import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { getPublicOrder } from '@/api';

interface OrderCartItem {
  name: string;
  qty: number;
  days: number;
  price: number;
  deposit?: number;
}

interface PublicOrder {
  id: number;
  name: string;
  cart: OrderCartItem[];
  status: string;
  createdAt: string;
  dueAt: string | null;
  deliveryMethod: string;
  deliveryAddress: string;
  receiveDate: string | null;
  receiveTime: string;
  paymentMethod: string;
  rejectReason: string;
  extensions: { days: number; amount: number }[];
  adminComment: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  processing: 'В работе',
  done: 'Выполнена',
  returned: 'Возвращена',
  rejected: 'Отклонена',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
  returned: 'bg-gray-200 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_ICONS: Record<string, string> = {
  new: 'Clock',
  processing: 'Loader',
  done: 'CheckCircle',
  returned: 'CornerDownLeft',
  rejected: 'XCircle',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличными',
  card: 'Картой при получении',
  transfer: 'Перевод по счёту',
};

export default function OrderStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPublicOrder(id).then((data) => {
      if (data && data.id) setOrder(data);
      else setNotFound(true);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  const rentTotal = order?.cart?.reduce((sum, i) => sum + i.qty * i.days * i.price, 0) || 0;
  const depositTotal = order?.cart?.reduce((sum, i) => sum + (i.deposit || 0) * i.qty, 0) || 0;
  const total = rentTotal + depositTotal;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
        <div className="bg-background border border-border p-10 max-w-md w-full text-center">
          <Icon name="SearchX" size={40} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="font-display font-bold text-2xl mb-2">Заказ не найден</h1>
          <p className="font-body text-muted-foreground mb-6">Проверьте ссылку или обратитесь к менеджеру.</p>
          <Button onClick={() => navigate('/')} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
            На главную
          </Button>
        </div>
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
        </div>
      </header>

      <div className="container py-10 max-w-2xl">
        <div className="bg-background border border-border p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="font-body text-sm text-muted-foreground mb-1">Заявка №{order.id}</div>
              <h1 className="font-display font-bold text-2xl">{order.name}</h1>
            </div>
            <span className={`px-3 py-1.5 text-sm font-body rounded flex items-center gap-1.5 shrink-0 ${STATUS_COLORS[order.status] || 'bg-secondary text-muted-foreground'}`}>
              <Icon name={STATUS_ICONS[order.status] || 'Circle'} size={15} />
              {STATUS_LABELS[order.status] || order.status}
            </span>
          </div>

          {order.status === 'rejected' && order.rejectReason && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-4 py-3 mb-6">
              <Icon name="AlertTriangle" size={16} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-body text-sm font-medium text-red-700">Заявка отклонена</p>
                <p className="font-body text-sm text-red-600 mt-0.5">{order.rejectReason}</p>
              </div>
            </div>
          )}

          {order.adminComment && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-4 py-3 mb-6">
              <Icon name="MessageCircle" size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-body text-sm font-medium text-amber-700">Комментарий от менеджера</p>
                <p className="font-body text-sm text-amber-700 mt-0.5">{order.adminComment}</p>
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mb-6 font-body text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name={order.deliveryMethod === 'delivery' ? 'Truck' : 'Store'} size={15} />
              {order.deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз'}
              {order.deliveryMethod === 'delivery' && order.deliveryAddress ? `: ${order.deliveryAddress}` : ''}
            </div>
            {order.receiveDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="Calendar" size={15} />
                {new Date(order.receiveDate).toLocaleDateString('ru')}
                {order.receiveTime ? `, ${order.receiveTime}` : ''}
              </div>
            )}
            {order.paymentMethod && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="Wallet" size={15} />
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon name="CalendarClock" size={15} />
              Оформлена {new Date(order.createdAt).toLocaleString('ru')}
            </div>
          </div>

          {order.cart.length > 0 && (
            <div className="border-t border-border pt-5 mb-5">
              <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-3">Состав заказа</div>
              <div className="space-y-2">
                {order.cart.map((item, i) => (
                  <div key={i} className="flex items-center justify-between font-body text-sm">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.qty} шт × {item.days} дн × {item.price} ₽ = <strong className="text-foreground">{item.qty * item.days * item.price} ₽</strong>
                      {!!item.deposit && <span className="block text-xs text-right">+ залог {item.deposit * item.qty} ₽</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                <div className="flex items-center justify-between font-body text-sm text-muted-foreground">
                  <span>Аренда</span>
                  <span>{rentTotal.toLocaleString('ru')} ₽</span>
                </div>
                {depositTotal > 0 && (
                  <div className="flex items-center justify-between font-body text-sm text-muted-foreground">
                    <span>Залог (возвращается)</span>
                    <span>{depositTotal.toLocaleString('ru')} ₽</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-body font-medium">Итого к оплате</span>
                  <span className="font-display font-bold text-2xl">{total.toLocaleString('ru')} ₽</span>
                </div>
              </div>
            </div>
          )}

          {order.extensions.length > 0 && (
            <div className="border-t border-border pt-5 mb-5">
              <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-3">Продления аренды</div>
              <div className="space-y-1.5">
                {order.extensions.map((ext, i) => (
                  <div key={i} className="flex items-center justify-between font-body text-sm text-muted-foreground">
                    <span>+{ext.days} дн</span>
                    <span>{ext.amount.toLocaleString('ru')} ₽</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.status === 'done' && order.dueAt && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-3 mb-2 font-body text-sm text-blue-700">
              <Icon name="Timer" size={16} />
              Срок возврата: {new Date(order.dueAt).toLocaleString('ru')}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="font-body text-muted-foreground mb-4">Спасибо, что пользуетесь нашим сервисом!</p>
          <Button onClick={() => navigate('/')} variant="outline" className="rounded-none font-body gap-2">
            <Icon name="ArrowLeft" size={16} /> Вернуться на главную
          </Button>
        </div>
      </div>
    </div>
  );
}