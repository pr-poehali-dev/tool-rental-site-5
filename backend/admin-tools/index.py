import base64
import json
import os
import uuid
import urllib.request
import psycopg2
import boto3

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

def resolve_images(image, images):
    imgs = [u for u in (images or []) if u and u.strip()]
    if not imgs and image:
        imgs = [image]
    return imgs

def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )

MAX_IMAGE_SIZE = 3 * 1024 * 1024  # 3 МБ — с запасом под лимит размера запроса облачной функции


def upload_image(body: dict) -> dict:
    """Загружает фото в S3 из base64 или URL, возвращает {url}."""
    source = body.get('source', 'base64')
    ext = 'jpg'
    image_bytes = None

    if source == 'base64':
        data = body.get('data', '')
        filename = body.get('filename', 'image.jpg')
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
        if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
            ext = 'jpg'
        if ',' in data:
            data = data.split(',', 1)[1]
        image_bytes = base64.b64decode(data)
    elif source == 'url':
        url = body.get('data', '')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            image_bytes = resp.read()
            ct = resp.headers.get('Content-Type', 'image/jpeg')
            if 'png' in ct: ext = 'png'
            elif 'webp' in ct: ext = 'webp'
            elif 'gif' in ct: ext = 'gif'
            else: ext = 'jpg'

    if not image_bytes:
        return {'error': 'Нет данных'}
    if len(image_bytes) > MAX_IMAGE_SIZE:
        return {'error': f'Файл слишком большой (макс. {MAX_IMAGE_SIZE // (1024 * 1024)} МБ)'}

    try:
        key = f"tool-images/{uuid.uuid4().hex}.{ext}"
        ct_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp', 'gif': 'image/gif'}
        get_s3().put_object(Bucket='files', Key=key, Body=image_bytes, ContentType=ct_map.get(ext, 'image/jpeg'))
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {'url': cdn_url}
    except Exception as e:
        return {'error': f'Не удалось сохранить файл в хранилище: {e}'}

MAX_PDF_SIZE = 3 * 1024 * 1024  # 3 МБ — с запасом под лимит размера запроса облачной функции


def upload_pdf(body: dict) -> dict:
    """Загружает PDF-инструкцию в S3 из base64, возвращает {url}."""
    data = body.get('data', '')
    filename = body.get('filename', 'manual.pdf')
    if not filename.lower().endswith('.pdf'):
        return {'error': 'Разрешены только PDF-файлы'}
    if ',' in data:
        data = data.split(',', 1)[1]
    try:
        pdf_bytes = base64.b64decode(data)
    except Exception:
        return {'error': 'Не удалось прочитать файл. Попробуйте выбрать файл заново'}

    if not pdf_bytes:
        return {'error': 'Нет данных'}
    if len(pdf_bytes) > MAX_PDF_SIZE:
        return {'error': f'Файл слишком большой (макс. {MAX_PDF_SIZE // (1024 * 1024)} МБ). Сожмите PDF или уменьшите разрешение картинок внутри него'}

    try:
        key = f"tool-manuals/{uuid.uuid4().hex}.pdf"
        get_s3().put_object(Bucket='files', Key=key, Body=pdf_bytes, ContentType='application/pdf')
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {'url': cdn_url}
    except Exception as e:
        return {'error': f'Не удалось сохранить файл в хранилище: {e}'}

MAX_EVIDENCE_SIZE = 8 * 1024 * 1024  # 8 МБ — с запасом под лимит размера запроса облачной функции


