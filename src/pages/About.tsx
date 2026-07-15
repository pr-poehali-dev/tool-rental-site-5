import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import SecondaryHeader from '@/components/layout/SecondaryHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SecondaryHeader />

      <section className="py-24 bg-foreground text-background">
        <div className="container grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="font-body text-sm uppercase tracking-widest text-accent mb-3">О компании</div>
            <h1 className="font-display font-bold text-5xl md:text-6xl tracking-tight mb-8">Начинаем свой путь с качества и доверия</h1>
            <p className="font-body text-lg text-background/70 mb-6">Мы — команда, которая понимает стройку изнутри. Предоставляем в аренду только проверенное профессиональное оборудование ведущих брендов.</p>
            <p className="font-body text-lg text-background/70">Каждый инструмент проходит техобслуживание перед выдачей. Вы получаете надёжную технику, готовую к работе.</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-background/10">
            {[{ icon: 'ShieldCheck', t: 'Гарантия', d: 'Проверенная техника' }, { icon: 'Truck', t: 'Доставка', d: 'По всему городу' }, { icon: 'Clock', t: 'Скорость', d: 'Выдача за 15 минут' }, { icon: 'Wallet', t: 'Цены', d: 'Без переплат' }].map((f, i) => (
              <div key={i} className="bg-foreground p-8">
                <Icon name={f.icon} size={32} className="text-accent mb-4" />
                <div className="font-display font-semibold text-xl mb-1">{f.t}</div>
                <div className="font-body text-sm text-background/60">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 divide-x divide-border border border-border">
            {[{ n: '200+', l: 'единиц техники' }, { n: '24/7', l: 'поддержка' }, { n: '1 час', l: 'на доставку' }, { n: '5 лет', l: 'на рынке' }].map((s, i) => (
              <div key={i} className="py-8 px-4 md:px-8">
                <div className="font-display font-semibold text-4xl">{s.n}</div>
                <div className="font-body text-sm text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary">
        <div className="container text-center">
          <Button onClick={() => navigate('/')} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 px-8 font-body gap-2">
            Перейти в каталог <Icon name="ArrowRight" size={16} />
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}