import type { Category } from './types';

export const ITEM_TYPES: Record<Category, string[]> = {
  merch: ['Book', 'Audiobook', 'Comic', 'Figure', 'Plush', 'Apparel', 'Print', 'Game', 'Other'],
  card: ['Trading card', 'Foil', 'Promo', 'Graded', 'Other'],
};
