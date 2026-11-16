import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Entries, EntryState, Item, Vault } from './types';
import seed from '../data/seed.json';

export function watchApprovedItems(cb: (items: Item[]) => void, onError: (e: Error) => void) {
  const q = query(collection(db, 'items'), where('status', '==', 'approved'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Item)), onError);
}

export async function getApprovedItems(): Promise<Item[]> {
  const snap = await getDocs(query(collection(db, 'items'), where('status', '==', 'approved')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Item);
}

export function watchEntries(uid: string, cb: (e: Entries) => void, onError: (e: Error) => void) {
  return onSnapshot(
    collection(db, 'vaults', uid, 'entries'),
    (snap) => {
      const out: Entries = {};
      snap.forEach((d) => (out[d.id] = d.data().state as EntryState));
      cb(out);
    },
    onError,
  );
}

export async function getEntries(uid: string): Promise<Entries> {
  const snap = await getDocs(collection(db, 'vaults', uid, 'entries'));
  const out: Entries = {};
  snap.forEach((d) => (out[d.id] = d.data().state as EntryState));
  return out;
}

export async function setEntry(uid: string, itemId: string, state: EntryState | null) {
  const ref = doc(db, 'vaults', uid, 'entries', itemId);
  if (state === null) await deleteDoc(ref);
  else await setDoc(ref, { state, updatedAt: serverTimestamp() });
}

export async function getVault(uid: string): Promise<Vault | null> {
  const snap = await getDoc(doc(db, 'vaults', uid));
  return snap.exists() ? (snap.data() as Vault) : null;
}

export async function saveVault(uid: string, v: Vault) {
  await setDoc(doc(db, 'vaults', uid), { displayName: v.displayName.slice(0, 40), isPublic: v.isPublic, updatedAt: serverTimestamp() });
}

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, 'admins', uid))).exists();
  } catch {
    return false;
  }
}

export type NewItem = Pick<Item, 'name' | 'category' | 'type' | 'rarity'> & Partial<Pick<Item, 'series' | 'number' | 'notes'>>;

export async function submitItem(uid: string, item: NewItem) {
  const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined && v !== ''));
  await setDoc(doc(collection(db, 'items')), { ...clean, status: 'pending', submittedBy: uid, createdAt: serverTimestamp() });
}

/** Admin-only: writes the starter catalog as approved items. */
export async function seedCatalog(uid: string) {
  const batch = writeBatch(db);
  for (const { id, ...rest } of seed) {
    batch.set(doc(db, 'items', id), { ...rest, status: 'approved', submittedBy: uid, createdAt: serverTimestamp() });
  }
  await batch.commit();
}
