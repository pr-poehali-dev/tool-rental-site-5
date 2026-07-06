ALTER TABLE client_addresses ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
UPDATE client_addresses ca SET client_id = c.id FROM clients c WHERE ca.client_phone = c.phone AND ca.client_id IS NULL AND c.phone <> '';
CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON client_addresses(client_id);