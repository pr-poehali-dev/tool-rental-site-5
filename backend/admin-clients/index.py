import json
import os
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Content-Type': 'application/json',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def check_auth(conn, token):
    cur = conn.cursor()
    cur.execute("SELECT id FROM admin_sessions WHERE id = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    cur.close()
    return row is not None

def handler(event: dict, context) -> dict:
    """База клиентов: GET — список с агрегацией из заказов и адресами, PUT — обновить ФИО/заметки,
    POST action=add_address — добавить адрес клиенту, DELETE action=address — удалить адрес."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    conn = get_conn()

    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    if method == 'POST' and params.get('action') == 'add_address':
        body = json.loads(event.get('body') or '{}')
        phone = body.get('phone', '')
        address = body.get('address', '')
        label = body.get('label', '')
        if not phone or not address:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'phone и address обязательны'})}
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO client_addresses (client_phone, address, label) VALUES (%s, %s, %s) RETURNING id",
            (phone, address, label)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'id': new_id, 'ok': True})}

    if method == 'DELETE' and params.get('action') == 'address':
        address_id = params.get('id')
        if not address_id:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'id required'})}
        cur = conn.cursor()
        cur.execute("DELETE FROM client_addresses WHERE id = %s", (address_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'GET':
        cur = conn.cursor()
        # Клиенты + агрегация из заказов по телефону
        cur.execute("""
            SELECT
                c.id,
                c.phone,
                c.full_name,
                c.notes,
                c.created_at,
                COUNT(o.id) AS order_count,
                COALESCE(SUM(
                    CASE
                        WHEN jsonb_array_length(o.cart) > 0
                        THEN (SELECT SUM((item->>'qty')::int * (item->>'days')::int * (item->>'price')::int)
                              FROM jsonb_array_elements(o.cart) AS item)
                        ELSE 0
                    END
                ), 0) AS total_amount,
                MIN(o.created_at) AS first_order,
                MAX(o.created_at) AS last_order,
                ARRAY_AGG(o.id ORDER BY o.created_at DESC) FILTER (WHERE o.id IS NOT NULL) AS order_ids
            FROM clients c
            LEFT JOIN orders o ON o.phone = c.phone
            GROUP BY c.id, c.phone, c.full_name, c.notes, c.created_at
            ORDER BY last_order DESC NULLS LAST, c.created_at DESC
        """)
        rows = cur.fetchall()

        # Адреса всех клиентов одним запросом
        cur.execute("SELECT id, client_phone, address, label, is_default FROM client_addresses ORDER BY is_default DESC, created_at")
        addresses_by_phone: dict = {}
        for a in cur.fetchall():
            addresses_by_phone.setdefault(a[1], []).append({
                'id': a[0], 'address': a[2], 'label': a[3], 'isDefault': a[4],
            })

        result = []
        for r in rows:
            result.append({
                'id': r[0],
                'phone': r[1],
                'fullName': r[2],
                'notes': r[3],
                'createdAt': r[4].isoformat() if r[4] else None,
                'orderCount': int(r[5]),
                'totalAmount': int(r[6]),
                'firstOrder': r[7].isoformat() if r[7] else None,
                'lastOrder': r[8].isoformat() if r[8] else None,
                'orderIds': r[9] or [],
                'addresses': addresses_by_phone.get(r[1], []),
            })

        # Также достаём детали заказов для конкретного клиента если запрошен phone
        phone = params.get('phone', '')
        if phone:
            cur.execute("""
                SELECT id, name, phone, message, cart, status, created_at
                FROM orders WHERE phone = %s ORDER BY created_at DESC
            """, (phone,))
            orders = []
            for row in cur.fetchall():
                total = 0
                cart = row[4] or []
                if isinstance(cart, list):
                    for item in cart:
                        try:
                            total += int(item.get('qty', 0)) * int(item.get('days', 0)) * int(item.get('price', 0))
                        except Exception:
                            pass
                orders.append({
                    'id': row[0], 'name': row[1], 'phone': row[2],
                    'message': row[3], 'cart': cart, 'status': row[5],
                    'createdAt': row[6].isoformat(), 'total': total,
                })
            cur.close()
            conn.close()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(orders, ensure_ascii=False)}

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        phone = body.get('phone', '')
        if not phone:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'phone required'})}

        cur = conn.cursor()
        # Upsert — создаём клиента если нет, иначе обновляем
        cur.execute("""
            INSERT INTO clients (phone, full_name, notes)
            VALUES (%s, %s, %s)
            ON CONFLICT (phone) WHERE phone <> '' DO UPDATE
            SET full_name = EXCLUDED.full_name,
                notes = EXCLUDED.notes,
                updated_at = NOW()
        """, (phone, body.get('fullName', ''), body.get('notes', '')))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}