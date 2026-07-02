import json
import os
import secrets
import psycopg2
from datetime import datetime, timedelta, timezone

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def handler(event: dict, context) -> dict:
    """Авторизация администратора. POST {login, password} → {token}. GET с токеном → проверка."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        login = body.get('login', '')
        password = body.get('password', '')

        admin_password = os.environ.get('ADMIN_PASSWORD', '')
        if login != 'admin' or password != admin_password or not admin_password:
            return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

        token = secrets.token_hex(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=24)

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("DELETE FROM admin_sessions WHERE expires_at < NOW()")
        cur.execute("INSERT INTO admin_sessions (id, expires_at) VALUES (%s, %s)", (token, expires))
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'token': token, 'expires': expires.isoformat()}),
        }

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        token = params.get('token', '')
        if not token:
            return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'valid': False})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id FROM admin_sessions WHERE id = %s AND expires_at > NOW()", (token,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if row:
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'valid': True})}
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'valid': False})}

    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}
