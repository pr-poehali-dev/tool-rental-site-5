import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { submitOrder } from '@/api';

interface CartItem {
  tool: { id: number; name: string; price: number; image: string; stock: number };
  days: number;
  qty: number;
}

const TIME_SLOTS = ['09:00 – 12:00', '12:00 – 15:00', '15:00 – 18:00', '18:00 – 21:00'];

const DELIVERY_OPTIONS = [
  { id: 'pickup', label: 'Самовывоз', desc: 'ул. Строителей, 15 — бесплатно', icon: 'Store' },
  { id: 'delivery', label: 'Доставка', desc: 'По городу — уточняется у менеджера', icon: 'Truck' },
] as const;

const PAYMENT_OPTIONS = [
  { id: 'cash', label: 'Наличными', desc: 'При получении', icon: 'Banknote' },
  { id: 'card', label: 'Картой при получении', desc: 'Терминал у курьера/на складе', icon: 'CreditCard' },
  { id: 'transfer', label: 'Перевод по счёту', desc: 'Для организаций и ИП', icon: 'Landmark' },
] as const;

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
          return;
        }
      } catch { /* empty */ }
    }
    // Если корзина пуста — вернуть на главную
    navigate('/');
  }, [navigate]);

  const total = cart.reduce((sum, i) => sum + i.tool.price * i.days * i.qty, 0);
  const canSubmit = name.trim() && phone.trim() && (deliveryMethod === 'pickup' || address.trim()) && date;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSending(true);
    const cartData = cart.map((i) => ({ id: i.tool.id, name: i.tool.name, price: i.tool.price, days: i.days, qty: i.qty }));
    const res = await submitOrder({
      name,
      phone,
      email,
      message,
      cart: cartData,
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'delivery' ? address : '',
      receiveDate: date ? format(date, 'yyyy-MM-dd') : '',
      receiveTime: timeSlot,
      paymentMethod,
    });
    if (res && res.id) setOrderId(res.id);
    setSending(false);
    setSent(true);
    localStorage.removeItem('cart');
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <div className="bg-background border border-border p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Icon name="CheckCircle" size={36} className="text-accent" />
          </div>
          <h1 className="font-display font-bold text-2xl mb-2">Заявка оформлена!</h1>
          <p className="font-body text-muted-foreground mb-6">Мы свяжемся с вами в ближайшее время для подтверждения.</p>
          <div className="space-y-2">
            {orderId && (
              <Button onClick={() => navigate(`/order/${orderId}`)} variant="outline" className="w-full rounded-none h-12 font-body">
                Посмотреть статус заявки
              </Button>
            )}
            <Button onClick={() => navigate('/')} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
              На главную
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) return null;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Шапка */}
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg">Строй_Rent</span>
          </button>
          <button onClick={() => navigate('/')} className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={15} /> Вернуться в каталог
          </button>
        </div>
      </header>

      <div className="container py-10 max-w-5xl">
        <h1 className="font-display font-bold text-3xl md:text-4xl mb-8">Оформление заявки</h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* ЛЕВАЯ КОЛОНКА — форма */}
          <div className="space-y-8">
            {/* Контактные данные */}
            <section className="bg-background border border-border p-6">
              <h2 className="font-display font-semibold text-xl mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-body">1</span>
                Контактные данные
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя *" className="rounded-none h-12 font-body" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Телефон *" className="rounded-none h-12 font-body" />
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (необязательно)" className="rounded-none h-12 font-body sm:col-span-2" />
              </div>
            </section>

            {/* Способ получения */}
            <section className="bg-background border border-border p-6">
              <h2 className="font-display font-semibold text-xl mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-body">2</span>
                Способ получения
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                {DELIVERY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDeliveryMethod(opt.id)}
                    className={`flex items-start gap-3 p-4 border text-left transition-colors ${deliveryMethod === opt.id ? 'border-accent bg-accent/5' : 'border-border hover:border-foreground/30'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${deliveryMethod === opt.id ? 'border-accent' : 'border-border'}`}>
                      {deliveryMethod === opt.id && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                    </div>
                    <div>
                      <div className="font-body font-medium text-sm flex items-center gap-1.5"><Icon name={opt.icon} size={15} /> {opt.label}</div>
                      <div className="font-body text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              {deliveryMethod === 'delivery' && (
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Адрес доставки *" className="rounded-none h-12 font-body mb-4" />
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">Дата получения *</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full h-12 border border-input bg-background px-3 flex items-center gap-2 font-body text-sm justify-start hover:border-foreground/30 transition-colors">
                        <Icon name="Calendar" size={16} className="text-muted-foreground" />
                        {date ? format(date, 'd MMMM yyyy', { locale: ru }) : <span className="text-muted-foreground">Выберите дату</span>}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                        locale={ru}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1.5 block">Время</label>
                  <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full h-12 px-3 border border-input bg-background font-body text-sm">
                    {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Способ оплаты */}
            <section className="bg-background border border-border p-6">
              <h2 className="font-display font-semibold text-xl mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-body">3</span>
                Способ оплаты
              </h2>
              <div className="space-y-3">
                {PAYMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`w-full flex items-center gap-3 p-4 border text-left transition-colors ${paymentMethod === opt.id ? 'border-accent bg-accent/5' : 'border-border hover:border-foreground/30'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === opt.id ? 'border-accent' : 'border-border'}`}>
                      {paymentMethod === opt.id && <div className="w-2.5 h-2.5 bg-accent rounded-full" />}
                    </div>
                    <Icon name={opt.icon} size={18} className="text-muted-foreground shrink-0" />
                    <div>
                      <div className="font-body font-medium text-sm">{opt.label}</div>
                      <div className="font-body text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Комментарий */}
            <section className="bg-background border border-border p-6">
              <h2 className="font-display font-semibold text-xl mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center text-sm font-body">4</span>
                Комментарий к заказу
              </h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Дополнительные пожелания (необязательно)"
                rows={4}
                className="w-full border border-input bg-background px-3 py-2 font-body text-sm resize-none"
              />
            </section>
          </div>

          {/* ПРАВАЯ КОЛОНКА — сводка заказа */}
          <div>
            <div className="bg-background border border-border p-6 sticky top-24">
              <h2 className="font-display font-semibold text-xl mb-5">Ваш заказ</h2>
              <div className="space-y-4 mb-5 max-h-80 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.tool.id} className="flex gap-3">
                    <img src={item.tool.image} alt={item.tool.name} className="w-14 h-14 object-cover bg-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-sm font-medium leading-tight truncate">{item.tool.name}</div>
                      <div className="font-body text-xs text-muted-foreground mt-0.5">{item.qty} шт × {item.days} дн</div>
                      <div className="font-display font-semibold text-sm mt-0.5">{item.tool.price * item.days * item.qty} ₽</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-4 mb-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-sm text-muted-foreground">Товары</span>
                  <span className="font-body text-sm">{total} ₽</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-body text-sm text-muted-foreground">Доставка</span>
                  <span className="font-body text-sm">{deliveryMethod === 'pickup' ? 'Бесплатно' : 'По согласованию'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body font-medium">Итого</span>
                  <span className="font-display font-bold text-2xl">{total} ₽</span>
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || sending}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-14 font-body text-base disabled:opacity-40"
              >
                {sending ? 'Отправляем...' : 'Подтвердить заявку'}
                {!sending && <Icon name="ArrowRight" size={18} className="ml-2" />}
              </Button>
              {!canSubmit && (
                <p className="font-body text-xs text-muted-foreground mt-3 text-center">
                  Заполните имя, телефон{deliveryMethod === 'delivery' ? ', адрес' : ''} и дату получения
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}