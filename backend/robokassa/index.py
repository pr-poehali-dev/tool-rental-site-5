import json
import os
import hashlib
import psycopg2
from urllib.parse import urlencode

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}

ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def calculate_signature(*args) -> str:
    joined = ':'.join(str(a) for a in args)
    return hashlib.md5(joined.encode()).hexdigest()


def handler(event: dict, context) -> dict:
    """Генерирует ссылку на оплату Robokassa (карта + СБП) для существующей заявки.
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

    merchant_login = os.environ.get('ROBOKASSA_MERCHANT_LOGIN', '')
    password_1 = os.environ.get('ROBOKASSA_PASSWORD_1', '')
    if not merchant_login or not password_1:
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

    amount_str = f"{amount:.2f}"
    signature = calculate_signature(merchant_login, amount_str, order_id, password_1)

    query_params = {
        'MerchantLogin': merchant_login,
        'OutSum': amount_str,
        'InvId': order_id,
        'SignatureValue': signature,
        'Culture': 'ru',
        'Description': f'Строй_Rent — оплата заявки №{order_id}',
    }
    if email:
        query_params['Email'] = email

    payment_url = f"{ROBOKASSA_URL}?{urlencode(query_params)}"

    cur.execute("UPDATE orders SET payment_url = %s WHERE id = %s", (payment_url, order_id))
    conn.commit()
    cur.close()
    conn.close()

    return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'paymentUrl': payment_url}, ensure_ascii=False)}