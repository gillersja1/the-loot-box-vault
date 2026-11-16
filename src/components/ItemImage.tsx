import { useState } from 'react';
import { RARITY_LABEL } from '../lib/rarity';
import type { Item } from '../lib/types';

/** Item picture from its image link, or a styled placeholder when there is none (or it fails to load). */
export function ItemImage({ item }: { item: Pick<Item, 'name' | 'category' | 'type' | 'number' | 'rarity' | 'imageUrl'> }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const shape = item.category === 'card' ? 'is-card' : 'is-merch';
  const url = item.imageUrl && item.imageUrl !== failedUrl ? item.imageUrl : null;

  if (url) {
    return (
      <div className={`item-img ${shape}`}>
        <img src={url} alt={item.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      </div>
    );
  }
  return (
    <div className={`item-img ${shape} placeholder`} role="img" aria-label={`${item.name} (no image)`}>
      <span className="ph-number">{item.number ? `#${item.number}` : '★'}</span>
      <span className="ph-type">{item.type}</span>
      <span className="ph-rarity">{RARITY_LABEL[item.rarity]}</span>
    </div>
  );
}
