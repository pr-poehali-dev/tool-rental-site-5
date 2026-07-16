import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { uploadEvidence, DepositResolutionItem, ActData } from '@/api';

const STATUS_SWITCH: string[] = ['new', 'processing', 'done'];
const STATUS_LABELS: Record<string, string> = { new: 'Новая', processing: 'В работе', done: 'Выполнена', returned: 'Завершена', rejected: 'Отклонена' };
const STATUS_COLORS: Record<string, string> = { new: 'bg-blue-100 text-blue-700', processing: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700', returned: 'bg-gray-200 text-gray-600', rejected: 'bg-red-100 text-red-700' };

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
  openReject: (order: Record<string, unknown>) => void;
  rejectOrderItem: Record<string, unknown> | null;
  setRejectOrderItem: (item: Record<string, unknown> | null) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  rejectSaving: boolean;
  handleRejectSave: () => void;
  deleteOrderId: number | null;
  setDeleteOrderId: (id: number | null) => void;
  handleDeleteOrder: (id: number) => void;
  openProcessing: (order: Record<string, unknown>) => void;
  processingOrderItem: Record<string, unknown> | null;
  setProcessingOrderItem: (item: Record<string, unknown> | null) => void;
  processingComment: string;
  setProcessingComment: (v: string) => void;
  processingSaving: boolean;
  handleProcessingSave: () => void;
  token: string;
  openDepositFull: (order: Record<string, unknown>) => void;
  openDepositPartial: (order: Record<string, unknown>) => void;
  depositOrderItem: Record<string, unknown> | null;
  setDepositOrderItem: (item: Record<string, unknown> | null) => void;
  depositMode: 'full' | 'partial';
  depositResolution: DepositResolutionItem[];
  setDepositResolution: (v: DepositResolutionItem[]) => void;
  depositSaving: boolean;
  handleDepositSave: () => void;
  confirmRefundOrderId: number | null;
  setConfirmRefundOrderId: (id: number | null) => void;
  confirmRefundSaving: boolean;
  handleConfirmRefund: (id: number) => void;
  openAct: (order: Record<string, unknown>, kind: 'handover' | 'return') => void;
  actOrderItem: Record<string, unknown> | null;
  actKind: 'handover' | 'return';
  actData: ActData | null;
  setActData: (v: ActData | null) => void;
  setActOrderItem: (v: Record<string, unknown> | null) => void;
  actSaving: boolean;
  handleActSave: () => void;
}

