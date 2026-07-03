import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

const STATUS_LABELS: Record<string, string> = { new: 'Новая', processing: 'В работе', done: 'Выполнена', returned: 'Возвращена' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', processing: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700', returned: 'bg-gray-200 text-gray-600' };

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

interface AdminClientsSectionProps {
  clients: Client[];
  clientSearch: string;
  setClientSearch: (v: string) => void;
  selectedClient: Client | null;
  handleSelectClient: (client: Client) => void;
  clientOrders: ClientOrder[];
  clientOrdersLoading: boolean;
  editClient: Client | null;
  setEditClient: (c: Client | null) => void;
  saving: boolean;
  handleSaveClient: () => void;
}

export default function AdminClientsSection({
  clients, clientSearch, setClientSearch, selectedClient, handleSelectClient,
  clientOrders, clientOrdersLoading, editClient, setEditClient, saving, handleSaveClient,
}: AdminClientsSectionProps) {
  const filteredClients = clients.filter((c) => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.phone.includes(q) || c.fullName.toLowerCase().includes(q);
  });

  return (
    <>
      <h2 className="font-display font-bold text-2xl mb-6">База клиентов</h2>

      {/* КЛИЕНТЫ */}
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
                {clients.length === 0 ? 'Клиентов пока нет — они появятся после первой заявки' : 'Ничего не найдено'}
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
    </>
  );
}
