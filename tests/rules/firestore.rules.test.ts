import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const card = (over: Record<string, unknown> = {}) => ({
  name: 'Test Card',
  category: 'card',
  type: 'Foil',
  rarity: 'gold',
  status: 'pending',
  submittedBy: 'alice',
  createdAt: serverTimestamp(),
  ...over,
});

beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-loot-box-vault',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port: Number(port) },
  });
});

afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/admin'), { note: 'test admin' });
    await setDoc(doc(db, 'items/approved-1'), { ...card({ status: 'approved', submittedBy: 'seed' }), createdAt: new Date() });
    await setDoc(doc(db, 'items/pending-bob'), { ...card({ submittedBy: 'bob' }), createdAt: new Date() });
    await setDoc(doc(db, 'vaults/pub'), { displayName: 'Public', isPublic: true, updatedAt: new Date() });
    await setDoc(doc(db, 'vaults/pub/entries/approved-1'), { state: 'owned', updatedAt: new Date() });
    await setDoc(doc(db, 'vaults/priv'), { displayName: 'Private', isPublic: false, updatedAt: new Date() });
    await setDoc(doc(db, 'vaults/priv/entries/approved-1'), { state: 'grail', updatedAt: new Date() });
  });
});

const as = (uid?: string) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

describe('items', () => {
  it('anyone can read approved items and query by status', async () => {
    await assertSucceeds(getDoc(doc(as(), 'items/approved-1')));
    await assertSucceeds(getDocs(query(collection(as(), 'items'), where('status', '==', 'approved'))));
  });

  it('pending items are visible to their submitter and admins only', async () => {
    await assertFails(getDoc(doc(as(), 'items/pending-bob')));
    await assertFails(getDoc(doc(as('alice'), 'items/pending-bob')));
    await assertSucceeds(getDoc(doc(as('bob'), 'items/pending-bob')));
    await assertSucceeds(getDoc(doc(as('admin'), 'items/pending-bob')));
  });

  it('an unfiltered catalog query is denied (it would leak pending items)', async () => {
    await assertFails(getDocs(collection(as('alice'), 'items')));
  });

  it('signed-in users can submit pending items as themselves', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'items/new'), card()));
  });

  it('submissions are rejected when signed out, approved, spoofed or malformed', async () => {
    await assertFails(setDoc(doc(as(), 'items/new'), card()));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ status: 'approved' })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ submittedBy: 'bob' })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ rarity: 'mythic' })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ category: 'weapon' })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ name: '' })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ name: 'x'.repeat(121) })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ price: 9000 })));
    await assertFails(setDoc(doc(as('alice'), 'items/new'), card({ createdAt: new Date(0) })));
  });

  it('only admins can approve, edit or delete items', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'items/pending-bob'), { status: 'approved' }));
    await assertFails(deleteDoc(doc(as('bob'), 'items/pending-bob')));
    await assertSucceeds(updateDoc(doc(as('admin'), 'items/pending-bob'), { status: 'approved' }));
    await assertSucceeds(deleteDoc(doc(as('admin'), 'items/approved-1')));
  });

  it('only admins can list the pending submission queue', async () => {
    const pendingQuery = (uid?: string) => getDocs(query(collection(as(uid), 'items'), where('status', '==', 'pending')));
    await assertSucceeds(pendingQuery('admin'));
    await assertFails(pendingQuery('alice'));
    await assertFails(pendingQuery());
  });

  it('admin approval can edit fields but must stay valid', async () => {
    await assertSucceeds(updateDoc(doc(as('admin'), 'items/pending-bob'), { status: 'approved', rarity: 'celestial', name: 'Renamed' }));
    await assertFails(updateDoc(doc(as('admin'), 'items/approved-1'), { rarity: 'mythic' }));
    await assertFails(updateDoc(doc(as('admin'), 'items/approved-1'), { name: '' }));
  });

  it('admins can create approved items directly (catalog seeding)', async () => {
    await assertSucceeds(setDoc(doc(as('admin'), 'items/seeded'), card({ status: 'approved', submittedBy: 'admin' })));
  });
});

describe('admins', () => {
  it('a user can check their own admin flag but nobody can write it', async () => {
    await assertSucceeds(getDoc(doc(as('admin'), 'admins/admin')));
    await assertFails(getDoc(doc(as('alice'), 'admins/admin')));
    await assertFails(setDoc(doc(as('alice'), 'admins/alice'), { note: 'let me in' }));
  });
});

describe('vaults', () => {
  const vault = (over: Record<string, unknown> = {}) => ({ displayName: 'Alice', isPublic: false, updatedAt: serverTimestamp(), ...over });

  it('owners can create and update their own vault', async () => {
    await assertSucceeds(setDoc(doc(as('alice'), 'vaults/alice'), vault()));
    await assertSucceeds(setDoc(doc(as('alice'), 'vaults/alice'), vault({ isPublic: true })));
  });

  it('nobody can write someone else’s vault or add unknown fields', async () => {
    await assertFails(setDoc(doc(as('bob'), 'vaults/alice'), vault()));
    await assertFails(setDoc(doc(as('alice'), 'vaults/alice'), vault({ isAdmin: true })));
    await assertFails(setDoc(doc(as('alice'), 'vaults/alice'), vault({ displayName: 'x'.repeat(41) })));
  });

  it('public vaults and entries are readable by anyone; private ones only by the owner', async () => {
    await assertSucceeds(getDoc(doc(as(), 'vaults/pub')));
    await assertSucceeds(getDocs(collection(as(), 'vaults/pub/entries')));
    await assertFails(getDoc(doc(as('alice'), 'vaults/priv')));
    await assertFails(getDocs(collection(as('alice'), 'vaults/priv/entries')));
    await assertSucceeds(getDocs(collection(as('priv'), 'vaults/priv/entries')));
  });

  it('owners can mark entries with valid states only', async () => {
    const entry = (state: string) => ({ state, updatedAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(as('alice'), 'vaults/alice/entries/approved-1'), entry('owned')));
    await assertSucceeds(setDoc(doc(as('alice'), 'vaults/alice/entries/approved-1'), entry('grail')));
    await assertSucceeds(deleteDoc(doc(as('alice'), 'vaults/alice/entries/approved-1')));
    await assertFails(setDoc(doc(as('alice'), 'vaults/alice/entries/approved-1'), entry('stolen')));
    await assertFails(setDoc(doc(as('bob'), 'vaults/alice/entries/approved-1'), entry('owned')));
  });
});
