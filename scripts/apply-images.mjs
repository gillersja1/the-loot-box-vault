// Adds official image links to the starter catalog (src/data/seed.json) and, with --check,
// loads every link in headless Chrome first so a typo can't ship a broken image.
import { readFile, writeFile } from 'node:fs/promises';
import { imageFor } from './borant-images.mjs';

const path = new URL('../src/data/seed.json', import.meta.url);
const seed = JSON.parse(await readFile(path, 'utf8'));
const withImages = seed.map((item) => {
  const url = imageFor(item.id);
  return url ? { ...item, imageUrl: url } : item;
});
const urls = [...new Set(withImages.map((i) => i.imageUrl).filter(Boolean))];

if (process.argv.includes('--check')) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = await page.evaluate(
    (list) =>
      Promise.all(
        list.map(
          (u) =>
            new Promise((resolve) => {
              const img = new Image();
              img.referrerPolicy = 'no-referrer';
              img.onload = () => resolve([u, img.naturalWidth > 0]);
              img.onerror = () => resolve([u, false]);
              img.src = u;
            }),
        ),
      ),
    urls,
  );
  await browser.close();
  const broken = results.filter(([, ok]) => !ok).map(([u]) => u);
  console.log(`${results.length - broken.length}/${results.length} image links load.`);
  if (broken.length) {
    console.error(broken.join('\n'));
    process.exit(1);
  }
}

await writeFile(path, '[\n' + withImages.map((x) => '  ' + JSON.stringify(x)).join(',\n') + '\n]\n');
console.log(`${withImages.filter((i) => i.imageUrl).length} of ${withImages.length} starter items have an image link.`);
