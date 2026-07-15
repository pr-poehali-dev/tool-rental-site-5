import Icon from '@/components/ui/icon';

export default function SiteFooter() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent flex items-center justify-center">
            <Icon name="Wrench" size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-2xl">Строй_Rent</span>
        </div>
        <div className="font-body text-sm text-background/50">
          © 2026 Строй_Rent. Аренда строительного инструмента и спецтехники.
        </div>
      </div>
      <div className="container mt-6 pt-6 border-t border-background/10">
        <div className="font-body text-xs text-background/40 leading-relaxed">
          ИП Максимова Алина Николаевна · ОГРН 326508100407884 · ИНН 360203243703
        </div>
      </div>
    </footer>
  );
}
