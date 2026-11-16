import { rarityRank } from './rarity';
import type { Category, Entries, EntryState, Item, Rarity } from './types';

export type OwnershipFilter = 'all' | EntryState | 'missing';

export interface CatalogFilter {
  category: Category;
  search: string;
  ownership: OwnershipFilter;
  rarity: Rarity | 'all';
}

export function filterItems(items: Item[], entries: Entries, f: CatalogFilter): Item[] {
  const q = f.search.trim().toLowerCase();
  return items
    .filter((i) => i.category === f.category)
    .filter((i) => f.rarity === 'all' || i.rarity === f.rarity)
    .filter((i) => {
      if (f.ownership === 'all') return true;
      const state = entries[i.id];
      if (f.ownership === 'missing') return state !== 'owned';
      return state === f.ownership;
    })
    .filter((i) => !q || [i.name, i.series, i.type, i.number].some((v) => v?.toLowerCase().includes(q)))
    .sort(compareItems);
}

export function compareItems(a: Item, b: Item): number {
  const series = (a.series ?? '').localeCompare(b.series ?? '');
  if (series !== 0) return series;
  const na = Number(a.number);
  const nb = Number(b.number);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.name.localeCompare(b.name);
}

export interface VaultStats {
  total: number;
  owned: number;
  want: number;
  grail: number;
  percent: number;
  bestRarity: Rarity | null;
}

export function vaultStats(items: Item[], entries: Entries): VaultStats {
  let owned = 0;
  let want = 0;
  let grail = 0;
  let best: Rarity | null = null;
  for (const item of items) {
    const s = entries[item.id];
    if (s === 'owned') {
      owned++;
      if (best === null || rarityRank(item.rarity) > rarityRank(best)) best = item.rarity;
    } else if (s === 'want') want++;
    else if (s === 'grail') grail++;
  }
  const total = items.length;
  return { total, owned, want, grail, percent: total ? Math.round((owned / total) * 100) : 0, bestRarity: best };
}

/** Clicking the same state again clears it; otherwise it switches. */
export function nextState(current: EntryState | undefined, clicked: EntryState): EntryState | null {
  return current === clicked ? null : clicked;
}
