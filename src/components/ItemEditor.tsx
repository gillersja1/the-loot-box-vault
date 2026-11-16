import { useState, type ReactNode } from 'react';
import { toEdits, type ItemEdits } from '../lib/api';
import { ITEM_TYPES } from '../lib/itemTypes';
import { RARITIES, RARITY_LABEL } from '../lib/rarity';
import type { Category, Item, Rarity } from '../lib/types';
import { ItemImage } from './ItemImage';

export function isValidImageUrl(url: string): boolean {
  const u = url.trim();
  return u === '' || (/^https:\/\/\S+$/.test(u) && u.length <= 500);
}

interface Props {
  item: Item;
  label: string;
  busy: boolean;
  /** valid is false while the name is blank or the image link is malformed. */
  actions: (form: ItemEdits, valid: boolean) => ReactNode;
}

/** Admin form for every editable item field, with a live image preview. */
export function ItemEditor({ item, label, busy, actions }: Props) {
  const [form, setForm] = useState<ItemEdits>(() => toEdits(item));
  const set = <K extends keyof ItemEdits>(k: K, v: ItemEdits[K]) => setForm((f) => ({ ...f, [k]: v }));
  const types = ITEM_TYPES[form.category].includes(form.type) ? ITEM_TYPES[form.category] : [form.type, ...ITEM_TYPES[form.category]];
  const urlOk = isValidImageUrl(form.imageUrl);

  return (
    <article className={`hud-panel pending rarity-${form.rarity}`} aria-label={label}>
      <div className="editor">
        <div className="editor-preview">
          <ItemImage item={{ ...item, ...form, imageUrl: urlOk ? form.imageUrl.trim() : '' }} />
        </div>
        <fieldset className="form-grid" disabled={busy}>
          <label className="wide">
            <span>Name</span>
            <input required maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label>
            <span>Category</span>
            <select
              value={form.category}
              onChange={(e) => {
                const c = e.target.value as Category;
                setForm((f) => ({ ...f, category: c, type: ITEM_TYPES[c][0] }));
              }}
            >
              <option value="merch">Merch</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label>
            <span>Type</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Series / set</span>
            <input maxLength={80} value={form.series} onChange={(e) => set('series', e.target.value)} />
          </label>
          <label>
            <span>Number</span>
            <input maxLength={20} value={form.number} onChange={(e) => set('number', e.target.value)} />
          </label>
          <label>
            <span>Rarity</span>
            <select value={form.rarity} onChange={(e) => set('rarity', e.target.value as Rarity)}>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {RARITY_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="wide">
            <span>Image link (https)</span>
            <input
              type="url"
              maxLength={500}
              value={form.imageUrl}
              placeholder="https://…"
              aria-invalid={!urlOk}
              onChange={(e) => set('imageUrl', e.target.value)}
            />
            {!urlOk && <small className="field-error">Use a full https:// link.</small>}
          </label>
          <label className="wide">
            <span>Notes</span>
            <textarea maxLength={500} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>
        </fieldset>
      </div>
      <div className="pending-actions">{actions(form, urlOk && form.name.trim() !== '')}</div>
    </article>
  );
}
