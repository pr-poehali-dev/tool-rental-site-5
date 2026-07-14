import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { getCatalog } from '@/api';

interface LegalDocument {
  id: number;
  title: string;
  fileUrl: string;
  fileType: string;
}

export default function RentalTerms() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCatalog().then((data) => {
      setDocuments(data.legalDocuments || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg">Строй_Rent</span>
          </button>
          <button onClick={() => navigate('/')} className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={15} /> На главную
          </button>
        </div>
      </header>

      <section className="py-20">
        <div className="container">
          <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Условия аренды</div>
          <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-12">Всё просто</h1>

          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            {[{ n: '01', t: 'Выберите технику', d: 'Добавьте инструмент в корзину и укажите срок аренды. Стоимость рассчитается автоматически.' }, { n: '02', t: 'Оформите бронь', d: 'Оставьте заявку — менеджер свяжется, подтвердит наличие и согласует доставку.' }, { n: '03', t: 'Получите инструмент', d: 'Внесите залог, подпишите договор и забирайте технику или ждите доставку.' }].map((s) => (
              <div key={s.n} className="bg-card p-8">
                <div className="font-display font-bold text-6xl text-accent mb-6">{s.n}</div>
                <h3 className="font-display font-semibold text-2xl mb-3">{s.t}</h3>
                <p className="font-body text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-8 font-body text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Icon name="Check" size={16} className="text-accent" /> Паспорт РФ</div>
            <div className="flex items-center gap-2"><Icon name="Check" size={16} className="text-accent" /> Залог возвращается</div>
            <div className="flex items-center gap-2"><Icon name="Check" size={16} className="text-accent" /> Продление в любой момент</div>
          </div>
          <p className="mt-6 font-body text-sm text-muted-foreground max-w-2xl">
            Залог за инструмент фиксирован для каждой позиции и указан в карточке товара под ценой аренды.
            Сумма вносится при получении и полностью возвращается при сдаче инструмента в исправном состоянии.
          </p>
          <p className="mt-3 font-body text-sm text-muted-foreground max-w-2xl">
            При аренде инструмента номинальной стоимостью выше 10 000 ₽ для оформления заказа потребуется паспорт гражданина РФ.
          </p>
          <p className="mt-3 font-body text-sm text-muted-foreground max-w-2xl"></p>

          {/* ГАРАНТИИ */}
          <div className="mt-16">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Наши гарантии</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-8">Работаем честно</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
              {[
                { icon: 'RefreshCw', t: 'Замена за 24 часа', d: 'Если инструмент вышел из строя не по вашей вине — заменим в течение суток' },
                { icon: 'CalendarCheck', t: 'Оплата по факту дней', d: 'Платите ровно за то время, что фактически пользовались техникой' },
                { icon: 'Infinity', t: 'Без ограничения срока', d: 'Максимального срока аренды нет — продлевайте, пока нужно' },
                { icon: 'Wrench', t: 'Техника проверена', d: 'Каждая единица проходит проверку и обслуживание перед выдачей' },
              ].map((g, i) => (
                <div key={i} className="bg-card p-6">
                  <Icon name={g.icon} size={28} className="text-accent mb-3" />
                  <div className="font-display font-semibold text-base mb-1.5">{g.t}</div>
                  <div className="font-body text-sm text-muted-foreground">{g.d}</div>
                </div>
              ))}
            </div>
          </div>

          {/* СКИДКИ ЗА ОБЪЁМ */}
          <div className="mt-16">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Экономьте больше</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-8">Скидки за объём аренды</h2>
            <div className="grid sm:grid-cols-2 gap-px bg-border border border-border mb-6">
              <div className="bg-card p-6">
                <Icon name="Package" size={26} className="text-accent mb-3" />
                <div className="font-display font-semibold text-lg mb-1.5">От 3 инструментов</div>
                <div className="font-body text-sm text-muted-foreground">При одновременной аренде от 3 позиций — скидка 5% на всю бронь</div>
              </div>
              <div className="bg-card p-6">
                <Icon name="CalendarRange" size={26} className="text-accent mb-3" />
                <div className="font-display font-semibold text-lg mb-1.5">От 7 дней аренды</div>
                <div className="font-body text-sm text-muted-foreground">При аренде от недели и дольше — скидка 10% на каждый день сверх недели</div>
              </div>
            </div>
            <p className="font-body text-sm text-muted-foreground max-w-2xl mb-6">
              Скидка за объём применяется автоматически менеджером при подтверждении заявки. А для типовых видов работ
              собраны готовые наборы инструментов с фиксированной скидкой — смотрите блок «Готовые наборы» в каталоге.
            </p>
            <Button variant="outline" onClick={() => navigate('/')} className="rounded-none h-11 px-6 font-body gap-2">
              <Icon name="Sparkles" size={16} /> Смотреть готовые наборы
            </Button>
          </div>

          {/* ДОКУМЕНТЫ */}
          <div className="mt-16">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Документы</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-8">Образцы документов</h2>
            {loading ? (
              <div className="flex items-center gap-3 text-muted-foreground font-body">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
              </div>
            ) : documents.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">Документы пока не добавлены.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
                {documents.map((doc) => (
                  <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                    className="bg-card p-6 flex items-center gap-4 hover:bg-secondary transition-colors group">
                    <div className="w-12 h-12 bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon name={doc.fileType === 'pdf' ? 'FileText' : 'Image'} size={22} className="text-accent" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base leading-tight group-hover:text-accent transition-colors">{doc.title}</div>
                      <div className="font-body text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Icon name="Download" size={12} /> Скачать {doc.fileType === 'pdf' ? 'PDF' : 'изображение'}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
            <p className="font-body text-xs text-muted-foreground mt-4 max-w-2xl">
              Это типовые образцы для ознакомления. Финальный экземпляр договора и согласий подписывается при получении инструмента.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-foreground text-background py-12">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl">Строй_Rent</span>
          </div>
          <div className="font-body text-sm text-background/50">
            © 2026 Строй_Rent. Аренда строительного инструмента и спецтехники.
          </div>
        </div>
      </footer>
    </div>
  );
}