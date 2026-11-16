import { RARITY_LABEL } from '../lib/rarity';
import type { EntryState, Item } from '../lib/types';

const STATES: { state: EntryState; label: string; icon: string }[] = [
  { state: 'owned', label: 'Owned', icon: '▣' },
  { state: 'want', label: 'Want', icon: '◷' },
  { state: 'grail', label: 'Grail', icon: '★' },
];

interface Props {
  item: Item;
  state?: EntryState;
  onMark?: (state: EntryState) => void;
  readOnly?: boolean;
}

export function ItemCard({ item, state, onMark, readOnly }: Props) {
  return (
    <article className={`card rarity-${item.rarity} ${state ? `is-${state}` : ''}`} aria-label={item.name}>
      <header className="card-head">
        <span className="chip">{RARITY_LABEL[item.rarity]}</span>
        <span className="card-type">{item.type}</span>
      </header>
      <h3 className="card-name">{item.name}</h3>
      {(item.series || item.number) && (
        <p className="card-meta">
          {item.series}
          {item.number ? ` · #${item.number}` : ''}
        </p>
      )}
      {item.notes && <p className="card-notes">{item.notes}</p>}
      {readOnly ? (
        state && <p className={`state-badge state-${state}`}>{STATES.find((s) => s.state === state)?.label}</p>
      ) : (
        <div className="card-actions" role="group" aria-label={`Track ${item.name}`}>
          {STATES.map((s) => (
            <button
              key={s.state}
              className={`mark mark-${s.state}`}
              aria-pressed={state === s.state}
              onClick={() => onMark?.(s.state)}
            >
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
