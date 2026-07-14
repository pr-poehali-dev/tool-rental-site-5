-- Исправляем некорректное значение иконки (лишний перенос строки ломал отображение)
UPDATE kits SET icon = 'Flame' WHERE id = 2 AND icon LIKE 'Spark%';