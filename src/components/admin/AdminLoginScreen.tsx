import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface AdminLoginScreenProps {
  login: string;
  setLogin: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  authError: string;
  authLoading: boolean;
  handleLogin: () => void;
}

export default function AdminLoginScreen({
  login, setLogin, password, setPassword, authError, authLoading, handleLogin,
}: AdminLoginScreenProps) {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      <div className="bg-card border border-border p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent flex items-center justify-center">
            <Icon name="Wrench" size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl">Строй_Rent</span>
        </div>
        <h1 className="font-display font-bold text-3xl mb-6">Панель управления</h1>
        <div className="space-y-3">
          <Input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" className="rounded-none h-12 font-body" />
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} placeholder="Пароль" className="rounded-none h-12 font-body" />
          {authError && <p className="font-body text-sm text-destructive">{authError}</p>}
          <Button onClick={handleLogin} disabled={authLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-none h-12 font-body">
            {authLoading ? 'Вход...' : 'Войти'}
          </Button>
        </div>
      </div>
    </div>
  );
}
