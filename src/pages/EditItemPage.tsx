import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ItemEditor } from '../components/ItemEditor';
import { useToast } from '../components/Toast';
import { getItem, rejectItem, saveItem } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Item } from '../lib/types';

export function EditItemPage() {
  const { id = '' } = useParams();
  const { admin, ready } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!admin) return;
    getItem(id)
      .then(setItem)
      .catch(() => setItem(null));
  }, [admin, id]);

  if (!ready || (admin && item === undefined)) return <p className="empty">Loading item…</p>;
  if (!admin) {
    return (
      <div className="empty hud-panel">
        <h1>Access denied</h1>
        <p>This floor is for admins only.</p>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="empty hud-panel">
        <h1>Item not found</h1>
        <Link className="btn" to="/">
          Back to the catalog
        </Link>
      </div>
    );
  }

  const back = item.category === 'card' ? '/?tab=cards' : '/';

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast(done);
      navigate(back);
    } catch {
      toast('That did not save. Check the fields and try again.', 'error');
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="hud-panel hud-title">
        <p className="eyebrow">Production Booth</p>
        <h1>Edit item</h1>
        <p className="muted">
          <Link to={back}>Back to the catalog</Link>
        </p>
      </div>
      <ItemEditor
        item={item}
        label={`Edit: ${item.name}`}
        busy={busy}
        actions={(form, valid) => (
          <>
            <button className="btn btn-primary" disabled={busy || !valid} onClick={() => run(() => saveItem(item.id, form), `${form.name.trim()} saved.`)}>
              Save
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => run(() => rejectItem(item.id), `${item.name} deleted.`)}>
              Delete
            </button>
          </>
        )}
      />
    </section>
  );
}
