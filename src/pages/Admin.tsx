import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  adminLogin, checkAdminToken, adminGet, adminCreate, adminUpdate, adminDelete,
  getOrders, updateOrderStatus, extendOrder as extendOrderApi, getClients, getClientOrders, updateClient,
  rejectOrder as rejectOrderApi, deleteOrder as deleteOrderApi,
  addClientAddress, deleteClientAddress,
} from '@/api';
import AdminLoginScreen from '@/components/admin/AdminLoginScreen';
import AdminCatalogSection from '@/components/admin/AdminCatalogSection';
import AdminOrdersSection from '@/components/admin/AdminOrdersSection';
import AdminClientsSection from '@/components/admin/AdminClientsSection';

type Tab = 'tools' | 'parts' | 'machines' | 'orders' | 'clients';

function emptyTool() {
  return { name: '', category: 'Электроинструмент', price: 0, image: '', stock: 0, totalStock: 0, specs: '', toolType: '', material: [] as string[], active: true, deposit: 0, manualPdfUrl: '', manualVideoUrl: '' };
}
function emptyPart() {
  return { name: '', category: 'Оснастка', price: 0, image: '', stock: 0, specs: '', toolType: '', material: [] as string[], active: true };
}
function emptyMachine() {
  return { name: '', subtitle: '', image: '', specs: [] as {label:string;value:string}[], attachments: [] as string[], price: 0, priceUnit: 'час', available: true };
}

interface ClientAddress {
  id: number;
  address: string;
  label: string;
  isDefault: boolean;
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
  addresses: ClientAddress[];
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

  // Заявки — отклонение + удаление
  const [rejectOrderItem, setRejectOrderItem] = useState<Record<string, unknown> | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);

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

  const openReject = (order: Record<string, unknown>) => {
    setRejectOrderItem(order);
    setRejectReason('');
  };

  const handleRejectSave = async () => {
    if (!rejectOrderItem || !rejectReason.trim()) return;
    setRejectSaving(true);
    await rejectOrderApi(token, rejectOrderItem.id as number, rejectReason.trim());
    setRejectSaving(false);
    setRejectOrderItem(null);
    const updated = await getOrders(token, showArchived);
    setData((prev) => ({ ...prev, orders: Array.isArray(updated) ? updated : [] }));
  };

  const handleDeleteOrder = async (id: number) => {
    await deleteOrderApi(token, id);
    setDeleteOrderId(null);
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

  const refreshClientsAndSelected = async (phone: string) => {
    const updated = await getClients(token);
    const list = Array.isArray(updated) ? updated : [];
    setData((prev) => ({ ...prev, clients: list }));
    const fresh = (list as Client[]).find((c) => c.phone === phone);
    if (fresh) setSelectedClient(fresh);
  };

  const handleAddAddress = async (phone: string, address: string, label: string) => {
    if (!address.trim()) return;
    await addClientAddress(token, phone, address, label);
    await refreshClientsAndSelected(phone);
  };

  const handleDeleteAddress = async (id: number) => {
    if (!selectedClient) return;
    await deleteClientAddress(token, id);
    await refreshClientsAndSelected(selectedClient.phone);
  };

  const setField = (key: string, value: unknown) => setEditItem((prev) => prev ? { ...prev, [key]: value } : prev);

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  if (!authed) {
    return (
      <AdminLoginScreen
        login={login}
        setLogin={setLogin}
        password={password}
        setPassword={setPassword}
        authError={authError}
        authLoading={authLoading}
        handleLogin={handleLogin}
      />
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

        {dataLoading ? (
          <div className="flex items-center gap-3 text-muted-foreground font-body">
            <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
          </div>
        ) : (
          <>
            {(tab === 'tools' || tab === 'parts' || tab === 'machines') && (
              <AdminCatalogSection
                tab={tab}
                items={items}
                token={token}
                openEdit={openEdit}
                openNew={openNew}
                setDeleteId={setDeleteId}
                editItem={editItem}
                setEditItem={setEditItem}
                isNew={isNew}
                saving={saving}
                handleSave={handleSave}
                setField={setField}
                deleteId={deleteId}
                handleDelete={handleDelete}
              />
            )}

            {tab === 'orders' && (
              <AdminOrdersSection
                items={items}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                handleOrderStatus={handleOrderStatus}
                openExtend={openExtend}
                extendOrderItem={extendOrderItem}
                setExtendOrderItem={setExtendOrderItem}
                extendDays={extendDays}
                setExtendDays={setExtendDays}
                extendAmount={extendAmount}
                setExtendAmount={setExtendAmount}
                extendSaving={extendSaving}
                handleExtendSave={handleExtendSave}
                openReject={openReject}
                rejectOrderItem={rejectOrderItem}
                setRejectOrderItem={setRejectOrderItem}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                rejectSaving={rejectSaving}
                handleRejectSave={handleRejectSave}
                deleteOrderId={deleteOrderId}
                setDeleteOrderId={setDeleteOrderId}
                handleDeleteOrder={handleDeleteOrder}
              />
            )}

            {tab === 'clients' && (
              <AdminClientsSection
                clients={data.clients as Client[]}
                clientSearch={clientSearch}
                setClientSearch={setClientSearch}
                selectedClient={selectedClient}
                handleSelectClient={handleSelectClient}
                clientOrders={clientOrders}
                clientOrdersLoading={clientOrdersLoading}
                editClient={editClient}
                setEditClient={setEditClient}
                saving={saving}
                handleSaveClient={handleSaveClient}
                handleAddAddress={handleAddAddress}
                handleDeleteAddress={handleDeleteAddress}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}