def upload_evidence(body: dict) -> dict:
    """Загружает фото/видео-доказательство удержания залога в S3 из base64, возвращает {url}."""
    data = body.get('data', '')
    filename = body.get('filename', 'evidence.jpg')
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    allowed = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp',
        'gif': 'image/gif', 'mp4': 'video/mp4', 'mov': 'video/quicktime', 'webm': 'video/webm',
    }
    if ext not in allowed:
        return {'error': 'Разрешены только фото (jpg, png, webp, gif) или видео (mp4, mov, webm)'}
    if ',' in data:
        data = data.split(',', 1)[1]
    try:
        file_bytes = base64.b64decode(data)
    except Exception:
        return {'error': 'Не удалось прочитать файл. Попробуйте выбрать файл заново'}

    if not file_bytes:
        return {'error': 'Нет данных'}
    if len(file_bytes) > MAX_EVIDENCE_SIZE:
        return {'error': f'Файл слишком большой (макс. {MAX_EVIDENCE_SIZE // (1024 * 1024)} МБ)'}

    try:
        key = f"deposit-evidence/{uuid.uuid4().hex}.{ext}"
        get_s3().put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=allowed[ext])
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return {'url': cdn_url}
    except Exception as e:
        return {'error': f'Не удалось сохранить файл в хранилище: {e}'}


