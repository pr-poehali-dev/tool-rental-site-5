import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { adminLogin, checkAdminToken, adminGet, adminCreate, adminUpdate, adminDelete, getOrders, updateOrderStatus } from '@/api';

type Tab = 'tools' | 'parts' | 'machines' | 'orders';

const TOOL_CATEGORIES = ['Электроинструмент', 'Сварка', 'Ручной инструмент', 'Измерение', 'Электромонтаж', 'Сад и техника', 'Экипировка'];
const PART_CATEGORIES = ['Оснастка'];

const STATUS_LABELS: Record<string, string> = { new: 'Новая', processing: 'В работе', done: 'Выполнена' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', processing: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700' };

function emptyTool() {
  return { name: '', category: 'Электроинструмент', price: 0, image: '', stock: 0, totalStock: 0, specs: '', toolType: '', material: [] as string[], active: true };
}
function emptyPart() {
  return { name: '', category: 'Оснастка', price: 0, image: '', stock: 0, specs: '', toolType: '', material: [] as string[], active: true };
}
function emptyMachine() {
  return { name: '', subtitle: '', image: '', specs: [] as {label:string;value:string}[], attachments: [] as string[], price: 0, priceUnit: 'час', available: true };
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
  const [data, setData] = useState<Record<Tab, unknown[]>>({ tools: [], parts: [], machines: [], orders: [] });
  const [dataLoading, setDataLoading] = useState(false);

  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
    const entity = tab === 'orders' ? null : tab === 'machines' ? 'machines' : tab;
    const loader = tab === 'orders' ? getOrders(token) : adminGet(entity!, token);
    loader.then((d) => {
      setData((prev) => ({ ...prev, [tab]: Array.isArray(d) ? d : [] }));
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [tab, authed]);

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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setAuthed(false);
  };

  const openEdit = (item: unknown) => { setEditItem({ ...(item as Record<string, unknown>) }); setIsNew(false); };
  const openNew = () => {
    const blank = tab === 'tools' ? emptyTool() : tab === 'parts' ? emptyPart() : emptyMachine();
    setEditItem(blank as Record<string, unknown>);
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editItem) return;
    setSaving(true);
    if (isNew) {
      await adminCreate(tab === 'machines' ? 'machines' : tab, token, editItem);
    } else {
      await adminUpdate(tab === 'machines' ? 'machines' : tab, token, editItem);
    }
    setSaving(false);
    setEditItem(null);
    // Обновляем список
    const entity = tab === 'machines' ? 'machines' : tab;
    const updated = await adminGet(entity, token);
    setData((prev) => ({ ...prev, [tab]: Array.isArray(updated) ? updated : [] }));
  };

  const handleDelete = async (id: number) => {
    await adminDelete(tab === 'machines' ? 'machines' : tab, token, id);
    setDeleteId(null);
    const entity = tab === 'machines' ? 'machines' : tab;
    const updated = await adminGet(entity, token);
    setData((prev) => ({ ...prev, [tab]: Array.isArray(updated) ? updated : [] }));
  };

  const handleOrderStatus = async (id: number, status: string) => {
    await updateOrderStatus(token, id, status);
    const updated = await getOrders(token);
    setData((prev) => ({ ...prev, orders: Array.isArray(updated) ? updated : [] }));
  };

  const setField = (key: string, value: unknown) => setEditItem((prev) => prev ? { ...prev, [key]: value } : prev);

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

  const items = data[tab] as Record<string, unknown>[];

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
        <div className="flex gap-1 mb-8 bg-background border border-border p-1 w-fit">
          {([['tools', 'Инструменты', 'Wrench'], ['parts', 'Комплектующие', 'Package'], ['machines', 'Спецтехника', 'Truck'], ['orders', 'Заявки', 'ClipboardList']] as [Tab, string, string][]).map(([key, label, icon]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 font-body text-sm transition-colors ${tab === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon name={icon} size={15} /> {label}
              {key === 'orders' && (data.orders as unknown[]).filter((o) => (o as Record<string, unknown>).status === 'new').length > 0 && (
                <span className="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center">
                  {(data.orders as unknown[]).filter((o) => (o as Record<string, unknown>).status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Заголовок раздела */}
        {tab !== 'orders' && (
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

        {tab === 'orders' && <h2 className="font-display font-bold text-2xl mb-6">Заявки от клиентов</h2>}

        {dataLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground font-body"><div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...</div>
        ) : (
          <>
            {/* ТАБЛИЦА ИНСТРУМЕНТОВ / КОМПЛЕКТУЮЩИХ */}
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
                          <img src={item.image as string} alt="" className="w-12 h-12 object-cover bg-secondary" onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23f0f0f0"/></svg>'; }} />
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

            {/* КАРТОЧКИ СПЕЦТЕХНИКИ */}
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
                {items.length === 0 && <div className="bg-background border border-border p-12 text-center text-muted-foreground font-body">Заявок пока нет</div>}
                {items.map((order) => (
                  <div key={order.id as number} className="bg-background border border-border p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-display font-semibold text-lg">{order.name as string}</span>
                          <span className={`px-2 py-0.5 text-xs font-body rounded ${STATUS_COLORS[order.status as string] || 'bg-secondary text-muted-foreground'}`}>
                            {STATUS_LABELS[order.status as string] || order.status as string}
                          </span>
                        </div>
                        <div className="font-body text-sm text-muted-foreground">{order.phone as string}</div>
                        <div className="font-body text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt as string).toLocaleString('ru')}</div>
                      </div>
                      <div className="flex gap-2">
                        {Object.keys(STATUS_LABELS).map((s) => (
                          <button key={s} onClick={() => handleOrderStatus(order.id as number, s)} disabled={order.status === s}
                            className={`font-body text-xs px-3 py-1.5 border transition-colors ${order.status === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
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
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">{isNew ? 'Добавить' : 'Редактировать'}</h3>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">

              {/* Общие поля */}
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
                    <Input value={editItem.specs as string || ''} onChange={(e) => setField('specs', e.target.value)} placeholder="160 Вт · диск 75 мм · гибкий вал" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Тип инструмента</label>
                    <Input value={editItem.toolType as string || ''} onChange={(e) => setField('toolType', e.target.value)} placeholder="Шлифмашина" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Материалы (через запятую)</label>
                    <Input value={(editItem.material as string[] || []).join(', ')} onChange={(e) => setField('material', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Металл, Бетон" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">URL фото</label>
                    <Input value={editItem.image as string || ''} onChange={(e) => setField('image', e.target.value)} className="rounded-none font-body text-xs" />
                    {editItem.image && <img src={editItem.image as string} alt="" className="mt-2 h-20 object-contain border border-border" />}
                  </div>
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
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">URL фото</label>
                    <Input value={editItem.image as string || ''} onChange={(e) => setField('image', e.target.value)} className="rounded-none font-body text-xs" />
                    {editItem.image && <img src={editItem.image as string} alt="" className="mt-2 h-20 object-contain border border-border" />}
                  </div>
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
    </div>
  );
}
