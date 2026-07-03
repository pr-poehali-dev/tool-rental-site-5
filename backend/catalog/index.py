import json
import os
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'], options=f"-c search_path={os.environ['MAIN_DB_SCHEMA']}")

def resolve_images(image: str, images: list) -> list:
    """Возвращает итоговый список фото: images[] если есть, иначе [image]."""
    imgs = [u for u in (images or []) if u and u.strip()]
    if not imgs and image:
        imgs = [image]
    return imgs

def handler(event: dict, context) -> dict:
    """Возвращает каталог: инструменты, комплектующие и спецтехника из БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, category, price, image, images, stock, total_stock, specs, tool_type, material, deposit,
               manual_pdf_url, manual_video_url
        FROM tools WHERE active = true ORDER BY category, name
    """)
    tools = []
    for row in cur.fetchall():
        imgs = resolve_images(row[4], row[5])
        tools.append({
            'id': row[0], 'name': row[1], 'category': row[2], 'price': row[3],
            'image': imgs[0] if imgs else '',
            'images': imgs,
            'stock': row[6], 'totalStock': row[7],
            'specs': row[8], 'toolType': row[9], 'material': row[10] or [],
            'deposit': row[11],
            'manualPdfUrl': row[12], 'manualVideoUrl': row[13],
        })

    cur.execute("""
        SELECT id, name, category, price, image, images, stock, specs, tool_type, material
        FROM parts WHERE active = true ORDER BY category, name
    """)
    parts = []
    for row in cur.fetchall():
        imgs = resolve_images(row[4], row[5])
        parts.append({
            'id': row[0], 'name': row[1], 'category': row[2], 'price': row[3],
            'image': imgs[0] if imgs else '',
            'images': imgs,
            'stock': row[6],
            'specs': row[7], 'toolType': row[8], 'material': row[9] or [],
        })

    cur.execute("""
        SELECT id, name, subtitle, image, images, specs, attachments, price, price_unit, available
        FROM spec_machines ORDER BY id
    """)
    machines = []
    for row in cur.fetchall():
        imgs = resolve_images(row[3], row[4])
        machines.append({
            'id': row[0], 'name': row[1], 'subtitle': row[2],
            'image': imgs[0] if imgs else '',
            'images': imgs,
            'specs': row[5], 'attachments': row[6] or [],
            'price': row[7], 'priceUnit': row[8], 'available': row[9],
        })

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps({'tools': tools, 'parts': parts, 'machines': machines}, ensure_ascii=False),
    }