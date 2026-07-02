import json
import os
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

def handler(event: dict, context) -> dict:
    """Заявки: POST — создать (публично), GET/PUT — для администратора."""
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
        # Автоматически создаём/обновляем клиента по телефону
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

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    if method == 'GET':
        cur = conn.cursor()
        cur.execute("SELECT id, name, phone, message, cart, status, created_at FROM orders ORDER BY created_at DESC LIMIT 200")
        rows = cur.fetchall()
        result = [
            {'id': r[0], 'name': r[1], 'phone': r[2], 'message': r[3],
             'cart': r[4], 'status': r[5], 'createdAt': r[6].isoformat()}
            for r in rows
        ]
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    if method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status=%s WHERE id=%s", (body.get('status', 'new'), body.get('id')))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}