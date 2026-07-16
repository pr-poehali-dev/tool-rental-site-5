import json
import os
import smtplib
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
import psycopg2
import acts

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Client-Token',
    'Content-Type': 'application/json',
}

STATUS_LABELS = {
    'new': 'Новая',
    'processing': 'В работе',
    'done': 'Выполнена',
    'returned': 'Возвращена',
    'rejected': 'Отклонена',
}

ADMIN_EMAIL = 'stroy_rent@list.ru'


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")


def check_auth(conn, token):
    cur = conn.cursor()
    cur.execute("SELECT id FROM admin_sessions WHERE id = %s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    cur.close()
    return row is not None


def cart_items_with_inventory(cur, cart):
    """Дополняет позиции корзины инвентарным номером инструмента (актуальным на момент вызова)."""
    tool_ids = [it.get('id') for it in (cart or []) if it.get('id')]
    inv_map = {}
    if tool_ids:
        cur.execute("SELECT id, inventory_number FROM tools WHERE id = ANY(%s)", (tool_ids,))
        inv_map = {r[0]: r[1] for r in cur.fetchall()}
    enriched = []
    for it in (cart or []):
        it = dict(it)
        it['inventoryNumber'] = inv_map.get(it.get('id'), '') or ''
        enriched.append(it)
    return enriched


def get_client_full_name(cur, phone):
    if not phone:
        return ''
    cur.execute("SELECT full_name FROM clients WHERE phone = %s", (phone,))
    row = cur.fetchone()
    return row[0] if row and row[0] else ''


def generate_act(cur, kind, order_id, name, phone, cart, extra=None):
    """Формирует данные и PDF акта (handover|return), сохраняет URL и данные в orders."""
    items = acts.default_items_from_cart(cart_items_with_inventory(cur, cart))
    data = {
        'representativeName': '',
        'clientFullName': get_client_full_name(cur, phone) or name or '',
        'clientPassport': '',
        'items': items,
        'depositTotal': acts.deposit_total_from_cart(cart),
        'notes': '',
    }
    if extra:
        data.update(extra)
    url = acts.generate_and_upload(kind, order_id, data)
    field_url = 'handover_act_url' if kind == 'handover' else 'return_act_url'
    field_data = 'handover_act_data' if kind == 'handover' else 'return_act_data'
    cur.execute(
        f"UPDATE orders SET {field_url}=%s, {field_data}=%s WHERE id=%s",
        (url, json.dumps(data, ensure_ascii=False), order_id)
    )
    return url, data


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


def build_message(order_id, name, status, cart, reject_reason='', admin_comment=''):
    """Формирует текст уведомления с составом заказа и ссылкой на статус."""
    site_url = os.environ.get('SITE_URL', '').rstrip('/')
    link = f"{site_url}/order/{order_id}" if site_url else ''
    status_label = 'Аренда завершена' if status == 'returned' else STATUS_LABELS.get(status, status)

    lines = [f"Строй_Rent: заявка №{order_id} — статус изменён на «{status_label}»."]

    items = cart or []
    deposit_total = 0
    if items:
        lines.append('Состав заказа:')
        for item in items:
            try:
                qty = int(item.get('qty', 0) or 0)
                days = int(item.get('days', 0) or 0)
                price = int(item.get('price', 0) or 0)
                deposit = int(item.get('deposit', 0) or 0)
                lines.append(f"— {item.get('name', '')}: {qty} шт × {days} дн × {price} ₽")
                deposit_total += deposit * qty
            except Exception:
                pass
        if deposit_total:
            lines.append(f"Залог за инструмент: {deposit_total} ₽ (возвращается)")

    if status == 'rejected' and reject_reason:
        lines.append(f"Причина отклонения: {reject_reason}")

    if status == 'processing' and admin_comment:
        lines.append(f"Комментарий от менеджера: {admin_comment}")

    lines.append('Спасибо, что пользуетесь нашим сервисом!')

    if status == 'returned':
        lines.append('Ждем Вас снова.')
        lines.append('"Бери на время — строй на века" - Строй_Rent')
    elif link:
        lines.append(f"Статус заказа: {link}")

    lines.append('Наши контакты для связи:')
    lines.append('тел: 8 (901) 504-64-44')
    lines.append('e-mail: stroy_rent@list.ru')

    return '\n'.join(lines)


def send_sms(phone: str, text: str):
    api_id = os.environ.get('SMS_RU_API_ID', '')
    if not api_id:
        print('SMS не отправлено: не задан секрет SMS_RU_API_ID')
        return
    if not phone:
        print('SMS не отправлено: у заявки не указан телефон')
        return
    try:
        digits = ''.join(ch for ch in phone if ch.isdigit())
        if len(digits) == 11 and digits.startswith('8'):
            digits = '7' + digits[1:]
        params = urllib.parse.urlencode({
            'api_id': api_id,
            'to': digits,
            'msg': text,
            'json': 1,
        })
        url = f"https://sms.ru/sms/send?{params}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            resp_body = resp.read().decode('utf-8', errors='replace')
            print(f'SMS.RU ответ: {resp_body}')
    except Exception as e:
        print(f'Ошибка отправки SMS: {e}')


def send_email(to_email: str, subject: str, text: str):
    host = os.environ.get('SMTP_HOST', '')
    port = os.environ.get('SMTP_PORT', '')
    user = os.environ.get('SMTP_USER', '')
    password = os.environ.get('SMTP_PASSWORD', '')
    missing = [n for n, v in [('SMTP_HOST', host), ('SMTP_PORT', port), ('SMTP_USER', user), ('SMTP_PASSWORD', password)] if not v]
    if missing:
        print(f'Email не отправлен: не заданы секреты {", ".join(missing)}')
        return
    if not to_email:
        print('Email не отправлен: у заявки не указан email клиента')
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
        print(f'Email успешно отправлен на {to_email}')
    except Exception as e:
        print(f'Ошибка отправки email на {to_email}: {e}')


def notify_status_change(phone, email, order_id, name, status, cart, reject_reason='', admin_comment=''):
    text = build_message(order_id, name, status, cart, reject_reason, admin_comment)
    send_sms(phone, text)
    send_email(email, f"Строй_Rent — заявка №{order_id}: {STATUS_LABELS.get(status, status)}", text)


def notify_deposit_resolution(phone, email, order_id, name, refund_amount, resolution, refund_status):
    """Уведомляет клиента о решении по возврату залога."""
    lines = [f"Строй_Rent: заявка №{order_id} — аренда завершена."]
    if refund_amount > 0:
        lines.append(f"Сумма к возврату залога: {refund_amount} ₽")
    withheld = [r for r in (resolution or []) if not r.get('refunded')]
    if withheld:
        lines.append('Залог удержан по позициям:')
        for r in withheld:
            lines.append(f"— {r.get('name', '')}: {r.get('amount', 0)} ₽ — {r.get('reason', '')}")
    if refund_status == 'pending':
        lines.append('Возврат средств будет произведён в ближайшее время на карту/счёт, с которого была оплата.')
    elif refund_status == 'refunded':
        lines.append('Средства уже возвращены на карту/счёт, с которого была оплата.')
    lines.append('Спасибо, что пользуетесь нашим сервисом!')
    lines.append('Наши контакты для связи:')
    lines.append('тел: 8 (901) 504-64-44')
    lines.append('e-mail: stroy_rent@list.ru')
    text = '\n'.join(lines)
    send_sms(phone, text)
    send_email(email, f"Строй_Rent — заявка №{order_id}: возврат залога", text)


def notify_admin_new_order(order_id, name, phone, email, cart, message, delivery_method, delivery_address, receive_date, receive_time, payment_method):
    """Уведомляет администратора на почту о новом заказе с сайта."""
    site_url = os.environ.get('SITE_URL', '').rstrip('/')
    link = f"{site_url}/order/{order_id}" if site_url else ''

    lines = [f"Новая заявка №{order_id} с сайта Строй_Rent", '']
    lines.append(f"Клиент: {name}")
    lines.append(f"Телефон: {phone}")
    if email:
        lines.append(f"Email: {email}")
    lines.append(f"Способ получения: {'Доставка' if delivery_method == 'delivery' else 'Самовывоз'}")
    if delivery_method == 'delivery' and delivery_address:
        lines.append(f"Адрес доставки: {delivery_address}")
    if receive_date:
        lines.append(f"Дата получения: {receive_date}{f', {receive_time}' if receive_time else ''}")
    payment_labels = {'cash': 'Наличными', 'card': 'Картой при получении', 'transfer': 'Перевод по счёту'}
    lines.append(f"Оплата: {payment_labels.get(payment_method, payment_method)}")
    if message:
        lines.append(f"Комментарий клиента: {message}")

    items = cart or []
    if items:
        lines.append('')
        lines.append('Состав заказа:')
        total = 0
        deposit_total = 0
        for item in items:
            try:
                qty = int(item.get('qty', 0) or 0)
                days = int(item.get('days', 0) or 0)
                price = int(item.get('price', 0) or 0)
                deposit = int(item.get('deposit', 0) or 0)
                sum_item = qty * days * price
                total += sum_item
                deposit_total += deposit * qty
                lines.append(f"— {item.get('name', '')}: {qty} шт × {days} дн × {price} ₽ = {sum_item} ₽")
            except Exception:
                pass
        lines.append(f"Сумма аренды: {total} ₽")
        if deposit_total:
            lines.append(f"Залог за инструмент: {deposit_total} ₽ (возвращается)")
        lines.append(f"Итого к оплате: {total + deposit_total} ₽")

    if link:
        lines.append('')
        lines.append(f"Ссылка на заявку: {link}")

    text = '\n'.join(lines)
    send_email(ADMIN_EMAIL, f"Новая заявка №{order_id} — {name}", text)


def handler(event: dict, context) -> dict:
    """Заявки: POST — создать (публично). GET — список для администратора либо публичная карточка заказа
    по id (?public=1&id=...). PUT/DELETE — для администратора: смена статуса, авто-списание/возврат остатков
    инструментов, продление аренды, отклонение с комментарием, архивация возвращённых заявок, полное удаление.
    При любом изменении статуса клиенту отправляется SMS и email с составом заказа и ссылкой на статус."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}

    # Публичная карточка заказа — без авторизации
    if method == 'GET' and params.get('public') == '1':
        order_id = params.get('id')
        if not order_id:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'id required'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, cart, status, created_at, due_at, delivery_method, delivery_address,
                   receive_date, receive_time, payment_method, reject_reason, extensions, admin_comment,
                   payment_status, payment_url, deposit_refund_amount, deposit_resolution, deposit_refund_status,
                   handover_act_url, return_act_url
            FROM orders WHERE id = %s
        """, (order_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
        result = {
            'id': row[0], 'name': row[1], 'cart': row[2], 'status': row[3],
            'createdAt': row[4].isoformat(),
            'dueAt': row[5].isoformat() if row[5] else None,
            'deliveryMethod': row[6], 'deliveryAddress': row[7],
            'receiveDate': row[8].isoformat() if row[8] else None,
            'receiveTime': row[9], 'paymentMethod': row[10],
            'rejectReason': row[11], 'extensions': row[12] or [],
            'adminComment': row[13],
            'paymentStatus': row[14], 'paymentUrl': row[15],
            'depositRefundAmount': row[16], 'depositResolution': row[17] or [],
            'depositRefundStatus': row[18],
            'handoverActUrl': row[19], 'returnActUrl': row[20],
        }
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    conn = get_conn()

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        name = body.get('name', '')
        phone = body.get('phone', '')
        email = body.get('email', '')
        at_pos = email.find('@')
        if not email or at_pos <= 0 or at_pos >= len(email) - 1:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Укажите корректный email'})}

        # Если клиент авторизован в личном кабинете — привязываем заказ к его профилю
        client_token = (event.get('headers') or {}).get('X-Client-Token', '')
        logged_client_id = None
        if client_token:
            cur = conn.cursor()
            cur.execute("SELECT client_id FROM client_sessions WHERE id = %s AND expires_at > NOW()", (client_token,))
            row = cur.fetchone()
            cur.close()
            if row:
                logged_client_id = row[0]

        cur = conn.cursor()
        cur.execute(
            """INSERT INTO orders
               (name, phone, message, cart, delivery_method, delivery_address,
                receive_date, receive_time, payment_method, email, client_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (name, phone, body.get('message', ''),
             json.dumps(body.get('cart', []), ensure_ascii=False),
             body.get('deliveryMethod', 'pickup'),
             body.get('deliveryAddress', ''),
             body.get('receiveDate') or None,
             body.get('receiveTime', ''),
             body.get('paymentMethod', 'cash'),
             body.get('email', ''),
             logged_client_id)
        )
        new_id = cur.fetchone()[0]
        if phone:
            cur.execute("""
                INSERT INTO clients (phone, full_name)
                VALUES (%s, %s)
                ON CONFLICT (phone) WHERE phone <> '' DO UPDATE
                SET full_name = CASE
                    WHEN clients.full_name = '' THEN EXCLUDED.full_name
                    ELSE clients.full_name
                END,
                updated_at = NOW()
            """, (phone, name))
        conn.commit()
        cur.close()
        conn.close()

        notify_admin_new_order(
            new_id, name, phone, body.get('email', ''),
            body.get('cart', []), body.get('message', ''),
            body.get('deliveryMethod', 'pickup'), body.get('deliveryAddress', ''),
            body.get('receiveDate') or '', body.get('receiveTime', ''),
            body.get('paymentMethod', 'cash'),
        )

        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'id': new_id, 'ok': True})}

    token = (event.get('headers') or {}).get('X-Authorization', '') or (event.get('headers') or {}).get('X-Admin-Token', '')
    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    if method == 'GET':
        show_archived = params.get('archived') == '1'
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, phone, message, cart, status, created_at, due_at, archived, extensions,
                   delivery_method, delivery_address, receive_date, receive_time, payment_method, email,
                   reject_reason, admin_comment, payment_status, payment_url,
                   deposit_refund_amount, deposit_resolution, deposit_refund_status,
                   handover_act_url, return_act_url, handover_act_data, return_act_data
            FROM orders WHERE archived = %s ORDER BY created_at DESC LIMIT 200
        """, (show_archived,))
        rows = cur.fetchall()
        result = [
            {'id': r[0], 'name': r[1], 'phone': r[2], 'message': r[3],
             'cart': r[4], 'status': r[5], 'createdAt': r[6].isoformat(),
             'dueAt': r[7].isoformat() if r[7] else None,
             'archived': r[8], 'extensions': r[9] or [],
             'deliveryMethod': r[10], 'deliveryAddress': r[11],
             'receiveDate': r[12].isoformat() if r[12] else None,
             'receiveTime': r[13], 'paymentMethod': r[14], 'email': r[15],
             'rejectReason': r[16], 'adminComment': r[17],
             'paymentStatus': r[18], 'paymentUrl': r[19],
             'depositRefundAmount': r[20], 'depositResolution': r[21] or [],
             'depositRefundStatus': r[22],
             'handoverActUrl': r[23], 'returnActUrl': r[24],
             'handoverActData': r[25] or {}, 'returnActData': r[26] or {}}
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

        if action == 'update_act':
            # Администратор вручную правит данные акта (ФИО, паспорт, состояние позиций, примечания)
            # и заявка перегенерируется в PDF.
            kind = body.get('kind', 'handover')  # 'handover' | 'return'
            data = body.get('data', {})
            if kind not in ('handover', 'return'):
                cur.close(); conn.close()
                return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'kind должен быть handover или return'})}
            url = acts.generate_and_upload(kind, order_id, data)
            field_url = 'handover_act_url' if kind == 'handover' else 'return_act_url'
            field_data = 'handover_act_data' if kind == 'handover' else 'return_act_data'
            cur.execute(
                f"UPDATE orders SET {field_url}=%s, {field_data}=%s WHERE id=%s",
                (url, json.dumps(data, ensure_ascii=False), order_id)
            )
            conn.commit()
            cur.close(); conn.close()
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True, 'url': url})}

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

        if action == 'reject':
            reason = body.get('reason', '')
            cur.execute("SELECT cart, status, phone, email, name FROM orders WHERE id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
            cart, prev_status, phone, email, name = row
            if prev_status == 'done':
                adjust_stock(cur, cart, +1)
            cur.execute(
                "UPDATE orders SET status='rejected', reject_reason=%s, archived=true WHERE id=%s",
                (reason, order_id)
            )
            conn.commit()
            cur.close(); conn.close()
            notify_status_change(phone, email, order_id, name, 'rejected', cart, reason)
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

        if action == 'resolve_deposit':
            # Завершение аренды с решением по возврату залога (полный/частичный/без возврата)
            refund_amount = int(body.get('refundAmount', 0) or 0)
            resolution = body.get('resolution', [])  # [{toolId, name, amount, refunded, reason, evidence: []}]

            cur.execute("SELECT cart, status, phone, email, name, payment_method, payment_status FROM orders WHERE id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
            cart, prev_status, phone, email, name, payment_method, payment_status = row

            if prev_status == 'done':
                adjust_stock(cur, cart, +1)

            # Если оплата была онлайн и есть что возвращать — ставим статус "ожидает возврата",
            # т.к. возврат через API ЮKassa инициируется отдельным запросом: администратор
            # проводит возврат вручную в личном кабинете ЮKassa и подтверждает это в системе.
            refund_status = 'pending' if (payment_method == 'online' and payment_status == 'paid' and refund_amount > 0) else 'none'

            cur.execute(
                """UPDATE orders SET status='returned', archived=true,
                   deposit_refund_amount=%s, deposit_resolution=%s, deposit_refund_status=%s
                   WHERE id=%s""",
                (refund_amount, json.dumps(resolution, ensure_ascii=False), refund_status, order_id)
            )
            deposit_withheld = sum(int(r.get('amount', 0) or 0) for r in resolution if not r.get('refunded'))
            deposit_total = acts.deposit_total_from_cart(cart)
            generate_act(cur, 'return', order_id, name, phone, cart, extra={
                'depositTotal': deposit_total,
                'depositWithheld': deposit_withheld,
                'depositReturned': refund_amount,
            })
            conn.commit()
            cur.close(); conn.close()
            notify_deposit_resolution(phone, email, order_id, name, refund_amount, resolution, refund_status)
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True, 'refundStatus': refund_status})}

        if action == 'confirm_deposit_refund':
            # Администратор подтверждает, что провёл возврат денег в личном кабинете ЮKassa вручную
            cur.execute("SELECT phone, email, name, deposit_refund_amount FROM orders WHERE id = %s", (order_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
            phone, email, name, refund_amount = row
            cur.execute(
                "UPDATE orders SET deposit_refund_status='refunded', deposit_refunded_at=NOW() WHERE id=%s",
                (order_id,)
            )
            conn.commit()
            cur.close(); conn.close()
            text = f"Строй_Rent: возврат залога {refund_amount} ₽ по заявке №{order_id} выполнен. Спасибо!"
            send_sms(phone, text)
            send_email(email, f"Строй_Rent — заявка №{order_id}: залог возвращён", text)
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

        status = body.get('status', 'new')
        comment = body.get('comment', '')
        cur.execute("SELECT cart, status, due_at, phone, email, name FROM orders WHERE id = %s", (order_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); conn.close()
            return {'statusCode': 404, 'headers': HEADERS, 'body': json.dumps({'error': 'Заявка не найдена'})}
        cart, prev_status, prev_due_at, phone, email, name = row

        if status == 'done' and prev_status != 'done':
            adjust_stock(cur, cart, -1)
            max_days = max([int(i.get('days', 1) or 1) for i in (cart or [])], default=1)
            cur.execute(
                "UPDATE orders SET status=%s, due_at = NOW() + %s * INTERVAL '1 day' WHERE id=%s",
                (status, max_days, order_id)
            )
            generate_act(cur, 'handover', order_id, name, phone, cart)
        elif status == 'returned':
            if prev_status == 'done':
                adjust_stock(cur, cart, +1)
            cur.execute("UPDATE orders SET status=%s, archived=true WHERE id=%s", (status, order_id))
            deposit_total = acts.deposit_total_from_cart(cart)
            generate_act(cur, 'return', order_id, name, phone, cart, extra={
                'depositTotal': deposit_total,
                'depositWithheld': 0,
                'depositReturned': deposit_total,
            })
        elif status == 'processing' and comment:
            cur.execute("UPDATE orders SET status=%s, admin_comment=%s WHERE id=%s", (status, comment, order_id))
        else:
            cur.execute("UPDATE orders SET status=%s WHERE id=%s", (status, order_id))

        conn.commit()
        cur.close()
        conn.close()

        if status != prev_status:
            notify_status_change(phone, email, order_id, name, status, cart, admin_comment=comment)

        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'DELETE':
        order_id = params.get('id')
        if not order_id:
            conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'id required'})}
        cur = conn.cursor()
        cur.execute("SELECT cart, status FROM orders WHERE id = %s", (order_id,))
        row = cur.fetchone()
        if row:
            cart, status = row
            if status == 'done':
                adjust_stock(cur, cart, +1)
            cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}