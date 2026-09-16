import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn } from './helpers';

test('write a proposal with formatting, review it and export a PDF', async ({ page }) => {
  const workspace = await createWorkspace('proposal');
  await createTemplate(workspace, 'E2E Education Grant');
  await signIn(page, workspace.email);

  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Girls in school 2027');
  await page.getByRole('button', { name: /E2E Education Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Girls in school 2027' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Executive summary' })).toBeVisible();

  const editor = page.getByPlaceholder(/Write here/);
  await editor.fill('We request 96,000 USD for two years. [NEEDS INPUT: 2025 enrolment]');

  // Select "96,000 USD" and make it bold with the toolbar.
  await editor.evaluate((area: HTMLTextAreaElement) => {
    const start = area.value.indexOf('96,000 USD');
    area.setSelectionRange(start, start + '96,000 USD'.length);
  });
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && response.url().includes('/sections/'),
  );
  await page.getByRole('button', { name: 'Bold' }).click();
  await expect(editor).toHaveValue(/\*\*96,000 USD\*\*/);
  expect((await saved).ok()).toBeTruthy();

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.locator('strong', { hasText: '96,000 USD' })).toBeVisible();

  // The text survives a reload.
  await page.reload();
  await expect(page.getByPlaceholder(/Write here/)).toHaveValue(/\*\*96,000 USD\*\*/);

  await page.getByRole('button', { name: 'Review draft' }).click();
  await page.getByRole('button', { name: 'Check the draft' }).click();
  await expect(page.getByText('1 unfilled placeholder still in the text.')).toBeVisible();
  await expect(page.getByText('This section is empty.')).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByRole('menuitem', { name: /PDF/ }).click();
  expect((await download).suggestedFilename()).toBe('girls-in-school-2027.pdf');

  await workspace.api.dispose();
});

test('a proposal appears in the table under its status tab', async ({ page }) => {
  const workspace = await createWorkspace('table');
  const templateId = await createTemplate(workspace, 'E2E Table Grant');
  const created = await workspace.api.post(`orgs/${workspace.orgId}/proposals`, {
    data: { templateId, title: 'Submitted application', requestedAmount: 42000 },
  });
  const proposal = await created.json();
  await workspace.api.patch(`orgs/${workspace.orgId}/proposals/${proposal.id}`, {
    data: { status: 'SUBMITTED' },
  });

  await signIn(page, workspace.email);
  await page.goto('/proposals');

  const row = page.getByRole('row', { name: /Submitted application/ });
  await expect(row).toContainText('$42,000');
  await expect(row).toContainText('Sent to funder');

  await page.getByRole('tab', { name: /Draft/ }).click();
  await expect(page.getByRole('row', { name: /Submitted application/ })).toHaveCount(0);
  await page.getByRole('tab', { name: /Submitted/ }).click();
  await expect(page.getByRole('row', { name: /Submitted application/ })).toBeVisible();

  await workspace.api.dispose();
});
