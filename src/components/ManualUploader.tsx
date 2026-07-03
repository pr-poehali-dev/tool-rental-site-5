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
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_PDF_MB = 3;

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError('');
    if (file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`Файл слишком большой (макс. ${MAX_PDF_MB} МБ). Сожмите PDF или вставьте ссылку на файл ниже`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPdf(token, file);
      onChangePdf(url);
    } catch (e: unknown) {
      setError((e as Error).message || 'Ошибка загрузки. Проверьте интернет-соединение и попробуйте снова');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleUrlAdd = () => {
    const url = urlInput.trim();
    if (!url) return;
    setError('');
    if (!/^https?:\/\//i.test(url)) {
      setError('Ссылка должна начинаться с http:// или https://');
      return;
    }
    onChangePdf(url);
    setUrlInput('');
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
        {!pdfUrl && !error && <p className="font-body text-xs text-muted-foreground mt-1">Максимум {MAX_PDF_MB} МБ</p>}

        {!pdfUrl && (
          <div className="flex gap-2 mt-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
              placeholder="Или вставить ссылку на PDF (Я.Диск, Google Drive и т.д.)"
              className="rounded-none font-body text-xs h-10 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUrlAdd}
              disabled={!urlInput.trim()}
              className="rounded-none font-body text-sm gap-1.5 shrink-0 h-10 px-3"
            >
              <Icon name="Link" size={14} /> Добавить
            </Button>
          </div>
        )}
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