CREATE TABLE IF NOT EXISTS client_addresses (
    id SERIAL PRIMARY KEY,
    client_phone TEXT NOT NULL,
    address TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_addresses_phone ON client_addresses(client_phone);