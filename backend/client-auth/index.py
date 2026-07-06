import json
import os
import random
import secrets
import smtplib
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Token',
    'Content-Type': 'application/json',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def normalize_phone(phone: str) -> str:
    digits = ''.join(ch for ch in phone if ch.isdigit())
    if len(digits) == 11 and digits.startswith('8'):
        digits = '7' + digits[1:]
    if len(digits) == 10:
        digits = '7' + digits
    return '+' + digits if digits else ''


def normalize_email(email: str) -> str:
    return email.strip().lower()


def send_sms(phone: str, text: str):
    api_id = os.environ.get('SMS_RU_API_ID', '')
    if not api_id or not phone:
        print('SMS не отправлено: нет API ключа или телефона')
        return
    try:
        digits = phone.lstrip('+')
        params = urllib.parse.urlencode({'api_id': api_id, 'to': digits, 'msg': text, 'json': 1})
        url = f"https://sms.ru/sms/send?{params}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            print(f'SMS.RU ответ: {resp.read().decode("utf-8", errors="replace")}')
    except Exception as e:
        print(f'Ошибка отправки SMS: {e}')


def send_email(to_email: str, subject: str, text: str):
    host = os.environ.get('SMTP_HOST', '')
    port = os.environ.get('SMTP_PORT', '')
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    if not all([host, port, user, password, to_email]):
        print('Email не отправлен: не хватает настроек SMTP или адреса получателя')
        return
    try:
        msg = MIMEText(text, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = user
        msg['To'] = to_email
        port_int = int(port)
        if port_int == 465:
            with smtplib.SMTP_SSL(host, port_int, timeout=10) as server:
                server.login(user, password)
                server.sendmail(user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port_int, timeout=10) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(user, [to_email], msg.as_string())
        print(f'Email отправлен на {to_email}')
    except Exception as e:
        print(f'Ошибка отправки email на {to_email}: {e}')


def check_session(conn, token):
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.phone, c.email, c.full_name, c.verified
        FROM client_sessions s JOIN clients c ON c.id = s.client_id
        WHERE s.id = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    return row


def handler(event: dict, context) -> dict:
    """Регистрация и вход клиента по коду из email/SMS (без пароля).
    POST ?action=request_code {contact, channel, fullName?} — отправить код подтверждения.
    POST ?action=verify_code {contact, channel, code} — подтвердить код и получить токен сессии.
    GET ?token=... — проверить сессию, вернуть профиль клиента.
    POST ?action=logout — завершить сессию (требует X-Client-Token)."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    if method == 'GET':
        token = params.get('token', '')
        if not token:
            return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'valid': False})}
        conn = get_conn()
        row = check_session(conn, token)
        conn.close()
        if not row:
            return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'valid': False})}
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({
            'valid': True,
            'client': {'id': row[0], 'phone': row[1], 'email': row[2], 'fullName': row[3], 'verified': row[4]},
        }, ensure_ascii=False)}

    if method == 'POST' and action == 'logout':
        token = (event.get('headers') or {}).get('X-Client-Token', '')
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute("DELETE FROM client_sessions WHERE id = %s", (token,))
            conn.commit()
            cur.close()
            conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    body = json.loads(event.get('body') or '{}')
    channel = body.get('channel', '')

    if method == 'POST' and action == 'request_code':
        contact_raw = body.get('contact', '')
        full_name = body.get('fullName', '').strip()

        if channel == 'email':
            contact = normalize_email(contact_raw)
            at_pos = contact.find('@')
            if at_pos <= 0 or at_pos >= len(contact) - 1:
                return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Укажите корректный email'})}
        elif channel == 'phone':
            contact = normalize_phone(contact_raw)
            if len(contact) != 12:
                return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Укажите корректный номер телефона'})}
        else:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Неверный способ связи'})}

        conn = get_conn()
        cur = conn.cursor()
        col = 'email' if channel == 'email' else 'phone'
        cur.execute(f"SELECT id, full_name FROM clients WHERE {col} = %s", (contact,))
        row = cur.fetchone()
        if row:
            client_id = row[0]
            if full_name and not row[1]:
                cur.execute("UPDATE clients SET full_name = %s, updated_at = NOW() WHERE id = %s", (full_name, client_id))
        else:
            cur.execute(f"INSERT INTO clients ({col}, full_name) VALUES (%s, %s) RETURNING id", (contact, full_name))
            client_id = cur.fetchone()[0]

        code = f"{random.randint(0, 999999):06d}"
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        cur.execute(
            "INSERT INTO client_verifications (client_id, contact, channel, code, expires_at) VALUES (%s, %s, %s, %s, %s)",
            (client_id, contact, channel, code, expires)
        )
        conn.commit()
        cur.close()
        conn.close()

        text = f"Строй_Rent: код подтверждения — {code}. Никому не сообщайте его. Код действует 10 минут."
        if channel == 'phone':
            send_sms(contact, text)
        else:
            send_email(contact, 'Строй_Rent — код подтверждения', text)

        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'POST' and action == 'verify_code':
        contact_raw = body.get('contact', '')
        code = body.get('code', '').strip()
        contact = normalize_email(contact_raw) if channel == 'email' else normalize_phone(contact_raw)

        conn = get_conn()
        cur = conn.cursor()
        col = 'email' if channel == 'email' else 'phone'
        cur.execute(f"SELECT id FROM clients WHERE {col} = %s", (contact,))
        client_row = cur.fetchone()
        if not client_row:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Код не найден. Запросите новый'})}
        client_id = client_row[0]

        cur.execute("""
            SELECT id FROM client_verifications
            WHERE client_id = %s AND code = %s AND used = false AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1
        """, (client_id, code))
        v_row = cur.fetchone()
        if not v_row:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Неверный или истёкший код'})}

        cur.execute("UPDATE client_verifications SET used = true WHERE id = %s", (v_row[0],))
        cur.execute("UPDATE clients SET verified = true WHERE id = %s", (client_id,))

        token = secrets.token_hex(32)
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        cur.execute("DELETE FROM client_sessions WHERE expires_at < NOW()")
        cur.execute("INSERT INTO client_sessions (id, client_id, expires_at) VALUES (%s, %s, %s)", (token, client_id, expires))

        conn.commit()
        cur.execute("SELECT id, phone, email, full_name, verified FROM clients WHERE id = %s", (client_id,))
        c = cur.fetchone()
        cur.close()
        conn.close()

        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({
            'token': token, 'expires': expires.isoformat(),
            'client': {'id': c[0], 'phone': c[1], 'email': c[2], 'fullName': c[3], 'verified': c[4]},
        }, ensure_ascii=False)}

    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}
