import json
import os
import base64
import uuid
import urllib.request
import urllib.error
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


def handler(event: dict, context) -> dict:
    """Создаёт платёж в ЮKassa (карта + СБП) для существующей заявки и возвращает ссылку на оплату.
    Доступно только после подтверждения заявки менеджером (статус processing/done) и если она ещё не оплачена.
    POST {orderId} → {paymentUrl}."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': HEADERS, 'body': ''}

    body = json.loads(event.get('body') or '{}')
    order_id = body.get('orderId')
    if not order_id:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'orderId required'})}

    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')
    if not shop_id or not secret_key:
        return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': 'Оплата онлайн временно недоступна'})}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT name, email, cart, status, payment_method, payment_status
        FROM orders WHERE id = %s
    """, (order_id,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}

    name, email, cart, status, payment_method, payment_status = row

    if payment_method != 'online':
        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Для этой заявки не выбрана онлайн-оплата'})}
    if status in ('new',):
        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Оплата станет доступна после подтверждения заявки менеджером'})}
    if status == 'rejected':
        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка отклонена, оплата недоступна'})}
    if payment_status == 'paid':
        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка уже оплачена'})}

    amount = 0
    for item in (cart or []):
        try:
            qty = int(item.get('qty', 0) or 0)
            days = int(item.get('days', 0) or 0)
            price = int(item.get('price', 0) or 0)
            deposit = int(item.get('deposit', 0) or 0)
            amount += qty * days * price + qty * deposit
        except Exception:
            pass

    if amount <= 0:
        cur.close(); conn.close()
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Сумма заказа равна нулю'})}

    site_url = os.environ.get('SITE_URL', '').rstrip('/')
    return_url = f"{site_url}/order/{order_id}" if site_url else 'https://yookassa.ru'

    payload = {
        'amount': {'value': f"{amount:.2f}", 'currency': 'RUB'},
        'confirmation': {'type': 'redirect', 'return_url': return_url},
        'capture': True,
        'description': f'Строй_Rent — оплата заявки №{order_id}',
        'metadata': {'order_id': str(order_id)},
    }
    if email:
        payload['receipt'] = {
            'customer': {'email': email},
            'items': [{
                'description': f'Аренда инструмента, заявка №{order_id}',
                'quantity': '1.00',
                'amount': {'value': f"{amount:.2f}", 'currency': 'RUB'},
                'vat_code': 1,
                'payment_mode': 'full_payment',
                'payment_subject': 'service',
            }],
        }

    req = urllib.request.Request(
        YOOKASSA_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': yk_auth_header(),
            'Idempotence-Key': str(uuid.uuid4()),
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        cur.close(); conn.close()
        print(f'Ошибка создания платежа ЮKassa: {e.code} {error_body}')
        return {'statusCode': 502, 'headers': HEADERS, 'body': json.dumps({'error': 'Не удалось создать платёж. Попробуйте позже.'})}

    payment_id = resp_data.get('id', '')
    payment_url = resp_data.get('confirmation', {}).get('confirmation_url', '')
    if not payment_url:
        cur.close(); conn.close()
        return {'statusCode': 502, 'headers': HEADERS, 'body': json.dumps({'error': 'Не удалось получить ссылку на оплату'})}

    cur.execute("UPDATE orders SET payment_url = %s, payment_op_key = %s WHERE id = %s", (payment_url, payment_id, order_id))
    conn.commit()
    cur.close()
    conn.close()

    return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'paymentUrl': payment_url}, ensure_ascii=False)}
