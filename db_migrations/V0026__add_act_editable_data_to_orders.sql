-- Редактируемые администратором данные для генерации актов (ФИО представителя, паспорт клиента, примечания)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS handover_act_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_act_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_act_data JSONB NOT NULL DEFAULT '[]';