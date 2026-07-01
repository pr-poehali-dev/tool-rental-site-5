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
}

interface CartItem {
  tool: Tool;
  days: number;
}

const TOOLS: Tool[] = [
  { id: 1, name: 'Перфоратор Bosch', category: 'Бурение', price: 650, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/dc116c46-331e-43e1-ac01-462744f172c0.jpg' },
  { id: 2, name: 'Бетономешалка 180л', category: 'Бетон', price: 900, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/7b409794-890b-494a-8624-a9309ec32f1b.jpg' },
  { id: 3, name: 'УШМ Болгарка 230мм', category: 'Резка', price: 400, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/1ca7c606-58d3-4ecd-a696-8f446449af65.jpg' },
  { id: 4, name: 'Перфоратор Makita', category: 'Бурение', price: 700, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/dc116c46-331e-43e1-ac01-462744f172c0.jpg' },
  { id: 5, name: 'Бетономешалка 120л', category: 'Бетон', price: 750, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/7b409794-890b-494a-8624-a9309ec32f1b.jpg' },
  { id: 6, name: 'УШМ Профи 125мм', category: 'Резка', price: 350, image: 'https://cdn.poehali.dev/projects/54519bd3-e88c-4417-805a-70dc3963c609/files/1ca7c606-58d3-4ecd-a696-8f446449af65.jpg' },
];

const CATEGORIES = ['Все', 'Бурение', 'Бетон', 'Резка'];

const NAV = [
  { label: 'Главная', id: 'hero' },
  { label: 'Каталог', id: 'catalog' },
  { label: 'О компании', id: 'about' },
  { label: 'Условия аренды', id: 'terms' },
  { label: 'Контакты', id: 'contacts' },
];

const Index = () => {
  const [activeCat, setActiveCat] = useState('Все');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(
    () => (activeCat === 'Все' ? TOOLS : TOOLS.filter((t) => t.category === activeCat)),
    [activeCat]
  );

  const cartCount = cart.length;
  const total = cart.reduce((sum, i) => sum + i.tool.price * i.days, 0);

  const addToCart = (tool: Tool) => {
    setCart((prev) => (prev.some((i) => i.tool.id === tool.id) ? prev : [...prev, { tool, days: 1 }]));
    setCartOpen(true);
  };

  const setDays = (id: number, days: number) =>
    setCart((prev) => prev.map((i) => (i.tool.id === id ? { ...i, days: Math.max(1, days) } : i)));

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
            <span className="font-display font-bold text-2xl tracking-tight">ПРОКАТ</span>
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
                { icon: 'Phone', t: '+7 (999) 123-45-67', d: 'Ежедневно с 8:00 до 22:00' },
                { icon: 'Mail', t: 'info@prokat.ru', d: 'Ответим в течение часа' },
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
            <span className="font-display font-bold text-2xl">ПРОКАТ</span>
          </div>
          <div className="font-body text-sm text-background/50">
            © 2026 ПРОКАТ. Аренда строительного инструмента.
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
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item) => (
                  <div key={item.tool.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <img src={item.tool.image} alt={item.tool.name} className="w-20 h-20 object-cover bg-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display font-semibold text-lg leading-tight">{item.tool.name}</h4>
                        <button onClick={() => removeItem(item.tool.id)} className="text-muted-foreground hover:text-destructive">
                          <Icon name="X" size={18} />
                        </button>
                      </div>
                      <div className="font-body text-sm text-muted-foreground mb-2">{item.tool.price} ₽ / сутки</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-border">
                          <button onClick={() => setDays(item.tool.id, item.days - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary">
                            <Icon name="Minus" size={14} />
                          </button>
                          <span className="font-body text-sm w-10 text-center">{item.days} дн</span>
                          <button onClick={() => setDays(item.tool.id, item.days + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-secondary">
                            <Icon name="Plus" size={14} />
                          </button>
                        </div>
                        <span className="font-display font-semibold text-lg">{item.tool.price * item.days} ₽</span>
                      </div>
                    </div>
                  </div>
                ))}
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