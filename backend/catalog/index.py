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

def handler(event: dict, context) -> dict:
    """Возвращает каталог: инструменты, комплектующие и спецтехника из БД."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, category, price, image, stock, total_stock, specs, tool_type, material
        FROM tools WHERE active = true ORDER BY category, name
    """)
    tools = []
    for row in cur.fetchall():
        tools.append({
            'id': row[0], 'name': row[1], 'category': row[2], 'price': row[3],
            'image': row[4], 'stock': row[5], 'totalStock': row[6],
            'specs': row[7], 'toolType': row[8], 'material': row[9] or [],
        })

    cur.execute("""
        SELECT id, name, category, price, image, stock, specs, tool_type, material
        FROM parts WHERE active = true ORDER BY category, name
    """)
    parts = []
    for row in cur.fetchall():
        parts.append({
            'id': row[0], 'name': row[1], 'category': row[2], 'price': row[3],
            'image': row[4], 'stock': row[5],
            'specs': row[6], 'toolType': row[7], 'material': row[8] or [],
        })

    cur.execute("""
        SELECT id, name, subtitle, image, specs, attachments, price, price_unit, available
        FROM spec_machines ORDER BY id
    """)
    machines = []
    for row in cur.fetchall():
        machines.append({
            'id': row[0], 'name': row[1], 'subtitle': row[2], 'image': row[3],
            'specs': row[4], 'attachments': row[5] or [],
            'price': row[6], 'priceUnit': row[7], 'available': row[8],
        })

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps({'tools': tools, 'parts': parts, 'machines': machines}, ensure_ascii=False),
    }
