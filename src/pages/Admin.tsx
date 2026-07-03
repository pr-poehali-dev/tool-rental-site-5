import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import {
  adminLogin, checkAdminToken, adminGet, adminCreate, adminUpdate, adminDelete,
  getOrders, updateOrderStatus, extendOrder as extendOrderApi, getClients, getClientOrders, updateClient,
} from '@/api';
import ImageUploader from '@/components/ImageUploader';

type Tab = 'tools' | 'parts' | 'machines' | 'orders' | 'clients';

const TOOL_CATEGORIES = ['Электроинструмент', 'Сварка', 'Ручной инструмент', 'Измерение', 'Электромонтаж', 'Сад и техника', 'Экипировка'];
const PART_CATEGORIES = ['Оснастка'];
const STATUS_SWITCH: string[] = ['new', 'processing', 'done'];
const STATUS_LABELS: Record<string, string> = { new: 'Новая', processing: 'В работе', done: 'Выполнена', returned: 'Возвращена' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', processing: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700', returned: 'bg-gray-200 text-gray-600' };

function OrderCountdown({ dueAt }: { dueAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(dueAt).getTime() - now;
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className={`inline-flex items-center gap-1.5 font-body text-xs px-2.5 py-1 ${overdue ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
      <Icon name={overdue ? 'AlertTriangle' : 'Timer'} size={12} />
      {overdue ? 'Просрочено: ' : 'Осталось: '}
      {days > 0 && `${days}д `}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </div>
  );
}

function emptyTool() {
  return { name: '', category: 'Электроинструмент', price: 0, image: '', stock: 0, totalStock: 0, specs: '', toolType: '', material: [] as string[], active: true };
}
function emptyPart() {
  return { name: '', category: 'Оснастка', price: 0, image: '', stock: 0, specs: '', toolType: '', material: [] as string[], active: true };
}
function emptyMachine() {
  return { name: '', subtitle: '', image: '', specs: [] as {label:string;value:string}[], attachments: [] as string[], price: 0, priceUnit: 'час', available: true };
}

interface Client {
  id: number;
  phone: string;
  fullName: string;
  notes: string;
  createdAt: string | null;
  orderCount: number;
  totalAmount: number;
  firstOrder: string | null;
  lastOrder: string | null;
  orderIds: number[];
}

interface ClientOrder {
  id: number;
  name: string;
  phone: string;
  message: string;
  cart: { name: string; qty: number; days: number; price: number }[];
  status: string;
  createdAt: string;
  total: number;
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('tools');
  const [data, setData] = useState<Record<Tab, unknown[]>>({ tools: [], parts: [], machines: [], orders: [], clients: [] });
  const [dataLoading, setDataLoading] = useState(false);

  // Заявки — архив + продление
  const [showArchived, setShowArchived] = useState(false);
  const [extendOrderItem, setExtendOrderItem] = useState<Record<string, unknown> | null>(null);
  const [extendDays, setExtendDays] = useState(1);
  const [extendAmount, setExtendAmount] = useState(0);
  const [extendSaving, setExtendSaving] = useState(false);

  // Каталог — редактирование
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Клиенты — выбранный клиент + его заказы + редактирование
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [clientOrdersLoading, setClientOrdersLoading] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  // Проверка токена при загрузке
  useEffect(() => {
    if (token) {
      checkAdminToken(token).then((valid) => {
        setAuthed(valid);
        if (!valid) localStorage.removeItem('admin_token');
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Загрузка данных при смене вкладки
  useEffect(() => {
    if (!authed) return;
    setDataLoading(true);
    setSelectedClient(null);
    setClientOrders([]);

    let loader: Promise<unknown[]>;
    if (tab === 'orders') loader = getOrders(token, showArchived);
    else if (tab === 'clients') loader = getClients(token);
    else loader = adminGet(tab === 'machines' ? 'machines' : tab, token);

    loader.then((d) => {
      setData((prev) => ({ ...prev, [tab]: Array.isArray(d) ? d : [] }));
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [tab, authed, showArchived]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    const res = await adminLogin(login, password);
    if (res.ok && res.data.token) {
      localStorage.setItem('admin_token', res.data.token);
      setToken(res.data.token);
      setAuthed(true);
    } else {
      setAuthError(res.data.error || 'Неверный пароль');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); setToken(''); setAuthed(false); };

  const openEdit = (item: unknown) => { setEditItem({ ...(item as Record<string, unknown>) }); setIsNew(false); };
  const openNew = () => {
    const blank = tab === 'tools' ? emptyTool() : tab === 'parts' ? emptyPart() : emptyMachine();
    setEditItem(blank as Record<string, unknown>);
    setIsNew(true);
  };

  const refreshTabData = async () => {
    const entity = tab === 'machines' ? 'machines' : tab;
    const updated = await adminGet(entity, token);
    setData((prev) => ({ ...prev, [tab]: Array.isArray(updated) ? updated : [] }));
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    if (isNew) await adminCreate(tab === 'machines' ? 'machines' : tab, token, editItem);
    else await adminUpdate(tab === 'machines' ? 'machines' : tab, token, editItem);
    setSaving(false);
    setEditItem(null);
    await refreshTabData();
  };

  const handleDelete = async (id: number) => {
    await adminDelete(tab === 'machines' ? 'machines' : tab, token, id);
    setDeleteId(null);
    await refreshTabData();
  };

  const handleOrderStatus = async (id: number, status: string) => {
    await updateOrderStatus(token, id, status);
    const updated = await getOrders(token, showArchived);
    setData((prev) => ({ ...prev, orders: Array.isArray(updated) ? updated : [] }));
  };

  const openExtend = (order: Record<string, unknown>) => {
    setExtendOrderItem(order);
    setExtendDays(1);
    const cart = (order.cart as { qty: number; price: number }[]) || [];
    const dailyTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
    setExtendAmount(dailyTotal);
  };

  const handleExtendSave = async () => {
    if (!extendOrderItem) return;
    setExtendSaving(true);
    await extendOrderApi(token, extendOrderItem.id as number, extendDays, extendAmount);
    setExtendSaving(false);
    setExtendOrderItem(null);
    const updated = await getOrders(token, showArchived);
    setData((prev) => ({ ...prev, orders: Array.isArray(updated) ? updated : [] }));
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setClientOrdersLoading(true);
    const orders = await getClientOrders(token, client.phone);
    setClientOrders(Array.isArray(orders) ? orders : []);
    setClientOrdersLoading(false);
  };

  const handleSaveClient = async () => {
    if (!editClient) return;
    setSaving(true);
    await updateClient(token, { phone: editClient.phone, fullName: editClient.fullName, notes: editClient.notes });
    setSaving(false);
    setEditClient(null);
    const updated = await getClients(token);
    setData((prev) => ({ ...prev, clients: Array.isArray(updated) ? updated : [] }));
    if (selectedClient?.phone === editClient.phone) {
      setSelectedClient({ ...selectedClient, fullName: editClient.fullName, notes: editClient.notes });
    }
  };

  const setField = (key: string, value: unknown) => setEditItem((prev) => prev ? { ...prev, [key]: value } : prev);

  const filteredClients = (data.clients as Client[]).filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.phone.includes(q) || c.fullName.toLowerCase().includes(q);
  });

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="bg-card border border-border p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-xl">Строй_Rent</span>
          </div>
          <h1 className="font-display font-bold text-3xl mb-6">Панель управления</h1>
          <div className="space-y-3">
            <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" className="rounded-none h-12 font-body" />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Пароль" className="rounded-none h-12 font-body" />
            {authError && <p className="font-body text-sm text-destructive">{authError}</p>}
            <Button onClick={handleLogin} disabled={authLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
              {authLoading ? 'Вход...' : 'Войти'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = tab !== 'clients' ? data[tab] as Record<string, unknown>[] : [];
  const newOrdersCount = (data.orders as Record<string, unknown>[]).filter((o) => o.status === 'new').length;

  return (
    <div className="min-h-screen bg-secondary">
      {/* Шапка */}
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg">Строй_Rent — Администратор</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="ExternalLink" size={14} /> Сайт
            </a>
            <Button variant="ghost" onClick={handleLogout} className="font-body text-sm gap-1.5">
              <Icon name="LogOut" size={15} /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Вкладки */}
        <div className="flex flex-wrap gap-1 mb-8 bg-background border border-border p-1 w-fit">
          {([
            ['tools', 'Инструменты', 'Wrench'],
            ['parts', 'Комплектующие', 'Package'],
            ['machines', 'Спецтехника', 'Truck'],
            ['orders', 'Заявки', 'ClipboardList'],
            ['clients', 'Клиенты', 'Users'],
          ] as [Tab, string, string][]).map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon name={icon} size={15} /> {label}
              {key === 'orders' && newOrdersCount > 0 && (
                <span className="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">{newOrdersCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Заголовок + кнопка добавления */}
        {tab !== 'orders' && tab !== 'clients' && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl">
              {tab === 'tools' ? 'Инструменты для аренды' : tab === 'parts' ? 'Комплектующие (продажа)' : 'Спецтехника'}
              <span className="font-body text-base font-normal text-muted-foreground ml-3">{items.length} позиций</span>
            </h2>
            <Button onClick={openNew} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body gap-2">
              <Icon name="Plus" size={16} /> Добавить
            </Button>
          </div>
        )}
        {tab === 'orders' && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-2xl">{showArchived ? 'Архив заявок' : 'Заявки от клиентов'}</h2>
            <div className="flex gap-1 bg-background border border-border p-1">
              <button onClick={() => setShowArchived(false)} className={`font-body text-sm px-3 py-1.5 transition-colors ${!showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>Активные</button>
              <button onClick={() => setShowArchived(true)} className={`font-body text-sm px-3 py-1.5 transition-colors flex items-center gap-1.5 ${showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon name="Archive" size={14} /> Архив
              </button>
            </div>
          </div>
        )}
        {tab === 'clients' && <h2 className="font-display font-bold text-2xl mb-6">База клиентов</h2>}

        {dataLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground font-body">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
          </div>
        ) : (
          <>
            {/* ИНСТРУМЕНТЫ / КОМПЛЕКТУЮЩИЕ */}
            {(tab === 'tools' || tab === 'parts') && (
              <div className="bg-background border border-border overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead className="bg-secondary border-b border-border">
                    <tr>
                      <th className="text-left p-4 text-muted-foreground font-normal">Фото</th>
                      <th className="text-left p-4 text-muted-foreground font-normal">Название</th>
                      <th className="text-left p-4 text-muted-foreground font-normal">Категория</th>
                      <th className="text-left p-4 text-muted-foreground font-normal">Цена</th>
                      <th className="text-left p-4 text-muted-foreground font-normal">В наличии</th>
                      {tab === 'tools' && <th className="text-left p-4 text-muted-foreground font-normal">Всего</th>}
                      <th className="text-left p-4 text-muted-foreground font-normal">Статус</th>
                      <th className="p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id as number} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                        <td className="p-4">
                          <img src={item.image as string} alt="" className="w-12 h-12 object-cover bg-secondary"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23f0f0f0"/></svg>'; }} />
                        </td>
                        <td className="p-4 font-medium max-w-[220px]">
                          <div className="truncate">{item.name as string}</div>
                          <div className="text-xs text-muted-foreground truncate">{item.specs as string}</div>
                        </td>
                        <td className="p-4 text-muted-foreground">{item.category as string}</td>
                        <td className="p-4 font-display font-semibold">{item.price as number} ₽</td>
                        <td className="p-4">
                          <span className={`font-semibold ${(item.stock as number) > 0 ? 'text-green-700' : 'text-red-500'}`}>{item.stock as number}</span>
                        </td>
                        {tab === 'tools' && <td className="p-4 text-muted-foreground">{item.totalStock as number}</td>}
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-xs ${(item.active as boolean) ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                            {(item.active as boolean) ? 'Активен' : 'Скрыт'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openEdit(item)} className="p-2 hover:bg-secondary rounded transition-colors"><Icon name="Pencil" size={15} /></button>
                            <button onClick={() => setDeleteId(item.id as number)} className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"><Icon name="Trash2" size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 && <div className="p-12 text-center text-muted-foreground font-body">Нет позиций. Нажмите «Добавить».</div>}
              </div>
            )}

            {/* СПЕЦТЕХНИКА */}
            {tab === 'machines' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((m) => (
                  <div key={m.id as number} className="bg-background border border-border p-5">
                    <img src={m.image as string} alt="" className="w-full aspect-[4/3] object-cover bg-secondary mb-4" />
                    <div className="font-display font-semibold text-lg mb-1">{m.name as string}</div>
                    <div className="font-body text-sm text-muted-foreground mb-3">{m.subtitle as string}</div>
                    <div className="font-display font-bold text-xl mb-4">{(m.price as number).toLocaleString('ru')} ₽ / {m.priceUnit as string}</div>
                    <div className="flex gap-2">
                      <Button onClick={() => openEdit(m)} variant="outline" className="rounded-none font-body text-sm flex-1 gap-1.5"><Icon name="Pencil" size={14} />Редактировать</Button>
                      <button onClick={() => setDeleteId(m.id as number)} className="p-2 hover:bg-destructive/10 text-destructive border border-border rounded-none transition-colors"><Icon name="Trash2" size={15} /></button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="col-span-3 p-12 text-center text-muted-foreground font-body bg-background border border-border">Нет техники. Нажмите «Добавить».</div>}
              </div>
            )}

            {/* ЗАЯВКИ */}
            {tab === 'orders' && (
              <div className="space-y-3">
                {items.length === 0 && (
                  <div className="bg-background border border-border p-12 text-center text-muted-foreground font-body">
                    {showArchived ? 'Архив пуст' : 'Заявок пока нет'}
                  </div>
                )}
                {items.map((order) => {
                  const status = order.status as string;
                  const dueAt = order.dueAt as string | null;
                  const extensions = (order.extensions as { days: number; amount: number }[]) || [];
                  return (
                    <div key={order.id as number} className="bg-background border border-border p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-display font-semibold text-lg">{order.name as string}</span>
                            <span className={`px-2 py-0.5 text-xs font-body rounded ${STATUS_COLORS[status] || 'bg-secondary text-muted-foreground'}`}>
                              {STATUS_LABELS[status] || status}
                            </span>
                            {status === 'done' && dueAt && <OrderCountdown dueAt={dueAt} />}
                          </div>
                          <div className="font-body text-sm text-muted-foreground">{order.phone as string}</div>
                          <div className="font-body text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt as string).toLocaleString('ru')}</div>
                        </div>

                        {!showArchived && (
                          <div className="flex gap-2 flex-wrap justify-end">
                            {status !== 'done' && STATUS_SWITCH.map((s) => (
                              <button key={s} onClick={() => handleOrderStatus(order.id as number, s)} disabled={status === s}
                                className={`font-body text-xs px-3 py-1.5 border transition-colors ${status === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                            {status === 'done' && (
                              <>
                                <button onClick={() => handleOrderStatus(order.id as number, 'returned')}
                                  className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-green-600 hover:text-green-700 transition-colors flex items-center gap-1.5">
                                  <Icon name="CornerDownLeft" size={13} /> Вернул
                                </button>
                                <button onClick={() => openExtend(order)}
                                  className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
                                  <Icon name="CalendarPlus" size={13} /> Продлил
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {(order.deliveryMethod || order.paymentMethod || order.receiveDate) && (
                        <div className="flex flex-wrap gap-4 mb-3 font-body text-xs text-muted-foreground">
                          {order.deliveryMethod && (
                            <span className="flex items-center gap-1.5">
                              <Icon name={order.deliveryMethod === 'delivery' ? 'Truck' : 'Store'} size={13} />
                              {order.deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз'}
                              {order.deliveryMethod === 'delivery' && order.deliveryAddress ? `: ${order.deliveryAddress as string}` : ''}
                            </span>
                          )}
                          {order.receiveDate && (
                            <span className="flex items-center gap-1.5">
                              <Icon name="Calendar" size={13} />
                              {new Date(order.receiveDate as string).toLocaleDateString('ru')}
                              {order.receiveTime ? `, ${order.receiveTime as string}` : ''}
                            </span>
                          )}
                          {order.paymentMethod && (
                            <span className="flex items-center gap-1.5">
                              <Icon name="Wallet" size={13} />
                              {order.paymentMethod === 'cash' ? 'Наличными' : order.paymentMethod === 'card' ? 'Картой при получении' : 'Перевод по счёту'}
                            </span>
                          )}
                          {order.email && (
                            <span className="flex items-center gap-1.5">
                              <Icon name="Mail" size={13} /> {order.email as string}
                            </span>
                          )}
                        </div>
                      )}
                      {order.message && <p className="font-body text-sm bg-secondary px-3 py-2 mb-3">{order.message as string}</p>}
                      {Array.isArray(order.cart) && (order.cart as unknown[]).length > 0 && (
                        <div>
                          <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Корзина</div>
                          <div className="space-y-1">
                            {(order.cart as Record<string, unknown>[]).map((ci, i) => (
                              <div key={i} className="font-body text-sm flex items-center justify-between">
                                <span>{ci.name as string}</span>
                                <span className="text-muted-foreground">{ci.qty as number} шт × {ci.days as number} дн × {ci.price as number} ₽ = <strong>{(ci.qty as number) * (ci.days as number) * (ci.price as number)} ₽</strong></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {extensions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Продления</div>
                          <div className="space-y-1">
                            {extensions.map((ext, i) => (
                              <div key={i} className="font-body text-sm flex items-center justify-between text-muted-foreground">
                                <span>+{ext.days} дн</span>
                                <span>{ext.amount.toLocaleString('ru')} ₽</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* КЛИЕНТЫ */}
            {tab === 'clients' && (
              <div className="grid lg:grid-cols-5 gap-6">
                {/* Список клиентов */}
                <div className="lg:col-span-2">
                  <div className="relative mb-3">
                    <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Поиск по имени или телефону..." className="pl-9 rounded-none h-10 font-body bg-background text-sm" />
                  </div>
                  <div className="space-y-1">
                    {filteredClients.length === 0 && (
                      <div className="bg-background border border-border p-8 text-center text-muted-foreground font-body text-sm">
                        {(data.clients as Client[]).length === 0 ? 'Клиентов пока нет — они появятся после первой заявки' : 'Ничего не найдено'}
                      </div>
                    )}
                    {filteredClients.map((client) => (
                      <button key={client.id} onClick={() => handleSelectClient(client)}
                        className={`w-full text-left p-4 border transition-colors ${selectedClient?.id === client.id ? 'bg-foreground text-background border-foreground' : 'bg-background border-border hover:border-foreground/30'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className={`font-body font-medium text-sm truncate ${selectedClient?.id === client.id ? 'text-background' : ''}`}>
                              {client.fullName || <span className="italic opacity-60">Без имени</span>}
                            </div>
                            <div className={`font-body text-xs mt-0.5 ${selectedClient?.id === client.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                              {client.phone}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`font-display font-semibold text-sm ${selectedClient?.id === client.id ? 'text-background' : 'text-accent'}`}>
                              {client.orderCount} зак.
                            </div>
                            {client.totalAmount > 0 && (
                              <div className={`font-body text-xs ${selectedClient?.id === client.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                                {client.totalAmount.toLocaleString('ru')} ₽
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Карточка клиента */}
                <div className="lg:col-span-3">
                  {!selectedClient ? (
                    <div className="bg-background border border-border h-64 flex items-center justify-center text-muted-foreground font-body text-sm">
                      <div className="text-center">
                        <Icon name="UserCircle" size={40} className="mx-auto mb-3 opacity-30" />
                        Выберите клиента из списка
                      </div>
                    </div>
                  ) : (
                    <div className="bg-background border border-border">
                      {/* Шапка карточки */}
                      <div className="p-5 border-b border-border flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display font-bold text-xl mb-0.5">
                            {selectedClient.fullName || <span className="text-muted-foreground italic">Имя не указано</span>}
                          </h3>
                          <div className="font-body text-sm text-muted-foreground">{selectedClient.phone}</div>
                        </div>
                        <Button onClick={() => setEditClient({ ...selectedClient })} variant="outline" className="rounded-none font-body text-sm gap-1.5 shrink-0">
                          <Icon name="Pencil" size={14} /> Редактировать
                        </Button>
                      </div>

                      {/* Статистика */}
                      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
                        <div className="p-4 text-center">
                          <div className="font-display font-bold text-2xl text-accent">{selectedClient.orderCount}</div>
                          <div className="font-body text-xs text-muted-foreground mt-0.5">заказов</div>
                        </div>
                        <div className="p-4 text-center">
                          <div className="font-display font-bold text-2xl">{selectedClient.totalAmount.toLocaleString('ru')} ₽</div>
                          <div className="font-body text-xs text-muted-foreground mt-0.5">сумма заказов</div>
                        </div>
                        <div className="p-4 text-center">
                          <div className="font-display font-bold text-lg">
                            {selectedClient.lastOrder ? new Date(selectedClient.lastOrder).toLocaleDateString('ru') : '—'}
                          </div>
                          <div className="font-body text-xs text-muted-foreground mt-0.5">последний заказ</div>
                        </div>
                      </div>

                      {/* Даты активности */}
                      <div className="px-5 py-3 border-b border-border flex gap-6 font-body text-xs text-muted-foreground">
                        <span>Первый заказ: <strong>{selectedClient.firstOrder ? new Date(selectedClient.firstOrder).toLocaleDateString('ru') : '—'}</strong></span>
                        <span>Клиент с: <strong>{selectedClient.createdAt ? new Date(selectedClient.createdAt).toLocaleDateString('ru') : '—'}</strong></span>
                      </div>

                      {/* Заметки */}
                      {selectedClient.notes && (
                        <div className="px-5 py-3 border-b border-border bg-secondary">
                          <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1">Заметки</div>
                          <p className="font-body text-sm">{selectedClient.notes}</p>
                        </div>
                      )}

                      {/* История заказов */}
                      <div className="p-5">
                        <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-3">История заказов</div>
                        {clientOrdersLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground font-body text-sm">
                            <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
                          </div>
                        ) : clientOrders.length === 0 ? (
                          <p className="font-body text-sm text-muted-foreground">Нет заказов</p>
                        ) : (
                          <div className="space-y-3">
                            {clientOrders.map((order) => (
                              <div key={order.id} className="border border-border p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-body text-xs text-muted-foreground">#{order.id}</span>
                                    <span className={`px-2 py-0.5 text-xs font-body rounded ${STATUS_COLORS[order.status] || 'bg-secondary text-muted-foreground'}`}>
                                      {STATUS_LABELS[order.status] || order.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-display font-semibold">{order.total.toLocaleString('ru')} ₽</span>
                                    <span className="font-body text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('ru')}</span>
                                  </div>
                                </div>
                                {order.message && <p className="font-body text-xs text-muted-foreground mb-2 italic">{order.message}</p>}
                                {order.cart.length > 0 && (
                                  <div className="space-y-0.5">
                                    {order.cart.map((ci, i) => (
                                      <div key={i} className="font-body text-xs flex justify-between text-muted-foreground">
                                        <span className="truncate mr-2">{ci.name}</span>
                                        <span className="shrink-0">{ci.qty} шт × {ci.days} дн</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ КАТАЛОГА */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">{isNew ? 'Добавить' : 'Редактировать'}</h3>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Название</label>
                <Input value={editItem.name as string || ''} onChange={(e) => setField('name', e.target.value)} className="rounded-none font-body" />
              </div>
              {tab !== 'machines' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Категория</label>
                      <select value={editItem.category as string || ''} onChange={(e) => setField('category', e.target.value)} className="w-full h-10 px-3 border border-input bg-background font-body text-sm rounded-none">
                        {(tab === 'tools' ? TOOL_CATEGORIES : PART_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Цена (₽)</label>
                      <Input type="number" value={editItem.price as number || 0} onChange={(e) => setField('price', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">В наличии</label>
                      <Input type="number" value={editItem.stock as number || 0} onChange={(e) => setField('stock', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                    {tab === 'tools' && (
                      <div>
                        <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Всего на складе</label>
                        <Input type="number" value={editItem.totalStock as number || 0} onChange={(e) => setField('totalStock', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Характеристики</label>
                    <Input value={editItem.specs as string || ''} onChange={(e) => setField('specs', e.target.value)} placeholder="160 Вт · диск 75 мм" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Тип инструмента</label>
                    <Input value={editItem.toolType as string || ''} onChange={(e) => setField('toolType', e.target.value)} placeholder="Шлифмашина" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Материалы (через запятую)</label>
                    <Input value={(editItem.material as string[] || []).join(', ')} onChange={(e) => setField('material', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Металл, Бетон" className="rounded-none font-body" />
                  </div>
                  <ImageUploader
                    images={editItem.images as string[] || (editItem.image ? [editItem.image as string] : [])}
                    onChange={(imgs) => { setField('images', imgs); setField('image', imgs[0] || ''); }}
                    token={token}
                  />
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="active" checked={editItem.active as boolean ?? true} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
                    <label htmlFor="active" className="font-body text-sm">Показывать в каталоге</label>
                  </div>
                </>
              )}
              {tab === 'machines' && (
                <>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Подзаголовок</label>
                    <Input value={editItem.subtitle as string || ''} onChange={(e) => setField('subtitle', e.target.value)} className="rounded-none font-body" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Цена (₽)</label>
                      <Input type="number" value={editItem.price as number || 0} onChange={(e) => setField('price', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Единица</label>
                      <select value={editItem.priceUnit as string || 'час'} onChange={(e) => setField('priceUnit', e.target.value)} className="w-full h-10 px-3 border border-input bg-background font-body text-sm rounded-none">
                        {['час', 'смена', 'сутки'].map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <ImageUploader
                    images={editItem.images as string[] || (editItem.image ? [editItem.image as string] : [])}
                    onChange={(imgs) => { setField('images', imgs); setField('image', imgs[0] || ''); }}
                    token={token}
                  />
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Навесное оборудование (через запятую)</label>
                    <Input value={(editItem.attachments as string[] || []).join(', ')} onChange={(e) => setField('attachments', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Ковш планировочный, Ямобур" className="rounded-none font-body" />
                  </div>
                  <div>
                    <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Характеристики</div>
                    {(editItem.specs as {label:string;value:string}[] || []).map((s, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Input value={s.label} onChange={(e) => { const sp = [...(editItem.specs as {label:string;value:string}[])]; sp[i] = {...sp[i], label: e.target.value}; setField('specs', sp); }} placeholder="Параметр" className="rounded-none font-body text-sm" />
                        <Input value={s.value} onChange={(e) => { const sp = [...(editItem.specs as {label:string;value:string}[])]; sp[i] = {...sp[i], value: e.target.value}; setField('specs', sp); }} placeholder="Значение" className="rounded-none font-body text-sm" />
                        <button onClick={() => { const sp = (editItem.specs as {label:string;value:string}[]).filter((_, j) => j !== i); setField('specs', sp); }} className="px-2 text-destructive hover:bg-destructive/10"><Icon name="X" size={14} /></button>
                      </div>
                    ))}
                    <button onClick={() => setField('specs', [...(editItem.specs as {label:string;value:string}[] || []), {label:'', value:''}])} className="font-body text-xs text-accent hover:underline flex items-center gap-1">
                      <Icon name="Plus" size={12} /> Добавить параметр
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setEditItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ КЛИЕНТА */}
      {editClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">Редактировать клиента</h3>
              <button onClick={() => setEditClient(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Телефон</label>
                <Input value={editClient.phone} disabled className="rounded-none font-body bg-secondary text-muted-foreground" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">ФИО</label>
                <Input value={editClient.fullName} onChange={(e) => setEditClient({ ...editClient, fullName: e.target.value })} placeholder="Иванов Иван Иванович" className="rounded-none font-body" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Заметки</label>
                <textarea value={editClient.notes} onChange={(e) => setEditClient({ ...editClient, notes: e.target.value })} placeholder="Постоянный клиент, предпочитает самовывоз..." rows={4} className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleSaveClient} disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setEditClient(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Удалить позицию?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">Позиция будет скрыта из каталога (данные сохранятся в БД).</p>
            <div className="flex gap-3">
              <Button onClick={() => handleDelete(deleteId)} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-none font-body">Удалить</Button>
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПРОДЛЕНИЯ ЗАЯВКИ */}
      {extendOrderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">Продление аренды</h3>
              <button onClick={() => setExtendOrderItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-body text-sm text-muted-foreground">{extendOrderItem.name as string} — {extendOrderItem.phone as string}</p>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">На сколько дней продлил</label>
                <Input type="number" min={1} value={extendDays} onChange={(e) => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))} className="rounded-none font-body" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Новая сумма оплаты (₽)</label>
                <Input type="number" min={0} value={extendAmount} onChange={(e) => setExtendAmount(Math.max(0, parseInt(e.target.value) || 0))} className="rounded-none font-body" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleExtendSave} disabled={extendSaving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {extendSaving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setExtendOrderItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}