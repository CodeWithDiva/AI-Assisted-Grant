import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn } from './helpers';

test('a note is left and resolved, and an owner approves the proposal', async ({ page }) => {
  const workspace = await createWorkspace('review');
  await createTemplate(workspace, 'E2E Review Grant');
  await signIn(page, workspace.email);

  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Review workflow proposal');
  await page.getByRole('button', { name: /E2E Review Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();

  // A reviewer's note about the section being written.
  await page.getByRole('button', { name: /^Notes/ }).click();
  await page.getByPlaceholder(/A note about/).fill('Name the district in the first line.');
  await page.getByRole('button', { name: 'Add note' }).click();
  await expect(page.getByText('Name the district in the first line.')).toBeVisible();
  await expect(page.getByRole('button', { name: /1 open review note/ })).toBeVisible();

  // Approving, then editing, which takes the approval back.
  await page.getByRole('button', { name: 'Approve for submission' }).click();
  await expect(page.getByText(/Approved for submission by/)).toBeVisible();

  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && response.url().includes('/sections/'),
  );
  await page.getByPlaceholder(/Write here/).fill('A first line written after the approval.');
  await saved;
  await expect(page.getByText('Not yet approved for submission.')).toBeVisible();

  // The note is dealt with and disappears from the open count.
  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(page.getByRole('button', { name: /open review note/ })).toBeHidden();
  await expect(page.getByText(/resolved by/)).toBeVisible();

  // The list shows the review state at a glance.
  await page.goto('/proposals');
  await expect(page.getByRole('row', { name: /Review workflow proposal/ })).not.toContainText(
    'open note',
  );
});

test('a viewer can leave notes but cannot approve', async ({ page, browser }) => {
  const workspace = await createWorkspace('reviewer');
  await createTemplate(workspace, 'E2E Viewer Grant');

  const invited = `viewer-${Date.now()}@e2e.test`;
  const invitation = await workspace.api.post(`orgs/${workspace.orgId}/invitations`, {
    data: { email: invited, role: 'VIEWER' },
  });
  expect(invitation.ok()).toBeTruthy();
  const { token } = await invitation.json();

  await signIn(page, workspace.email);
  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Viewer review proposal');
  await page.getByRole('button', { name: /E2E Viewer Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();
  const proposalUrl = page.url();

  // The viewer joins in a second browser session.
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await viewerPage.goto(`/invite/${token}`);
  await viewerPage.getByRole('link', { name: 'Create an account' }).click();
  await viewerPage.getByLabel('Full name').fill('Sara Reviewer');
  await viewerPage.getByLabel('Work email').fill(invited);
  await viewerPage.getByLabel('Password').fill('Secret12345');
  await viewerPage.getByRole('button', { name: 'Create account' }).click();
  await viewerPage.getByRole('button', { name: /Join/ }).click();

  await viewerPage.goto(proposalUrl);
  await viewerPage.getByRole('button', { name: /^Notes/ }).click();
  await viewerPage.getByPlaceholder(/A note about/).fill('The budget needs a second look.');
  await viewerPage.getByRole('button', { name: 'Add note' }).click();
  await expect(viewerPage.getByText('The budget needs a second look.')).toBeVisible();
  await expect(viewerPage.getByRole('button', { name: 'Approve for submission' })).toBeHidden();
  await expect(viewerPage.getByText('An owner signs it off.')).toBeVisible();

  // The owner sees the viewer's note.
  await page.reload();
  await page.getByRole('button', { name: /^Notes/ }).click();
  await expect(page.getByText('The budget needs a second look.')).toBeVisible();
  await expect(page.getByText('Sara Reviewer')).toBeVisible();
  await viewerContext.close();
});
