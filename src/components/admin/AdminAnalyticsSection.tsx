import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icon from '@/components/ui/icon';
import { AnalyticsSummary } from '@/api';

interface AdminAnalyticsSectionProps {
  analytics: AnalyticsSummary | null;
  loading: boolean;
}

export default function AdminAnalyticsSection({ analytics, loading }: AdminAnalyticsSectionProps) {
  if (loading || !analytics) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground font-body">
        <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" /> Загрузка...
      </div>
    );
  }

  const chartData = analytics.daily.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }),
  }));

  const cards = [
    { label: 'Всего визитов', value: analytics.totalVisits.toLocaleString('ru'), icon: 'MousePointerClick' },
    { label: 'Уникальных посетителей', value: analytics.uniqueVisitors.toLocaleString('ru'), icon: 'Users' },
    { label: 'Всего заявок', value: analytics.totalOrders.toLocaleString('ru'), icon: 'ClipboardList' },
    { label: 'Конверсия в заявку', value: `${analytics.conversionRate}%`, icon: 'TrendingUp', highlight: true },
  ];

  return (
    <>
      <h2 className="font-display font-bold text-2xl mb-6">Аналитика посещаемости</h2>

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
        <h3 className="font-display font-semibold text-lg mb-4">Динамика за последние 30 дней</h3>
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
                labelFormatter={(label) => `Дата: ${label}`}
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
  );
}