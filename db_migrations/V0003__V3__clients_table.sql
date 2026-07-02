
-- Таблица клиентов (агрегируется по номеру телефона)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Заполняем из существующих заявок (по уникальному телефону)
INSERT INTO clients (phone, full_name)
SELECT DISTINCT ON (phone) phone, name
FROM orders
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (phone) DO NOTHING;
