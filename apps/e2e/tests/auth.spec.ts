import { expect, test } from '@playwright/test';
import { PASSWORD, uniqueEmail } from './helpers';

test('a new user signs up, creates an organization, signs out and back in', async ({ page }) => {
  const email = uniqueEmail('signup');
  const orgName = `Sunrise Trust ${Date.now()}`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Full name').fill('Bilal Ahmed');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Create your organization' })).toBeVisible();
  await page.getByLabel('Name').fill(orgName);
  await page.getByLabel('Country').fill('Pakistan');
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page.getByRole('heading', { name: 'Organization profile' })).toBeVisible();
  // The sidebar's organization switcher shows the new organization.
  await expect(page.locator('aside').first()).toContainText(orgName);

  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bilal');
});

test('a wrong password is refused with a clear message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(uniqueEmail('nobody'));
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
});
