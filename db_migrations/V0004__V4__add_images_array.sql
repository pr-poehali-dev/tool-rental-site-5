
-- Добавляем массив images во все три таблицы
-- tools: копируем существующий image в images[0]
ALTER TABLE tools ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
UPDATE tools SET images = ARRAY[image] WHERE image != '' AND array_length(images, 1) IS NULL;

-- parts
ALTER TABLE parts ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
UPDATE parts SET images = ARRAY[image] WHERE image != '' AND array_length(images, 1) IS NULL;

-- spec_machines
ALTER TABLE spec_machines ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}';
UPDATE spec_machines SET images = ARRAY[image] WHERE image != '' AND array_length(images, 1) IS NULL;
