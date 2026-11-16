import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ItemCard } from '../components/ItemCard';
import { LootBoxReveal } from '../components/LootBoxReveal';
import { useToast } from '../components/Toast';
import { seedCatalog, setEntry, watchApprovedItems, watchEntries } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RARITIES, RARITY_LABEL } from '../lib/rarity';
import type { Category, Entries, EntryState, Item, Rarity } from '../lib/types';
import { filterItems, nextState, vaultStats, type OwnershipFilter } from '../lib/vault';

export function CatalogPage() {
  const { user, admin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const category: Category = params.get('tab') === 'cards' ? 'card' : 'merch';

  const [items, setItems] = useState<Item[] | null>(null);
  const [entries, setEntries] = useState<Entries>({});
  const [search, setSearch] = useState('');
  const [ownership, setOwnership] = useState<OwnershipFilter>('all');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [reveal, setReveal] = useState<Item | null>(null);

  useEffect(() => watchApprovedItems(setItems, () => toast('The catalog is not responding. Try again soon.', 'error')), [toast]);
  useEffect(() => {
    if (!user) {
      setEntries({});
      return;
    }
    return watchEntries(user.uid, setEntries, () => toast('Could not load your vault.', 'error'));
  }, [user, toast]);

  const visible = useMemo(
    () => (items ? filterItems(items, entries, { category, search, ownership, rarity }) : []),
    [items, entries, category, search, ownership, rarity],
  );
  const stats = useMemo(() => vaultStats((items ?? []).filter((i) => i.category === category), entries), [items, entries, category]);

  async function mark(item: Item, clicked: EntryState) {
    if (!user) {
      toast('Crawler not identified. Sign in to start hoarding.');
      navigate('/login');
      return;
    }
    const state = nextState(entries[item.id], clicked);
    try {
      await setEntry(user.uid, item.id, state);
      if (state === 'owned') setReveal(item);
      else if (state === 'grail') toast(`${item.name} marked as a grail. The System admires your ambition.`);
      else if (state === 'want') toast(`${item.name} added to your want list.`);
    } catch {
      toast('That did not save. The dungeon ate it.', 'error');
    }
  }

  async function seed() {
    if (!user) return;
    try {
      await seedCatalog(user.uid);
      toast('Starter catalog deployed.');
    } catch {
      toast('Seeding failed. Are you really an admin?', 'error');
    }
  }

  const label = category === 'card' ? 'cards' : 'merch';

  return (
    <section>
      <div className="hud-panel hud-title">
        <p className="eyebrow">World Dungeon // Collector Index</p>
        <h1>Catalog</h1>
        <div className="tabs" role="tablist" aria-label="Catalog type">
          <button role="tab" aria-selected={category === 'merch'} onClick={() => setParams({})}>
            Merch
          </button>
          <button role="tab" aria-selected={category === 'card'} onClick={() => setParams({ tab: 'cards' })}>
            Cards
          </button>
        </div>
        {user && (
          <p className="progress-line" aria-label="Collection progress">
            <span>
              {stats.owned}/{stats.total} owned
            </span>
            <span className="meter" aria-hidden="true">
              <span style={{ width: `${stats.percent}%` }} />
            </span>
            <span>{stats.percent}%</span>
          </p>
        )}
      </div>

      <div className="filters hud-panel">
        <label>
          <span>Search</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, series, number…" />
        </label>
        <label>
          <span>Show</span>
          <select value={ownership} onChange={(e) => setOwnership(e.target.value as OwnershipFilter)}>
            <option value="all">Everything</option>
            <option value="owned">Owned</option>
            <option value="missing">Missing</option>
            <option value="want">Want</option>
            <option value="grail">Grails</option>
          </select>
        </label>
        <label>
          <span>Rarity</span>
          <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | 'all')}>
            <option value="all">Any</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items === null ? (
        <p className="empty">Loading the loot table…</p>
      ) : visible.length === 0 ? (
        <div className="empty hud-panel">
          <p>{items.some((i) => i.category === category) ? 'No loot matches those filters.' : `No ${label} in the catalog yet.`}</p>
          <Link className="btn" to="/submit">
            Submit an item
          </Link>
          {admin && items.length === 0 && (
            <button className="btn btn-primary" onClick={seed}>
              Seed starter catalog
            </button>
          )}
        </div>
      ) : (
        <div className="grid">
          {visible.map((item) => (
            <ItemCard key={item.id} item={item} state={entries[item.id]} onMark={(s) => mark(item, s)} />
          ))}
        </div>
      )}

      {reveal && <LootBoxReveal item={reveal} onClose={() => setReveal(null)} />}
    </section>
  );
}
