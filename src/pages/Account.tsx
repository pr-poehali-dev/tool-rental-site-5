import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getClientAccount, updateClientProfile, addAccountAddress, setDefaultAddress, deleteAccountAddress } from '@/api';
import { useClientAuth } from '@/hooks/useClientAuth';

interface OrderCartItem {
  name: string;
  qty: number;
  days: number;
  price: number;
  deposit?: number;
}

interface AccountOrder {
  id: number;
  cart: OrderCartItem[];
  status: string;
  createdAt: string;
  total: number;
  deliveryMethod: string;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
}

interface AccountAddress {
  id: number;
  address: string;
  label: string;
  isDefault: boolean;
}

interface AccountData {
  client: { id: number; phone: string; email: string; fullName: string; verified: boolean; createdAt: string | null };
  orders: AccountOrder[];
  orderCount: number;
  totalSpent: number;
  addresses: AccountAddress[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая', processing: 'В работе', done: 'Выполнена', returned: 'Завершена', rejected: 'Отклонена',
};
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', processing: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700', returned: 'bg-gray-200 text-gray-600', rejected: 'bg-red-100 text-red-700',
};

export default function Account() {
  const navigate = useNavigate();
  const { token, client, authed, checked, logout } = useClientAuth();

  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  useEffect(() => {
    if (checked && !authed) navigate('/account/login');
  }, [checked, authed, navigate]);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    getClientAccount(token).then((d) => {
      setData(d);
      setNameInput(d?.client?.fullName || '');
      setLoading(false);
    });
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleSaveName = async () => {
    setSavingName(true);
    await updateClientProfile(token, nameInput.trim());
    setSavingName(false);
    setEditingName(false);
    loadData();
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) return;
    setAddingAddress(true);
    await addAccountAddress(token, newAddress.trim(), newLabel.trim());
    setNewAddress('');
    setNewLabel('');
    setAddingAddress(false);
    loadData();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!checked || loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-background border-b border-border sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 bg-accent flex items-center justify-center">
              <Icon name="Wrench" size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg">Строй_Rent</span>
          </button>
          <div className="flex items-center gap-3">
            <a href="/" className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Icon name="ArrowLeft" size={14} /> В каталог
            </a>
            <Button variant="ghost" onClick={handleLogout} className="font-body text-sm gap-1.5">
              <Icon name="LogOut" size={15} /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-10 max-w-4xl">
        <h1 className="font-display font-bold text-3xl mb-8">Личный кабинет</h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-background border border-border p-5">
            <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1">Заказов оформлено</div>
            <div className="font-display font-bold text-3xl">{data.orderCount}</div>
          </div>
          <div className="bg-background border border-border p-5">
            <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1">Потрачено средств</div>
            <div className="font-display font-bold text-3xl">{data.totalSpent.toLocaleString('ru')} ₽</div>
          </div>
          <div className="bg-background border border-border p-5">
            <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1">Контакты</div>
            <div className="font-body text-sm mt-1">{data.client.email || '—'}</div>
            <div className="font-body text-sm text-muted-foreground">{data.client.phone || '—'}</div>
          </div>
        </div>

        {/* Профиль */}
        <div className="bg-background border border-border p-6 mb-6">
          <h2 className="font-display font-semibold text-xl mb-4">Профиль</h2>
          {editingName ? (
            <div className="flex gap-2 max-w-md">
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Ваше имя" className="rounded-none font-body" />
              <Button onClick={handleSaveName} disabled={savingName} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {savingName ? '...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setEditingName(false)} className="rounded-none font-body">Отмена</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-body">{data.client.fullName || 'Имя не указано'}</span>
              <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground"><Icon name="Pencil" size={14} /></button>
            </div>
          )}
        </div>

        {/* Адреса */}
        <div className="bg-background border border-border p-6 mb-6">
          <h2 className="font-display font-semibold text-xl mb-4">Адреса доставки</h2>
          <div className="space-y-2 mb-4">
            {data.addresses.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border border-border px-4 py-3">
                <Icon name="MapPin" size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm truncate">{a.address}</div>
                  {a.label && <div className="font-body text-xs text-muted-foreground">{a.label}</div>}
                </div>
                {a.isDefault ? (
                  <span className="font-body text-xs text-accent shrink-0">Основной</span>
                ) : (
                  <button onClick={async () => { await setDefaultAddress(token, a.id); loadData(); }} className="font-body text-xs text-muted-foreground hover:text-accent shrink-0">
                    Сделать основным
                  </button>
                )}
                <button onClick={async () => { await deleteAccountAddress(token, a.id); loadData(); }} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Icon name="X" size={14} />
                </button>
              </div>
            ))}
            {data.addresses.length === 0 && <p className="font-body text-sm text-muted-foreground">Адресов пока нет</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Новый адрес" className="rounded-none font-body flex-1 min-w-[200px]" />
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Метка (дом, офис)" className="rounded-none font-body w-40" />
            <Button onClick={handleAddAddress} disabled={!newAddress.trim() || addingAddress} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body gap-1.5">
              <Icon name="Plus" size={15} /> Добавить
            </Button>
          </div>
        </div>

        {/* История заказов */}
        <div className="bg-background border border-border p-6">
          <h2 className="font-display font-semibold text-xl mb-4">История заказов</h2>
          <div className="space-y-3">
            {data.orders.map((o) => (
              <button key={o.id} onClick={() => navigate(`/order/${o.id}`)} className="w-full text-left border border-border p-4 hover:border-foreground/30 transition-colors block">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <span className="font-body text-sm text-muted-foreground">Заявка №{o.id} · {new Date(o.createdAt).toLocaleDateString('ru')}</span>
                  <div className="flex items-center gap-2">
                    {o.paymentMethod === 'online' && (
                      o.paymentStatus === 'paid' ? (
                        <span className="px-2 py-0.5 text-xs font-body rounded bg-green-100 text-green-700">Оплачено</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-body rounded bg-amber-100 text-amber-700">Ожидает оплаты</span>
                      )
                    )}
                    <span className={`px-2 py-0.5 text-xs font-body rounded ${STATUS_COLORS[o.status] || 'bg-secondary text-muted-foreground'}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </div>
                </div>
                <div className="font-body text-sm truncate mb-1">
                  {o.cart.map((i) => i.name).join(', ')}
                </div>
                <div className="font-display font-semibold">{o.total.toLocaleString('ru')} ₽</div>
              </button>
            ))}
            {data.orders.length === 0 && <p className="font-body text-sm text-muted-foreground">У вас пока нет заказов</p>}
          </div>
        </div>
      </div>
    </div>
  );
}