ALTER TABLE tools ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE spec_machines ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE tools SET sort_order = id WHERE sort_order = 0;
UPDATE parts SET sort_order = id WHERE sort_order = 0;
UPDATE spec_machines SET sort_order = id WHERE sort_order = 0;