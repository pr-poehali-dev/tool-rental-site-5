import { useState, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Tool {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  stock: number;
  totalStock: number;
}

interface SpecMachine {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  specs: { label: string; value: string }[];
  attachments?: string[];
  price: number;
  priceUnit: string;
  available: boolean;
}

interface CartItem {
  tool: Tool;
  days: number;
  qty: number;
}

const BC = 'https://baucenter.ru/upload/pictures';
const CDN = 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files';

const TOOLS: Tool[] = [
  // Электроинструмент
  { id: 1,  name: 'Шуруповёрт Hanskonner HCD18165BLI ударный 18В',     category: 'Электроинструмент', price: 450, image: `${BC}/70/706000271-0.webp?1739199618`,  stock: 3, totalStock: 5 },
  { id: 2,  name: 'Точильно-шлифовальный станок P.I.T. PBG75-C 160Вт', category: 'Электроинструмент', price: 300, image: `${BC}/70/706003924-0.webp?1659047997`,  stock: 1, totalStock: 2 },
  { id: 3,  name: 'Шуруповёрт Hanskonner HCD2065BLC 18В 2×2.0Ач',      category: 'Электроинструмент', price: 420, image: `${BC}/70/706000452-0.webp?1739199623`,  stock: 2, totalStock: 4 },
  { id: 4,  name: 'Аккумуляторная отвёртка Sturm CD3404U2 3.6В',        category: 'Электроинструмент', price: 200, image: `${BC}/70/706005089-0.webp?1739201453`,  stock: 5, totalStock: 8 },
  { id: 5,  name: 'УШМ Hanskonner HAG24230ECH 2400Вт 230мм',            category: 'Электроинструмент', price: 550, image: `${BC}/70/706004809-0.webp`,              stock: 2, totalStock: 3 },
  { id: 6,  name: 'Штроборез Makita SG1251J 1400Вт 125мм',              category: 'Электроинструмент', price: 900, image: `${CDN}/180c91ca-28ee-411c-9817-308ba5035e9b.jpg`, stock: 1, totalStock: 2 },
  { id: 7,  name: 'Перфоратор DeWalt D25134K SDS-Plus 800Вт',           category: 'Электроинструмент', price: 700, image: `${CDN}/1b7470ec-8508-4340-ba69-798bb25f75d1.jpg`, stock: 2, totalStock: 4 },
  { id: 8,  name: 'УШМ DeWalt DWE4057 800Вт 125мм',                     category: 'Электроинструмент', price: 400, image: `${CDN}/5637a7f2-496e-4648-94cc-fe68d32513c1.jpg`, stock: 3, totalStock: 5 },
  { id: 9,  name: 'Лобзик DeWalt DWE349 650Вт',                         category: 'Электроинструмент', price: 500, image: `${CDN}/630db858-3f97-4e31-ac47-7fa5f845ae3e.jpg`, stock: 2, totalStock: 3 },
  { id: 10, name: 'Миксер строительный INGCO MX214008 1400Вт M14',       category: 'Электроинструмент', price: 350, image: `${CDN}/c9c0905d-0d99-431e-a0eb-a0fa6ded713a.jpg`, stock: 3, totalStock: 6 },
  { id: 11, name: 'Тепловая пушка Ballu BHP-P/5 5кВт',                  category: 'Электроинструмент', price: 600, image: `${CDN}/809aa387-cb89-4da4-bee4-b9f4db2ea105.jpg`, stock: 2, totalStock: 3 },
  { id: 12, name: 'Технический фен Metabo H 16-500',                    category: 'Электроинструмент', price: 350, image: `${CDN}/48548722-c1ce-4809-b96c-f45821b82418.jpg`, stock: 2, totalStock: 4 },
  { id: 13, name: 'Пила торцовочная Practyl J1GZP1210',                  category: 'Электроинструмент', price: 750, image: `${CDN}/671aff69-e46a-40af-b90b-c680e32f0510.jpg`, stock: 1, totalStock: 2 },
  { id: 14, name: 'Винтоверт ProfiPower MKDTD-18V 18В 2×4.0Ач',         category: 'Электроинструмент', price: 480, image: `${CDN}/80a97bf7-3e92-476f-83a7-e46241d0f32d.jpg`, stock: 2, totalStock: 4 },

  // Сварка
  { id: 15, name: 'Сварочный инвертор Resanta САИ-250 10–250А',         category: 'Сварка', price: 800, image: `${CDN}/3eaea528-426d-4b48-9c1f-0b5140dff3db.jpg`, stock: 2, totalStock: 3 },
  { id: 16, name: 'Сварочный инвертор Resanta САИ-220Д 20–220А',        category: 'Сварка', price: 700, image: `${CDN}/3eaea528-426d-4b48-9c1f-0b5140dff3db.jpg`, stock: 1, totalStock: 2 },

  // Ручной инструмент
  { id: 17, name: 'Кувалда кованая 4кг деревянная рукоятка',            category: 'Ручной инструмент', price: 80,  image: `${CDN}/78667578-4a52-468d-a204-69179cc5c7d0.jpg`, stock: 5, totalStock: 8 },
  { id: 18, name: 'Бокорезы Matrix Insulated 180мм диэлектрические',    category: 'Ручной инструмент', price: 120, image: `${BC}/70/705004398-0.webp?1659047080`,  stock: 6, totalStock: 10 },
  { id: 19, name: 'Пассатижи силовые FIT 200мм шарнирные',              category: 'Ручной инструмент', price: 100, image: `${BC}/70/705001632-0.webp`,              stock: 4, totalStock: 8 },
  { id: 20, name: 'Струбцина быстрозажимная Dorn PRO 300мм',            category: 'Ручной инструмент', price: 90,  image: `${BC}/70/705005050-0.webp?1726495219`,  stock: 3, totalStock: 6 },
  { id: 21, name: 'Угольник магнитный FoxWeld FIX-5Pro',                category: 'Ручной инструмент', price: 80,  image: `${BC}/70/706003305-0.webp`,              stock: 4, totalStock: 6 },

  // Электромонтаж
  { id: 22, name: 'Ножницы кабельные EKF НКИ-12 Master 1000В',          category: 'Электромонтаж', price: 150, image: `${BC}/87/878002935-0.webp?1665221520`,  stock: 3, totalStock: 5 },
  { id: 23, name: 'Нож монтёрский Rexant с пяткой',                     category: 'Электромонтаж', price: 70,  image: `${BC}/87/878003109-0.webp`,              stock: 7, totalStock: 10 },
  { id: 24, name: 'Стриппер-обжимник КВТ WS-11 до 10мм²',              category: 'Электромонтаж', price: 180, image: `${BC}/87/878001251-0.webp?1745922638`,  stock: 2, totalStock: 4 },
  { id: 25, name: 'Паяльник Rexant ЭПСН 40Вт деревянная рукоятка',     category: 'Электромонтаж', price: 110, image: `${BC}/76/760000068-0.webp?1717065014`,  stock: 5, totalStock: 8 },

  // Оснастка
  { id: 26, name: 'Коронка по бетону Dorn SDS-Plus 120мм',              category: 'Оснастка', price: 160, image: `${BC}/70/708006329-0.webp?1739284246`, stock: 4, totalStock: 7 },
  { id: 27, name: 'Алмазная чашка Matrix Turbo 180×22.2мм',             category: 'Оснастка', price: 140, image: `${BC}/70/708004080-0.webp`,            stock: 3, totalStock: 5 },
  { id: 28, name: 'Алмазная чашка Matrix 125×22.2мм двухрядная',        category: 'Оснастка', price: 120, image: `${BC}/70/708003748-0.webp`,            stock: 5, totalStock: 8 },

  // Сад и техника
  { id: 29, name: 'Триммер бензиновый Dorn PRO TT-S50 1.7 л.с.',        category: 'Сад и техника', price: 800, image: `${BC}/95/950001920-0.webp?1751961638`, stock: 1, totalStock: 2 },

  // Экипировка
  { id: 30, name: 'Щиток лицевой Denzel НС-01 с сеткой',               category: 'Экипировка', price: 90,  image: `${BC}/71/713000041-0.webp`,             stock: 6, totalStock: 10 },
  { id: 31, name: 'Крепление для нивелира Condtrol Wall Mount PRO',     category: 'Экипировка', price: 130, image: `${BC}/71/710000758-0.webp?1720512827`, stock: 2, totalStock: 4 },
  { id: 32, name: 'Фонарь налобный Kodak 5Вт 600Лм IP65 1500мАч',       category: 'Экипировка', price: 100, image: `${BC}/88/888000030-0.webp`,             stock: 4, totalStock: 7 },
];

const CATEGORIES = ['Все', 'Электроинструмент', 'Сварка', 'Ручной инструмент', 'Электромонтаж', 'Оснастка', 'Сад и техника', 'Экипировка'];

const SPEC_MACHINES: SpecMachine[] = [
  {
    id: 101,
    name: 'Грузовик с КМУ',
    subtitle: 'Кран-манипулятор до 5 тонн',
    image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/9ca341c6-ea83-4a77-b45d-9002feff10bd.jpg',
    specs: [
      { label: 'Грузоподъёмность', value: 'до 5 т' },
      { label: 'Вылет стрелы', value: 'до 8 м' },
      { label: 'Тип', value: 'КМУ + кузов' },
      { label: 'Водитель', value: 'включён' },
    ],
    price: 3500,
    priceUnit: 'час',
    available: true,
  },
  {
    id: 102,
    name: 'Грузовик-тент',
    subtitle: 'Борт и закрытый тент, до 3 тонн',
    image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/684e1431-15f3-420a-beb0-0f097302c8ed.jpg',
    specs: [
      { label: 'Грузоподъёмность', value: 'до 3 т' },
      { label: 'Кузов', value: 'борт + тент' },
      { label: 'Объём', value: 'до 20 м³' },
      { label: 'Водитель', value: 'включён' },
    ],
    price: 2200,
    priceUnit: 'час',
    available: true,
  },
  {
    id: 103,
    name: 'Мини-экскаватор Rippa R15',
    subtitle: 'С комплектом навесного оборудования',
    image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/f451c346-9b8c-40c1-91fc-583d42eddbec.jpg',
    specs: [
      { label: 'Марка', value: 'Rippa R15' },
      { label: 'Масса', value: '1 500 кг' },
      { label: 'Глубина копания', value: 'до 2,5 м' },
      { label: 'Оператор', value: 'включён' },
    ],
    attachments: ['Планировочный ковш', 'Траншейный ковш', 'Гидравлический ямобур'],
    price: 4500,
    priceUnit: 'смена',
    available: true,
  },
];

const NAV = [
  { label: 'Главная', id: 'hero' },
  { label: 'Инструмент', id: 'catalog' },
  { label: 'Спецтехника', id: 'spectech' },
  { label: 'О компании', id: 'about' },
  { label: 'Условия аренды', id: 'terms' },
  { label: 'Контакты', id: 'contacts' },
];

const Index = () => {
  const [activeCat, setActiveCat] = useState('Все');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [excavatorAttachments, setExcavatorAttachments] = useState<string[]>([]);

  const filtered = useMemo(
    () => (activeCat === 'Все' ? TOOLS : TOOLS.filter((t) => t.category === activeCat)),
    [activeCat]
  );

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const total = cart.reduce((sum, i) => sum + i.tool.price * i.days * i.qty, 0);

  const addToCart = (tool: Tool) => {
    setCart((prev) => (prev.some((i) => i.tool.id === tool.id) ? prev : [...prev, { tool, days: 1, qty: 1 }]));
    setCartOpen(true);
  };

  const setDays = (id: number, days: number) =>
    setCart((prev) => prev.map((i) => (i.tool.id === id ? { ...i, days: Math.max(1, days) } : i)));

  const setQty = (id: number, qty: number) =>
    setCart((prev) => prev.map((i) => (i.tool.id === id ? { ...i, qty: Math.min(Math.max(1, qty), i.tool.stock) } : i)));

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.tool.id !== id));

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="fixed top-0 inset-x-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-20">
          <button onClick={() => scrollTo('hero')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">Строй_Rent</span>
          </button>
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => scrollTo(n.id)}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {n.label}
              </button>
            ))}
          </nav>
          <Button
            variant="ghost"
            onClick={() => setCartOpen(true)}
            className="relative gap-2 font-body"
          >
            <Icon name="ShoppingCart" size={20} />
            <span className="hidden sm:inline">Корзина</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center animate-scale-in">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section id="hero" className="pt-20">
        <div className="container py-24 md:py-36">
          <div className="max-w-4xl animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 border border-border rounded-full text-xs uppercase tracking-widest text-muted-foreground">
              <span className="w-2 h-2 bg-accent rounded-full" />
              Аренда посуточно
            </div>
            <h1 className="font-display font-bold leading-[0.95] text-6xl md:text-8xl tracking-tight mb-8">
              ИНСТРУМЕНТ
              <br />
              <span className="text-accent">В АРЕНДУ</span>
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mb-10">
              Профессиональное строительное оборудование для любых задач. Честные цены, быстрое бронирование, доставка по городу.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => scrollTo('catalog')}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-body rounded-none h-14 px-8 text-base"
              >
                Смотреть каталог
                <Icon name="ArrowRight" size={18} className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollTo('terms')}
                className="rounded-none h-14 px-8 text-base font-body"
              >
                Условия аренды
              </Button>
            </div>
          </div>
        </div>
        <div className="border-y border-border">
          <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[
              { n: '200+', l: 'единиц техники' },
              { n: '24/7', l: 'поддержка' },
              { n: '1 час', l: 'на доставку' },
              { n: '5 лет', l: 'на рынке' },
            ].map((s, i) => (
              <div key={i} className="py-8 px-4 md:px-8">
                <div className="font-display font-semibold text-4xl">{s.n}</div>
                <div className="font-body text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG */}
      <section id="catalog" className="py-24">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
            <div>
              <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Каталог</div>
              <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight">Выберите инструмент</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`font-body text-sm px-5 py-2.5 border transition-colors ${
                    activeCat === c
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
            {filtered.map((tool) => (
              <div key={tool.id} className="group bg-card p-6 flex flex-col">
                <div className="aspect-square bg-secondary mb-6 overflow-hidden">
                  <img
                    src={tool.image}
                    alt={tool.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  {tool.category}
                </div>
                <h3 className="font-display font-semibold text-2xl mb-4">{tool.name}</h3>
                <div className="mt-auto flex items-end justify-between">
                  <div>
                    <span className="font-display font-bold text-3xl">{tool.price} ₽</span>
                    <span className="font-body text-sm text-muted-foreground"> / сутки</span>
                  </div>
                  <Button
                    onClick={() => addToCart(tool)}
                    size="icon"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 w-12"
                  >
                    <Icon name="Plus" size={20} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPECTECH */}
      <section id="spectech" className="py-24 bg-secondary">
        <div className="container">
          <div className="mb-12">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Спецтехника</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-4">Аренда спецтехники</h2>
            <p className="font-body text-muted-foreground text-lg max-w-xl">Работаем с экипажем. Оператор или водитель включён в стоимость.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-px bg-border border border-border">
            {SPEC_MACHINES.map((m) => (
              <div key={m.id} className="bg-card flex flex-col">
                {/* Фото */}
                <div className="aspect-[4/3] overflow-hidden bg-secondary">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                </div>

                <div className="p-6 flex flex-col flex-1">
                  {/* Заголовок */}
                  <div className="mb-4">
                    <h3 className="font-display font-bold text-2xl leading-tight">{m.name}</h3>
                    <p className="font-body text-sm text-muted-foreground mt-1">{m.subtitle}</p>
                  </div>

                  {/* Характеристики */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    {m.specs.map((s, i) => (
                      <div key={i} className="border-b border-border pb-2">
                        <div className="font-body text-xs text-muted-foreground">{s.label}</div>
                        <div className="font-display font-semibold text-sm">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Оснастка (если есть) */}
                  {m.attachments && (
                    <div className="mb-4">
                      <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">
                        Навесное оборудование — выберите нужное
                      </div>
                      <div className="flex flex-col gap-2">
                        {m.attachments.map((a, i) => {
                          const checked = excavatorAttachments.includes(a);
                          return (
                            <button
                              key={i}
                              onClick={() =>
                                setExcavatorAttachments((prev) =>
                                  checked ? prev.filter((x) => x !== a) : [...prev, a]
                                )
                              }
                              className={`flex items-center gap-2.5 px-3 py-2 border text-left transition-colors font-body text-sm ${
                                checked
                                  ? 'border-accent bg-accent/5 text-foreground'
                                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                              }`}
                            >
                              <div className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                                checked ? 'border-accent bg-accent' : 'border-border'
                              }`}>
                                {checked && <Icon name="Check" size={11} className="text-white" />}
                              </div>
                              {a}
                            </button>
                          );
                        })}
                      </div>
                      {excavatorAttachments.length > 0 && (
                        <p className="font-body text-xs text-muted-foreground mt-2">
                          Выбрано: {excavatorAttachments.length} — уточним наличие при подтверждении
                        </p>
                      )}
                    </div>
                  )}

                  {/* Цена и кнопка */}
                  <div className="mt-auto pt-4 border-t border-border flex items-end justify-between gap-4">
                    <div>
                      <div className="font-display font-bold text-3xl">{m.price.toLocaleString('ru')} ₽</div>
                      <div className="font-body text-xs text-muted-foreground">/ {m.priceUnit} · с оператором</div>
                    </div>
                    <Button
                      onClick={() => scrollTo('contacts')}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 px-5 font-body shrink-0"
                    >
                      Заказать
                      <Icon name="ArrowRight" size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Плашка о мин. заказе */}
          <div className="mt-6 flex flex-wrap items-center gap-6 font-body text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Icon name="Clock" size={15} className="text-accent" /> Минимальный заказ — 4 часа</div>
            <div className="flex items-center gap-2"><Icon name="MapPin" size={15} className="text-accent" /> Выезд по городу и области</div>
            <div className="flex items-center gap-2"><Icon name="Phone" size={15} className="text-accent" /> Диспетчер 24/7</div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-foreground text-background">
        <div className="container grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">О компании</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-8">
              Строим доверие с 2019 года
            </h2>
            <p className="font-body text-lg text-background/70 mb-6">
              Мы — команда, которая понимает стройку изнутри. Предоставляем в аренду только проверенное профессиональное оборудование ведущих брендов.
            </p>
            <p className="font-body text-lg text-background/70">
              Каждый инструмент проходит техобслуживание перед выдачей. Вы получаете надёжную технику, готовую к работе.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-background/10">
            {[
              { icon: 'ShieldCheck', t: 'Гарантия', d: 'Проверенная техника' },
              { icon: 'Truck', t: 'Доставка', d: 'По всему городу' },
              { icon: 'Clock', t: 'Скорость', d: 'Выдача за 15 минут' },
              { icon: 'Wallet', t: 'Цены', d: 'Без переплат' },
            ].map((f, i) => (
              <div key={i} className="bg-foreground p-8">
                <Icon name={f.icon} size={32} className="text-accent mb-4" />
                <div className="font-display font-semibold text-xl mb-1">{f.t}</div>
                <div className="font-body text-sm text-background/60">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TERMS */}
      <section id="terms" className="py-24">
        <div className="container">
          <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Условия аренды</div>
          <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-12">Всё просто</h2>
          <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
            {[
              { n: '01', t: 'Выберите технику', d: 'Добавьте инструмент в корзину и укажите срок аренды. Стоимость рассчитается автоматически.' },
              { n: '02', t: 'Оформите бронь', d: 'Оставьте заявку — менеджер свяжется, подтвердит наличие и согласует доставку.' },
              { n: '03', t: 'Получите инструмент', d: 'Внесите залог, подпишите договор и забирайте технику или ждите доставку.' },
            ].map((s) => (
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
        </div>
      </section>

      {/* CONTACTS */}
      <section id="contacts" className="py-24 bg-secondary">
        <div className="container grid md:grid-cols-2 gap-16">
          <div>
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Контакты</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-10">Свяжитесь с нами</h2>
            <div className="space-y-6">
              {[
                { icon: 'Phone', t: '+7 (901) 504-64-44', d: 'Ежедневно с 8:00 до 22:00' },
                { icon: 'Mail', t: 'stroy_rent@list.ru', d: 'Ответим в течение часа' },
                { icon: 'MapPin', t: 'ул. Строителей, 15', d: 'Пункт выдачи и самовывоз' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent flex items-center justify-center shrink-0">
                    <Icon name={c.icon} size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-xl">{c.t}</div>
                    <div className="font-body text-sm text-muted-foreground">{c.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border p-8">
            <h3 className="font-display font-semibold text-2xl mb-6">Оставить заявку</h3>
            <div className="space-y-4">
              <Input placeholder="Ваше имя" className="rounded-none h-12 font-body" />
              <Input placeholder="Телефон" className="rounded-none h-12 font-body" />
              <textarea
                placeholder="Какой инструмент нужен?"
                rows={4}
                className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
              />
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
                Отправить заявку
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
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

      {/* CART DRAWER */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="font-display font-bold text-2xl text-left">Корзина аренды</SheetTitle>
          </SheetHeader>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-6">
              <Icon name="ShoppingCart" size={48} />
              <p className="font-body">Корзина пуста</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {cart.map((item) => {
                  const canAdd = item.qty < item.tool.stock;
                  const hasMore = item.tool.totalStock > item.tool.stock;
                  const waitCount = item.tool.totalStock - item.tool.stock;

                  return (
                    <div key={item.tool.id} className="pb-5 border-b border-border last:border-0">
                      {/* Шапка позиции */}
                      <div className="flex gap-3 mb-3">
                        <img src={item.tool.image} alt={item.tool.name} className="w-16 h-16 object-cover bg-secondary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-semibold text-base leading-tight">{item.tool.name}</h4>
                            <button onClick={() => removeItem(item.tool.id)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                              <Icon name="X" size={16} />
                            </button>
                          </div>
                          <div className="font-body text-sm text-muted-foreground">{item.tool.price} ₽ / сутки / шт</div>
                        </div>
                      </div>

                      {/* Количество штук */}
                      <div className="mb-2">
                        <div className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Количество</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-border">
                            <button
                              onClick={() => setQty(item.tool.id, item.qty - 1)}
                              disabled={item.qty <= 1}
                              className="w-8 h-8 flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                            >
                              <Icon name="Minus" size={13} />
                            </button>
                            <span className="font-display font-semibold text-base w-8 text-center">{item.qty}</span>
                            <button
                              onClick={() => setQty(item.tool.id, item.qty + 1)}
                              disabled={!canAdd}
                              className="w-8 h-8 flex items-center justify-center hover:bg-secondary disabled:opacity-30"
                            >
                              <Icon name="Plus" size={13} />
                            </button>
                          </div>
                          <span className="font-body text-xs text-muted-foreground">
                            {canAdd
                              ? <span className="text-green-700">ещё {item.tool.stock - item.qty} доступно</span>
                              : <span className="text-amber-600">достигнут лимит в наличии</span>
                            }
                          </span>
                        </div>
                      </div>

                      {/* Подсказка про остаток на складе */}
                      {item.qty >= item.tool.stock && hasMore && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2 mt-2">
                          <Icon name="Clock" size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="font-body text-xs text-amber-700">
                            Ещё {waitCount} {waitCount === 1 ? 'шт' : 'шт'} вернутся на склад — уточните дату у менеджера
                          </p>
                        </div>
                      )}

                      {/* Срок аренды + итог */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border">
                          <button onClick={() => setDays(item.tool.id, item.days - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary">
                            <Icon name="Minus" size={13} />
                          </button>
                          <span className="font-body text-sm w-12 text-center">{item.days} дн</span>
                          <button onClick={() => setDays(item.tool.id, item.days + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary">
                            <Icon name="Plus" size={13} />
                          </button>
                        </div>
                        <span className="font-display font-semibold text-lg">{item.tool.price * item.days * item.qty} ₽</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 border-t border-border bg-secondary">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-body text-muted-foreground">Итого</span>
                  <span className="font-display font-bold text-3xl">{total} ₽</span>
                </div>
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-14 font-body text-base">
                  Забронировать
                  <Icon name="ArrowRight" size={18} className="ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;