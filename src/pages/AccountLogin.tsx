import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestClientCode, verifyClientCode } from '@/api';
import { useClientAuth } from '@/hooks/useClientAuth';

type Channel = 'email' | 'phone';
type Step = 'contact' | 'code';

export default function AccountLogin() {
  const navigate = useNavigate();
  const { login } = useClientAuth();

  const [channel, setChannel] = useState<Channel>('email');
  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const phoneValid = contact.replace(/\D/g, '').length >= 10;
  const contactValid = channel === 'email' ? emailValid : phoneValid;

  const handleRequestCode = async () => {
    if (!contactValid) return;
    setSending(true);
    setError('');
    const res = await requestClientCode(channel, contact, fullName.trim());
    setSending(false);
    if (res.ok) {
      setStep('code');
    } else {
      setError(res.data.error || 'Не удалось отправить код. Попробуйте снова');
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) return;
    setSending(true);
    setError('');
    const res = await verifyClientCode(channel, contact, code.trim());
    setSending(false);
    if (res.ok && res.data.token) {
      login(res.data.token, res.data.client);
      navigate('/account');
    } else {
      setError(res.data.error || 'Неверный код');
    }
  };

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
          <button onClick={() => navigate('/')} className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={15} /> На главную
          </button>
        </div>
      </header>

      <div className="container py-16 max-w-md">
        <div className="bg-background border border-border p-8">
          <h1 className="font-display font-bold text-2xl mb-1">
            {step === 'contact' ? 'Вход и регистрация' : 'Подтверждение'}
          </h1>
          <p className="font-body text-sm text-muted-foreground mb-6">
            {step === 'contact'
              ? 'Если аккаунта ещё нет — он будет создан автоматически'
              : `Мы отправили код на ${contact}`}
          </p>

          {step === 'contact' && (
            <>
              <div className="flex gap-1 mb-5 bg-secondary p-1 w-fit">
                {([['email', 'Email', 'Mail'], ['phone', 'Телефон', 'Phone']] as [Channel, string, string][]).map(([key, label, icon]) => (
                  <button
                    key={key}
                    onClick={() => { setChannel(key); setContact(''); setError(''); }}
                    className={`flex items-center gap-1.5 px-4 py-2 font-body text-sm transition-colors ${channel === key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Icon name={icon} size={14} /> {label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <Input
                  type={channel === 'email' ? 'email' : 'tel'}
                  value={contact}
                  onChange={(e) => setContact(channel === 'phone' ? e.target.value.replace(/[^\d+]/g, '') : e.target.value)}
                  placeholder={channel === 'email' ? 'you@example.com' : '+7 900 000-00-00'}
                  className="rounded-none h-12 font-body"
                />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ваше имя (необязательно)"
                  className="rounded-none h-12 font-body"
                />
                {error && <p className="font-body text-xs text-destructive">{error}</p>}
                <Button
                  onClick={handleRequestCode}
                  disabled={!contactValid || sending}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body"
                >
                  {sending ? 'Отправляем...' : 'Получить код'}
                </Button>
              </div>
            </>
          )}

          {step === 'code' && (
            <div className="space-y-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="rounded-none h-12 font-body text-center text-lg tracking-[0.5em]"
                maxLength={6}
              />
              {error && <p className="font-body text-xs text-destructive">{error}</p>}
              <Button
                onClick={handleVerify}
                disabled={code.trim().length < 4 || sending}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body"
              >
                {sending ? 'Проверяем...' : 'Войти'}
              </Button>
              <button
                onClick={() => { setStep('contact'); setCode(''); setError(''); }}
                className="w-full font-body text-sm text-muted-foreground hover:text-foreground text-center py-2"
              >
                Изменить {channel === 'email' ? 'email' : 'телефон'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
