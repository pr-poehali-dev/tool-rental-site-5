CREATE TABLE IF NOT EXISTS site_visits (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_session ON site_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits(created_at);
