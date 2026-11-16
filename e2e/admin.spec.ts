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
});
