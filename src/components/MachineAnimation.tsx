interface MachineAnimationProps {
  name: string;
  className?: string;
}

/** Определяет тип анимации по названию спецтехники. */
function resolveType(name: string): 'excavator' | 'truck-tent' | 'crane' {
  const n = name.toLowerCase();
  if (n.includes('экскаватор')) return 'excavator';
  if (n.includes('тент')) return 'truck-tent';
  return 'crane';
}

function ExcavatorScene() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Земля */}
      <line x1="20" y1="250" x2="380" y2="250" className="stroke-foreground/30" strokeWidth="2" />
      {/* Куча грунта — растёт при копании */}
      <g className="origin-[120px_248px] machine-anim-dirt-pile">
        <ellipse cx="120" cy="246" rx="34" ry="10" className="fill-accent/25" />
        <ellipse cx="100" cy="248" rx="18" ry="7" className="fill-accent/35" />
      </g>
      {/* Гусеницы */}
      <rect x="230" y="215" width="110" height="22" rx="10" className="fill-foreground/80" />
      <circle cx="248" cy="237" r="10" className="fill-foreground/60" />
      <circle cx="322" cy="237" r="10" className="fill-foreground/60" />
      {/* Корпус */}
      <rect x="245" y="175" width="80" height="45" rx="4" className="fill-foreground/80" />
      <rect x="255" y="160" width="40" height="20" rx="3" className="fill-foreground/70" />
      {/* Стрела (boom) */}
      <g className="origin-[277px_185px] machine-anim-excavator-boom">
        <rect x="270" y="140" width="14" height="50" rx="4" className="fill-foreground/80" transform="rotate(-35 277 185)" />
        {/* Рукоять (stick) */}
        <g className="origin-[230px_150px] machine-anim-excavator-arm">
          <rect x="225" y="120" width="10" height="55" rx="4" className="fill-foreground/70" transform="rotate(45 230 150)" />
          {/* Ковш (bucket) */}
          <g className="origin-[195px_170px] machine-anim-excavator-bucket">
            <path d="M180 165 L210 165 L205 190 L185 190 Z" className="fill-accent" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function TruckTentScene() {
  const boxes = [
    { x: 250, y: 195, w: 46, h: 38, delay: '0s' },
    { x: 300, y: 195, w: 46, h: 38, delay: '0.35s' },
    { x: 250, y: 150, w: 46, h: 38, delay: '0.7s' },
    { x: 300, y: 150, w: 46, h: 38, delay: '1.05s' },
  ];
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Земля */}
      <line x1="20" y1="250" x2="380" y2="250" className="stroke-foreground/30" strokeWidth="2" />
      {/* Кабина */}
      <rect x="60" y="180" width="70" height="55" rx="5" className="fill-foreground/80" />
      <rect x="70" y="150" width="45" height="35" rx="4" className="fill-foreground/70" />
      {/* Кузов-тент (каркас) */}
      <rect x="230" y="140" width="140" height="95" rx="4" className="stroke-foreground/50 fill-none" strokeWidth="3" strokeDasharray="6 5" />
      {/* Колёса */}
      <circle cx="90" cy="238" r="14" className="fill-foreground/60" />
      <circle cx="290" cy="238" r="14" className="fill-foreground/60" />
      <circle cx="340" cy="238" r="14" className="fill-foreground/60" />
      {/* Коробки — появляются по очереди */}
      {boxes.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx="3"
          className="fill-accent/70 opacity-0 machine-anim-box-pop"
          style={{ animationDelay: b.delay }}
        />
      ))}
    </svg>
  );
}

function CraneTruckScene() {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Земля */}
      <line x1="20" y1="250" x2="380" y2="250" className="stroke-foreground/30" strokeWidth="2" />
      {/* Кузов грузовика */}
      <rect x="120" y="190" width="180" height="45" rx="4" className="fill-foreground/80" />
      <rect x="60" y="170" width="60" height="65" rx="5" className="fill-foreground/70" />
      {/* Колёса */}
      <circle cx="90" cy="238" r="14" className="fill-foreground/60" />
      <circle cx="220" cy="238" r="14" className="fill-foreground/60" />
      <circle cx="270" cy="238" r="14" className="fill-foreground/60" />
      {/* Кран (манипулятор) — качается */}
      <g className="origin-[170px_190px] machine-anim-crane-arm">
        <rect x="165" y="120" width="10" height="70" rx="3" className="fill-foreground/80" />
        {/* Груз на крюке */}
        <g className="origin-[170px_190px] machine-anim-crane-hook">
          <line x1="170" y1="190" x2="170" y2="215" className="stroke-foreground/50" strokeWidth="2" />
          <rect x="158" y="215" width="24" height="18" rx="2" className="fill-accent" />
        </g>
      </g>
    </svg>
  );
}

export default function MachineAnimation({ name, className = '' }: MachineAnimationProps) {
  const type = resolveType(name);
  return (
    <div className={`absolute inset-0 bg-card opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${className}`}>
      {type === 'excavator' && <ExcavatorScene />}
      {type === 'truck-tent' && <TruckTentScene />}
      {type === 'crane' && <CraneTruckScene />}
    </div>
  );
}