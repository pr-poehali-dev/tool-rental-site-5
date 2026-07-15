import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getCatalog, submitOrder } from '@/api';
import ImageSlider from '@/components/ImageSlider';
import MachineAnimation from '@/components/MachineAnimation';
import { useClientAuth } from '@/hooks/useClientAuth';

interface Tool {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  images: string[];
  stock: number;
  totalStock: number;
  specs: string;
  toolType: string;
  material: string[];
  deposit: number;
  manualPdfUrl: string;
  manualVideoUrl: string;
}

interface Part {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  images: string[];
  stock: number;
  specs: string;
  toolType: string;
  material: string[];
}

interface SpecMachine {
  id: number;
  name: string;
  subtitle: string;
  image: string;
  images: string[];
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
  kitDiscount?: number;
  kitName?: string;
}

interface Kit {
  id: number;
  name: string;
  description: string;
  toolIds: number[];
  discountPercent: number;
  icon: string;
}

interface Review {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  toolName: string;
}

const TOOL_CATEGORIES = ['Все', 'Электроинструмент', 'Бензоинструмент', 'Сварка', 'Ручной инструмент', 'Измерение', 'Электромонтаж', 'Сад и техника', 'Экипировка'];
const TOOL_TYPES = ['Все типы', 'Болгарка (УШМ)', 'Вибратор', 'Захватный', 'Зажимной', 'Измерительный', 'Коронка', 'Лобзик', 'Миксер', 'Нивелир', 'Нож', 'Ножницы', 'Отвёртка', 'Паяльник', 'Перфоратор', 'Пила', 'Сварочный аппарат', 'Стриппер', 'Тепловая пушка', 'Триммер', 'Ударный', 'Фен технический', 'Фонарь', 'Шлифмашина', 'Шлифовальный круг', 'Штроборез', 'Шуруповёрт'];
const MATERIALS = ['Все материалы', 'Бетон', 'Дерево', 'Кабель', 'Камень', 'Кирпич', 'Металл', 'Пластик', 'Штукатурка'];

const NAV = [
  { label: 'Главная', id: 'hero' },
  { label: 'Инструмент', id: 'catalog' },
  { label: 'Комплектующие', id: 'parts' },
  { label: 'Спецтехника', id: 'spectech' },
  { label: 'Отзывы', id: 'reviews' },
  { label: 'Контакты', id: 'contacts' },
];

const STATUS_COLORS: Record<string, string> = {
  new: 'text-blue-600',
  processing: 'text-amber-600',
  done: 'text-green-600',
};

