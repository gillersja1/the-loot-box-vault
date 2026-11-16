export type Category = 'merch' | 'card';
export type Rarity = 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary' | 'celestial';
export type EntryState = 'owned' | 'want' | 'grail';
export type ItemStatus = 'approved' | 'pending';

export interface Item {
  id: string;
  name: string;
  category: Category;
  type: string;
  series?: string;
  number?: string;
  rarity: Rarity;
  notes?: string;
  imageUrl?: string;
  status: ItemStatus;
  submittedBy: string;
}

export interface Vault {
  displayName: string;
  isPublic: boolean;
}

/** itemId -> state */
export type Entries = Record<string, EntryState>;
