import json
import os
import psycopg2
from datetime import datetime, timezone

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

def handler(event: dict, context) -> dict:
    """CRUD для инструментов (tools) и комплектующих (parts). Требует X-Admin-Token."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    conn = get_conn()

    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters') or {}
    entity = params.get('entity', 'tools')  # tools | parts | machines
    table = entity if entity in ('tools', 'parts') else 'spec_machines'

    cur = conn.cursor()

    if method == 'GET':
        if table == 'spec_machines':
            cur.execute("SELECT id, name, subtitle, image, specs, attachments, price, price_unit, available FROM spec_machines ORDER BY id")
            rows = cur.fetchall()
            result = [{'id': r[0], 'name': r[1], 'subtitle': r[2], 'image': r[3], 'specs': r[4],
                       'attachments': r[5] or [], 'price': r[6], 'priceUnit': r[7], 'available': r[8]} for r in rows]
        elif table == 'parts':
            cur.execute("SELECT id, name, category, price, image, stock, specs, tool_type, material, active FROM parts ORDER BY category, name")
            rows = cur.fetchall()
            result = [{'id': r[0], 'name': r[1], 'category': r[2], 'price': r[3], 'image': r[4],
                       'stock': r[5], 'specs': r[6], 'toolType': r[7], 'material': r[8] or [], 'active': r[9]} for r in rows]
        else:
            cur.execute("SELECT id, name, category, price, image, stock, total_stock, specs, tool_type, material, active FROM tools ORDER BY category, name")
            rows = cur.fetchall()
            result = [{'id': r[0], 'name': r[1], 'category': r[2], 'price': r[3], 'image': r[4],
                       'stock': r[5], 'totalStock': r[6], 'specs': r[7], 'toolType': r[8], 'material': r[9] or [], 'active': r[10]} for r in rows]

        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps(result, ensure_ascii=False)}

    body = json.loads(event.get('body') or '{}')

    if method == 'POST':
        if table == 'spec_machines':
            cur.execute(
                "INSERT INTO spec_machines (name, subtitle, image, specs, attachments, price, price_unit, available) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('subtitle',''), body.get('image',''),
                 json.dumps(body.get('specs',[]), ensure_ascii=False), body.get('attachments',[]),
                 body.get('price',0), body.get('priceUnit','час'), body.get('available', True))
            )
        elif table == 'parts':
            cur.execute(
                "INSERT INTO parts (name, category, price, image, stock, specs, tool_type, material) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('category',''), body.get('price',0), body.get('image',''),
                 body.get('stock',0), body.get('specs',''), body.get('toolType',''), body.get('material',[]))
            )
        else:
            cur.execute(
                "INSERT INTO tools (name, category, price, image, stock, total_stock, specs, tool_type, material) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (body.get('name',''), body.get('category',''), body.get('price',0), body.get('image',''),
                 body.get('stock',0), body.get('totalStock',0), body.get('specs',''), body.get('toolType',''), body.get('material',[]))
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
                "UPDATE spec_machines SET name=%s, subtitle=%s, image=%s, specs=%s, attachments=%s, price=%s, price_unit=%s, available=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('subtitle'), body.get('image'),
                 json.dumps(body.get('specs',[]), ensure_ascii=False), body.get('attachments',[]),
                 body.get('price'), body.get('priceUnit'), body.get('available'), item_id)
            )
        elif table == 'parts':
            cur.execute(
                "UPDATE parts SET name=%s, category=%s, price=%s, image=%s, stock=%s, specs=%s, tool_type=%s, material=%s, active=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('category'), body.get('price'), body.get('image'),
                 body.get('stock'), body.get('specs'), body.get('toolType'), body.get('material',[]), body.get('active', True), item_id)
            )
        else:
            cur.execute(
                "UPDATE tools SET name=%s, category=%s, price=%s, image=%s, stock=%s, total_stock=%s, specs=%s, tool_type=%s, material=%s, active=%s, updated_at=NOW() WHERE id=%s",
                (body.get('name'), body.get('category'), body.get('price'), body.get('image'),
                 body.get('stock'), body.get('totalStock'), body.get('specs'), body.get('toolType'),
                 body.get('material',[]), body.get('active', True), item_id)
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