def handler(event: dict, context) -> dict:
    """CRUD + загрузка фото и PDF-инструкций для инструментов, комплектующих и спецтехники. Требует X-Admin-Token."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    conn = get_conn()

    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    # Загрузка фото — отдельный маршрут
    if action == 'upload' and method == 'POST':
        conn.close()
        try:
            body = json.loads(event.get('body') or '{}')
        except Exception:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': f'Файл слишком большой (макс. {MAX_IMAGE_SIZE // (1024 * 1024)} МБ) или повреждён'})}
        result = upload_image(body)
        if 'error' in result:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps(result)}
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result)}

    # Загрузка PDF-инструкции — отдельный маршрут
    if action == 'upload_pdf' and method == 'POST':
        conn.close()
        try:
            body = json.loads(event.get('body') or '{}')
        except Exception:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': f'Файл слишком большой (макс. {MAX_PDF_SIZE // (1024 * 1024)} МБ) или повреждён'})}
        result = upload_pdf(body)
        if 'error' in result:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps(result)}
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result)}

    # Загрузка фото/видео-доказательства удержания залога — отдельный маршрут
    if action == 'upload_evidence' and method == 'POST':
        conn.close()
        try:
            body = json.loads(event.get('body') or '{}')
        except Exception:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': f'Файл слишком большой (макс. {MAX_EVIDENCE_SIZE // (1024 * 1024)} МБ) или повреждён'})}
        result = upload_evidence(body)
        if 'error' in result:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps(result)}
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result)}

    entity = params.get('entity', 'tools')
    table = entity if entity in ('tools', 'parts') else 'spec_machines'

    # Смена порядка позиций (drag & drop) — отдельный маршрут
    if action == 'reorder' and method == 'PUT':
        body = json.loads(event.get('body') or '{}')
        order = body.get('order', [])
        for i, item_id in enumerate(order):
            cur = conn.cursor()
            cur.execute(f"UPDATE {table} SET sort_order = %s WHERE id = %s", (i, item_id))
            cur.close()
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    cur = conn.cursor()

    if method == 'GET':
        if table == 'spec_machines':
            cur.execute("SELECT id, name, subtitle, image, images, specs, attachments, price, price_unit, available FROM spec_machines ORDER BY sort_order, id")
            rows = cur.fetchall()
            result = []
            for r in rows:
                imgs = resolve_images(r[3], r[4])
                result.append({'id': r[0], 'name': r[1], 'subtitle': r[2],
                                'image': imgs[0] if imgs else '', 'images': imgs,
                                'specs': r[5], 'attachments': r[6] or [],
                                'price': r[7], 'priceUnit': r[8], 'available': r[9]})
        elif table == 'parts':
            cur.execute("SELECT id, name, category, price, image, images, stock, specs, tool_type, material, active FROM parts ORDER BY sort_order, id")
            rows = cur.fetchall()
            result = []
            for r in rows:
                imgs = resolve_images(r[4], r[5])
                result.append({'id': r[0], 'name': r[1], 'category': r[2], 'price': r[3],
                                'image': imgs[0] if imgs else '', 'images': imgs,
                                'stock': r[6], 'specs': r[7], 'toolType': r[8],
                                'material': r[9] or [], 'active': r[10]})
        else:
            cur.execute("SELECT id, name, category, price, image, images, stock, total_stock, specs, tool_type, material, active, deposit, manual_pdf_url, manual_video_url FROM tools ORDER BY sort_order, id")
            rows = cur.fetchall()
            result = []
            for r in rows:
                imgs = resolve_images(r[4], r[5])
                result.append({'id': r[0], 'name': r[1], 'category': r[2], 'price': r[3],
                                'image': imgs[0] if imgs else '', 'images': imgs,
                                'stock': r[6], 'totalStock': r[7], 'specs': r[8],
                                'toolType': r[9], 'material': r[10] or [], 'active': r[11],
                                'deposit': r[12], 'manualPdfUrl': r[13], 'manualVideoUrl': r[14]})

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    body = json.loads(event.get('body') or '{}')
    images = body.get('images', [])
    # первый элемент images становится главным image
    main_image = images[0] if images else body.get('image', '')

    if method == 'POST':
        cur.execute(f"SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {table}")
        next_order = cur.fetchone()[0]
        if table == 'spec_machines':
            cur.execute(
                "INSERT INTO spec_machines (name, subtitle, image, images, specs, attachments, price, price_unit, available, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('subtitle',''), main_image, images,
                 json.dumps(body.get('specs',[]), ensure_ascii=False), body.get('attachments',[]),
                 body.get('price',0), body.get('priceUnit','час'), body.get('available', True), next_order)
            )
        elif table == 'parts':
            cur.execute(
                "INSERT INTO parts (name, category, price, image, images, stock, specs, tool_type, material, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('category',''), body.get('price',0), main_image, images,
                 body.get('stock',0), body.get('specs',''), body.get('toolType',''), body.get('material',[]), next_order)
            )
        else:
            cur.execute(
                "INSERT INTO tools (name, category, price, image, images, stock, total_stock, specs, tool_type, material, deposit, manual_pdf_url, manual_video_url, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('category',''), body.get('price',0), main_image, images,
                 body.get('stock',0), body.get('totalStock',0), body.get('specs',''), body.get('toolType',''), body.get('material',[]), body.get('deposit',0),
                 body.get('manualPdfUrl',''), body.get('manualVideoUrl',''), next_order)
            )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'id': new_id})}

    if method == 'PUT':
        item_id = body.get('id')
        if not item_id:
            cur.close(); conn.close()
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'id required'})}

        if table == 'spec_machines':
            cur.execute(
                "UPDATE spec_machines SET name=%s, subtitle=%s, image=%s, images=%s, specs=%s, attachments=%s, price=%s, price_unit=%s, available=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('subtitle'), main_image, images,
                 json.dumps(body.get('specs',[]), ensure_ascii=False), body.get('attachments',[]),
                 body.get('price'), body.get('priceUnit'), body.get('available'), item_id)
            )
        elif table == 'parts':
            cur.execute(
                "UPDATE parts SET name=%s, category=%s, price=%s, image=%s, images=%s, stock=%s, specs=%s, tool_type=%s, material=%s, active=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('category'), body.get('price'), main_image, images,
                 body.get('stock'), body.get('specs'), body.get('toolType'), body.get('material',[]),
                 body.get('active', True), item_id)
            )
        else:
            cur.execute(
                "UPDATE tools SET name=%s, category=%s, price=%s, image=%s, images=%s, stock=%s, total_stock=%s, specs=%s, tool_type=%s, material=%s, active=%s, deposit=%s, manual_pdf_url=%s, manual_video_url=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('category'), body.get('price'), main_image, images,
                 body.get('stock'), body.get('totalStock'), body.get('specs'), body.get('toolType'),
                 body.get('material',[]), body.get('active', True), body.get('deposit', 0),
                 body.get('manualPdfUrl', ''), body.get('manualVideoUrl', ''), item_id)
            )
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    if method == 'DELETE':
        item_id = params.get('id')
        if table == 'spec_machines':
            cur.execute("DELETE FROM spec_machines WHERE id=%s", (item_id,))
        elif table == 'parts':
            cur.execute("UPDATE parts SET active=false WHERE id=%s", (item_id,))
        else:
            cur.execute("UPDATE tools SET active=false WHERE id=%s", (item_id,))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    cur.close()
    conn.close()
    return {'statusCode': 405, 'headers': HEADERS, 'body': ''}