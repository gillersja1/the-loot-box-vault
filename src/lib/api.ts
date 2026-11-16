import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
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

export const STARTER_IDS: string[] = seed.map((s) => s.id);

/** Admin-only: writes starter catalog items that are not in Firestore yet (never overwrites edits). */
export async function seedCatalog(uid: string, existingIds: Iterable<string>) {
  const have = new Set(existingIds);
  const batch = writeBatch(db);
  let added = 0;
  for (const { id, ...rest } of seed) {
    if (have.has(id)) continue;
    batch.set(doc(db, 'items', id), { ...rest, status: 'approved', submittedBy: uid, createdAt: serverTimestamp() });
    added++;
  }
  if (added) await batch.commit();
  return added;
}

export function watchPendingItems(cb: (items: Item[]) => void, onError: (e: Error) => void) {
  const q = query(collection(db, 'items'), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Item)), onError);
}

export type ItemEdits = Pick<Item, 'name' | 'category' | 'type' | 'rarity'> & { series: string; number: string; notes: string };

/** Admin-only: applies edits and publishes the item. Empty optional fields are removed. */
export async function approveItem(id: string, edits: ItemEdits) {
  const optional = (v: string) => (v.trim() ? v.trim() : deleteField());
  await updateDoc(doc(db, 'items', id), {
    name: edits.name.trim(),
    category: edits.category,
    type: edits.type,
    rarity: edits.rarity,
    series: optional(edits.series),
    number: optional(edits.number),
    notes: optional(edits.notes),
    status: 'approved',
  });
}

/** Admin-only: rejecting a submission deletes it. */
export async function rejectItem(id: string) {
  await deleteDoc(doc(db, 'items', id));
}
