-- Отзывы клиентов
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    text TEXT NOT NULL,
    tool_name TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO reviews (author_name, rating, text, tool_name, sort_order) VALUES
('Дмитрий К.', 5, 'Брал перфоратор на выходные для ремонта — всё чисто, работает отлично. Залог вернули на месте в день сдачи.', 'Перфоратор DeWalt', 1),
('Анна С.', 5, 'Заказывали экскаватор с оператором для расчистки участка. Приехали вовремя, работали быстро и аккуратно.', 'Спецтехника', 2),
('Игорь М.', 4, 'Хорошая цена и большой выбор инструмента. Один раз пришлось продлить аренду — сделали это за 2 минуты по телефону.', 'Штроборез Makita', 3),
('Сергей В.', 5, 'Пользуюсь регулярно для мелких заказов, всегда всё в наличии и в исправном состоянии. Рекомендую.', 'Шуруповёрт', 4);