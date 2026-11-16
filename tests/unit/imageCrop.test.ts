import { describe, expect, it } from 'vitest';
import { cropStyle, parseCrop } from '../../src/lib/imageCrop';

describe('parseCrop', () => {
  it('reads a W3C percent media fragment', () => {
    expect(parseCrop('https://x.test/a.png#xywh=percent:10,20,40,50')).toEqual({ x: 10, y: 20, w: 40, h: 50 });
    expect(parseCrop('https://x.test/a.png#xywh=percent:0,0,36.5,48')).toEqual({ x: 0, y: 0, w: 36.5, h: 48 });
  });

  it.each([
    'https://x.test/a.png',
    'https://x.test/a.png#xywh=10,20,40,50',
    'https://x.test/a.png#xywh=percent:10,20,0,50',
    'https://x.test/a.png#xywh=percent:70,0,40,50',
    'https://x.test/a.png#xywh=percent:-5,0,40,50',
  ])('ignores %s', (url) => expect(parseCrop(url)).toBeNull());
});

describe('cropStyle', () => {
  it('scales and offsets the image so only the region shows', () => {
    expect(cropStyle({ x: 25, y: 50, w: 50, h: 50 })).toEqual({ width: '200%', height: '200%', left: '-50%', top: '-100%' });
  });

  it('is the identity for the full image', () => {
    expect(cropStyle({ x: 0, y: 0, w: 100, h: 100 })).toEqual({ width: '100%', height: '100%', left: '0%', top: '0%' });
  });
});

import { itemsMissingStarterImages } from '../../src/lib/api';
import type { Item } from '../../src/lib/types';

describe('itemsMissingStarterImages', () => {
  const base: Item = { id: 'm-princess-posse-plush-chonk-donut', name: 'Chonk Donut', category: 'merch', type: 'Plush', rarity: 'bronze', status: 'approved', submittedBy: 'x' };
  it('picks missing and outdated official images but leaves custom ones alone', () => {
    const missing = { ...base };
    const outdated = { ...base, imageUrl: 'https://www.borantcorp.com/wp-content/uploads/2026/07/DCC_Donut_Plush_BlindBox_1b-768x576.png' };
    const custom = { ...base, imageUrl: 'https://my.photos.test/chonk.jpg' };
    const notStarter = { ...base, id: 'something-else' };
    expect(itemsMissingStarterImages([missing, outdated, custom, notStarter])).toEqual([missing, outdated]);
  });
});
