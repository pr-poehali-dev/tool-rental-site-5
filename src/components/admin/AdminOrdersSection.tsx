import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

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

interface AdminOrdersSectionProps {
  items: Record<string, unknown>[];
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  handleOrderStatus: (id: number, status: string) => void;
  openExtend: (order: Record<string, unknown>) => void;
  extendOrderItem: Record<string, unknown> | null;
  setExtendOrderItem: (item: Record<string, unknown> | null) => void;
  extendDays: number;
  setExtendDays: (v: number) => void;
  extendAmount: number;
  setExtendAmount: (v: number) => void;
  extendSaving: boolean;
  handleExtendSave: () => void;
}

export default function AdminOrdersSection({
  items, showArchived, setShowArchived, handleOrderStatus, openExtend,
  extendOrderItem, setExtendOrderItem, extendDays, setExtendDays,
  extendAmount, setExtendAmount, extendSaving, handleExtendSave,
}: AdminOrdersSectionProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl">{showArchived ? 'Архив заявок' : 'Заявки от клиентов'}</h2>
        <div className="flex gap-1 bg-background border border-border p-1">
          <button onClick={() => setShowArchived(false)} className={`font-body text-sm px-3 py-1.5 transition-colors ${!showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>Активные</button>
          <button onClick={() => setShowArchived(true)} className={`font-body text-sm px-3 py-1.5 transition-colors flex items-center gap-1.5 ${showArchived ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon name="Archive" size={14} /> Архив
          </button>
        </div>
      </div>

      {/* ЗАЯВКИ */}
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
    </>
  );
}