export default function Index() {
  const navigate = useNavigate();
  const { authed } = useClientAuth();
  // Данные из БД
  const [tools, setTools] = useState<Tool[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<SpecMachine[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Каталог — фильтры инструментов
  const [activeCat, setActiveCat] = useState('Все');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('Все типы');
  const [activeMaterial, setActiveMaterial] = useState('Все материалы');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Комплектующие — фильтры
  const [partSearch, setPartSearch] = useState('');

  // Пагинация «Посмотреть ещё»
  const PAGE_LIMIT = 16;
  const [showAllTools, setShowAllTools] = useState(false);
  const [showAllParts, setShowAllParts] = useState(false);
  const [showAllMachines, setShowAllMachines] = useState(false);

  // Корзина
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Экскаватор
  const [excavatorAttachments, setExcavatorAttachments] = useState<string[]>([]);

  // Форма контактов
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderEmail, setOrderEmail] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [orderSending, setOrderSending] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const orderEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderEmail);

  useEffect(() => {
    getCatalog().then((data) => {
      setTools(data.tools || []);
      setParts(data.parts || []);
      setMachines(data.machines || []);
      setKits(data.kits || []);
      setReviews(data.reviews || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = activeCat === 'Все' ? tools : tools.filter((t) => t.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.specs.toLowerCase().includes(q) || t.toolType.toLowerCase().includes(q));
    }
    if (activeType !== 'Все типы') list = list.filter((t) => t.toolType === activeType);
    if (activeMaterial !== 'Все материалы') list = list.filter((t) => t.material.includes(activeMaterial));
    return list;
  }, [tools, activeCat, search, activeType, activeMaterial]);

  const filteredParts = useMemo(() => {
    if (!partSearch.trim()) return parts;
    const q = partSearch.toLowerCase();
    return parts.filter((p) => p.name.toLowerCase().includes(q) || p.specs.toLowerCase().includes(q));
  }, [parts, partSearch]);

  const activeFiltersCount = (activeType !== 'Все типы' ? 1 : 0) + (activeMaterial !== 'Все материалы' ? 1 : 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const itemPrice = (i: CartItem) => i.kitDiscount ? Math.round(i.tool.price * (1 - i.kitDiscount / 100)) : i.tool.price;
  const rentTotal = cart.reduce((sum, i) => sum + itemPrice(i) * i.days * i.qty, 0);
  const depositTotal = cart.reduce((sum, i) => sum + (i.tool.deposit || 0) * i.qty, 0);
  const total = rentTotal + depositTotal;

  const addToCart = (tool: Tool) => {
    setCart((prev) => (prev.some((i) => i.tool.id === tool.id) ? prev : [...prev, { tool, days: 1, qty: 1 }]));
    setCartOpen(true);
  };
  const addKitToCart = (kit: Kit) => {
    setCart((prev) => {
      const next = [...prev];
      kit.toolIds.forEach((toolId) => {
        const tool = tools.find((t) => t.id === toolId);
        if (!tool) return;
        const idx = next.findIndex((i) => i.tool.id === toolId);
        if (idx === -1) next.push({ tool, days: 1, qty: 1, kitDiscount: kit.discountPercent, kitName: kit.name });
        else next[idx] = { ...next[idx], kitDiscount: kit.discountPercent, kitName: kit.name };
      });
      return next;
    });
    setCartOpen(true);
  };
  const setDays = (id: number, days: number) =>
    setCart((prev) => prev.map((i) => (i.tool.id === id ? { ...i, days: Math.max(1, days) } : i)));
  const setQty = (id: number, qty: number) =>
    setCart((prev) => prev.map((i) => (i.tool.id === id ? { ...i, qty: Math.min(Math.max(1, qty), i.tool.stock) } : i)));
  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.tool.id !== id));

  const resetFilters = () => { setActiveType('Все типы'); setActiveMaterial('Все материалы'); setSearch(''); setShowAllTools(false); };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleOrder = async () => {
    if (!orderName || !orderPhone || !orderEmailValid) return;
    setOrderSending(true);
    const cartData = cart.map((i) => ({ id: i.tool.id, name: i.tool.name, price: itemPrice(i), days: i.days, qty: i.qty, deposit: i.tool.deposit || 0 }));
    await submitOrder({ name: orderName, phone: orderPhone, email: orderEmail, message: orderMessage, cart: cartData, deliveryMethod: 'pickup', paymentMethod: 'cash' });
    setOrderSending(false);
    setOrderSent(true);
    setCart([]);
  };

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
          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => scrollTo(n.id)} className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
                {n.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={() => navigate(authed ? '/account' : '/account/login')} className="gap-2 font-body">
              <Icon name="User" size={18} />
              <span className="hidden sm:inline">{authed ? 'Кабинет' : 'Войти'}</span>
            </Button>
            <Button variant="ghost" onClick={() => setCartOpen(true)} className="relative gap-2 font-body">
              <Icon name="ShoppingCart" size={20} />
              <span className="hidden sm:inline">Корзина</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
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
              ИНСТРУМЕНТ<br /><span className="text-accent">В АРЕНДУ</span>
            </h1>
            <p className="font-body text-lg md:text-xl text-muted-foreground max-w-xl mb-10">Профессиональное строительное оборудование для любых задач. Честные цены, быстрое бронирование, доставка по Москве и Московской области.</p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => scrollTo('catalog')} className="bg-accent hover:bg-accent/90 text-accent-foreground font-body rounded-none h-14 px-8 text-base">
                Смотреть каталог <Icon name="ArrowRight" size={18} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/rental-terms')} className="rounded-none h-14 px-8 text-base font-body">
                Условия аренды
              </Button>
            </div>
          </div>
        </div>
        <div className="border-y border-border">
          <div className="container grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
            {[{ n: '200+', l: 'единиц техники' }, { n: '24/7', l: 'поддержка' }, { n: '1 час', l: 'на доставку' }, { n: '5 лет', l: 'на рынке' }].map((s, i) => (
              <div key={i} className="py-8 px-4 md:px-8">
                <div className="font-display font-semibold text-4xl">{s.n}</div>
                <div className="font-body text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG — АРЕНДА ИНСТРУМЕНТА */}
      <section id="catalog" className="py-24">
        <div className="container">
          <div className="mb-10">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Каталог</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight">Аренда инструмента</h2>
          </div>

          {/* АКЦИОННЫЕ НАБОРЫ СО СКИДКОЙ */}
          {kits.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Icon name="Sparkles" size={18} className="text-accent" />
                <h3 className="font-display font-semibold text-xl">Готовые наборы — дешевле по отдельности</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {kits.map((kit) => {
                  const kitTools = kit.toolIds.map((id) => tools.find((t) => t.id === id)).filter(Boolean) as Tool[];
                  if (kitTools.length === 0) return null;
                  const fullPrice = kitTools.reduce((s, t) => s + t.price, 0);
                  const discountedPrice = Math.round(fullPrice * (1 - kit.discountPercent / 100));
                  const allInStock = kitTools.every((t) => t.stock > 0);
                  return (
                    <div key={kit.id} className="border border-accent/30 bg-accent/5 p-6 flex flex-col">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Icon name={kit.icon} size={20} className="text-accent shrink-0" />
                          <h4 className="font-display font-semibold text-lg leading-tight">{kit.name}</h4>
                        </div>
                        <span className="font-body text-xs px-2 py-1 bg-accent text-white shrink-0 whitespace-nowrap">−{kit.discountPercent}%</span>
                      </div>
                      <p className="font-body text-sm text-muted-foreground mb-4">{kit.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {kitTools.map((t) => (
                          <span key={t.id} className="font-body text-xs px-2 py-1 bg-background border border-border text-muted-foreground">{t.name}</span>
                        ))}
                      </div>
                      <div className="mt-auto flex items-end justify-between gap-3">
                        <div>
                          <span className="font-body text-sm text-muted-foreground line-through mr-2">{fullPrice} ₽</span>
                          <span className="font-display font-bold text-2xl text-accent">{discountedPrice} ₽</span>
                          <span className="font-body text-xs text-muted-foreground"> / сутки за комплект</span>
                        </div>
                      </div>
                      <Button onClick={() => addKitToCart(kit)} disabled={!allInStock} className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-11 font-body disabled:opacity-40">
                        {allInStock ? 'Добавить набор в корзину' : 'Не все позиции в наличии'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Поиск + кнопка фильтров */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-lg">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Найти инструмент..." className="pl-9 rounded-none h-11 font-body" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Icon name="X" size={15} /></button>}
            </div>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`flex items-center gap-2 px-4 h-11 border font-body text-sm transition-colors ${filtersOpen || activeFiltersCount > 0 ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}
            >
              <Icon name="SlidersHorizontal" size={15} /> Фильтры
              {activeFiltersCount > 0 && <span className="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
            </button>
            {(activeFiltersCount > 0 || search) && (
              <button onClick={resetFilters} className="flex items-center gap-1.5 px-4 h-11 border border-border text-muted-foreground hover:text-foreground font-body text-sm transition-colors">
                <Icon name="RotateCcw" size={14} /> Сбросить
              </button>
            )}
          </div>

          {/* Панель фильтров */}
          {filtersOpen && (
            <div className="border border-border bg-secondary p-5 mb-6 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-3">Тип инструмента</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TOOL_TYPES.map((t) => (
                      <button key={t} onClick={() => setActiveType(t)} className={`font-body text-xs px-3 py-1.5 border transition-colors ${activeType === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-3">Материал / назначение</div>
                  <div className="flex flex-wrap gap-1.5">
                    {MATERIALS.map((m) => (
                      <button key={m} onClick={() => setActiveMaterial(m)} className={`font-body text-xs px-3 py-1.5 border transition-colors ${activeMaterial === m ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>{m}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Категории */}
          <div className="flex flex-wrap gap-2 mb-8">
            {TOOL_CATEGORIES.map((c) => (
              <button key={c} onClick={() => { setActiveCat(c); setShowAllTools(false); }} className={`font-body text-sm px-5 py-2.5 border transition-colors ${activeCat === c ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>{c}</button>
            ))}
          </div>

          {/* Сетка */}
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card p-4 animate-pulse">
                  <div className="aspect-square bg-secondary mb-3" />
                  <div className="h-3 bg-secondary rounded mb-2 w-1/3" />
                  <div className="h-5 bg-secondary rounded mb-2" />
                  <div className="h-3 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
              <Icon name="SearchX" size={48} />
              <p className="font-body text-lg">Ничего не найдено</p>
              <button onClick={resetFilters} className="font-body text-sm underline hover:text-foreground">Сбросить фильтры</button>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
                {(showAllTools ? filtered : filtered.slice(0, PAGE_LIMIT)).map((tool) => (
                  <div key={tool.id} className="group bg-card p-4 flex flex-col">
                    <ImageSlider
                      images={tool.images?.length ? tool.images : [tool.image]}
                      alt={tool.name}
                      className="aspect-square bg-secondary mb-3"
                    />
                    <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-1">{tool.category}</div>
                    <h3 className="font-display font-semibold text-base leading-snug mb-2">{tool.name}</h3>
                    <p className="font-body text-xs text-muted-foreground mb-3">{tool.specs}</p>
                    {tool.material.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tool.material.map((m) => <span key={m} className="font-body text-xs px-2 py-0.5 bg-secondary border border-border text-muted-foreground">{m}</span>)}
                      </div>
                    )}
                    {(tool.manualPdfUrl || tool.manualVideoUrl) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tool.manualPdfUrl && (
                          <a href={tool.manualPdfUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="font-body text-xs px-2 py-1 border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1">
                            <Icon name="FileText" size={12} /> Инструкция PDF
                          </a>
                        )}
                        {tool.manualVideoUrl && (
                          <a href={tool.manualVideoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="font-body text-xs px-2 py-1 border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1">Видеоинструкция по применению
</a>
                        )}
                      </div>
                    )}
                    <div className="mt-auto flex items-end justify-between">
                      <div>
                        <span className="font-display font-bold text-2xl">{tool.price} ₽</span>
                        <span className="font-body text-xs text-muted-foreground"> / сутки</span>
                        {tool.deposit > 0 && (
                          <div className="font-body text-xs text-muted-foreground mt-0.5">Залог: {tool.deposit.toLocaleString('ru')} ₽</div>
                        )}
                      </div>
                      <Button onClick={() => addToCart(tool)} size="icon" disabled={tool.stock === 0} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-10 w-10 disabled:opacity-40">
                        <Icon name="Plus" size={18} />
                      </Button>
                    </div>
                    {tool.stock === 0 && <p className="font-body text-xs text-destructive mt-2">Нет в наличии</p>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="font-body text-sm text-muted-foreground">
                  Показано: {Math.min(showAllTools ? filtered.length : PAGE_LIMIT, filtered.length)} из {filtered.length}
                </div>
                {filtered.length > PAGE_LIMIT && !showAllTools && (
                  <button onClick={() => setShowAllTools(true)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                    Посмотреть ещё {filtered.length - PAGE_LIMIT}
                    <Icon name="ChevronDown" size={15} />
                  </button>
                )}
                {showAllTools && filtered.length > PAGE_LIMIT && (
                  <button onClick={() => setShowAllTools(false)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                    Свернуть
                    <Icon name="ChevronUp" size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* PARTS — КОМПЛЕКТУЮЩИЕ (ПРОДАЖА) */}
      <section id="parts" className="py-24 bg-secondary">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Магазин</div>
              <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight">Комплектующие и расходники</h2>

            </div>
            <div className="relative w-full max-w-xs">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={partSearch} onChange={(e) => setPartSearch(e.target.value)} placeholder="Поиск..." className="pl-9 rounded-none h-11 font-body bg-background" />
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card p-4 animate-pulse">
                  <div className="aspect-square bg-secondary mb-3" />
                  <div className="h-5 bg-secondary rounded mb-2" />
                  <div className="h-3 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
              <Icon name="PackageSearch" size={40} />
              <p className="font-body">Ничего не найдено</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
                {(showAllParts ? filteredParts : filteredParts.slice(0, PAGE_LIMIT)).map((part) => (
                  <div key={part.id} className="group bg-card p-4 flex flex-col">
                    <ImageSlider
                      images={part.images?.length ? part.images : [part.image]}
                      alt={part.name}
                      className="aspect-square bg-secondary mb-3"
                    />
                    <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-1">{part.category}</div>
                    <h3 className="font-display font-semibold text-base leading-snug mb-2">{part.name}</h3>
                    <p className="font-body text-xs text-muted-foreground mb-3">{part.specs}</p>
                    {part.material.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {part.material.map((m) => <span key={m} className="font-body text-xs px-2 py-0.5 bg-secondary border border-border text-muted-foreground">{m}</span>)}
                      </div>
                    )}
                    <div className="mt-auto flex items-end justify-between pt-3 border-t border-border">
                      <div>
                        <span className="font-display font-bold text-2xl">{part.price} ₽</span>
                        <span className="font-body text-xs text-muted-foreground"> / шт</span>
                      </div>
                      <Button onClick={() => scrollTo('contacts')} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-9 px-3 font-body text-xs">
                        Заказать
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`w-2 h-2 rounded-full ${part.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                      <span className="font-body text-xs text-muted-foreground">{part.stock > 0 ? `В наличии: ${part.stock} шт` : 'Нет в наличии'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <div className="font-body text-sm text-muted-foreground">
                  Показано: {Math.min(showAllParts ? filteredParts.length : PAGE_LIMIT, filteredParts.length)} из {filteredParts.length}
                </div>
                {filteredParts.length > PAGE_LIMIT && !showAllParts && (
                  <button onClick={() => setShowAllParts(true)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                    Посмотреть ещё {filteredParts.length - PAGE_LIMIT}
                    <Icon name="ChevronDown" size={15} />
                  </button>
                )}
                {showAllParts && filteredParts.length > PAGE_LIMIT && (
                  <button onClick={() => setShowAllParts(false)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                    Свернуть <Icon name="ChevronUp" size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* SPECTECH */}
      <section id="spectech" className="py-24">
        <div className="container">
          <div className="mb-12">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Спецтехника</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-4">Аренда спецтехники</h2>
            <p className="font-body text-muted-foreground text-lg max-w-xl">Работаем с экипажем. Оператор или водитель включён в стоимость.</p>
          </div>

          {loading ? (
            <div className="grid lg:grid-cols-3 gap-px bg-border border border-border">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card p-6 animate-pulse h-64" />)}
            </div>
          ) : (
            <>
            <div className="grid lg:grid-cols-3 gap-px bg-border border border-border">
              {(showAllMachines ? machines : machines.slice(0, PAGE_LIMIT)).map((m) => (
                <div key={m.id} className="group bg-card flex flex-col">
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                    <ImageSlider
                      images={m.images?.length ? m.images : [m.image]}
                      alt={m.name}
                      className="w-full h-full"
                    />
                    <MachineAnimation name={m.name} />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="font-display font-bold text-2xl leading-tight">{m.name}</h3>
                      <p className="font-body text-sm text-muted-foreground mt-1">{m.subtitle}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                      {m.specs.map((s, i) => (
                        <div key={i} className="border-b border-border pb-2">
                          <div className="font-body text-xs text-muted-foreground">{s.label}</div>
                          <div className="font-display font-semibold text-sm">{s.value}</div>
                        </div>
                      ))}
                    </div>
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-4">
                        <div className="font-body text-xs uppercase tracking-widest text-muted-foreground mb-2">Навесное оборудование — выберите нужное</div>
                        <div className="flex flex-col gap-2">
                          {m.attachments.map((a, i) => {
                            const checked = excavatorAttachments.includes(a);
                            return (
                              <button key={i} onClick={() => setExcavatorAttachments((prev) => checked ? prev.filter((x) => x !== a) : [...prev, a])}
                                className={`flex items-center gap-2.5 px-3 py-2 border text-left transition-colors font-body text-sm ${checked ? 'border-accent bg-accent/5 text-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
                                <div className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-accent bg-accent' : 'border-border'}`}>
                                  {checked && <Icon name="Check" size={11} className="text-white" />}
                                </div>
                                {a}
                              </button>
                            );
                          })}
                        </div>
                        {excavatorAttachments.length > 0 && <p className="font-body text-xs text-muted-foreground mt-2">Выбрано: {excavatorAttachments.length} — уточним при подтверждении</p>}
                      </div>
                    )}
                    <div className="mt-auto pt-4 border-t border-border flex items-end justify-between gap-4">
                      <div>
                        <div className="font-display font-bold text-3xl">{m.price.toLocaleString('ru')} ₽</div>
                        <div className="font-body text-xs text-muted-foreground">/ {m.priceUnit} · с оператором</div>
                      </div>
                      <Button onClick={() => scrollTo('contacts')} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 px-5 font-body shrink-0">
                        Заказать <Icon name="ArrowRight" size={16} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="font-body text-sm text-muted-foreground">
                Показано: {Math.min(showAllMachines ? machines.length : PAGE_LIMIT, machines.length)} из {machines.length}
              </div>
              {machines.length > PAGE_LIMIT && !showAllMachines && (
                <button onClick={() => setShowAllMachines(true)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                  Посмотреть ещё {machines.length - PAGE_LIMIT}
                  <Icon name="ChevronDown" size={15} />
                </button>
              )}
              {showAllMachines && machines.length > PAGE_LIMIT && (
                <button onClick={() => setShowAllMachines(false)} className="flex items-center gap-2 font-body text-sm px-6 py-2.5 border border-border hover:border-foreground hover:text-foreground text-muted-foreground transition-colors">
                  Свернуть <Icon name="ChevronUp" size={15} />
                </button>
              )}
            </div>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-6 font-body text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Icon name="Clock" size={15} className="text-accent" /> Минимальный заказ — 4 часа</div>
            <div className="flex items-center gap-2"><Icon name="MapPin" size={15} className="text-accent" /> Выезд по городу и области</div>
            <div className="flex items-center gap-2"><Icon name="Phone" size={15} className="text-accent" /> Диспетчер 24/7</div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section id="reviews" className="py-24 bg-secondary">
          <div className="container">
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Отзывы</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-12">Нам доверяют</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
              {reviews.map((r) => (
                <div key={r.id} className="bg-card p-6 flex flex-col">
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon key={i} name="Star" size={15} className={i < r.rating ? 'text-accent fill-accent' : 'text-border'} />
                    ))}
                  </div>
                  <p className="font-body text-sm text-muted-foreground mb-4 flex-1">{r.text}</p>
                  <div>
                    <div className="font-display font-semibold text-sm">{r.authorName}</div>
                    {r.toolName && <div className="font-body text-xs text-muted-foreground">{r.toolName}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACTS */}
      <section id="contacts" className="py-24 bg-secondary">
        <div className="container grid md:grid-cols-2 gap-16">
          <div>
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">Контакты</div>
            <h2 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-10">Свяжитесь с нами</h2>
            <div className="space-y-6">
              {[{ icon: 'Phone', t: '+7 (901) 504-64-44', d: 'Ежедневно с 8:00 до 22:00' }, { icon: 'Mail', t: 'stroy_rent@list.ru', d: 'Ответим в течение часа' }, { icon: 'MapPin', t: 'ул. Строителей, 15', d: 'Пункт выдачи и самовывоз' }].map((c, i) => (
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
            {orderSent ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                  <Icon name="CheckCircle" size={36} className="text-accent" />
                </div>
                <p className="font-display font-semibold text-xl">Заявка отправлена!</p>
                <p className="font-body text-muted-foreground">Мы свяжемся с вами в ближайшее время.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Ваше имя" className="rounded-none h-12 font-body" />
                <Input
                  type="tel"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="Телефон"
                  className="rounded-none h-12 font-body"
                />
                <div>
                  <Input
                    type="email"
                    value={orderEmail}
                    onChange={(e) => setOrderEmail(e.target.value.replace(/\s/g, ''))}
                    placeholder="Email"
                    className="rounded-none h-12 font-body"
                  />
                  {orderEmail.length > 0 && !orderEmailValid && (
                    <p className="font-body text-xs text-destructive mt-1">Введите корректный email (должен содержать @)</p>
                  )}
                </div>
                <textarea value={orderMessage} onChange={(e) => setOrderMessage(e.target.value)} placeholder="Какой инструмент нужен?" rows={4} className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none" />
                {cart.length > 0 && (
                  <div className="bg-secondary border border-border p-3 text-sm font-body text-muted-foreground">
                    В корзине: {cart.map(i => `${i.tool.name} (${i.qty} шт × ${i.days} дн)`).join(', ')}
                  </div>
                )}
                <Button onClick={handleOrder} disabled={orderSending || !orderName || !orderPhone || !orderEmailValid} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
                  {orderSending ? 'Отправляем...' : 'Отправить заявку'}
                </Button>
              </div>
            )}
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
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/about')} className="font-body text-sm text-background/60 hover:text-background transition-colors">О компании</button>
            <button onClick={() => navigate('/rental-terms')} className="font-body text-sm text-background/60 hover:text-background transition-colors">Условия аренды</button>
          </div>
          <div className="font-body text-sm text-background/50">
            © 2026 Строй_Rent. Аренда строительного инструмента и спецтехники.
          </div>
        </div>
        <div className="container mt-6 pt-6 border-t border-background/10">
          <div className="font-body text-xs text-background/40 leading-relaxed">
            ИП Максимова Алина Николаевна · ОГРН 326508100407884 · ИНН 360203243703
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
                      <div className="flex gap-3 mb-3">
                        <img src={item.tool.image} alt={item.tool.name} className="w-16 h-16 object-cover bg-secondary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-semibold text-base leading-tight">{item.tool.name}</h4>
                            <button onClick={() => removeItem(item.tool.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Icon name="X" size={16} /></button>
                          </div>
                          {item.kitDiscount ? (
                            <div className="flex items-center gap-2">
                              <span className="font-body text-sm text-muted-foreground line-through">{item.tool.price} ₽</span>
                              <span className="font-body text-sm text-accent font-medium">{itemPrice(item)} ₽ / сутки / шт</span>
                            </div>
                          ) : (
                            <div className="font-body text-sm text-muted-foreground">{item.tool.price} ₽ / сутки / шт</div>
                          )}
                          {item.kitName && (
                            <div className="font-body text-[11px] text-accent flex items-center gap-1 mt-0.5">
                              <Icon name="Tag" size={11} /> {item.kitName} (−{item.kitDiscount}%)
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Количество</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center border border-border">
                            <button onClick={() => setQty(item.tool.id, item.qty - 1)} disabled={item.qty <= 1} className="w-8 h-8 flex items-center justify-center hover:bg-secondary disabled:opacity-30"><Icon name="Minus" size={13} /></button>
                            <span className="font-display font-semibold text-base w-8 text-center">{item.qty}</span>
                            <button onClick={() => setQty(item.tool.id, item.qty + 1)} disabled={!canAdd} className="w-8 h-8 flex items-center justify-center hover:bg-secondary disabled:opacity-30"><Icon name="Plus" size={13} /></button>
                          </div>
                          <span className="font-body text-xs text-muted-foreground">
                            {canAdd ? <span className="text-green-700">ещё {item.tool.stock - item.qty} доступно</span> : <span className="text-amber-600">достигнут лимит</span>}
                          </span>
                        </div>
                      </div>
                      {item.qty >= item.tool.stock && hasMore && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2 mt-2">
                          <Icon name="Clock" size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="font-body text-xs text-amber-700">Ещё {waitCount} шт вернутся на склад — уточните дату у менеджера</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border">
                          <button onClick={() => setDays(item.tool.id, item.days - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary"><Icon name="Minus" size={13} /></button>
                          <span className="font-body text-sm w-12 text-center">{item.days} дн</span>
                          <button onClick={() => setDays(item.tool.id, item.days + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary"><Icon name="Plus" size={13} /></button>
                        </div>
                        <span className="font-display font-semibold text-lg">{itemPrice(item) * item.days * item.qty} ₽</span>
                      </div>
                      {!!item.tool.deposit && (
                        <div className="font-body text-xs text-muted-foreground mt-1 text-right">+ залог {item.tool.deposit * item.qty} ₽</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-6 border-t border-border bg-secondary">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-sm text-muted-foreground">Аренда</span>
                  <span className="font-body text-sm">{rentTotal} ₽</span>
                </div>
                {depositTotal > 0 && (
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-muted-foreground">Залог (возвращается)</span>
                    <span className="font-body text-sm">{depositTotal} ₽</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4 mt-2 pt-2 border-t border-border">
                  <span className="font-body text-muted-foreground">Итого к оплате</span>
                  <span className="font-display font-bold text-3xl">{total} ₽</span>
                </div>
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-14 font-body text-base" onClick={() => { setCartOpen(false); navigate('/checkout'); }}>
                  Оформить заявку <Icon name="ArrowRight" size={18} className="ml-2" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}