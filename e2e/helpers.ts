import { expect, type Page } from '@playwright/test';

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const PROJECT = 'demo-loot-box-vault';

export const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@crawler.test`;

/**
 * Signs in through the real email-link flow: the UI requests a link, the Auth emulator
 * records the out-of-band code, and we follow it like a user clicking the email.
 */
export async function signInWithEmailLink(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('crawler@example.com').fill(email);
  await page.getByRole('button', { name: 'Email me a link' }).click();
  await expect(page.getByText('Link sent.')).toBeVisible();

  let oobLink: string | undefined;
  await expect
    .poll(async () => {
      const res = await page.request.get(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT}/oobCodes`);
      const { oobCodes } = (await res.json()) as { oobCodes: { email: string; oobLink: string; requestType: string }[] };
      oobLink = oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN').at(-1)?.oobLink;
      return oobLink;
    })
    .toBeTruthy();

  const code = new URL(oobLink!).searchParams;
  await page.goto(`/login?mode=signIn&oobCode=${code.get('oobCode')}&apiKey=${code.get('apiKey')}&lang=en`);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  // Regression: a successful sign-in must not also report the link as expired.
  await expect(page.getByText('sign-in link is expired')).toHaveCount(0);
}
