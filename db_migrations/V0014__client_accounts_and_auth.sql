-- Личный кабинет клиента: регистрация/авторизация + связь заказов с профилем

ALTER TABLE clients ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password_salt TEXT NOT NULL DEFAULT '';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_unique ON clients (email) WHERE email <> '';

CREATE TABLE IF NOT EXISTS client_sessions (
    id TEXT PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS client_verifications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    contact TEXT NOT NULL,
    channel TEXT NOT NULL,
    code TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_verifications_client ON client_verifications(client_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);