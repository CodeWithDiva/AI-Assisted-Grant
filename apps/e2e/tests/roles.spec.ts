import { expect, test } from '@playwright/test';
import { createTemplate, createWorkspace, signIn, PASSWORD, uniqueEmail } from './helpers';

test('a proposal is assigned, and the assignee sees it under "Assigned to me"', async ({
  page,
  browser,
}) => {
  const workspace = await createWorkspace('assign');
  await createTemplate(workspace, 'E2E Assign Grant');

  const employee = uniqueEmail('employee');
  const invitation = await workspace.api.post(`orgs/${workspace.orgId}/invitations`, {
    data: { email: employee, role: 'EDITOR' },
  });
  const { token } = await invitation.json();

  // The employee joins.
  const employeeContext = await browser.newContext();
  const employeePage = await employeeContext.newPage();
  await employeePage.goto(`/invite/${token}`);
  await employeePage.getByRole('link', { name: 'Create an account' }).click();
  await employeePage.getByLabel('Full name').fill('Bilal Employee');
  await employeePage.getByLabel('Work email').fill(employee);
  await employeePage.getByLabel('Password').fill(PASSWORD);
  await employeePage.getByRole('button', { name: 'Create account' }).click();
  await employeePage.getByRole('button', { name: /Join/ }).click();

  // The owner starts a proposal and hands it over.
  await signIn(page, workspace.email);
  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Work to hand over');
  await page.getByRole('button', { name: /E2E Assign Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();

  await page.getByRole('button', { name: 'Assign this proposal' }).click();
  await page.getByRole('menuitem', { name: /Bilal Employee/ }).click();
  await expect(page.getByRole('button', { name: 'Assign this proposal' })).toContainText(
    'Bilal Employee',
  );

  // The employee finds it under their own filter, and hears about it.
  await employeePage.goto('/proposals');
  await employeePage.getByLabel('Assigned to me').check();
  await expect(employeePage.getByRole('row', { name: /Work to hand over/ })).toBeVisible();
  await employeePage.getByRole('button', { name: /Notifications, \d+ unread/ }).click();
  await expect(
    employeePage.getByLabel('Notifications').getByText(/Work to hand over/),
  ).toBeVisible();

  // The owner's list shows who has it.
  await page.goto('/proposals');
  await expect(page.getByRole('row', { name: /Work to hand over/ })).toContainText(
    'Bilal Employee',
  );
  await employeeContext.close();
});

test('a read-only member is not offered actions they cannot take', async ({ page, browser }) => {
  const workspace = await createWorkspace('readonly');
  await createTemplate(workspace, 'E2E Read Grant');

  const viewer = uniqueEmail('readonly');
  const invitation = await workspace.api.post(`orgs/${workspace.orgId}/invitations`, {
    data: { email: viewer, role: 'VIEWER' },
  });
  const { token } = await invitation.json();

  await signIn(page, workspace.email);
  await page.goto('/proposals/new');
  await page.getByLabel('Proposal title').fill('Read-only check');
  await page.getByRole('button', { name: /E2E Read Grant/ }).click();
  await page.getByRole('button', { name: 'Create proposal' }).click();
  await expect(page.getByPlaceholder(/Write here/)).toBeVisible();
  const proposalUrl = page.url();

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await viewerPage.goto(`/invite/${token}`);
  await viewerPage.getByRole('link', { name: 'Create an account' }).click();
  await viewerPage.getByLabel('Full name').fill('Rida Reader');
  await viewerPage.getByLabel('Work email').fill(viewer);
  await viewerPage.getByLabel('Password').fill(PASSWORD);
  await viewerPage.getByRole('button', { name: 'Create account' }).click();
  await viewerPage.getByRole('button', { name: /Join/ }).click();

  // The proposal is readable, but nothing that writes is on offer.
  await viewerPage.goto(proposalUrl);
  await expect(viewerPage.getByRole('heading', { level: 1 })).toContainText('Read-only check');
  for (const name of ['Write with AI', 'Review draft', 'Export', 'Save', 'Library']) {
    await expect(viewerPage.getByRole('button', { name, exact: true })).toBeHidden();
  }
  await expect(viewerPage.getByPlaceholder(/Write here/)).toHaveAttribute('readonly', '');
  // Reviewing is still their job.
  await expect(viewerPage.getByRole('button', { name: /^Notes/ })).toBeVisible();

  // The lists and pages drop their write actions too.
  await viewerPage.goto('/proposals');
  await expect(viewerPage.getByRole('button', { name: 'New proposal' })).toBeHidden();
  await viewerPage.goto('/deadlines');
  await expect(viewerPage.getByRole('button', { name: 'Add deadline' })).toBeHidden();
  await viewerPage.goto('/library');
  await expect(viewerPage.getByRole('button', { name: 'New passage' })).toBeHidden();
  await viewerPage.goto('/documents');
  await expect(viewerPage.getByText('Choose a file')).toBeHidden();
  await viewerPage.goto('/templates');
  await expect(viewerPage.getByRole('button', { name: 'Import from RFP' })).toBeHidden();
  await viewerPage.goto('/proposals/new');
  await expect(viewerPage.getByText('Only owners and editors start proposals')).toBeVisible();
  await viewerContext.close();
});
