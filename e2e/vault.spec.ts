import { expect, test } from '@playwright/test';
import { signInWithEmailLink, uniqueEmail } from './helpers';

test.describe('catalog (signed out)', () => {
  test('shows seeded merch, switches to cards and filters by search', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Dungeon Crawler Carl', exact: true })).toBeVisible();
    // Books: the seeded series has 8 numbered novels plus special editions.
    await page.getByRole('searchbox').fill('Parade of Horribles');
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByRole('searchbox').fill('');

    await page.getByRole('tab', { name: 'Cards' }).click();
    await expect(page).toHaveURL(/tab=cards/);
    // Other tests approve new cards in parallel, so count only the seeded set.
    await page.getByRole('searchbox').fill('Emulator Set');
    await expect(page.getByRole('article')).toHaveCount(2);

    await page.getByRole('searchbox').fill('boss battle');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article', { name: 'Test Card: Boss Battle Foil' })).toBeVisible();

    await page.getByRole('searchbox').fill('no such loot');
    await expect(page.getByText('No loot matches those filters.')).toBeVisible();
  });

  test('filters by rarity', async ({ page }) => {
    await page.goto('/?tab=cards');
    await page.getByRole('searchbox').fill('Emulator Set');
    await page.getByLabel('Rarity').selectOption('legendary');
    await expect(page.getByRole('article')).toHaveCount(1);
  });

  test('tracking an item asks the crawler to sign in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('article', { name: 'Dungeon Crawler Carl', exact: true }).getByRole('button', { name: 'Owned' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Crawler not identified.')).toBeVisible();
  });

  test('a private or missing vault is sealed', async ({ page }) => {
    await page.goto('/vault/nobody-here');
    await expect(page.getByRole('heading', { name: 'Vault sealed' })).toBeVisible();
  });
});

test.describe('signed-in crawler', () => {
  test('marks loot, opens a loot box and shares a public vault', async ({ page, browser }) => {
    await signInWithEmailLink(page, uniqueEmail('carl'));

    const book = page.getByRole('article', { name: 'The Gate of the Feral Gods' });
    await book.getByRole('button', { name: 'Owned' }).click();

    const reveal = page.getByRole('dialog');
    await expect(reveal).toContainText('Bronze Box');
    await expect(reveal.getByRole('heading', { name: 'The Gate of the Feral Gods' })).toBeVisible();
    await reveal.getByRole('button', { name: 'Claim loot' }).click();
    await expect(reveal).toBeHidden();

    await expect(book.getByRole('button', { name: 'Owned' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Collection progress')).toContainText(/^1\/\d+ owned/);

    await page.getByRole('article', { name: 'This Inevitable Ruin' }).getByRole('button', { name: 'Grail' }).click();
    await expect(page.getByText('marked as a grail')).toBeVisible();

    // Clicking Owned again un-marks it.
    await page.getByRole('article', { name: 'Carl\'s Doomsday Scenario' }).getByRole('button', { name: 'Owned' }).click();
    await page.getByRole('button', { name: 'Claim loot' }).click();
    await page.getByRole('article', { name: 'Carl\'s Doomsday Scenario' }).getByRole('button', { name: 'Owned' }).click();
    await expect(page.getByLabel('Collection progress')).toContainText(/^1\/\d+ owned/);

    // Filters respect ownership.
    await page.getByLabel('Show').selectOption('owned');
    await expect(page.getByRole('article')).toHaveCount(1);

    await page.getByRole('link', { name: 'My Vault' }).click();
    await expect(page.getByRole('region', { name: 'Owned' }).getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Grails' }).getByRole('article')).toHaveCount(1);

    await page.getByLabel('Vault name').fill('Princess Donut Fan Club');
    await page.getByLabel(/Public vault/).check();
    await expect(page.getByText('Vault is now public.')).toBeVisible();
    const shareUrl = (await page.locator('.share code').textContent())!;

    // A stranger can view the public vault, read-only.
    const stranger = await browser.newPage();
    await stranger.goto(shareUrl);
    await expect(stranger.getByRole('heading', { name: 'Princess Donut Fan Club' })).toBeVisible();
    await expect(stranger.getByRole('region', { name: 'Owned' })).toContainText('The Gate of the Feral Gods');
    await expect(stranger.getByRole('button', { name: 'Owned' })).toHaveCount(0);
    await expect(stranger.getByLabel('Vault name')).toHaveCount(0);

    // Going private seals it again.
    await page.getByLabel(/Public vault/).uncheck();
    await expect(page.getByText('Vault saved.')).toBeVisible();
    await stranger.reload();
    await expect(stranger.getByRole('heading', { name: 'Vault sealed' })).toBeVisible();
    await stranger.close();
  });

  test('submits an item that waits for approval', async ({ page }) => {
    await signInWithEmailLink(page, uniqueEmail('donut'));
    await page.getByRole('link', { name: 'Submit' }).click();
    const name = `Pending Plush ${Date.now()}`;
    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Type').selectOption('Plush');
    await page.getByLabel('Rarity').selectOption('platinum');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByText('Submitted. It shows up in the catalog')).toBeVisible();

    await page.getByRole('link', { name: 'Catalog' }).click();
    await page.getByRole('searchbox').fill(name);
    await expect(page.getByText('No loot matches those filters.')).toBeVisible();
  });

  test('sign out returns to a signed-out catalog', async ({ page }) => {
    await signInWithEmailLink(page, uniqueEmail('mordecai'));
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Collection progress')).toHaveCount(0);
  });
});

test('the Series One card set is in the catalog with its parallels', async ({ page }) => {
  await page.goto('/?tab=cards');
  await page.getByRole('searchbox').fill('Faction Wars');
  await expect(page.getByRole('article')).toHaveCount(11);
  await page.getByRole('searchbox').fill('Emerald parallel');
  await expect(page.getByRole('article')).toHaveCount(81);
  await page.getByRole('searchbox').fill('Matt Dinniman');
  await expect(page.getByRole('article', { name: 'Signed: Matt Dinniman' })).toContainText('Celestial');
});

test('researched merch, comics and RPG products are in the catalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('Special Edition #0 Cover');
  await expect(page.getByRole('article')).toHaveCount(8);
  await page.getByRole('searchbox').fill('Loot Box: Donut');
  await expect(page.getByRole('article')).toHaveCount(6);
  await page.getByRole('searchbox').fill('DCC RPG');
  await expect(page.getByRole('article')).toHaveCount(11);
  await page.getByRole('searchbox').fill('Kickstarter');
  await expect(page.getByRole('article').first()).toContainText('Legendary');
});

test('the catalog is grouped into collapsible sections', async ({ page }) => {
  await page.goto('/?tab=cards');
  const factionWars = page.locator('details', { has: page.getByText('Rainbow Foil: Faction Wars', { exact: true }) });
  await expect(factionWars.getByRole('article')).toHaveCount(11);
  await factionWars.getByText('Rainbow Foil: Faction Wars', { exact: true }).click();
  await expect(factionWars.getByRole('article').first()).toBeHidden();
  // Items without an image link get a labeled placeholder.
  await page.getByRole('searchbox').fill('Crawler Rookie');
  await expect(page.getByRole('img', { name: 'Test Card: Crawler Rookie (no image)' })).toBeVisible();
});
