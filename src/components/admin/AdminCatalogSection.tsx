import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import ImageUploader from '@/components/ImageUploader';

type Tab = 'tools' | 'parts' | 'machines' | 'orders' | 'clients';

const TOOL_CATEGORIES = ['Электроинструмент', 'Сварка', 'Ручной инструмент', 'Измерение', 'Электромонтаж', 'Сад и техника', 'Экипировка'];
const PART_CATEGORIES = ['Оснастка'];

interface AdminCatalogSectionProps {
  tab: Tab;
  items: Record<string, unknown>[];
  token: string;
  openEdit: (item: unknown) => void;
  openNew: () => void;
  setDeleteId: (id: number | null) => void;
  editItem: Record<string, unknown> | null;
  setEditItem: (item: Record<string, unknown> | null) => void;
  isNew: boolean;
  saving: boolean;
  handleSave: () => void;
  setField: (key: string, value: unknown) => void;
  deleteId: number | null;
  handleDelete: (id: number) => void;
}

export default function AdminCatalogSection({
  tab, items, token, openEdit, openNew, setDeleteId,
  editItem, setEditItem, isNew, saving, handleSave, setField,
  deleteId, handleDelete,
}: AdminCatalogSectionProps) {
  return (
    <>
      {/* Заголовок + кнопка добавления */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-2xl">
          {tab === 'tools' ? 'Инструменты для аренды' : tab === 'parts' ? 'Комплектующие (продажа)' : 'Спецтехника'}
          <span className="font-body text-base font-normal text-muted-foreground ml-3">{items.length} позиций</span>
        </h2>
        <Button onClick={openNew} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body gap-2">
          <Icon name="Plus" size={16} /> Добавить
        </Button>
      </div>

      {/* ИНСТРУМЕНТЫ / КОМПЛЕКТУЮЩИЕ */}
      {(tab === 'tools' || tab === 'parts') && (
        <div className="bg-background border border-border overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="text-left p-4 text-muted-foreground font-normal">Фото</th>
                <th className="text-left p-4 text-muted-foreground font-normal">Название</th>
                <th className="text-left p-4 text-muted-foreground font-normal">Категория</th>
                <th className="text-left p-4 text-muted-foreground font-normal">Цена</th>
                {tab === 'tools' && <th className="text-left p-4 text-muted-foreground font-normal">Залог</th>}
                <th className="text-left p-4 text-muted-foreground font-normal">В наличии</th>
                {tab === 'tools' && <th className="text-left p-4 text-muted-foreground font-normal">Всего</th>}
                <th className="text-left p-4 text-muted-foreground font-normal">Статус</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id as number} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                  <td className="p-4">
                    <img src={item.image as string} alt="" className="w-12 h-12 object-cover bg-secondary"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23f0f0f0"/></svg>'; }} />
                  </td>
                  <td className="p-4 font-medium max-w-[220px]">
                    <div className="truncate">{item.name as string}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.specs as string}</div>
                  </td>
                  <td className="p-4 text-muted-foreground">{item.category as string}</td>
                  <td className="p-4 font-display font-semibold">{item.price as number} ₽</td>
                  {tab === 'tools' && <td className="p-4 text-muted-foreground">{(item.deposit as number) > 0 ? `${item.deposit as number} ₽` : '—'}</td>}
                  <td className="p-4">
                    <span className={`font-semibold ${(item.stock as number) > 0 ? 'text-green-700' : 'text-red-500'}`}>{item.stock as number}</span>
                  </td>
                  {tab === 'tools' && <td className="p-4 text-muted-foreground">{item.totalStock as number}</td>}
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-xs ${(item.active as boolean) ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                      {(item.active as boolean) ? 'Активен' : 'Скрыт'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(item)} className="p-2 hover:bg-secondary rounded transition-colors"><Icon name="Pencil" size={15} /></button>
                      <button onClick={() => setDeleteId(item.id as number)} className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"><Icon name="Trash2" size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-12 text-center text-muted-foreground font-body">Нет позиций. Нажмите «Добавить».</div>}
        </div>
      )}

      {/* СПЕЦТЕХНИКА */}
      {tab === 'machines' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <div key={m.id as number} className="bg-background border border-border p-5">
              <img src={m.image as string} alt="" className="w-full aspect-[4/3] object-cover bg-secondary mb-4" />
              <div className="font-display font-semibold text-lg mb-1">{m.name as string}</div>
              <div className="font-body text-sm text-muted-foreground mb-3">{m.subtitle as string}</div>
              <div className="font-display font-bold text-xl mb-4">{(m.price as number).toLocaleString('ru')} ₽ / {m.priceUnit as string}</div>
              <div className="flex gap-2">
                <Button onClick={() => openEdit(m)} variant="outline" className="rounded-none font-body text-sm flex-1 gap-1.5"><Icon name="Pencil" size={14} />Редактировать</Button>
                <button onClick={() => setDeleteId(m.id as number)} className="p-2 hover:bg-destructive/10 text-destructive border border-border rounded-none transition-colors"><Icon name="Trash2" size={15} /></button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-3 p-12 text-center text-muted-foreground font-body bg-background border border-border">Нет техники. Нажмите «Добавить».</div>}
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ КАТАЛОГА */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-xl">{isNew ? 'Добавить' : 'Редактировать'}</h3>
              <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><Icon name="X" size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Название</label>
                <Input value={editItem.name as string || ''} onChange={(e) => setField('name', e.target.value)} className="rounded-none font-body" />
              </div>
              {tab !== 'machines' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Категория</label>
                      <select value={editItem.category as string || ''} onChange={(e) => setField('category', e.target.value)} className="w-full h-10 px-3 border border-input bg-background font-body text-sm rounded-none">
                        {(tab === 'tools' ? TOOL_CATEGORIES : PART_CATEGORIES).map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Цена (₽)</label>
                      <Input type="number" value={editItem.price as number || 0} onChange={(e) => setField('price', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">В наличии</label>
                      <Input type="number" value={editItem.stock as number || 0} onChange={(e) => setField('stock', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                    {tab === 'tools' && (
                      <div>
                        <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Всего на складе</label>
                        <Input type="number" value={editItem.totalStock as number || 0} onChange={(e) => setField('totalStock', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                      </div>
                    )}
                  </div>
                  {tab === 'tools' && (
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Залог за единицу (₽)</label>
                      <Input type="number" value={editItem.deposit as number || 0} onChange={(e) => setField('deposit', parseInt(e.target.value) || 0)} placeholder="0 — без залога" className="rounded-none font-body" />
                    </div>
                  )}
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Характеристики</label>
                    <Input value={editItem.specs as string || ''} onChange={(e) => setField('specs', e.target.value)} placeholder="160 Вт · диск 75 мм" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Тип инструмента</label>
                    <Input value={editItem.toolType as string || ''} onChange={(e) => setField('toolType', e.target.value)} placeholder="Шлифмашина" className="rounded-none font-body" />
                  </div>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Материалы (через запятую)</label>
                    <Input value={(editItem.material as string[] || []).join(', ')} onChange={(e) => setField('material', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Металл, Бетон" className="rounded-none font-body" />
                  </div>
                  <ImageUploader
                    images={editItem.images as string[] || (editItem.image ? [editItem.image as string] : [])}
                    onChange={(imgs) => { setField('images', imgs); setField('image', imgs[0] || ''); }}
                    token={token}
                  />
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="active" checked={editItem.active as boolean ?? true} onChange={(e) => setField('active', e.target.checked)} className="w-4 h-4" />
                    <label htmlFor="active" className="font-body text-sm">Показывать в каталоге</label>
                  </div>
                </>
              )}
              {tab === 'machines' && (
                <>
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Подзаголовок</label>
                    <Input value={editItem.subtitle as string || ''} onChange={(e) => setField('subtitle', e.target.value)} className="rounded-none font-body" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Цена (₽)</label>
                      <Input type="number" value={editItem.price as number || 0} onChange={(e) => setField('price', parseInt(e.target.value) || 0)} className="rounded-none font-body" />
                    </div>
                    <div>
                      <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Единица</label>
                      <select value={editItem.priceUnit as string || 'час'} onChange={(e) => setField('priceUnit', e.target.value)} className="w-full h-10 px-3 border border-input bg-background font-body text-sm rounded-none">
                        {['час', 'смена', 'сутки'].map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <ImageUploader
                    images={editItem.images as string[] || (editItem.image ? [editItem.image as string] : [])}
                    onChange={(imgs) => { setField('images', imgs); setField('image', imgs[0] || ''); }}
                    token={token}
                  />
                  <div>
                    <label className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-1 block">Навесное оборудование (через запятую)</label>
                    <Input value={(editItem.attachments as string[] || []).join(', ')} onChange={(e) => setField('attachments', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="Ковш планировочный, Ямобур" className="rounded-none font-body" />
                  </div>
                  <div>
                    <div className="font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Характеристики</div>
                    {(editItem.specs as {label:string;value:string}[] || []).map((s, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <Input value={s.label} onChange={(e) => { const sp = [...(editItem.specs as {label:string;value:string}[])]; sp[i] = {...sp[i], label: e.target.value}; setField('specs', sp); }} placeholder="Параметр" className="rounded-none font-body text-sm" />
                        <Input value={s.value} onChange={(e) => { const sp = [...(editItem.specs as {label:string;value:string}[])]; sp[i] = {...sp[i], value: e.target.value}; setField('specs', sp); }} placeholder="Значение" className="rounded-none font-body text-sm" />
                        <button onClick={() => { const sp = (editItem.specs as {label:string;value:string}[]).filter((_, j) => j !== i); setField('specs', sp); }} className="px-2 text-destructive hover:bg-destructive/10"><Icon name="X" size={14} /></button>
                      </div>
                    ))}
                    <button onClick={() => setField('specs', [...(editItem.specs as {label:string;value:string}[] || []), {label:'', value:''}])} className="font-body text-xs text-accent hover:underline flex items-center gap-1">
                      <Icon name="Plus" size={12} /> Добавить параметр
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-none font-body">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setEditItem(null)} className="rounded-none font-body">Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {/* ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background border border-border p-6 w-full max-w-sm">
            <h3 className="font-display font-bold text-xl mb-2">Удалить позицию?</h3>
            <p className="font-body text-sm text-muted-foreground mb-6">Позиция будет скрыта из каталога (данные сохранятся в БД).</p>
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