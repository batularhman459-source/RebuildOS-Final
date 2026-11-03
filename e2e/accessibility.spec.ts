import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { addFirstAction, openApp, quickAdd } from './helpers';

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

test('screens have no serious accessibility issues', async ({ page }) => {
  await openApp(page);
  await check(page, 'Today (first run)');

  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');
  await check(page, 'Today');

  await page.getByRole('button', { name: 'Add an action' }).last().click();
  await check(page, 'Add sheet');
  await page.keyboard.press('Escape');

  await page.getByRole('link', { name: 'Plan' }).click();
  await check(page, 'Plan');

  await page.getByRole('button', { name: 'New Mission' }).click();
  await page.locator('#mission-title').fill('Launch my app');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#mission-first-step').fill('Write pricing section');
  await page.getByRole('button', { name: 'Create Mission' }).click();
  await check(page, 'Mission');

  await page.getByRole('link', { name: 'Progress' }).click();
  await check(page, 'Progress');

  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Start focus' }).click();
  await check(page, 'Focus');
  await page.getByRole('button', { name: 'Finish' }).click();
  await check(page, 'Focus finished');
  await page.getByRole('button', { name: 'More to do' }).click();
  await page.getByRole('button', { name: 'Not now' }).click();

  await page.getByRole('button', { name: 'Make today smaller' }).click();
  await check(page, 'A smaller day');
  await page.getByRole('button', { name: 'Back to Today' }).click();

  await page.goto('/close');
  await check(page, 'Close the day');

  await page.goto('/welcome');
  await check(page, 'Welcome back');
});
