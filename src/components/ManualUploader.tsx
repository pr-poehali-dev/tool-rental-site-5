import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { uploadPdf } from '@/api';

interface ManualUploaderProps {
  pdfUrl: string;
  videoUrl: string;
  onChangePdf: (url: string) => void;
  onChangeVideo: (url: string) => void;
  token: string;
}

export default function ManualUploader({ pdfUrl, videoUrl, onChangePdf, onChangeVideo, token }: ManualUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadPdf(token, file);
      onChangePdf(url);
    } catch (e: unknown) {
      setError((e as Error).message || 'Ошибка загрузки');
    }
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest block">
        Инструкция по эксплуатации
      </label>

      {/* PDF */}
      <div>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files)} />
        {pdfUrl ? (
          <div className="flex items-center gap-2 border border-border px-3 py-2">
            <Icon name="FileText" size={16} className="text-accent shrink-0" />
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="font-body text-sm truncate flex-1 hover:underline">{pdfUrl}</a>
            <button onClick={() => onChangePdf('')} className="text-muted-foreground hover:text-destructive shrink-0"><Icon name="X" size={14} /></button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-none font-body text-sm gap-2 w-full h-10"
          >
            {uploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
                Загружаем...
              </>
            ) : (
              <>
                <Icon name="Upload" size={15} />
                Загрузить PDF-инструкцию
              </>
            )}
          </Button>
        )}
        {error && <p className="font-body text-xs text-destructive mt-1">{error}</p>}
      </div>

      {/* Видео */}
      <div>
        <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Ссылка на видео (YouTube, VK Видео и т.д.)</label>
        <Input
          value={videoUrl}
          onChange={(e) => onChangeVideo(e.target.value)}
          placeholder="https://youtube.com/watch?v=... или https://vk.com/video..."
          className="rounded-none font-body text-sm"
        />
      </div>
    </div>
  );
}
