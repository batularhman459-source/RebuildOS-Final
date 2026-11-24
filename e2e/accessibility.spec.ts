import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addFirstAction, changeFeeling, openApp, openPlan, quickAdd, openDetails, countedHeading, dismissInstallPrompt } from './helpers';

/** Automated accessibility checks (axe) on every screen. Fails on serious or critical issues. */

async function check(page: Page, name: string) {
  // Let entrance animations settle so contrast is measured on final colours.
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const minor = results.violations.filter((v) => !serious.includes(v));
  console.log(`${name}: ${results.passes.length} rules passed, ${serious.length} serious, ${minor.length} minor/moderate${minor.length ? ' (' + minor.map((v) => v.id).join(', ') + ')' : ''}`);
  const summary = serious.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`);
  expect(summary, `${name} has accessibility issues`).toEqual([]);
}

test('first-time setup has no serious accessibility issues', async ({ page }) => {
  await openApp(page, '/', { setup: true });
  await expect(page).toHaveURL(/\/setup$/);
  await check(page, 'Setup: areas');
  await page.getByRole('button', { name: 'Fitness' }).click();
  await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible();
  await check(page, 'Setup: goal');
});

test('screens have no serious accessibility issues', async ({ page }) => {
  await openApp(page);
  await check(page, 'Today (first run)');

  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');
  await check(page, 'Today');

  await page.getByRole('button', { name: 'Add a task' }).last().click();
  await check(page, 'Add sheet');
  await page.keyboard.press('Escape');

  await openPlan(page);
  await check(page, 'Your plan');

  await page.getByRole('button', { name: 'New goal' }).click();
  await page.locator('#mission-title').fill('Launch my app');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#mission-first-step').fill('Write pricing section');
  await page.getByRole('button', { name: 'Create goal' }).click();
  await check(page, 'Mission');

  await openDetails(page);
  await check(page, 'Details');

  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start focus' }).click();
  await check(page, 'Focus');
  await page.getByRole('button', { name: 'Finish' }).click();
  await check(page, 'Focus finished');
  await page.getByRole('button', { name: 'More to do' }).click();
  await dismissInstallPrompt(page);

  await page.goto('/minimum');
  await check(page, 'My minimum day');
  await page.getByRole('button', { name: 'Close' }).click();

  await page.goto('/welcome');
  await check(page, 'Welcome back');

  await page.goto('/journal');
  await page.getByLabel('Today’s journal').fill('A line about today.');
  await check(page, 'Journal');
  const today = await page.evaluate(() => new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10));
  await page.goto(`/day/${today}`);
  await check(page, 'A day');
  await page.goto('/settings');
  await check(page, 'Settings');
});

test('the daily check-in, a rough day and Day counted have no serious accessibility issues', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await page.getByRole('button', { name: /day, change$/ }).click();
  await check(page, 'Check-in');
  await page.getByRole('button', { name: /^Rough/ }).click();
  await check(page, 'Today (rough day)');
  for (const name of ['Write landing page copy', '10-minute walk', 'Clear your desk']) await page.getByRole('button', { name }).click();
  await expect(countedHeading(page)).toBeVisible();
  await page.waitForTimeout(800);
  await check(page, 'Day counted');
  await page.getByRole('button', { name: 'Add it to your sky' }).click();
  await check(page, 'Sky');
  await page.getByRole('link', { name: 'Today' }).click();
  await page.waitForTimeout(400);
  await dismissInstallPrompt(page);
  await changeFeeling(page, 'Okay');
  await check(page, 'Today (okay day)');

  await page.goto('/week');
  await check(page, 'Weekly check-in: your week');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Busy' }).click();
  await check(page, 'Weekly check-in: what got in the way');
  await page.getByRole('button', { name: 'Next' }).click();
  await check(page, 'Weekly check-in: next week');
});

test.describe('phone in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('light screens have no serious accessibility issues in dark mode', async ({ page }) => {
    await openApp(page);
    await addFirstAction(page, 'Write landing page copy');
    await quickAdd(page, 'Gym: legs');
    await page.getByRole('button', { name: 'Mark Gym: legs as done' }).click();
    await check(page, 'Today (dark)');
    await openDetails(page);
    await check(page, 'Progress (dark)');
    await openPlan(page);
    await check(page, 'Your plan (dark)');
    await page.goto('/week');
    await check(page, 'Weekly check-in (dark)');
    await page.goto('/journal');
    await check(page, 'Journal (dark)');
    await page.goto('/settings');
    await check(page, 'Settings (dark)');
  });

  test('the app is one dark design, whatever the phone is set to', async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const page = await (await browser.newContext({ colorScheme })).newPage();
      await openApp(page, '/settings');
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(18, 17, 16)');
      await page.context().close();
    }
  });
});

