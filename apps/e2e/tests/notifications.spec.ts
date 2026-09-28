import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn, PASSWORD } from './helpers';

test('an owner is told when a reviewer leaves a note', async ({ page, browser }) => {
  const workspace = await createWorkspace('notify');
  await createTemplate(workspace, 'E2E Notify Grant');

  const reviewer = `reviewer-${Date.now()}@e2e.test`;
  const invitation = await workspace.api.post(`orgs/${workspace.orgId}/invitations`, {
    data: { email: reviewer, role: 'EDITOR' },
  });
  const { token } = await invitation.json();

  await signIn(page, workspace.email);
  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Notified proposal');
  await page.getByRole('button', { name: /E2E Notify Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();
  const proposalUrl = page.url();

  // Nothing yet for the owner.
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByText('Nothing yet.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');

  // The reviewer joins in a second session and leaves a note.
  const reviewerContext = await browser.newContext();
  const reviewerPage = await reviewerContext.newPage();
  await reviewerPage.goto(`/invite/${token}`);
  await reviewerPage.getByRole('link', { name: 'Create an account' }).click();
  await reviewerPage.getByLabel('Full name').fill('Hina Reviewer');
  await reviewerPage.getByLabel('Work email').fill(reviewer);
  await reviewerPage.getByLabel('Password').fill(PASSWORD);
  await reviewerPage.getByRole('button', { name: 'Create account' }).click();
  await reviewerPage.getByRole('button', { name: /Join/ }).click();

  await reviewerPage.goto(proposalUrl);
  await reviewerPage.getByRole('button', { name: /^Notes/ }).click();
  await reviewerPage.getByPlaceholder(/A note about/).fill('The opening paragraph needs a figure.');
  await reviewerPage.getByRole('button', { name: 'Add note' }).click();
  await expect(reviewerPage.getByText('The opening paragraph needs a figure.')).toBeVisible();

  // The owner sees the note, and the person who joined, in the bell.
  await page.reload();
  await expect(page.getByRole('button', { name: /Notifications, \d+ unread/ })).toBeVisible();
  await page.getByRole('button', { name: /Notifications/ }).click();
  await expect(
    page.getByText('Hina Reviewer left a review note on Notified proposal'),
  ).toBeVisible();
  await expect(page.getByText('Hina Reviewer joined')).toBeVisible();

  // Opening one marks it read and goes to the proposal.
  await page.getByText('Hina Reviewer left a review note on Notified proposal').click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Notified proposal');
  await expect(page.getByRole('button', { name: /Notifications, 1 unread/ })).toBeVisible();

  // Marking everything read clears the badge.
  await page.getByRole('button', { name: /Notifications/ }).click();
  await page.getByRole('button', { name: 'Mark all read' }).click();
  await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();

  // The reviewer is not told about their own note.
  await reviewerPage.reload();
  await reviewerPage.getByRole('button', { name: 'Notifications' }).click();
  await expect(reviewerPage.getByText('left a review note')).toBeHidden();
  await reviewerContext.close();
});
