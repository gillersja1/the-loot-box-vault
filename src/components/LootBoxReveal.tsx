import { useEffect, useRef, useState } from 'react';
import { RARITY_LABEL, quipFor } from '../lib/rarity';
import type { Item } from '../lib/types';

export function LootBoxReveal({ item, onClose }: { item: Item; onClose: () => void }) {
  const [opened, setOpened] = useState(false);
  const [quip] = useState(() => quipFor(item.rarity));
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setOpened(true), 900);
    button.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="reveal-backdrop" onClick={onClose}>
      <div
        className={`reveal rarity-${item.rarity} ${opened ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reveal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="box" aria-hidden="true">
          <div className="box-lid" />
          <div className="box-body" />
          <div className="box-burst" />
        </div>
        <p className="reveal-tier">{RARITY_LABEL[item.rarity]} Box</p>
        <h2 id="reveal-title">{opened ? item.name : 'Opening…'}</h2>
        <p className="reveal-quip">{opened ? quip : ' '}</p>
        <button ref={button} className="btn btn-primary" onClick={onClose}>
          Claim loot
        </button>
      </div>
    </div>
  );
}
