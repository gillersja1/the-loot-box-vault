import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { submitItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RARITIES, RARITY_LABEL } from '../lib/rarity';
import type { Category, Rarity } from '../lib/types';

const TYPES: Record<Category, string[]> = {
  merch: ['Book', 'Audiobook', 'Comic', 'Figure', 'Plush', 'Apparel', 'Print', 'Game', 'Other'],
  card: ['Trading card', 'Foil', 'Promo', 'Graded', 'Other'],
};

const blank = { name: '', category: 'merch' as Category, type: 'Book', series: '', number: '', rarity: 'bronze' as Rarity, notes: '' };

export function SubmitPage() {
  const { user, ready } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (ready && !user) return <Navigate to="/login" replace />;

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      await submitItem(user.uid, { ...form, name: form.name.trim() });
      setDone(true);
      setForm(blank);
      toast('Submission received. An admin will review it.');
    } catch {
      toast('The System rejected that submission. Check the fields.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hud-panel submit">
      <p className="eyebrow">Loot Report</p>
      <h1>Submit an item</h1>
      <p>Missing something? Add it here. Submissions appear in the catalog after an admin approves them.</p>
      {done && <p className="notice">Submitted. It shows up in the catalog once it's approved.</p>}
      <form onSubmit={onSubmit} className="form-grid">
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
              setForm((f) => ({ ...f, category: c, type: TYPES[c][0] }));
            }}
          >
            <option value="merch">Merch</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label>
          <span>Type</span>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            {TYPES[form.category].map((t) => (
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
          <span>Notes</span>
          <textarea maxLength={500} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </section>
  );
}
