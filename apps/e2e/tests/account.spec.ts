import { expect, request, test, type Page } from '@playwright/test';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { API_URL } from '../playwright.config';
import { PASSWORD, signIn, uniqueEmail } from './helpers';

/**
 * Outside production the API saves every email as an HTML file. The API started by
 * `pnpm dev` runs in apps/api; CI starts it from the repo root and sets this variable.
 */
const PREVIEW_DIR = resolve(process.env.E2E_EMAIL_PREVIEW_DIR ?? '../api/.email-previews');

/** The newest saved email whose text contains `marker`, waiting briefly for it to appear. */
async function findEmail(marker: string, since: number): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const files = await readdir(PREVIEW_DIR).catch(() => [] as string[]);
    for (const file of files.sort().reverse()) {
      const path = join(PREVIEW_DIR, file);
      if ((await stat(path)).mtimeMs < since - 1000) continue;
      const html = await readFile(path, 'utf8');
      if (html.includes(marker)) return html;
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`No email containing "${marker}" in ${PREVIEW_DIR}`);
}

async function register(prefix: string) {
  const email = uniqueEmail(prefix);
  // A unique name identifies this test's email among the saved previews.
  const name = `Sana ${prefix} ${Date.now()}`;
  const api = await request.newContext({ baseURL: `${API_URL}/` });
  const registered = await api.post('auth/register', { data: { name, email, password: PASSWORD } });
  expect(registered.ok()).toBeTruthy();
  const org = await api.post('orgs', { data: { name: `E2E ${prefix}`, type: 'NONPROFIT' } });
  expect(org.ok()).toBeTruthy();
  await api.dispose();
  return { email, name };
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
}

test('a forgotten password is reset through the emailed link', async ({ page }) => {
  const { email, name } = await register('reset');
  const newPassword = 'Fresh-Pass-2026';
  const requestedAt = Date.now();

  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  const html = await findEmail(name, requestedAt);
  const path = /\/reset-password\/[\w-]+/.exec(html)?.[0];
  expect(path, 'reset link in the email').toBeTruthy();

  await page.goto(path!);
  await page.getByLabel(/^New password/).fill(newPassword);
  await page.getByLabel(/^Repeat the new password/).fill(newPassword);
  await page.getByRole('button', { name: 'Save and sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)/,
  );

  // The link works once.
  await signOut(page);
  await page.goto(path!);
  await page.getByLabel(/^New password/).fill('Another-Pass-1');
  await page.getByLabel(/^Repeat the new password/).fill('Another-Pass-1');
  await page.getByRole('button', { name: 'Save and sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');

  // The old password no longer works; the new one does.
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await signIn(page, email, newPassword);
});

test('an unknown email gets the same answer as a real one', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill(uniqueEmail('nobody'));
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
});

test('the email address is changed from Settings', async ({ page }) => {
  const { email, name } = await register('email');
  const newEmail = uniqueEmail('moved');
  const changedAt = Date.now();

  await signIn(page, email);
  await page.goto('/settings');
  await page.getByLabel('New email').fill(newEmail);
  await page.getByLabel(/^Password/).fill('wrong-password');
  await page.getByRole('button', { name: 'Change email' }).click();
  await expect(page.getByRole('alert')).toContainText('current password is not correct');

  await page.getByLabel(/^Password/).fill(PASSWORD);
  await page.getByRole('button', { name: 'Change email' }).click();
  await expect(page.getByText(`You now sign in with ${newEmail}`)).toBeVisible();

  // The old address is told about the change.
  expect(await findEmail(name, changedAt)).toContain(newEmail);

  await signOut(page);
  await signIn(page, newEmail);
});
