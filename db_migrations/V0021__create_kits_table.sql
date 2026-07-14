-- Акционные наборы инструментов (например "Набор электромонтажника") со скидкой на аренду
CREATE TABLE IF NOT EXISTS kits (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tool_ids INTEGER[] NOT NULL DEFAULT '{}',
    discount_percent INTEGER NOT NULL DEFAULT 10,
    icon TEXT NOT NULL DEFAULT 'PackagePlus',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Набор электромонтажника: Штроборез(6), Перфоратор(7), Пассатижи(20), Ножницы кабельные(24), Стриппер(26)
INSERT INTO kits (name, description, tool_ids, discount_percent, icon, sort_order)
VALUES (
    'Набор электромонтажника',
    'Всё для электромонтажных работ: штроборез, перфоратор, пассатижи, кабельные ножницы и стриппер',
    ARRAY[6, 7, 20, 24, 26],
    10,
    'Zap',
    1
);