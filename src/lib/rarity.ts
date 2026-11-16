import type { Rarity } from './types';

export const RARITIES: Rarity[] = ['bronze', 'silver', 'gold', 'platinum', 'legendary', 'celestial'];

export const RARITY_LABEL: Record<Rarity, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  legendary: 'Legendary',
  celestial: 'Celestial',
};

export function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}

export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && (RARITIES as string[]).includes(value);
}

/** Original System AI flavor text, one line per tier. */
const QUIPS: Record<Rarity, string[]> = {
  bronze: [
    'A Bronze box. The System has seen more excitement in a supply closet.',
    'Bronze. Technically loot. Technically.',
  ],
  silver: [
    'Silver box acquired. Your viewers are mildly entertained.',
    'Silver. Shiny enough to show your mom. Not your rivals.',
  ],
  gold: [
    'Gold box! The audience leans forward in their seats.',
    'Gold. The System grudgingly logs this as "a decent haul."',
  ],
  platinum: [
    'Platinum box. Sponsors are now pretending they always believed in you.',
    'Platinum. Someone in the production booth just spilled their drink.',
  ],
  legendary: [
    'LEGENDARY. The System would like you to know it is not crying.',
    'Legendary box unlocked. Ratings spike. Crawlers weep.',
  ],
  celestial: [
    'CELESTIAL. This is not supposed to happen. The System is filing a report.',
    'Celestial box. Somewhere, a showrunner is updating their résumé.',
  ],
};

export function quipFor(r: Rarity, roll: number = Math.random()): string {
  const lines = QUIPS[r];
  return lines[Math.min(lines.length - 1, Math.floor(roll * lines.length))];
}
