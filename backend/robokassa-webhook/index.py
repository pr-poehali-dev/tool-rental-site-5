import os
import hashlib
import psycopg2
import smtplib
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from urllib.parse import parse_qs

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'text/plain',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def calculate_signature(*args) -> str:
    joined = ':'.join(str(a) for a in args)
    return hashlib.md5(joined.encode()).hexdigest().upper()


def send_sms(phone: str, text: str):
    api_id = os.environ.get('SMS_RU_API_ID', '')
    if not api_id or not phone:
        return
    try:
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if len(digits) == 11 and digits.startswith('8'):
            digits = '7' + digits[1:]
        params = urllib.parse.urlencode({'api_id': api_id, 'to': digits, 'msg': text, 'json': 1})
        with urllib.request.urlopen(f"https://sms.ru/sms/send?{params}", timeout=10):
            pass
    except Exception as e:
        print(f'Ошибка отправки SMS: {e}')


def send_email(to_email: str, subject: str, text: str):
    host = os.environ.get('SMTP_HOST', '')
    port = os.environ.get('SMTP_PORT', '')
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    if not all([host, port, user, password, to_email]):
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
    except Exception as e:
        print(f'Ошибка отправки email: {e}')


def handler(event: dict, context) -> dict:
    """Result URL вебхук от Robokassa: подтверждает оплату заявки (OutSum, InvId, SignatureValue),
    помечает orders.payment_status = 'paid', уведомляет клиента. Возвращает OK{InvId}."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = {}
    body = event.get('body', '') or ''
    if method == 'POST' and body:
        if event.get('isBase64Encoded'):
            import base64
            body = base64.b64decode(body).decode('utf-8')
        parsed = parse_qs(body)
        params = {k: v[0] for k, v in parsed.items()}
    if not params:
        params = event.get('queryStringParameters') or {}

    out_sum = params.get('OutSum', '')
    inv_id = params.get('InvId', '')
    signature_value = params.get('SignatureValue', '').upper()

    if not out_sum or not inv_id or not signature_value:
        return {'statusCode': 400, 'headers': HEADERS, 'body': 'Missing required parameters'}

    password_2 = os.environ.get('ROBOKASSA_PASSWORD_2', '')
    if not password_2:
        return {'statusCode': 500, 'headers': HEADERS, 'body': 'Configuration error'}

    expected = calculate_signature(out_sum, inv_id, password_2)
    if signature_value != expected:
        return {'statusCode': 400, 'headers': HEADERS, 'body': 'Invalid signature'}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE orders SET payment_status = 'paid', paid_at = NOW()
        WHERE id = %s AND payment_status != 'paid'
        RETURNING id, name, phone, email
    """, (int(inv_id),))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if row:
        order_id, name, phone, email = row
        text = f"Строй_Rent: оплата заявки №{order_id} прошла успешно. Спасибо!"
        send_sms(phone, text)
        send_email(email, f"Строй_Rent — заявка №{order_id} оплачена", text)

    return {'statusCode': 200, 'headers': HEADERS, 'body': f'OK{inv_id}'}