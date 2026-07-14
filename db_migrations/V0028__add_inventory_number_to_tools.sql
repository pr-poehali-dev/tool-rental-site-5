-- Инвентаризационный номер для учёта инструмента
ALTER TABLE tools ADD COLUMN IF NOT EXISTS inventory_number TEXT NOT NULL DEFAULT '';