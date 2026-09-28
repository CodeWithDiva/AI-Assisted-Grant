import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn } from './helpers';

test('a library passage is inserted into a proposal, and section text is saved back', async ({
  page,
}) => {
  const workspace = await createWorkspace('library');
  await createTemplate(workspace, 'E2E Library Grant');
  await signIn(page, workspace.email);

  // Add a passage from the library page.
  await page.goto('/library');
  await expect(page.getByText('Start your library')).toBeVisible();
  await page.getByRole('button', { name: '+ Safeguarding policy' }).click();
  await expect(page.getByLabel('Title')).toHaveValue('Safeguarding policy');
  await page
    .getByLabel(/^Passage/)
    .fill('Every teacher is vetted and trained in child protection before starting.');
  await page.getByRole('button', { name: 'Add to library' }).click();
  await expect(page.getByRole('heading', { name: 'Safeguarding policy' })).toBeVisible();
  await expect(page.getByText('used 0 times')).toBeVisible();

  // Insert it into a section of a new proposal.
  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Library check');
  await page.getByRole('button', { name: /E2E Library Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();

  const editor = page.getByPlaceholder(/Write here/);
  await editor.fill('Our approach to child safety:');
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByLabel('Search the content library').fill('vetted');
  await page.getByRole('button', { name: 'Insert' }).click();
  await expect(editor).toHaveValue(
    'Our approach to child safety:\n\nEvery teacher is vetted and trained in child protection before starting.',
  );

  // Save the section text back to the library as a new passage.
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Save this section to the library' }).click();
  await page.getByLabel('Title for this passage').fill('Child safety summary');
  await page.getByRole('button', { name: 'Save passage' }).click();
  await expect(page.getByText('Saved to the library.')).toBeVisible();

  // Both passages are listed, and the inserted one counts as used.
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Child safety summary' })).toBeVisible();
  await expect(page.getByText('used 1 time', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Search passages').fill('summary');
  await expect(page.getByRole('heading', { name: 'Safeguarding policy' })).toBeHidden();
});