export default function AdminOrdersSection({
  items, showArchived, setShowArchived, handleOrderStatus, openExtend,
  extendOrderItem, setExtendOrderItem, extendDays, setExtendDays,
  extendAmount, setExtendAmount, extendSaving, handleExtendSave,
  openReject, rejectOrderItem, setRejectOrderItem, rejectReason, setRejectReason,
  rejectSaving, handleRejectSave, deleteOrderId, setDeleteOrderId, handleDeleteOrder,
  openProcessing, processingOrderItem, setProcessingOrderItem, processingComment,
  setProcessingComment, processingSaving, handleProcessingSave,
  token, openDepositFull, openDepositPartial, depositOrderItem, setDepositOrderItem,
  depositMode, depositResolution, setDepositResolution, depositSaving, handleDepositSave,
  confirmRefundOrderId, setConfirmRefundOrderId, confirmRefundSaving, handleConfirmRefund,
  openAct, actOrderItem, actKind, actData, setActData, setActOrderItem, actSaving, handleActSave,
}: AdminOrdersSectionProps) {
  const [evidenceUploading, setEvidenceUploading] = useState<number | null>(null);

  const handleEvidenceUpload = async (idx: number, files: FileList | null) => {
    if (!files || !files.length) return;
    setEvidenceUploading(idx);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const url = await uploadEvidence(token, file);
        uploaded.push(url);
      } catch { /* ignore single file failure */ }
    }
    setEvidenceUploading(null);
    if (uploaded.length) {
      const next = [...depositResolution];
      next[idx] = { ...next[idx], evidence: [...(next[idx].evidence || []), ...uploaded] };
      setDepositResolution(next);
    }
  };
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
                      <button key={s} onClick={() => s === 'processing' ? openProcessing(order) : handleOrderStatus(order.id as number, s)} disabled={status === s}
                        className={`font-body text-xs px-3 py-1.5 border transition-colors ${status === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                    {status === 'done' && (
                      <>
                        <button onClick={() => openDepositFull(order)}
                          className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-green-600 hover:text-green-700 transition-colors flex items-center gap-1.5">
                          <Icon name="ShieldCheck" size={13} /> Завершено с возвратом залога
                        </button>
                        <button onClick={() => openDepositPartial(order)}
                          className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5">
                          <Icon name="ShieldAlert" size={13} /> Завершено без возврата / с частичным возвратом залога
                        </button>
                        <button onClick={() => openExtend(order)}
                          className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
                          <Icon name="CalendarPlus" size={13} /> Продлил
                        </button>
                      </>
                    )}
                    {status !== 'rejected' && status !== 'returned' && (
                      <button onClick={() => openReject(order)}
                        className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5">
                        <Icon name="Ban" size={13} /> Отклонить заявку
                      </button>
                    )}
                  </div>
                )}
                <button onClick={() => setDeleteOrderId(order.id as number)}
                  className="p-2 hover:bg-destructive/10 text-destructive border border-border rounded transition-colors shrink-0"
                  title="Удалить заявку полностью">
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
              {status === 'rejected' && (order.rejectReason as string) && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 mb-3">
                  <Icon name="Ban" size={14} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="font-body text-xs text-red-700"><strong>Причина отклонения:</strong> {order.rejectReason as string}</p>
                </div>
              )}
              {(order.adminComment as string) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2 mb-3">
                  <Icon name="MessageCircle" size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="font-body text-xs text-amber-700"><strong>Комментарий менеджера:</strong> {order.adminComment as string}</p>
                </div>
              )}
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
                      {order.paymentMethod === 'cash' ? 'Наличными' : order.paymentMethod === 'card' ? 'Картой при получении' : order.paymentMethod === 'online' ? 'Картой онлайн / СБП' : 'Перевод по счёту'}
                    </span>
                  )}
                  {order.paymentMethod === 'online' && (
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      <Icon name={order.paymentStatus === 'paid' ? 'CheckCircle' : 'Clock'} size={13} />
                      {order.paymentStatus === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
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
              {status === 'returned' && (order.depositResolution as DepositResolutionItem[] | undefined)?.length ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Решение по залогу</div>
                  <div className="space-y-1.5 mb-2">
                    {(order.depositResolution as DepositResolutionItem[]).map((r, i) => (
                      <div key={i} className="font-body text-sm">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Icon name={r.refunded ? 'CheckCircle' : 'XCircle'} size={13} className={r.refunded ? 'text-green-600' : 'text-red-500'} />
                            {r.name}
                          </span>
                          <span className={r.refunded ? 'text-green-700' : 'text-red-600'}>{r.refunded ? '+' : '−'}{r.amount.toLocaleString('ru')} ₽</span>
                        </div>
                        {!r.refunded && r.reason && <p className="text-xs text-muted-foreground pl-5">{r.reason}</p>}
                        {!r.refunded && !!r.evidence?.length && (
                          <div className="flex gap-1.5 pl-5 mt-1 flex-wrap">
                            {r.evidence.map((url, j) => (
                              url.match(/\.(mp4|mov|webm)$/i)
                                ? <video key={j} src={url} controls className="w-16 h-16 object-cover bg-secondary" />
                                : <img key={j} src={url} alt="" className="w-16 h-16 object-cover bg-secondary" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(order.paymentMethod === 'online') && (order.depositRefundAmount as number) > 0 && (
                    order.depositRefundStatus === 'refunded' ? (
                      <div className="flex items-center gap-1.5 font-body text-xs text-green-700"><Icon name="CheckCircle" size={13} /> Возврат {(order.depositRefundAmount as number).toLocaleString('ru')} ₽ выполнен</div>
                    ) : order.depositRefundStatus === 'pending' ? (
                      <button onClick={() => setConfirmRefundOrderId(order.id as number)}
                        className="font-body text-xs px-3 py-1.5 border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-1.5">
                        <Icon name="Banknote" size={13} /> Подтвердить возврат {(order.depositRefundAmount as number).toLocaleString('ru')} ₽ клиенту
                      </button>
                    ) : null
                  )}
                </div>
              ) : null}
              {(order.handoverActUrl || order.returnActUrl || status === 'done' || status === 'returned') && (
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                  {(order.handoverActUrl || status === 'done') && (
                    <>
                      {order.handoverActUrl && (
                        <a href={order.handoverActUrl as string} target="_blank" rel="noreferrer"
                          className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                          <Icon name="FileText" size={13} /> Акт приёма-передачи
                        </a>
                      )}
                      <button onClick={() => openAct(order, 'handover')}
                        className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
                        <Icon name="Pencil" size={13} /> {order.handoverActUrl ? 'Изменить акт выдачи' : 'Сформировать акт выдачи'}
                      </button>
                    </>
                  )}
                  {(order.returnActUrl || status === 'returned') && (
                    <>
                      {order.returnActUrl && (
                        <a href={order.returnActUrl as string} target="_blank" rel="noreferrer"
                          className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                          <Icon name="FileText" size={13} /> Акт возврата
                        </a>
                      )}
                      <button onClick={() => openAct(order, 'return')}
                        className="font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
                        <Icon name="Pencil" size={13} /> {order.returnActUrl ? 'Изменить акт возврата' : 'Сформировать акт возврата'}
                      </button>
                    </>
                  )}
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

      {/* МОДАЛКА ОТКЛОНЕНИЯ ЗАЯВКИ */}
      {rejectOrderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">Отклонить заявку</h3>
              <button onClick={() => setRejectOrderItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-body text-sm text-muted-foreground">{rejectOrderItem.name as string} — {rejectOrderItem.phone as string}</p>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Причина отклонения</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Например: нет в наличии нужного количества, клиент не подтвердил бронь..."
                  rows={4}
                  className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleRejectSave} disabled={rejectSaving || !rejectReason.trim()} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-none font-body">
                {rejectSaving ? 'Сохраняем...' : 'Отклонить заявку'}
              </Button>
              <Button variant="outline" onClick={() => setRejectOrderItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА КОММЕНТАРИЯ ПРИ ПЕРЕВОДЕ "В РАБОТЕ" */}
      {processingOrderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">Перевести «В работе»</h3>
              <button onClick={() => setProcessingOrderItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-body text-sm text-muted-foreground">{processingOrderItem.name as string} — {processingOrderItem.phone as string}</p>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Комментарий для клиента (необязательно)</label>
                <textarea
                  value={processingComment}
                  onChange={(e) => setProcessingComment(e.target.value)}
                  placeholder="Например: уточните удобное время получения, подтвердите адрес доставки..."
                  rows={4}
                  className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
                />
                <p className="font-body text-xs text-muted-foreground mt-1">Комментарий будет отправлен клиенту вместе с уведомлением о статусе.</p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleProcessingSave} disabled={processingSaving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {processingSaving ? 'Сохраняем...' : 'Перевести в работу'}
              </Button>
              <Button variant="outline" onClick={() => setProcessingOrderItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ЗАЯВКИ */}
      {deleteOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Удалить заявку?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">Заявка будет полностью удалена из базы данных без возможности восстановления. Если по ней списан инструмент — остаток вернётся на склад.</p>
            <div className="flex gap-3">
              <Button onClick={() => handleDeleteOrder(deleteOrderId)} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-none font-body">Удалить</Button>
              <Button variant="outline" onClick={() => setDeleteOrderId(null)} className="flex-1 rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ЗАВЕРШЕНИЯ С РЕШЕНИЕМ ПО ЗАЛОГУ */}
      {depositOrderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">
                {depositMode === 'full' ? 'Завершение с возвратом залога' : 'Завершение без возврата / с частичным возвратом залога'}
              </h3>
              <button onClick={() => setDepositOrderItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="font-body text-sm text-muted-foreground">{depositOrderItem.name as string} — {depositOrderItem.phone as string}</p>

              {depositResolution.length === 0 && (
                <p className="font-body text-sm text-muted-foreground">По этой заявке залог не взимался.</p>
              )}

              {depositMode === 'full' ? (
                <div className="space-y-2">
                  {depositResolution.map((r) => (
                    <div key={r.toolId} className="flex items-center justify-between border border-border px-3 py-2">
                      <span className="font-body text-sm">{r.name}</span>
                      <span className="font-body text-sm font-semibold text-green-700">{r.amount.toLocaleString('ru')} ₽</span>
                    </div>
                  ))}
                  {depositResolution.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-body font-medium">Итого к возврату</span>
                      <span className="font-display font-bold text-xl">{depositResolution.reduce((s, r) => s + r.amount, 0).toLocaleString('ru')} ₽</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {depositResolution.map((r, i) => (
                    <div key={r.toolId} className="border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-body text-sm font-medium">{r.name}</span>
                        <span className="font-body text-xs text-muted-foreground">Залог: {r.amount.toLocaleString('ru')} ₽</span>
                      </div>
                      <div className="flex gap-1 bg-secondary p-1 w-fit">
                        <button
                          onClick={() => { const next = [...depositResolution]; next[i] = { ...next[i], refunded: true, reason: '', evidence: [] }; setDepositResolution(next); }}
                          className={`font-body text-xs px-3 py-1.5 transition-colors ${r.refunded ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Вернуть
                        </button>
                        <button
                          onClick={() => { const next = [...depositResolution]; next[i] = { ...next[i], refunded: false }; setDepositResolution(next); }}
                          className={`font-body text-xs px-3 py-1.5 transition-colors ${!r.refunded ? 'bg-destructive text-white' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Не возвращать
                        </button>
                      </div>
                      {!r.refunded && (
                        <div className="space-y-2 pt-1">
                          <textarea
                            value={r.reason || ''}
                            onChange={(e) => { const next = [...depositResolution]; next[i] = { ...next[i], reason: e.target.value }; setDepositResolution(next); }}
                            placeholder="Комментарий: причина невозврата залога..."
                            rows={2}
                            className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
                          />
                          <div>
                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              id={`evidence-${i}`}
                              className="hidden"
                              onChange={(e) => handleEvidenceUpload(i, e.target.files)}
                            />
                            <label htmlFor={`evidence-${i}`} className="inline-flex items-center gap-1.5 font-body text-xs px-3 py-1.5 border border-border text-muted-foreground hover:border-foreground hover:text-foreground cursor-pointer transition-colors">
                              {evidenceUploading === i ? (
                                <><div className="animate-spin w-3 h-3 border-2 border-accent border-t-transparent rounded-full" /> Загружаем...</>
                              ) : (
                                <><Icon name="Upload" size={13} /> Приложить фото/видео доказательство</>
                              )}
                            </label>
                            {!!r.evidence?.length && (
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {r.evidence.map((url, j) => (
                                  url.match(/\.(mp4|mov|webm)$/i)
                                    ? <video key={j} src={url} controls className="w-16 h-16 object-cover bg-secondary" />
                                    : <img key={j} src={url} alt="" className="w-16 h-16 object-cover bg-secondary" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {depositResolution.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-body font-medium">Итого к возврату</span>
                      <span className="font-display font-bold text-xl">{depositResolution.filter((r) => r.refunded).reduce((s, r) => s + r.amount, 0).toLocaleString('ru')} ₽</span>
                    </div>
                  )}
                </div>
              )}

              {(depositOrderItem.paymentMethod === 'online') && depositResolution.some((r) => r.refunded) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2">
                  <Icon name="Info" size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="font-body text-xs text-amber-700">
                    Оплата была онлайн через ЮKassa. После сохранения проведите возврат вручную в личном кабинете ЮKassa,
                    затем подтвердите это в системе кнопкой «Подтвердить возврат» — клиенту придёт уведомление.
                  </p>
                </div>
              )}

              {!(depositOrderItem.paymentMethod === 'online') && depositResolution.some((r) => r.refunded) && (
                <p className="font-body text-xs text-muted-foreground">Оплата была не онлайн — верните залог клиенту наличными или переводом самостоятельно.</p>
              )}
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleDepositSave} disabled={depositSaving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {depositSaving ? 'Сохраняем...' : 'Завершить заявку'}
              </Button>
              <Button variant="outline" onClick={() => setDepositOrderItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ ФАКТИЧЕСКОГО ВОЗВРАТА СРЕДСТВ */}
      {confirmRefundOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Подтвердить возврат средств?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Убедитесь, что вы уже провели возврат в личном кабинете ЮKassa. После подтверждения клиенту придёт уведомление о возврате.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => handleConfirmRefund(confirmRefundOrderId)} disabled={confirmRefundSaving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {confirmRefundSaving ? 'Сохраняем...' : 'Да, возврат выполнен'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmRefundOrderId(null)} className="flex-1 rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ АКТА ПРИЁМА-ПЕРЕДАЧИ / ВОЗВРАТА */}
      {actOrderItem && actData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">
                {actKind === 'handover' ? 'Акт приёма-передачи' : 'Акт возврата'} — заявка №{actOrderItem.id as number}
              </h3>
              <button onClick={() => { setActOrderItem(null); setActData(null); }} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Представитель арендодателя</label>
                  <Input value={actData.representativeName} onChange={(e) => setActData({ ...actData, representativeName: e.target.value })} placeholder="ФИО менеджера" className="rounded-none font-body" />
                </div>
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">ФИО клиента</label>
                  <Input value={actData.clientFullName} onChange={(e) => setActData({ ...actData, clientFullName: e.target.value })} className="rounded-none font-body" />
                </div>
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Паспортные данные клиента</label>
                <Input value={actData.clientPassport} onChange={(e) => setActData({ ...actData, clientPassport: e.target.value })} placeholder="серия, номер, кем выдан" className="rounded-none font-body" />
              </div>

              <div>
                <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Состав инструмента</div>
                <div className="space-y-2">
                  {actData.items.map((it, i) => (
                    <div key={i} className="border border-border p-3 grid grid-cols-[1fr_auto] gap-2 items-start">
                      <div className="font-body text-sm font-medium pt-2">{it.name} <span className="text-muted-foreground">× {it.qty}</span></div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Input
                          value={it.inventoryNumber || ''}
                          onChange={(e) => {
                            const next = [...actData.items];
                            next[i] = { ...next[i], inventoryNumber: e.target.value };
                            setActData({ ...actData, items: next });
                          }}
                          placeholder="Инв. номер"
                          className="rounded-none font-body text-sm w-32"
                        />
                        <Input
                          value={it.state}
                          onChange={(e) => {
                            const next = [...actData.items];
                            next[i] = { ...next[i], state: e.target.value };
                            setActData({ ...actData, items: next });
                          }}
                          placeholder="Состояние"
                          className="rounded-none font-body text-sm w-56"
                        />
                      </div>
                    </div>
                  ))}
                  {actData.items.length === 0 && <p className="font-body text-sm text-muted-foreground">В заявке нет позиций</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Сумма залога, ₽</label>
                  <Input type="number" value={actData.depositTotal} onChange={(e) => setActData({ ...actData, depositTotal: parseInt(e.target.value) || 0 })} className="rounded-none font-body" />
                </div>
                {actKind === 'return' && (
                  <>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Удержано, ₽</label>
                      <Input type="number" value={actData.depositWithheld || 0} onChange={(e) => setActData({ ...actData, depositWithheld: parseInt(e.target.value) || 0 })} className="rounded-none font-body" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Возвращено, ₽</label>
                      <Input type="number" value={actData.depositReturned || 0} onChange={(e) => setActData({ ...actData, depositReturned: parseInt(e.target.value) || 0 })} className="rounded-none font-body" />
                    </div>
                  </>
                )}
              </div>

              {actKind === 'return' && (
                <div>
                  <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Выявленные повреждения (необязательно)</label>
                  <textarea
                    value={actData.damageNotes || ''}
                    onChange={(e) => setActData({ ...actData, damageNotes: e.target.value })}
                    rows={2}
                    className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
                  />
                </div>
              )}

              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Примечания</label>
                <textarea
                  value={actData.notes}
                  onChange={(e) => setActData({ ...actData, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-none border border-input bg-background px-3 py-2 font-body text-sm resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleActSave} disabled={actSaving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {actSaving ? 'Формируем PDF...' : 'Сохранить и сформировать PDF'}
              </Button>
              <Button variant="outline" onClick={() => { setActOrderItem(null); setActData(null); }} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}