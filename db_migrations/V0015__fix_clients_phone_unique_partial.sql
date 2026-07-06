ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone_unique ON clients (phone) WHERE phone <> '';