import json
import os
import datetime
import psycopg2

HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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


def get_available_years(cur):
    cur.execute("""
        SELECT DISTINCT year FROM (
            SELECT EXTRACT(YEAR FROM created_at)::int AS year FROM site_visits
            UNION
            SELECT EXTRACT(YEAR FROM created_at)::int AS year FROM orders
        ) t ORDER BY year DESC
    """)
    years = [r[0] for r in cur.fetchall()]
    if not years:
        years = [datetime.date.today().year]
    return years


def handler(event: dict, context) -> dict:
    """Аналитика посещаемости сайта: POST — публично фиксирует визит анонимного посетителя
    (sessionId, path). GET — для администратора (требует X-Admin-Token) отдаёт сводную
    статистику: число посещений, уникальных посетителей, заказов и конверсию визит → заказ,
    с фильтрацией по году и/или месяцу (?year=YYYY&month=MM) и разбивкой по дням/месяцам.
    DELETE — сбрасывает накопленную статистику посещений (очищает site_visits)."""
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

    if method == 'DELETE':
        cur = conn.cursor()
        cur.execute("TRUNCATE TABLE site_visits")
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'ok': True})}

    params = event.get('queryStringParameters') or {}
    year = params.get('year')
    month = params.get('month')
    year = int(year) if year and year.isdigit() else None
    month = int(month) if month and month.isdigit() and 1 <= int(month) <= 12 else None

    cur = conn.cursor()
    available_years = get_available_years(cur)

    if year and month:
        range_start = datetime.date(year, month, 1)
        range_end = datetime.date(year + 1, 1, 1) if month == 12 else datetime.date(year, month + 1, 1)
        granularity = 'day'
    elif year:
        range_start = datetime.date(year, 1, 1)
        range_end = datetime.date(year + 1, 1, 1)
        granularity = 'month'
    else:
        range_start = None
        range_end = None
        granularity = 'day'

    if range_start:
        cur.execute(
            "SELECT COUNT(*), COUNT(DISTINCT session_id) FROM site_visits WHERE created_at >= %s AND created_at < %s",
            (range_start, range_end)
        )
        total_visits, unique_visitors = cur.fetchone()
        cur.execute(
            "SELECT COUNT(*) FROM orders WHERE created_at >= %s AND created_at < %s",
            (range_start, range_end)
        )
        total_orders = cur.fetchone()[0]
    else:
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT session_id) FROM site_visits")
        total_visits, unique_visitors = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM orders")
        total_orders = cur.fetchone()[0]

    conversion_rate = round((total_orders / unique_visitors * 100), 2) if unique_visitors else 0.0

    if year and month:
        cur.execute("""
            SELECT day::date, COALESCE(v.visits, 0), COALESCE(v.uniques, 0), COALESCE(o.orders_count, 0)
            FROM generate_series(%s::date, (%s::date - INTERVAL '1 day'), INTERVAL '1 day') AS day
            LEFT JOIN (
                SELECT created_at::date AS d, COUNT(*) AS visits, COUNT(DISTINCT session_id) AS uniques
                FROM site_visits WHERE created_at >= %s AND created_at < %s GROUP BY created_at::date
            ) v ON v.d = day::date
            LEFT JOIN (
                SELECT created_at::date AS d, COUNT(*) AS orders_count
                FROM orders WHERE created_at >= %s AND created_at < %s GROUP BY created_at::date
            ) o ON o.d = day::date
            ORDER BY day
        """, (range_start, range_end, range_start, range_end, range_start, range_end))
    elif year:
        cur.execute("""
            SELECT month_start::date, COALESCE(v.visits, 0), COALESCE(v.uniques, 0), COALESCE(o.orders_count, 0)
            FROM generate_series(%s::date, (%s::date - INTERVAL '1 month'), INTERVAL '1 month') AS month_start
            LEFT JOIN (
                SELECT date_trunc('month', created_at)::date AS d, COUNT(*) AS visits, COUNT(DISTINCT session_id) AS uniques
                FROM site_visits WHERE created_at >= %s AND created_at < %s GROUP BY 1
            ) v ON v.d = month_start::date
            LEFT JOIN (
                SELECT date_trunc('month', created_at)::date AS d, COUNT(*) AS orders_count
                FROM orders WHERE created_at >= %s AND created_at < %s GROUP BY 1
            ) o ON o.d = month_start::date
            ORDER BY month_start
        """, (range_start, range_end, range_start, range_end, range_start, range_end))
    else:
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
            'granularity': granularity,
            'availableYears': available_years,
            'filter': {'year': year, 'month': month},
        }, ensure_ascii=False),
    }
