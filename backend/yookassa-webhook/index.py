import json
import os
import base64
import urllib.request
import urllib.error
import smtplib
import urllib.parse
from email.mime.text import MIMEText
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}

YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/payments'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def yk_auth_header() -> str:
    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')
    token = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    return f"Basic {token}"


def fetch_payment(payment_id: str) -> dict:
    """Запрашивает у ЮKassa актуальные данные платежа по его id — так мы проверяем
    подлинность уведомления, не доверяя телу запроса напрямую (ЮKassa рекомендует этот способ)."""
    req = urllib.request.Request(
        f"{YOOKASSA_API_URL}/{payment_id}",
        headers={'Authorization': yk_auth_header()},
        method='GET',
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))


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
    """HTTP-уведомление (webhook) от ЮKassa о смене статуса платежа.
    При событии payment.succeeded — перепроверяет платёж напрямую в API ЮKassa (по payment_id),
    помечает orders.payment_status = 'paid', уведомляет клиента. Возвращает 200 OK."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': HEADERS, 'body': ''}

    body_raw = event.get('body', '') or ''
    if event.get('isBase64Encoded'):
        body_raw = base64.b64decode(body_raw).decode('utf-8')

    try:
        notification = json.loads(body_raw or '{}')
    except Exception:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Invalid JSON'})}

    event_type = notification.get('event', '')
    payment_obj = notification.get('object', {}) or {}
    payment_id = payment_obj.get('id', '')

    if not payment_id:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Missing payment id'})}

    if event_type != 'payment.succeeded':
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')
    if not shop_id or not secret_key:
        return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': 'Configuration error'})}

    try:
        payment = fetch_payment(payment_id)
    except urllib.error.HTTPError as e:
        print(f'Ошибка проверки платежа ЮKassa: {e.code} {e.read()}')
        return {'statusCode': 502, 'headers': HEADERS, 'body': json.dumps({'error': 'Payment verification failed'})}

    if payment.get('status') != 'succeeded':
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    order_id = (payment.get('metadata') or {}).get('order_id', '')
    if not order_id:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Missing order_id in metadata'})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        UPDATE orders SET payment_status = 'paid', paid_at = NOW(), payment_op_key = %s
        WHERE id = %s AND payment_status != 'paid'
        RETURNING id, name, phone, email
    """, (payment_id, int(order_id)))
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if row:
        oid, name, phone, email = row
        text = f"Строй_Rent: оплата заявки №{oid} прошла успешно. Спасибо!"
        send_sms(phone, text)
        send_email(email, f"Строй_Rent — заявка №{oid} оплачена", text)

    return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}
