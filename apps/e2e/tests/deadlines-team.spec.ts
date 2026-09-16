import { expect, test } from '@playwright/test';
import { createWorkspace, PASSWORD, signIn, uniqueEmail } from './helpers';

test('add a deadline this week and mark it done', async ({ page }) => {
  const workspace = await createWorkspace('deadline');
  await signIn(page, workspace.email);
  await page.goto('/deadlines');

  const inThreeDays = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  await page.getByRole('button', { name: 'Add deadline' }).click();
  await page.getByLabel('What is due').fill('Letter of inquiry to E2E Fund');
  await page.getByLabel('Date').fill(inThreeDays);
  await page.getByRole('button', { name: 'Add deadline' }).click();

  const item = page.getByRole('listitem').filter({ hasText: 'Letter of inquiry to E2E Fund' });
  await expect(item).toContainText('3 days left');
  await expect(page.getByText(/^This week/)).toBeVisible();

  await item.getByRole('button', { name: 'Mark as done' }).click();
  await expect(page.getByText(/^Done/)).toBeVisible();

  await workspace.api.dispose();
});

test('an owner invites a colleague who joins as a viewer', async ({ page, browser }) => {
  const owner = await createWorkspace('owner');
  await signIn(page, owner.email);
  await page.goto('/team');

  const inviteeEmail = uniqueEmail('invitee');
  await page.getByLabel('Email').fill(inviteeEmail);
  await page.getByLabel('Role').selectOption('VIEWER');
  await page.getByRole('button', { name: 'Send invitation' }).click();

  await expect(page.getByText(`Invitation created for ${inviteeEmail}`)).toBeVisible();
  const link = await page.locator('input[readonly]').inputValue();
  expect(link).toContain('/invite/');
  await expect(page.getByText(inviteeEmail).first()).toBeVisible();

  // The colleague opens the link in their own browser.
  const colleague = await browser.newContext();
  const invitee = await colleague.newPage();
  await invitee.goto(link);
  await expect(invitee.getByText(owner.orgName)).toBeVisible();
  await invitee.getByRole('link', { name: 'Create an account to accept' }).click();

  await invitee.getByLabel('Full name').fill('Sana Iqbal');
  await invitee.getByLabel('Work email').fill(inviteeEmail);
  await invitee.getByLabel('Password').fill(PASSWORD);
  await invitee.getByRole('button', { name: 'Create account' }).click();

  await invitee.getByRole('button', { name: `Join ${owner.orgName}` }).click();
  await expect(invitee.getByRole('heading', { level: 1 })).toContainText('Sana');

  await invitee.goto('/team');
  await expect(invitee.getByText('Only owners can invite people or change roles.')).toBeVisible();

  // Back on the owner's side the new member is listed.
  await page.reload();
  await expect(page.getByText('Sana Iqbal')).toBeVisible();

  await colleague.close();
  await owner.api.dispose();
});
