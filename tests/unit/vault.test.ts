import { describe, expect, it } from 'vitest';
import { RARITIES, isRarity, quipFor, rarityRank } from '../../src/lib/rarity';
import type { Entries, Item } from '../../src/lib/types';
import { compareItems, filterItems, nextState, vaultStats } from '../../src/lib/vault';

const item = (over: Partial<Item>): Item => ({
  id: 'x',
  name: 'Item',
  category: 'merch',
  type: 'Book',
  rarity: 'bronze',
  status: 'approved',
  submittedBy: 'seed',
  ...over,
});

const items: Item[] = [
  item({ id: 'b2', name: 'Book Two', series: 'DCC', number: '2', rarity: 'silver' }),
  item({ id: 'b10', name: 'Book Ten', series: 'DCC', number: '10', rarity: 'gold' }),
  item({ id: 'b1', name: 'Book One', series: 'DCC', number: '1' }),
  item({ id: 'c1', name: 'Foil Card', category: 'card', type: 'Foil', rarity: 'legendary' }),
];
const entries: Entries = { b1: 'owned', b2: 'want', c1: 'owned', b10: 'grail' };
const all = { search: '', ownership: 'all', rarity: 'all' } as const;

describe('filterItems', () => {
  it('keeps only the selected category', () => {
    expect(filterItems(items, entries, { ...all, category: 'card' }).map((i) => i.id)).toEqual(['c1']);
  });

  it('sorts by series, then numerically by number', () => {
    expect(filterItems(items, {}, { ...all, category: 'merch' }).map((i) => i.id)).toEqual(['b1', 'b2', 'b10']);
  });

  it.each([
    ['owned', ['b1']],
    ['want', ['b2']],
    ['grail', ['b10']],
    ['missing', ['b2', 'b10']],
  ] as const)('ownership filter %s', (ownership, expected) => {
    expect(filterItems(items, entries, { ...all, category: 'merch', ownership }).map((i) => i.id)).toEqual(expected);
  });

  it('filters by rarity', () => {
    expect(filterItems(items, entries, { ...all, category: 'merch', rarity: 'gold' }).map((i) => i.id)).toEqual(['b10']);
  });

  it('searches name, series and number, ignoring case and whitespace', () => {
    expect(filterItems(items, entries, { ...all, category: 'merch', search: '  TEN ' }).map((i) => i.id)).toEqual(['b10']);
    expect(filterItems(items, entries, { ...all, category: 'merch', search: 'dcc' })).toHaveLength(3);
  });
});

describe('compareItems', () => {
  it('falls back to name when numbers are missing', () => {
    expect(compareItems(item({ name: 'B' }), item({ name: 'A' }))).toBeGreaterThan(0);
  });
});

describe('vaultStats', () => {
  it('counts states and the best owned rarity', () => {
    expect(vaultStats(items, entries)).toEqual({ total: 4, owned: 2, want: 1, grail: 1, percent: 50, bestRarity: 'legendary' });
  });

  it('handles an empty catalog without dividing by zero', () => {
    expect(vaultStats([], {})).toEqual({ total: 0, owned: 0, want: 0, grail: 0, percent: 0, bestRarity: null });
  });
});

describe('nextState', () => {
  it('toggles off when the same state is clicked', () => expect(nextState('owned', 'owned')).toBeNull());
  it('switches to a new state', () => expect(nextState('want', 'owned')).toBe('owned'));
  it('sets a state from nothing', () => expect(nextState(undefined, 'grail')).toBe('grail'));
});

describe('rarity', () => {
  it('ranks tiers from bronze to celestial', () => {
    expect(RARITIES.map(rarityRank)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('validates rarity strings', () => {
    expect(isRarity('gold')).toBe(true);
    expect(isRarity('mythic')).toBe(false);
    expect(isRarity(3)).toBe(false);
  });

  it('always returns a quip, even for a roll of 1', () => {
    for (const r of RARITIES) {
      expect(quipFor(r, 0)).toBeTruthy();
      expect(quipFor(r, 0.999)).toBeTruthy();
      expect(quipFor(r, 1)).toBeTruthy();
    }
  });
});
