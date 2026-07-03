import json
import os
from datetime import timedelta
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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

def adjust_stock(cur, cart, direction):
    """direction: +1 вернуть на склад, -1 списать со склада"""
    for item in cart or []:
        tool_id = item.get('id')
        qty = int(item.get('qty', 0) or 0)
        if not tool_id or qty <= 0:
            continue
        if direction < 0:
            cur.execute(
                "UPDATE tools SET stock = GREATEST(0, stock - %s), updated_at = NOW() WHERE id = %s",
                (qty, tool_id)
            )
        else:
            cur.execute(
                "UPDATE tools SET stock = LEAST(total_stock, stock + %s), updated_at = NOW() WHERE id = %s",
                (qty, tool_id)
            )

def handler(event: dict, context) -> dict:
    """Заявки: POST — создать (публично). GET/PUT — для администратора: смена статуса,
    авто-списание/возврат остатков инструментов, продление аренды, архивация возвращённых заявок."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    conn = get_conn()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = body.get('name', '')
        phone = body.get('phone', '')
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO orders (name, phone, message, cart) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, phone, body.get('message', ''),
             json.dumps(body.get('cart', []), ensure_ascii=False))
        )
        new_id = cur.fetchone()[0]
        if phone:
            cur.execute("""
                INSERT INTO clients (phone, full_name)
                VALUES (%s, %s)
                ON CONFLICT (phone) DO UPDATE
                SET full_name = CASE
                    WHEN clients.full_name = '' THEN EXCLUDED.full_name
                    ELSE clients.full_name
                END,
                updated_at = NOW()
            """, (phone, name))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'id': new_id, 'ok': True})}

    token = (event.get('headers') or {}).get('X-Authorization', '') or (event.get('headers') or {}).get('X-Admin-Token', '')
    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        show_archived = params.get('archived') == '1'
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, phone, message, cart, status, created_at, due_at, archived, extensions
            FROM orders WHERE archived = %s ORDER BY created_at DESC LIMIT 200
        """, (show_archived,))
        rows = cur.fetchall()
        result = [
            {'id': r[0], 'name': r[1], 'phone': r[2], 'message': r[3],
             'cart': r[4], 'status': r[5], 'createdAt': r[6].isoformat(),
             'dueAt': r[7].isoformat() if r[7] else None,
             'archived': r[8], 'extensions': r[9] or []}
            for r in rows
        ]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        order_id = body.get('id')
        action = body.get('action', '')
        cur = conn.cursor()

        if action == 'extend':
            extra_days = int(body.get('extraDays', 0) or 0)
            new_amount = body.get('newAmount', 0)
            cur.execute("SELECT due_at, extensions FROM orders WHERE id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
            due_at, extensions = row
            extensions = extensions or []
            extensions.append({
                'days': extra_days,
                'amount': new_amount,
                'date': None,
            })
            cur.execute(
                "UPDATE orders SET due_at = COALESCE(due_at, NOW()) + %s * INTERVAL '1 day', extensions = %s WHERE id = %s",
                (extra_days, json.dumps(extensions, ensure_ascii=False), order_id)
            )
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

        status = body.get('status', 'new')
        cur.execute("SELECT cart, status, due_at FROM orders WHERE id = %s", (order_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
        cart, prev_status, prev_due_at = row

        if status == 'done' and prev_status != 'done':
            adjust_stock(cur, cart, -1)
            max_days = max([int(i.get('days', 1) or 1) for i in (cart or [])], default=1)
            cur.execute(
                "UPDATE orders SET status=%s, due_at = NOW() + %s * INTERVAL '1 day' WHERE id=%s",
                (status, max_days, order_id)
            )
        elif status == 'returned':
            if prev_status == 'done':
                adjust_stock(cur, cart, +1)
            cur.execute("UPDATE orders SET status=%s, archived=true WHERE id=%s", (status, order_id))
        else:
            cur.execute("UPDATE orders SET status=%s WHERE id=%s", (status, order_id))

        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}
