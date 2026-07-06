import json
import os
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Token',
    'Content-Type': 'application/json',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def get_client_id(conn, token):
    cur = conn.cursor()
    cur.execute("SELECT client_id FROM client_sessions WHERE id = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    cur.close()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """Личный кабинет клиента (требует X-Client-Token из client-auth):
    GET / — профиль + история заказов + потраченная сумма + адреса.
    PUT / — обновить ФИО.
    POST ?action=add_address {address, label} — добавить адрес доставки.
    PUT ?action=set_default_address {id} — сделать адрес основным.
    DELETE ?action=address&id=... — удалить адрес."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Client-Token', '')
    conn = get_conn()
    client_id = get_client_id(conn, token)
    if not client_id:
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if method == 'POST' and action == 'add_address':
        body = json.loads(event.get('body') or '{}')
        address = body.get('address', '').strip()
        label = body.get('label', '').strip()
        if not address:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Укажите адрес'})}
        cur = conn.cursor()
        cur.execute("SELECT phone FROM clients WHERE id = %s", (client_id,))
        phone = cur.fetchone()[0] or ''
        cur.execute(
            "INSERT INTO client_addresses (client_id, client_phone, address, label) VALUES (%s, %s, %s, %s) RETURNING id",
            (client_id, phone, address, label)
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'id': new_id, 'ok': True})}

    if method == 'PUT' and action == 'set_default_address':
        body = json.loads(event.get('body') or '{}')
        address_id = body.get('id')
        cur = conn.cursor()
        cur.execute("UPDATE client_addresses SET is_default = false WHERE client_id = %s", (client_id,))
        cur.execute("UPDATE client_addresses SET is_default = true WHERE id = %s AND client_id = %s", (address_id, client_id))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'DELETE' and action == 'address':
        address_id = params.get('id')
        cur = conn.cursor()
        cur.execute("DELETE FROM client_addresses WHERE id = %s AND client_id = %s", (address_id, client_id))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        full_name = body.get('fullName', '').strip()
        cur = conn.cursor()
        cur.execute("UPDATE clients SET full_name = %s, updated_at = NOW() WHERE id = %s", (full_name, client_id))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'GET':
        cur = conn.cursor()
        cur.execute("SELECT id, phone, email, full_name, verified, created_at FROM clients WHERE id = %s", (client_id,))
        c = cur.fetchone()

        cur.execute("""
            SELECT id, name, phone, email, message, cart, status, created_at, delivery_method, delivery_address,
                   receive_date, receive_time, payment_method
            FROM orders WHERE client_id = %s ORDER BY created_at DESC
        """, (client_id,))
        orders = []
        total_spent = 0
        for r in cur.fetchall():
            cart = r[5] or []
            total = 0
            if isinstance(cart, list):
                for item in cart:
                    try:
                        total += int(item.get('qty', 0)) * int(item.get('days', 0)) * int(item.get('price', 0))
                    except Exception:
                        pass
            if r[6] in ('done', 'returned'):
                total_spent += total
            orders.append({
                'id': r[0], 'name': r[1], 'phone': r[2], 'email': r[3], 'message': r[4],
                'cart': cart, 'status': r[6], 'createdAt': r[7].isoformat(),
                'deliveryMethod': r[8], 'deliveryAddress': r[9],
                'receiveDate': r[10].isoformat() if r[10] else None,
                'receiveTime': r[11], 'paymentMethod': r[12], 'total': total,
            })

        cur.execute(
            "SELECT id, address, label, is_default FROM client_addresses WHERE client_id = %s ORDER BY is_default DESC, created_at",
            (client_id,)
        )
        addresses = [{'id': a[0], 'address': a[1], 'label': a[2], 'isDefault': a[3]} for a in cur.fetchall()]

        cur.close()
        conn.close()

        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({
            'client': {
                'id': c[0], 'phone': c[1], 'email': c[2], 'fullName': c[3],
                'verified': c[4], 'createdAt': c[5].isoformat() if c[5] else None,
            },
            'orders': orders,
            'orderCount': len(orders),
            'totalSpent': total_spent,
            'addresses': addresses,
        }, ensure_ascii=False)}

    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}
