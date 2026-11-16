import type { Category } from './types';

export const ITEM_TYPES: Record<Category, string[]> = {
  merch: ['Book', 'Audiobook', 'Comic', 'Graphic novel', 'Figure', 'Statue', 'Plush', 'Mini figure', 'Miniatures', 'RPG', 'Dice', 'Apparel', 'Print', 'Game', 'Other'],
  card: ['Classic', 'Emerald parallel', 'Gold Foil', 'Rainbow Foil', 'Sketch card', 'Signed card', 'Promo', 'Graded', 'Other'],
};
