import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ItemCard } from '../components/ItemCard';
import { useToast } from '../components/Toast';
import { getApprovedItems, getEntries, getVault, saveVault } from '../lib/api';
import { useAuth } from '../lib/auth';
import { RARITY_LABEL } from '../lib/rarity';
import type { Entries, EntryState, Item, Vault } from '../lib/types';
import { compareItems, vaultStats } from '../lib/vault';

const SECTIONS: { state: EntryState; title: string }[] = [
  { state: 'grail', title: 'Grails' },
  { state: 'owned', title: 'Owned' },
  { state: 'want', title: 'Want list' },
];

export function VaultPage() {
  const { uid: routeUid } = useParams();
  const { user, ready } = useAuth();
  const toast = useToast();
  const uid = routeUid ?? user?.uid;
  const isMine = !!user && user.uid === uid;

  const [items, setItems] = useState<Item[]>([]);
  const [entries, setEntries] = useState<Entries>({});
  const [vault, setVault] = useState<Vault | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'hidden'>('loading');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!uid) return;
    let live = true;
    setStatus('loading');
    (async () => {
      try {
        const v = await getVault(uid);
        if (!v && uid !== user?.uid) throw new Error('no vault');
        const [i, e] = await Promise.all([getApprovedItems(), getEntries(uid)]);
        if (!live) return;
        setVault(v);
        setName(v?.displayName ?? user?.displayName ?? '');
        setItems(i);
        setEntries(e);
        setStatus('ok');
      } catch {
        if (live) setStatus('hidden');
      }
    })();
    return () => {
      live = false;
    };
  }, [uid, user]);

  const stats = useMemo(() => vaultStats(items, entries), [items, entries]);

  if (!routeUid && ready && !user) return <Navigate to="/login" replace />;
  if (!uid || status === 'loading') return <p className="empty">Unlocking the vault…</p>;
  if (status === 'hidden') {
    return (
      <div className="empty hud-panel">
        <h1>Vault sealed</h1>
        <p>This vault is private, or it doesn't exist.</p>
        <Link className="btn" to="/">
          Back to the catalog
        </Link>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/vault/${uid}`;

  async function save(isPublic: boolean) {
    if (!user) return;
    const previous = vault;
    const next = { displayName: name.trim() || 'Anonymous Crawler', isPublic };
    setVault(next); // optimistic, so the toggle responds immediately
    try {
      await saveVault(user.uid, next);
      toast(isPublic ? 'Vault is now public. Your hoard is on the broadcast.' : 'Vault saved.');
    } catch {
      setVault(previous);
      toast('Vault settings did not save.', 'error');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Share link copied.');
    } catch {
      toast('Copy blocked. Select the link and copy it manually.', 'error');
    }
  }

  return (
    <section>
      <div className="hud-panel hud-title">
        <p className="eyebrow">Crawler Vault</p>
        <h1>{vault?.displayName || (isMine ? 'My vault' : 'Crawler vault')}</h1>
        <dl className="stats">
          <div>
            <dt>Owned</dt>
            <dd>{stats.owned}</dd>
          </div>
          <div>
            <dt>Grails</dt>
            <dd>{stats.grail}</dd>
          </div>
          <div>
            <dt>Want</dt>
            <dd>{stats.want}</dd>
          </div>
          <div>
            <dt>Complete</dt>
            <dd>{stats.percent}%</dd>
          </div>
          <div>
            <dt>Best pull</dt>
            <dd>{stats.bestRarity ? RARITY_LABEL[stats.bestRarity] : '—'}</dd>
          </div>
        </dl>
      </div>

      {isMine && (
        <div className="hud-panel settings">
          <label>
            <span>Vault name</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={vault?.isPublic ?? false} onChange={(e) => save(e.target.checked)} />
            <span>Public vault (anyone with the link can view)</span>
          </label>
          <button className="btn" onClick={() => save(vault?.isPublic ?? false)}>
            Save name
          </button>
          {vault?.isPublic && (
            <p className="share">
              <code>{shareUrl}</code>
              <button className="btn" onClick={copy}>
                Copy link
              </button>
            </p>
          )}
        </div>
      )}

      {SECTIONS.map(({ state, title }) => {
        const list = items.filter((i) => entries[i.id] === state).sort(compareItems);
        return (
          <section key={state} aria-label={title}>
            <h2 className="section-title">
              {title} <span className="count">{list.length}</span>
            </h2>
            {list.length === 0 ? (
              <p className="empty-line">Nothing here yet.</p>
            ) : (
              <div className="grid">
                {list.map((i) => (
                  <ItemCard key={i.id} item={i} state={state} readOnly />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
