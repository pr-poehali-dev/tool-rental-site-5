import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

interface ImageSliderProps {
  images: string[];
  alt: string;
  className?: string;
  autoPlayOnHover?: boolean;
  intervalMs?: number;
}

export default function ImageSlider({
  images,
  alt,
  className = '',
  autoPlayOnHover = true,
  intervalMs = 1200,
}: ImageSliderProps) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = images.length;

  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);

  // Автоплей при наведении
  useEffect(() => {
    if (autoPlayOnHover && hovered && total > 1) {
      timerRef.current = setInterval(next, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hovered, autoPlayOnHover, total, next, intervalMs]);

  // Сброс при уходе мыши
  const handleMouseLeave = () => {
    setHovered(false);
    setIdx(0);
  };

  if (!images || images.length === 0) {
    return <div className={`bg-secondary ${className}`} />;
  }

  if (total === 1) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={images[0]} alt={alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Фото */}
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`${alt} ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Стрелки — видны при наведении */}
      {hovered && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        </>
      )}

      {/* Точки-индикаторы */}
      {total > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'bg-white w-3' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
