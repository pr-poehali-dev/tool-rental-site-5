-- Возврат залога при завершении аренды: полный/частичный, с доказательствами при удержании

ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_resolution JSONB NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_refund_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_refund_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deposit_refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_op_key TEXT NOT NULL DEFAULT '';