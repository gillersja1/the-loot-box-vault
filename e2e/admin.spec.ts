import { expect, test } from '@playwright/test';
import { makeAdmin, signInWithEmailLink, submitItem, uniqueEmail } from './helpers';

test.describe('admin approvals', () => {
  test('non-admins cannot see or use the admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();

    await signInWithEmailLink(page, uniqueEmail('crawler'));
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });

  test('admin edits and approves a submission, which then appears in the catalog', async ({ page }) => {
    const email = uniqueEmail('admin');
    await signInWithEmailLink(page, email);
    const submitted = await submitItem(page, 'Queue Card', { category: 'card' });
    await makeAdmin(page, email);

    await page.getByRole('link', { name: 'Admin' }).click();
    const row = page.getByRole('article', { name: `Submission: ${submitted}` });
    await expect(row).toBeVisible();

    const approvedName = `${submitted} (approved)`;
    await row.getByLabel('Name').fill(approvedName);
    await row.getByLabel('Rarity').selectOption('celestial');
    await row.getByLabel('Series / set').fill('Admin Set');
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText(`${approvedName} approved.`)).toBeVisible();
    await expect(row).toBeHidden();

    await page.getByRole('link', { name: 'Catalog' }).click();
    await page.getByRole('tab', { name: 'Cards' }).click();
    await page.getByRole('searchbox').fill(approvedName);
    const card = page.getByRole('article', { name: approvedName });
    await expect(card).toContainText('Celestial');
    await expect(card).toContainText('Admin Set');
  });

  test('admin rejects a submission, which is removed for good', async ({ page }) => {
    const email = uniqueEmail('admin');
    await signInWithEmailLink(page, email);
    const submitted = await submitItem(page, 'Junk Plush');
    await makeAdmin(page, email);

    await page.getByRole('link', { name: 'Admin' }).click();
    const row = page.getByRole('article', { name: `Submission: ${submitted}` });
    await row.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText(`${submitted} rejected.`)).toBeVisible();
    await expect(row).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Submission queue' })).toBeVisible();
    await expect(page.getByRole('article', { name: `Submission: ${submitted}` })).toHaveCount(0);
  });

  test('approve is disabled while the name is blank', async ({ page }) => {
    const email = uniqueEmail('admin');
    await signInWithEmailLink(page, email);
    const submitted = await submitItem(page, 'Blank Check');
    await makeAdmin(page, email);

    await page.getByRole('link', { name: 'Admin' }).click();
    const row = page.getByRole('article', { name: `Submission: ${submitted}` });
    await row.getByLabel('Name').fill('   ');
    await expect(row.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  test('admin adds an image link to a catalog item and it shows in the catalog', async ({ page }) => {
    // Serve a tiny PNG for the fake image host so the test does not depend on the internet.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await page.route('https://images.loot.test/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));

    const email = uniqueEmail('admin');
    await signInWithEmailLink(page, email);
    await makeAdmin(page, email);
    const name = await submitItem(page, 'Pictured Plush');
    await page.getByRole('link', { name: 'Admin' }).click();
    await page.getByRole('article', { name: `Submission: ${name}` }).getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText(`${name} approved.`)).toBeVisible();

    await page.getByRole('link', { name: 'Catalog' }).click();
    await page.getByRole('searchbox').fill(name);
    await page.getByRole('link', { name: `Edit ${name}` }).click();

    const editor = page.getByRole('article', { name: `Edit: ${name}` });
    await editor.getByLabel('Image link').fill('not a link');
    await expect(editor.getByText('Use a full https:// link.')).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Save' })).toBeDisabled();

    await editor.getByLabel('Image link').fill('https://images.loot.test/plush.png');
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(`${name} saved.`)).toBeVisible();

    await page.getByRole('searchbox').fill(name);
    await expect(page.getByRole('article', { name }).getByRole('img', { name })).toHaveAttribute('src', 'https://images.loot.test/plush.png');
  });

  test('non-admins get no edit links and cannot open the editor', async ({ page }) => {
    await signInWithEmailLink(page, uniqueEmail('crawler'));
    await expect(page.getByRole('link', { name: /^Edit / })).toHaveCount(0);
    await page.goto('/admin/item/book-01');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  });

  test('admin fills missing official images from the starter catalog', async ({ page }) => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await page.route('https://www.borantcorp.com/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));

    const email = uniqueEmail('admin');
    await signInWithEmailLink(page, email);
    await makeAdmin(page, email);
    await page.getByRole('link', { name: 'Admin' }).click();
    // Other parallel tests may have filled them already; only click if offered.
    await expect(page.getByTestId('catalog-status')).toBeVisible();
    const fill = page.getByRole('button', { name: /^Update \d+ official images$/ });
    // The desktop and mobile projects share one emulator, so the other may click first.
    if (await fill.isVisible()) await fill.click({ timeout: 3000 }).catch(() => {});
    await expect(fill).toBeHidden({ timeout: 15000 });

    await page.getByRole('link', { name: 'Catalog' }).click();
    await page.getByRole('tab', { name: 'Cards' }).click();
    await page.getByRole('searchbox').fill('Faction Wars');
    await expect(page.getByRole('img', { name: 'Princess Donut' }).first()).toHaveAttribute('src', /borantcorp\.com.*_090\.jpg$/);
  });
});
