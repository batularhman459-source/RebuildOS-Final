import { expect, test } from '@playwright/test';
import { addFirstAction, alsoToday, openApp, quickAdd, seed, stageTitle } from './helpers';

/** The five V1 journeys from docs/product-brief.md §5, plus Close the day, backup and install. */

test('1 · first run: one Action, Focus, done', async ({ page }) => {
  await openApp(page);
  await expect(page.getByRole('heading', { name: 'What’s one thing you want to get done today?' })).toBeVisible();
  await addFirstAction(page, 'Revise chapter 3');

  await page.getByRole('button', { name: 'Start focus' }).click();
  await expect(page).toHaveURL(/\/focus$/);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await expect(page.getByRole('timer')).toHaveText(/00:0[1-9]/, { timeout: 5000 });

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Is this action done?')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  // The first finished Focus session suggests the home screen, once.
  const install = page.getByRole('dialog', { name: 'Add RebuildOS to your home screen' });
  await expect(install).toBeVisible();
  await install.getByRole('button', { name: 'Maybe later' }).click();
  await expect(install).toBeHidden();

  await expect(stageTitle(page)).toHaveText('That’s done.');
  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByText('Active on 1 of the last 7 days.')).toBeVisible();
});

test('2 · a normal day: add, complete, Later, and the overnight rule', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs', { estimate: '45 min' });
  await quickAdd(page, 'Email the tutor');
  await expect(alsoToday(page).getByText('45 min')).toBeVisible();

  await page.getByRole('button', { name: 'Mark Email the tutor as done' }).click();
  await expect(page.getByRole('button', { name: 'Mark Email the tutor as not done' })).toBeVisible();

  // Pretend everything was planned yesterday; reopening runs the overnight rule.
  await seed(page, `
    const req = stores.actions.getAll();
    req.onsuccess = () => { for (const a of req.result) { if (a.state === 'today') { a.todayDay = u.ago(1); stores.actions.put(a); } } };
  `);
  await page.reload();
  await expect(stageTitle(page)).toHaveText('Write landing page copy');
  await expect(page.getByRole('status')).toContainText('1 action moved to Later');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(alsoToday(page).getByText('Gym: legs')).toBeVisible();

  await alsoToday(page).getByText('Gym: legs').click();
  await page.getByRole('button', { name: 'Move to Later' }).click();
  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('region', { name: 'Later' }).getByText('Gym: legs')).toBeVisible();
});

test('3 · a hard day: make today smaller', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');

  await page.getByRole('button', { name: 'Make today smaller' }).click();
  await expect(page.getByRole('heading', { name: 'A smaller day.' })).toBeVisible();
  const slots = page.getByRole('region', { name: 'Your small things' });
  await expect(slots).toContainText('Write landing page copy');

  await slots.getByRole('button', { name: 'Swap' }).nth(1).click();
  await page.getByRole('button', { name: 'Stretch for 5 minutes' }).click();
  await page.getByRole('button', { name: 'Start this day' }).click();

  await expect(page.getByText('A smaller day', { exact: true })).toBeVisible();
  await expect(alsoToday(page)).not.toContainText('Gym: legs');
  await page.getByRole('button', { name: 'Mark Stretch for 5 minutes as done' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(stageTitle(page)).toHaveText('Good day.');

  await page.getByRole('button', { name: 'Back to full Today' }).click();
  await expect(stageTitle(page)).toHaveText('Gym: legs');
});

test('4 · coming back after three weeks', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await seed(page, `stores.meta.put({ key: 'lastSeenDay', value: u.ago(21) });`);
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByText('Everything is where you left it.')).toBeVisible();

  await page.getByRole('button', { name: 'Start with a small day' }).click();
  await expect(page.getByRole('region', { name: 'Your small things' })).toContainText('Write landing page copy');

  // Once seen, Welcome back doesn't repeat the same day.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
});

test('5 · creating a Mission', async ({ page }) => {
  await openApp(page, '/plan');
  await page.getByRole('button', { name: 'New Mission' }).click();
  await page.locator('#mission-title').fill('Launch my app');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#mission-first-step').fill('Write landing page copy');
  await page.getByRole('button', { name: 'Create Mission' }).click();

  await expect(page).toHaveURL(/\/mission\//);
  await expect(page.getByRole('heading', { name: 'Launch my app' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Next' })).toContainText('On Today');

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('region', { name: 'Main action' })).toContainText('Launch my app');
  await expect(stageTitle(page)).toHaveText('Write landing page copy');

  await page.getByRole('link', { name: 'Plan' }).click();
  await page.getByRole('link', { name: /Launch my app/ }).click();
  await page.getByRole('button', { name: 'Mark Mission complete' }).click();
  await expect(page.getByRole('heading', { name: 'Mission complete.' })).toBeVisible();
});

test('close the day sets up tomorrow', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 3, 19, 0) });
  await page.clock.resume();
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');
  await page.getByRole('button', { name: /Close the day/ }).click();

  await expect(page.getByRole('heading', { name: 'Your day.' })).toBeVisible();
  await page.getByRole('group', { name: 'Where should Gym: legs go?' }).getByRole('button', { name: 'Tomorrow' }).click();
  await page.getByRole('radio', { name: '3 of 5' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Close the day' }).click();

  await expect(stageTitle(page)).toHaveText('Done for today.');
  await expect(page.getByText('Tomorrow: Write landing page copy')).toBeVisible();
});

test('backup: save and restore', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await page.getByRole('link', { name: 'Progress' }).click();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a backup' }).click();
  const file = await (await download).path();

  // Change something, then restore the backup over it.
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(stageTitle(page)).toHaveText('That’s done.');

  await page.getByRole('link', { name: 'Progress' }).click();
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(stageTitle(page)).toHaveText('Write landing page copy');
});

test('install help: Safari gets steps, other iPhone browsers are sent to Safari', async ({ page, browser }) => {
  await openApp(page, '/progress');
  await page.getByRole('button', { name: 'Add to home screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to home screen' });
  await expect(sheet.getByText('Add to Home Screen', { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText('Don’t see it? Tap ••• first, then Share.')).toBeVisible();

  const ua = (await page.evaluate(() => navigator.userAgent)).replace(/Version\/[\d.]+/, 'CriOS/130.0');
  const other = await browser.newContext({ ...(await import('@playwright/test')).devices['iPhone 13'], userAgent: ua });
  const page2 = await other.newPage();
  await page2.goto('/progress');
  await page2.getByRole('button', { name: 'Add to home screen' }).click();
  await expect(page2.getByText(/open it in Safari/)).toBeVisible();
  await expect(page2.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await other.close();
});
