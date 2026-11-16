// Seeds the Firestore emulator with the starter catalog plus a few test cards.
// Uses the emulator's "Bearer owner" token, which bypasses security rules (emulator only).
import { readFile } from 'node:fs/promises';

const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const project = process.env.GCLOUD_PROJECT ?? 'demo-loot-box-vault';
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;

const seed = JSON.parse(await readFile(new URL('../src/data/seed.json', import.meta.url), 'utf8'));
const testCards = [
  { id: 'card-test-01', name: 'Test Card: Crawler Rookie', category: 'card', type: 'Trading card', series: 'Emulator Set', number: '1', rarity: 'silver' },
  { id: 'card-test-02', name: 'Test Card: Boss Battle Foil', category: 'card', type: 'Foil', series: 'Emulator Set', number: '2', rarity: 'legendary' },
];

const toFields = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, k === 'createdAt' ? { timestampValue: v } : { stringValue: v }]));

// Image links are left out so e2e never depends on a third-party image host;
// the admin "Fill missing images" test adds them (with the host mocked).
for (const { id, imageUrl: _image, ...rest } of [...seed, ...testCards]) {
  const res = await fetch(`${base}/items/${id}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields({ ...rest, status: 'approved', submittedBy: 'seed', createdAt: new Date().toISOString() }) }),
  });
  if (!res.ok) throw new Error(`Seeding ${id} failed: ${res.status} ${await res.text()}`);
}
console.log(`Seeded ${seed.length + testCards.length} items into ${project}.`);
