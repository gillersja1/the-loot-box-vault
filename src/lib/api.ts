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

const STARTER_IMAGES = new Map<string, string>(
  seed.flatMap((s) => ('imageUrl' in s && typeof s.imageUrl === 'string' ? [[s.id, s.imageUrl] as [string, string]] : [])),
);

const OFFICIAL_IMAGE_HOST = 'https://www.borantcorp.com/';

/**
 * Catalog items whose official starter image is missing or outdated. Images an admin
 * set from any other site are never touched.
 */
export function itemsMissingStarterImages(items: Item[]): Item[] {
  return items.filter((i) => {
    const starter = STARTER_IMAGES.get(i.id);
    if (!starter || i.imageUrl === starter) return false;
    return !i.imageUrl || i.imageUrl.startsWith(OFFICIAL_IMAGE_HOST);
  });
}

/** Admin-only: applies starter image links to the items itemsMissingStarterImages picks. */
export async function fillStarterImages(items: Item[]) {
  const targets = itemsMissingStarterImages(items);
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    for (const item of targets.slice(i, i + 400)) batch.update(doc(db, 'items', item.id), { imageUrl: STARTER_IMAGES.get(item.id)! });
    await batch.commit();
  }
  return targets.length;
}

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

export type ItemEdits = Pick<Item, 'name' | 'category' | 'type' | 'rarity'> & { series: string; number: string; notes: string; imageUrl: string };

export function toEdits(item: Item): ItemEdits {
  return {
    name: item.name,
    category: item.category,
    type: item.type,
    rarity: item.rarity,
    series: item.series ?? '',
    number: item.number ?? '',
    notes: item.notes ?? '',
    imageUrl: item.imageUrl ?? '',
  };
}

/** Admin-only: saves edits; empty optional fields are removed. Pass approve to publish a pending item. */
export async function saveItem(id: string, edits: ItemEdits, approve = false) {
  const optional = (v: string) => (v.trim() ? v.trim() : deleteField());
  await updateDoc(doc(db, 'items', id), {
    name: edits.name.trim(),
    category: edits.category,
    type: edits.type,
    rarity: edits.rarity,
    series: optional(edits.series),
    number: optional(edits.number),
    notes: optional(edits.notes),
    imageUrl: optional(edits.imageUrl),
    ...(approve ? { status: 'approved' } : {}),
  });
}

export async function getItem(id: string): Promise<Item | null> {
  const snap = await getDoc(doc(db, 'items', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Item) : null;
}

/** Admin-only: deletes an item (rejecting a submission, or removing a catalog item). */
export async function rejectItem(id: string) {
  await deleteDoc(doc(db, 'items', id));
}
