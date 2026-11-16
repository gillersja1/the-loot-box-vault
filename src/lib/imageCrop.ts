/**
 * Parses a W3C media-fragment crop from an image link, e.g.
 *   https://example.com/group.png#xywh=percent:10,20,40,50
 * meaning "show the region starting 10% from the left and 20% from the top,
 * 40% wide and 50% tall". Lets one group photo show each variant separately.
 */
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function parseCrop(url: string): Crop | null {
  const m = /#xywh=percent:(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(url);
  if (!m) return null;
  const [x, y, w, h] = m.slice(1).map(Number);
  if (w <= 0 || h <= 0 || w > 100 || h > 100 || x + w > 100 || y + h > 100) return null;
  return { x, y, w, h };
}

/** Absolute positioning for an <img> so only the crop region fills its (overflow-hidden) box. */
export function cropStyle(c: Crop): { width: string; height: string; left: string; top: string } {
  return {
    width: `${(100 / c.w) * 100}%`,
    height: `${(100 / c.h) * 100}%`,
    left: `${(-c.x / c.w) * 100}%`,
    top: `${(-c.y / c.h) * 100}%`,
  };
}
