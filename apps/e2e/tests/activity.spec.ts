import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn } from './helpers';

test('the activity trail records what each member changed', async ({ page }) => {
  const workspace = await createWorkspace('activity');
  await createTemplate(workspace, 'E2E Activity Grant');
  await signIn(page, workspace.email);

  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Trail check proposal');
  await page.getByRole('button', { name: /E2E Activity Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();

  // The editor saves two seconds after typing stops; wait for that request, not the label.
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && response.url().includes('/sections/'),
  );
  await page.getByPlaceholder(/Write here/).fill('A first paragraph, saved by hand.');
  await saved;

  await page.goto('/activity');
  const trail = page.locator('main').getByRole('listitem');
  await expect(
    trail.filter({ hasText: 'started the proposal Trail check proposal' }),
  ).toBeVisible();
  await expect(trail.filter({ hasText: 'edited the section Executive summary' })).toBeVisible();
  await expect(trail.first()).toContainText(workspace.name);

  // Proposal entries open the proposal.
  await trail.filter({ hasText: 'started the proposal' }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Trail check proposal');
});
