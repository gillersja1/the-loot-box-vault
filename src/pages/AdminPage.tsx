import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { STARTER_IDS, approveItem, rejectItem, seedCatalog, watchApprovedItems, watchPendingItems, type ItemEdits } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ITEM_TYPES } from '../lib/itemTypes';
import { RARITIES, RARITY_LABEL } from '../lib/rarity';
import type { Category, Item, Rarity } from '../lib/types';

export function AdminPage() {
  const { user, admin, ready } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<Item[] | null>(null);
  const [approvedIds, setApprovedIds] = useState<string[] | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!admin) return;
    return watchPendingItems(setPending, () => toast('Could not load the submission queue.', 'error'));
  }, [admin, toast]);
  useEffect(() => {
    if (!admin) return;
    return watchApprovedItems((items) => setApprovedIds(items.map((i) => i.id)), () => {});
  }, [admin]);

  const missing = approvedIds ? STARTER_IDS.filter((id) => !approvedIds.includes(id)).length : 0;

  async function addStarters() {
    if (!user || !approvedIds) return;
    setSeeding(true);
    try {
      const added = await seedCatalog(user.uid, approvedIds);
      toast(`${added} starter items added to the catalog.`);
    } catch {
      toast('Adding starter items failed.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  if (!ready) return <p className="empty">Checking clearance…</p>;
  if (!admin) {
    return (
      <div className="empty hud-panel">
        <h1>Access denied</h1>
        <p>This floor is for admins only.</p>
        <Link className="btn" to="/">
          Back to the catalog
        </Link>
      </div>
    );
  }

  return (
    <section>
      <div className="hud-panel hud-title">
        <p className="eyebrow">Production Booth</p>
        <h1>Submission queue</h1>
        <p className="muted">Review what crawlers submitted. Fix any details, then approve to publish it, or reject to delete it.</p>
        {missing > 0 && (
          <p className="starter-line">
            <span>{missing} starter catalog items are not in the catalog yet.</span>
            <button className="btn btn-primary" disabled={seeding} onClick={addStarters}>
              Add {missing} starter items
            </button>
          </p>
        )}
      </div>
      {pending === null ? (
        <p className="empty">Loading submissions…</p>
      ) : pending.length === 0 ? (
        <p className="empty hud-panel">The queue is empty. The System is almost disappointed.</p>
      ) : (
        <div className="queue">
          {pending
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <PendingRow key={item.id} item={item} />
            ))}
        </div>
      )}
    </section>
  );
}

function PendingRow({ item }: { item: Item }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<ItemEdits>({
    name: item.name,
    category: item.category,
    type: item.type,
    rarity: item.rarity,
    series: item.series ?? '',
    number: item.number ?? '',
    notes: item.notes ?? '',
  });
  const set = <K extends keyof ItemEdits>(k: K, v: ItemEdits[K]) => setForm((f) => ({ ...f, [k]: v }));
  const types = ITEM_TYPES[form.category].includes(form.type) ? ITEM_TYPES[form.category] : [form.type, ...ITEM_TYPES[form.category]];

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast(done);
    } catch {
      toast('That action failed. Check the fields and try again.', 'error');
      setBusy(false);
    }
  }

  return (
    <article className={`hud-panel pending rarity-${form.rarity}`} aria-label={`Submission: ${item.name}`}>
      <div className="form-grid">
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
          <span>Notes</span>
          <textarea maxLength={500} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
      </div>
      <div className="pending-actions">
        <button
          className="btn btn-primary"
          disabled={busy || !form.name.trim()}
          onClick={() => run(() => approveItem(item.id, form), `${form.name.trim()} approved. It's in the catalog now.`)}
        >
          Approve
        </button>
        <button className="btn btn-danger" disabled={busy} onClick={() => run(() => rejectItem(item.id), `${item.name} rejected.`)}>
          Reject
        </button>
      </div>
    </article>
  );
}
