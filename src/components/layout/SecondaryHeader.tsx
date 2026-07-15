import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

interface SecondaryHeaderProps {
  backTo?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

export default function SecondaryHeader({ backTo = '/', backLabel = 'На главную', children }: SecondaryHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-background border-b border-border sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        <button onClick={() => navigate('/')} className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent flex items-center justify-center">
            <Icon name="Wrench" size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg">Строй_Rent</span>
        </button>
        {children ?? (
          <button onClick={() => navigate(backTo)} className="font-body text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <Icon name="ArrowLeft" size={15} /> {backLabel}
          </button>
        )}
      </div>
    </header>
  );
}
