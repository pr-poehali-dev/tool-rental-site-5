import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { uploadImageBase64, uploadImageUrl } from '@/api';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  token: string;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, token, maxImages = 5 }: ImageUploaderProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState<number | null>(null); // индекс загружаемого
  const [urlUploading, setUrlUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addImages = (urls: string[]) => {
    const merged = [...images, ...urls].slice(0, maxImages);
    onChange(merged);
  };

  const removeImage = (i: number) => {
    onChange(images.filter((_, j) => j !== i));
  };

  const moveLeft = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveRight = (i: number) => {
    if (i === images.length - 1) return;
    const next = [...images];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setError('');
    const slots = maxImages - images.length;
    const toUpload = Array.from(files).slice(0, slots);
    const uploaded: string[] = [];
    for (let i = 0; i < toUpload.length; i++) {
      setUploading(i);
      try {
        const url = await uploadImageBase64(token, toUpload[i]);
        uploaded.push(url);
      } catch (e: unknown) {
        setError((e as Error).message || 'Ошибка загрузки');
      }
    }
    setUploading(null);
    if (uploaded.length) addImages(uploaded);
  };

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return;
    setError('');
    setUrlUploading(true);
    try {
      const url = await uploadImageUrl(token, urlInput.trim());
      addImages([url]);
      setUrlInput('');
    } catch (e: unknown) {
      setError((e as Error).message || 'Не удалось загрузить по URL');
    }
    setUrlUploading(false);
  };

  const canAdd = images.length < maxImages;

  return (
    <div className="space-y-3">
      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest block">
        Фото ({images.length}/{maxImages}) — первое главное
      </label>

      {/* Превью с управлением */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group w-20 h-20 border border-border">
              <img src={src} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
              {/* Первое фото — метка */}
              {i === 0 && (
                <div className="absolute top-0.5 left-0.5 bg-accent text-white text-[9px] px-1 font-body leading-4">
                  Гл.
                </div>
              )}
              {/* Контролы при наведении */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i > 0 && (
                  <button onClick={() => moveLeft(i)} className="w-5 h-5 bg-white/80 flex items-center justify-center hover:bg-white">
                    <Icon name="ChevronLeft" size={11} />
                  </button>
                )}
                <button onClick={() => removeImage(i)} className="w-5 h-5 bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                  <Icon name="X" size={11} />
                </button>
                {i < images.length - 1 && (
                  <button onClick={() => moveRight(i)} className="w-5 h-5 bg-white/80 flex items-center justify-center hover:bg-white">
                    <Icon name="ChevronRight" size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <>
          {/* Загрузка с диска */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading !== null}
              className="rounded-none font-body text-sm gap-2 w-full h-10"
            >
              {uploading !== null ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
                  Загружаем {uploading + 1}...
                </>
              ) : (
                <>
                  <Icon name="Upload" size={15} />
                  Загрузить с компьютера
                </>
              )}
            </Button>
          </div>

          {/* Загрузка по URL */}
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
              placeholder="Вставить ссылку на фото из интернета..."
              className="rounded-none font-body text-xs h-10 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUrlAdd}
              disabled={urlUploading || !urlInput.trim()}
              className="rounded-none font-body text-sm gap-1.5 shrink-0 h-10 px-3"
            >
              {urlUploading
                ? <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
                : <><Icon name="Link" size={14} /> Добавить</>
              }
            </Button>
          </div>
        </>
      )}

      {error && <p className="font-body text-xs text-destructive">{error}</p>}
      {!canAdd && <p className="font-body text-xs text-muted-foreground">Максимум {maxImages} фото</p>}
    </div>
  );
}
