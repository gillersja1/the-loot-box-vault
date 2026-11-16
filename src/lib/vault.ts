import { ITEM_TYPES } from './itemTypes';
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
    .filter((i) => !q || [i.name, i.series, i.type, i.number, i.notes].some((v) => v?.toLowerCase().includes(q)))
    .sort(compareItems);
}

export function compareItems(a: Item, b: Item): number {
  const series = (a.series ?? '').localeCompare(b.series ?? '');
  if (series !== 0) return series;
  // Within a card set, list each parallel together (Classic, then Emerald, then foils...).
  if (a.category === 'card' && b.category === 'card' && a.type !== b.type) {
    const rank = (t: string) => {
      const i = ITEM_TYPES.card.indexOf(t);
      return i === -1 ? ITEM_TYPES.card.length : i; // unknown types last
    };
    return rank(a.type) - rank(b.type) || a.type.localeCompare(b.type);
  }
  // Numbered items first, in numeric order; unnumbered ones (sketch, signed) after.
  const na = a.number ? Number(a.number) : Number.NaN;
  const nb = b.number ? Number(b.number) : Number.NaN;
  const hasA = !Number.isNaN(na);
  const hasB = !Number.isNaN(nb);
  if (hasA !== hasB) return hasA ? -1 : 1;
  if (hasA && na !== nb) return na - nb;
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

export interface ItemGroup {
  key: string;
  items: Item[];
}

/** Section heading for an item: cards by parallel + subset (from notes), merch by series. */
export function groupKey(item: Item): string {
  if (item.category === 'card') {
    const subset = item.notes?.split(' · ')[0]?.trim();
    return subset ? `${item.type}: ${subset}` : item.type;
  }
  return item.series?.trim() || item.type;
}

/** Groups already-sorted items, keeping groups in order of their first item. */
export function groupItems(items: Item[]): ItemGroup[] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = groupKey(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return [...groups].map(([key, list]) => ({ key, items: list }));
}
