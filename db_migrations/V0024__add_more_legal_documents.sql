-- Добавляем акт приёма-передачи, акт приёма-передачи (возврат) и допсоглашение о продлении аренды,
-- размещаем их сразу после договора аренды, согласия сдвигаем ниже по порядку

UPDATE legal_documents SET sort_order = sort_order + 3 WHERE sort_order > 1;

INSERT INTO legal_documents (title, file_url, file_type, sort_order) VALUES
('Акт приёма-передачи инструмента', '/legal/akt-priema-peredachi-instrumenta.pdf', 'pdf', 2),
('Акт приёма-передачи инструмента (возврат)', '/legal/akt-priema-peredachi-instrumenta-vozvrat.pdf', 'pdf', 3),
('Дополнительное соглашение о продлении аренды', '/legal/dopsoglashenie-o-prodlenii-arendy.pdf', 'pdf', 4);