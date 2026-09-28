// Renders the app icons from the same compass-needle mark as apps/web/public/favicon.svg.
// The PNGs are committed, so this only runs when the mark changes:
//
//   pnpm icons
//
// It lives here because Playwright, which does the rendering, is this package's dependency.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const publicDir = join(root, 'apps/web/public');

/** Full-bleed: iOS and Android apply their own rounded mask. */
const markup = (size) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#11261f"/>
  <path d="M16 6.5 19.4 16 12.6 16Z" fill="#c79a45"/>
  <path d="M16 25.5 19.4 16 12.6 16Z" fill="#ffffff"/>
</svg>`;

const icons = [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

const manifest = {
  name: 'GrantPilot',
  short_name: 'GrantPilot',
  description: 'Draft grant proposals against funder templates and track every deadline.',
  start_url: '/',
  display: 'standalone',
  background_color: '#f7f5f0',
  theme_color: '#11261f',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};

// Reuses the machine's Chrome, like the tests do, so no extra browser download is needed.
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  await mkdir(publicDir, { recursive: true });
  for (const [name, size] of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(markup(size));
    await page.screenshot({ path: join(publicDir, name), omitBackground: false });
    await page.close();
    console.log(`${name} (${size}x${size})`);
  }
  await writeFile(join(publicDir, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('site.webmanifest');
} finally {
  await browser.close();
}
