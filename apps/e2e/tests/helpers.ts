import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

export const PASSWORD = 'Secret12345';

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`;
}

export interface Workspace {
  api: APIRequestContext;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
}

/** Creates a user and an organization through the API, so a test can start from the UI. */
export async function createWorkspace(prefix: string): Promise<Workspace> {
  const api = await request.newContext({ baseURL: `${API_URL}/` });
  const email = uniqueEmail(prefix);
  const name = 'Farah Qureshi';
  const orgName = `E2E ${prefix} ${Date.now()}`;

  const registered = await api.post('auth/register', { data: { name, email, password: PASSWORD } });
  expect(registered.ok()).toBeTruthy();

  const org = await api.post('orgs', {
    data: { name: orgName, type: 'NONPROFIT', country: 'Pakistan' },
  });
  expect(org.ok()).toBeTruthy();

  return { api, email, name, orgId: (await org.json()).id, orgName };
}

export async function createTemplate(workspace: Workspace, name: string): Promise<string> {
  const response = await workspace.api.post(`orgs/${workspace.orgId}/templates`, {
    data: {
      name,
      funderName: 'E2E Foundation',
      sections: [
        {
          title: 'Executive summary',
          instructions: 'The request and the change',
          wordLimit: 120,
          required: true,
        },
        {
          title: 'Statement of need',
          instructions: 'Local evidence',
          wordLimit: 200,
          required: true,
        },
      ],
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).id;
}

export async function signIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)/,
  );
}
