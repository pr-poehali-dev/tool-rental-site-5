-- Автогенерация актов приёма-передачи, возврата и допсоглашений о продлении по заявке
ALTER TABLE orders ADD COLUMN IF NOT EXISTS handover_act_url TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_act_url TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extension_act_urls TEXT[] NOT NULL DEFAULT '{}';