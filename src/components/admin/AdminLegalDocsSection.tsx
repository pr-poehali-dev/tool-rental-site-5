import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { LegalDocument, uploadLegalDoc, addLegalDocument, deleteLegalDocument } from '@/api';

interface AdminLegalDocsSectionProps {
  documents: LegalDocument[];
  token: string;
  onChange: () => void;
}

export default function AdminLegalDocsSection({ documents, token, onChange }: AdminLegalDocsSectionProps) {
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (!title.trim()) {
      setError('Сначала укажите название документа');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const { url, fileType } = await uploadLegalDoc(token, files[0]);
      await addLegalDocument(token, title.trim(), url, fileType);
      setTitle('');
      onChange();
    } catch (e: unknown) {
      setError((e as Error).message || 'Ошибка загрузки');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id: number) => {
    await deleteLegalDocument(token, id);
    setDeleteId(null);
    onChange();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl">Документы — «Условия аренды»</h2>
      </div>

      {/* Добавление нового документа */}
      <div className="bg-background border border-border p-5 mb-6">
        <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-3">Добавить документ</div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название документа (например: Образец договора аренды)"
              className="rounded-none font-body h-11"
            />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-none font-body gap-2 h-11"
            >
              {uploading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
                  Загружаем...
                </>
              ) : (
                <>
                  <Icon name="Upload" size={15} />
                  Загрузить файл (PDF, JPG, PNG)
                </>
              )}
            </Button>
          </div>
        </div>
        {error && <p className="font-body text-xs text-destructive mt-2">{error}</p>}
      </div>

      {/* Список документов */}
      <div className="space-y-2">
        {documents.length === 0 && (
          <div className="bg-background border border-border p-12 text-center text-muted-foreground font-body">
            Документы пока не добавлены
          </div>
        )}
        {documents.map((doc) => (
          <div key={doc.id} className="bg-background border border-border p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center shrink-0">
              <Icon name={doc.fileType === 'pdf' ? 'FileText' : 'Image'} size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-base leading-tight truncate">{doc.title}</div>
              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="font-body text-xs text-muted-foreground hover:text-accent inline-flex items-center gap-1 mt-0.5">
                <Icon name="ExternalLink" size={11} /> Открыть файл
              </a>
            </div>
            <button onClick={() => setDeleteId(doc.id)}
              className="p-2 hover:bg-destructive/10 text-destructive border border-border rounded transition-colors shrink-0"
              title="Удалить документ">
              <Icon name="Trash2" size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Подтверждение удаления */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Удалить документ?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">Документ будет удалён из раздела «Условия аренды» на сайте.</p>
            <div className="flex gap-3">
              <Button onClick={() => handleDelete(deleteId)} className="flex-1 bg-destructive hover:bg-destructive/90 text-white rounded-none font-body">Удалить</Button>
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
