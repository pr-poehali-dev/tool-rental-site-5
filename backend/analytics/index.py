import json
import os
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    """Аналитика посещаемости сайта: POST — публично фиксирует визит анонимного посетителя
    (sessionId, path). GET — для администратора (требует X-Admin-Token) отдаёт сводную
    статистику: число посещений, уникальных посетителей, заказов и конверсию визит → заказ,
    а также разбивку по дням за последние 30 дней."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}

    method = event.get('httpMethod', 'GET')

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        session_id = (body.get('sessionId') or '').strip()[:64]
        path = (body.get('path') or '')[:255]
        if not session_id:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'sessionId required'})}
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("INSERT INTO site_visits (session_id, path) VALUES (%s, %s)", (session_id, path))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 201, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    token = (event.get('headers') or {}).get('X-Admin-Token', '')
    conn = get_conn()
    if not check_auth(conn, token):
        conn.close()
        return {'statusCode': 401, 'headers': HEADERS, 'body': json.dumps({'error': 'Не авторизован'})}

    cur = conn.cursor()

    cur.execute("SELECT COUNT(*), COUNT(DISTINCT session_id) FROM site_visits")
    total_visits, unique_visitors = cur.fetchone()

    cur.execute("SELECT COUNT(*) FROM orders")
    total_orders = cur.fetchone()[0]

    conversion_rate = round((total_orders / unique_visitors * 100), 2) if unique_visitors else 0.0

    cur.execute("""
        SELECT day::date, COALESCE(v.visits, 0), COALESCE(v.uniques, 0), COALESCE(o.orders_count, 0)
        FROM generate_series(CURRENT_DATE - INTERVAL '29 day', CURRENT_DATE, INTERVAL '1 day') AS day
        LEFT JOIN (
            SELECT created_at::date AS d, COUNT(*) AS visits, COUNT(DISTINCT session_id) AS uniques
            FROM site_visits GROUP BY created_at::date
        ) v ON v.d = day::date
        LEFT JOIN (
            SELECT created_at::date AS d, COUNT(*) AS orders_count
            FROM orders GROUP BY created_at::date
        ) o ON o.d = day::date
        ORDER BY day
    """)
    daily = [
        {'date': r[0].isoformat(), 'visits': r[1], 'uniqueVisitors': r[2], 'orders': r[3]}
        for r in cur.fetchall()
    ]

    cur.close()
    conn.close()

    return {
        'statusCode': 200,
        'headers': HEADERS,
        'body': json.dumps({
            'totalVisits': total_visits,
            'uniqueVisitors': unique_visitors,
            'totalOrders': total_orders,
            'conversionRate': conversion_rate,
            'daily': daily,
        }, ensure_ascii=False),
    }
