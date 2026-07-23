import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { AnalyticsSummary } from '@/api';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface AdminAnalyticsSectionProps {
  analytics: AnalyticsSummary | null;
  loading: boolean;
  year: number | undefined;
  setYear: (v: number | undefined) => void;
  month: number | undefined;
  setMonth: (v: number | undefined) => void;
  onReset: () => void;
  confirmReset: boolean;
  setConfirmReset: (v: boolean) => void;
  resetting: boolean;
  handleReset: () => void;
}

export default function AdminAnalyticsSection({
  analytics, loading, year, setYear, month, setMonth,
  onReset, confirmReset, setConfirmReset, resetting, handleReset,
}: AdminAnalyticsSectionProps) {
  const currentYear = new Date().getFullYear();
  const availableYears = analytics?.availableYears?.length ? analytics.availableYears : [currentYear];

  const chartData = (analytics?.daily || []).map((d) => ({
    ...d,
    label: analytics?.granularity === 'month'
      ? new Date(d.date).toLocaleDateString('ru', { month: 'short', year: 'numeric' })
      : new Date(d.date).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }),
  }));

  const cards = analytics ? [
    { label: 'Всего визитов', value: analytics.totalVisits.toLocaleString('ru'), icon: 'MousePointerClick' },
    { label: 'Уникальных посетителей', value: analytics.uniqueVisitors.toLocaleString('ru'), icon: 'Users' },
    { label: 'Всего заявок', value: analytics.totalOrders.toLocaleString('ru'), icon: 'ClipboardList' },
    { label: 'Конверсия в заявку', value: `${analytics.conversionRate}%`, icon: 'TrendingUp', highlight: true },
  ] : [];

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h2 className="font-display font-bold text-2xl">Аналитика посещаемости</h2>
        <Button variant="outline" onClick={onReset} className="rounded-none font-body text-destructive border-destructive/40 hover:bg-destructive/10 gap-2">
          <Icon name="Trash2" size={15} /> Сбросить статистику
        </Button>
      </div>

      {/* ФИЛЬТРЫ ПО ГОДУ И МЕСЯЦУ */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-background border border-border p-1">
          <button onClick={() => { setYear(undefined); setMonth(undefined); }}
            className={`font-body text-sm px-3 py-1.5 transition-colors ${!year ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
            Всё время
          </button>
          {availableYears.map((y) => (
            <button key={y} onClick={() => { setYear(y); setMonth(undefined); }}
              className={`font-body text-sm px-3 py-1.5 transition-colors ${year === y && !month ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
              {y}
            </button>
          ))}
        </div>

        {year && (
          <select
            value={month ?? ''}
            onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value) : undefined)}
            className="h-9 px-3 border border-input bg-background font-body text-sm rounded-none"
          >
            <option value="">Весь год</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        )}
      </div>

      {loading || !analytics ? (
        <div className="flex items-center gap-3 text-muted-foreground font-body">
          <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((c) => (
              <div key={c.label} className={`bg-background border border-border p-5 ${c.highlight ? 'border-accent' : ''}`}>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Icon name={c.icon} size={15} />
                  <span className="font-body text-xs uppercase tracking-widest">{c.label}</span>
                </div>
                <div className={`font-display font-bold text-3xl ${c.highlight ? 'text-accent' : ''}`}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-background border border-border p-6">
            <h3 className="font-display font-semibold text-lg mb-4">
              {month && year ? `Динамика за ${MONTHS[month - 1].toLowerCase()} ${year}` : year ? `Динамика по месяцам за ${year} год` : 'Динамика за последние 30 дней'}
            </h3>
            {analytics.totalVisits === 0 ? (
              <p className="font-body text-sm text-muted-foreground text-center py-12">Пока нет данных о посещениях</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 0, fontSize: 12, fontFamily: 'inherit' }}
                    labelFormatter={(label) => `${chartData.length && analytics.granularity === 'month' ? '' : 'Дата: '}${label}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'inherit' }} />
                  <Line type="monotone" dataKey="visits" name="Визиты" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="uniqueVisitors" name="Уникальные" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="orders" name="Заявки" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {/* ПОДТВЕРЖДЕНИЕ СБРОСА СТАТИСТИКИ */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Сбросить статистику посещений?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Все накопленные данные о визитах будут удалены без возможности восстановления. Заявки клиентов затронуты не будут.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleReset} disabled={resetting} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-none font-body">
                {resetting ? 'Сбрасываем...' : 'Да, сбросить'}
              </Button>
              <Button variant="outline" onClick={() => setConfirmReset(false)} className="flex-1 rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
