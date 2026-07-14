-- Документы в разделе "Условия аренды": договор аренды, согласия на обработку/передачу персональных данных и другие файлы, которые администратор может добавлять/удалять
CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO legal_documents (title, file_url, file_type, sort_order) VALUES
('Образец договора аренды инструмента', '/legal/dogovor-arendy-instrumenta.pdf', 'pdf', 1),
('Согласие на обработку персональных данных', '/legal/soglasie-na-obrabotku-personalnyh-dannyh.pdf', 'pdf', 2),
('Согласие на передачу данных третьим лицам', '/legal/soglasie-na-peredachu-dannyh-tretim-litsam.pdf', 'pdf', 3);