import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { ItemEditor } from '../components/ItemEditor';
import { STARTER_IDS, rejectItem, saveItem, seedCatalog, watchApprovedItems, watchPendingItems } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Item } from '../lib/types';

export function AdminPage() {
  const { user, admin, ready } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<Item[] | null>(null);
  const [approvedIds, setApprovedIds] = useState<string[] | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!admin) return;
    return watchPendingItems(setPending, () => toast('Could not load the submission queue.', 'error'));
  }, [admin, toast]);
  useEffect(() => {
    if (!admin) return;
    return watchApprovedItems((items) => setApprovedIds(items.map((i) => i.id)), () => {});
  }, [admin]);

  const missing = approvedIds ? STARTER_IDS.filter((id) => !approvedIds.includes(id)).length : 0;

  async function addStarters() {
    if (!user || !approvedIds) return;
    setSeeding(true);
    try {
      const added = await seedCatalog(user.uid, approvedIds);
      toast(`${added} starter items added to the catalog.`);
    } catch {
      toast('Adding starter items failed.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  if (!ready) return <p className="empty">Checking clearance…</p>;
  if (!admin) {
    return (
      <div className="empty hud-panel">
        <h1>Access denied</h1>
        <p>This floor is for admins only.</p>
        <Link className="btn" to="/">
          Back to the catalog
        </Link>
      </div>
    );
  }

  return (
    <section>
      <div className="hud-panel hud-title">
        <p className="eyebrow">Production Booth</p>
        <h1>Submission queue</h1>
        <p className="muted">Review what crawlers submitted. Fix any details, then approve to publish it, or reject to delete it.</p>
        {missing > 0 && (
          <p className="starter-line">
            <span>{missing} starter catalog items are not in the catalog yet.</span>
            <button className="btn btn-primary" disabled={seeding} onClick={addStarters}>
              Add {missing} starter items
            </button>
          </p>
        )}
      </div>
      {pending === null ? (
        <p className="empty">Loading submissions…</p>
      ) : pending.length === 0 ? (
        <p className="empty hud-panel">The queue is empty. The System is almost disappointed.</p>
      ) : (
        <div className="queue">
          {pending
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <PendingRow key={item.id} item={item} />
            ))}
        </div>
      )}
    </section>
  );
}

function PendingRow({ item }: { item: Item }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast(done);
    } catch {
      toast('That action failed. Check the fields and try again.', 'error');
      setBusy(false);
    }
  }

  return (
    <ItemEditor
      item={item}
      label={`Submission: ${item.name}`}
      busy={busy}
      actions={(form, valid) => (
        <>
          <button
            className="btn btn-primary"
            disabled={busy || !valid}
            onClick={() => run(() => saveItem(item.id, form, true), `${form.name.trim()} approved. It's in the catalog now.`)}
          >
            Approve
          </button>
          <button className="btn btn-danger" disabled={busy} onClick={() => run(() => rejectItem(item.id), `${item.name} rejected.`)}>
            Reject
          </button>
        </>
      )}
    />
  );
}
