import { test } from '@playwright/test';
import { signIn } from './helpers';
test('library shots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, 'demo@grantpilot.test', 'DemoPass2026');
  await page.goto('/library'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
  await page.screenshot({ path: String.raw`C:\Users\HP\AppData\Local\Temp\claude\c--Users-HP-Documents-GitHub-AI-Assisted-Grant\c34890f9-c16e-402c-b066-513b1230cdb0\scratchpad\lib\library.png` });
  await page.goto('/proposals'); await page.waitForLoadState('networkidle');
  await page.locator('tbody tr').filter({ hasText: 'Keeping girls' }).click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Library', exact: true }).click(); await page.waitForTimeout(600);
  await page.screenshot({ path: String.raw`C:\Users\HP\AppData\Local\Temp\claude\c--Users-HP-Documents-GitHub-AI-Assisted-Grant\c34890f9-c16e-402c-b066-513b1230cdb0\scratchpad\lib\editor-panel.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/library'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
  await page.screenshot({ path: String.raw`C:\Users\HP\AppData\Local\Temp\claude\c--Users-HP-Documents-GitHub-AI-Assisted-Grant\c34890f9-c16e-402c-b066-513b1230cdb0\scratchpad\lib\m-library.png`, fullPage: true });
  const o = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log('mobile width', o);
});
