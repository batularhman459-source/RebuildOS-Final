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
  await expect(page.getByText('Is this task done?')).toBeVisible();
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
  await expect(page.getByRole('status')).toContainText('1 task moved to Someday');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(alsoToday(page).getByText('Gym: legs')).toBeVisible();

  await alsoToday(page).getByText('Gym: legs').click();
  await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Someday' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('region', { name: 'Someday' }).getByText('Gym: legs')).toBeVisible();
});

test('3 · a hard day: one tap to my minimum', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');

  // One tap, no choosing: the saved minimum (goal step + 10-minute walk + clear your desk).
  await page.getByRole('button', { name: 'Bad day? Just do my minimum' }).click();
  await expect(page.getByText('Minimum day', { exact: true })).toBeVisible();
  await expect(stageTitle(page)).toHaveText('Write landing page copy');
  await expect(alsoToday(page)).toContainText('10-minute walk');
  await expect(alsoToday(page)).toContainText('Clear your desk');
  await expect(alsoToday(page)).not.toContainText('Gym: legs');

  await page.getByRole('button', { name: 'Mark 10-minute walk as done' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(stageTitle(page)).toHaveText('Good day.');

  await page.getByRole('button', { name: 'Back to full Today' }).click();
  await expect(stageTitle(page)).toHaveText('Gym: legs');
});

test('my minimum day can be edited once and then used', async ({ page }) => {
  await openApp(page, '/plan');
  await page.getByRole('link', { name: /My minimum day/ }).click();
  await expect(page.getByRole('heading', { name: 'My minimum day.' })).toBeVisible();
  await page.getByRole('switch').uncheck();
  await page.getByRole('button', { name: 'Remove Clear your desk' }).click();
  await page.getByRole('button', { name: '+ Stretch for 5 minutes' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('link', { name: /My minimum day/ })).toContainText('10-minute walk · Stretch for 5 minutes');

  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Bad day? Just do my minimum' }).click();
  await expect(stageTitle(page)).toHaveText('10-minute walk');
  await expect(alsoToday(page)).toContainText('Stretch for 5 minutes');
});

test('habits: your own, every day or some days a week', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');

  // A daily habit, from the + sheet with Repeat.
  await page.getByRole('button', { name: 'Add a task' }).last().click();
  let dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByPlaceholder('What do you need to do?').fill('Read for 20 minutes');
  await dialog.getByRole('button', { name: 'Every day' }).click();
  await page.getByRole('dialog', { name: 'New habit' }).getByRole('button', { name: 'Add habit' }).click();

  // A weekly habit, from Plan → New habit.
  await page.getByRole('link', { name: 'Plan' }).click();
  await page.getByRole('button', { name: 'New habit' }).click();
  dialog = page.getByRole('dialog', { name: 'New habit' });
  await dialog.getByPlaceholder('e.g. Read for 20 minutes').fill('Gym');
  await dialog.getByRole('button', { name: 'Some days a week' }).click();
  await dialog.getByRole('button', { name: 'Fewer times a week' }).click();
  await expect(dialog.getByText('2×')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add habit' }).click();
  await expect(page.getByRole('region', { name: 'Habits' })).toContainText('2× a week');

  await page.getByRole('link', { name: 'Today' }).click();
  const habits = page.getByRole('list', { name: 'Habits today' });
  await expect(habits).toContainText('Read for 20 minutes');
  await expect(habits).toContainText('0 of 2 this week');
  await page.getByRole('button', { name: 'Tick Gym' }).click();
  await expect(habits).toContainText('1 of 2 this week');

  // Done twice this week already (simulated): the weekly habit leaves Today until next week.
  await seed(page, `
    const pad = (n) => String(n).padStart(2, '0');
    const key = (t) => t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
    const [y, m, d] = u.today.split('-').map(Number);
    const monday = new Date(y, m - 1, d, 12);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const week = Array.from({ length: 7 }, (_, i) => { const t = new Date(monday); t.setDate(monday.getDate() + i); return key(t); });
    const otherDays = week.filter((k) => k !== u.today).slice(0, 2);
    const req = stores.habits.getAll();
    req.onsuccess = () => {
      const gym = req.result.find((h) => h.title === 'Gym');
      stores.habitChecks.delete(gym.id + ':' + u.today);
      for (const day of otherDays) stores.habitChecks.put({ id: gym.id + ':' + day, habitId: gym.id, day, createdAt: 0 });
    };
  `);
  await page.reload();
  await expect(page.getByRole('list', { name: 'Habits today' })).not.toContainText('Gym');
  await expect(page.getByRole('list', { name: 'Habits today' })).toContainText('Read for 20 minutes');

  await page.getByRole('link', { name: 'Progress' }).click();
  await expect(page.getByRole('region', { name: 'Habits this week' })).toContainText('Gym');
  await expect(page.getByLabel(/^Gym: [0-2] of 2 this week$/)).toBeVisible();
});

test('4 · coming back after three weeks', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await seed(page, `stores.meta.put({ key: 'lastSeenDay', value: u.ago(21) });`);
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByText('Everything is where you left it.')).toBeVisible();

  await page.getByRole('button', { name: 'Start with my minimum day' }).click();
  await expect(page.getByText('Minimum day', { exact: true })).toBeVisible();
  await expect(stageTitle(page)).toHaveText('Write landing page copy');

  // Once seen, Welcome back doesn't repeat the same day.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
});

test('5 · creating a Mission', async ({ page }) => {
  await openApp(page, '/plan');
  await page.getByRole('button', { name: 'New goal' }).click();
  await page.locator('#mission-title').fill('Launch my app');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#mission-first-step').fill('Write landing page copy');
  await page.getByRole('button', { name: 'Create goal' }).click();

  await expect(page).toHaveURL(/\/goal\//);
  await expect(page.getByRole('heading', { name: 'Launch my app' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Next' })).toContainText('On Today');

  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('region', { name: 'Up next' })).toContainText('Launch my app');
  await expect(stageTitle(page)).toHaveText('Write landing page copy');

  await page.getByRole('link', { name: 'Plan' }).click();
  await page.getByRole('link', { name: /Launch my app/ }).click();
  await page.getByRole('button', { name: 'Mark goal complete' }).click();
  await expect(page.getByRole('heading', { name: 'Goal complete.' })).toBeVisible();
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

test('dated tasks: upcoming, then on Today on their day, ordered by time', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');

  // A task for tomorrow at 18:00 waits in Plan → Upcoming.
  await page.getByRole('button', { name: 'Add a task' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByPlaceholder('What do you need to do?').fill('Gym: legs');
  await dialog.getByRole('button', { name: 'Tomorrow' }).click();
  await dialog.getByLabel(/^Time/).fill('18:00');
  await dialog.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('region', { name: 'Up next' })).not.toContainText('Gym');

  await page.getByRole('link', { name: 'Plan' }).click();
  const upcomingSection = page.getByRole('region', { name: 'Upcoming' });
  await expect(upcomingSection).toContainText('Tomorrow');
  await expect(upcomingSection).toContainText('Gym: legs');
  await expect(upcomingSection).toContainText('18:00');

  // Its day arrives (simulated): it moves onto Today by itself.
  await seed(page, `
    const req = stores.actions.getAll();
    req.onsuccess = () => { for (const a of req.result) if (a.title === 'Gym: legs') { a.targetDay = u.today; stores.actions.put(a); } };
  `);
  await page.goto('/');
  await quickAdd(page, 'Morning run');
  await page.getByRole('button', { name: 'Morning run', exact: true }).click();
  await page.getByRole('dialog', { name: 'Edit task' }).getByLabel(/^Time/).fill('07:30');
  await page.keyboard.press('Escape');

  const rows = page.getByRole('region', { name: 'Also today' }).getByRole('listitem');
  await expect(rows.nth(0)).toContainText('Morning run');
  await expect(rows.nth(0)).toContainText('07:30');
  await expect(rows.nth(1)).toContainText('Gym: legs');
  await expect(rows.nth(1)).toContainText('18:00');
});

test('first-time setup: from a template to a full Today in about a minute', async ({ page }) => {
  await openApp(page, '/', { setup: true });
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole('heading', { name: 'Let’s set you up.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();

  await page.getByRole('button', { name: 'Run a race' }).click();
  await expect(page.locator('#setup-goal')).toHaveValue('Run a half marathon');
  await expect(page.getByText('A progress bar will track 0 → 21 km.')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { name: 'Your first steps' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Habits to keep' })).toBeVisible();
  await expect(page.getByText('3× a week')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'On a bad day…' })).toBeVisible();
  await page.getByRole('button', { name: 'Done — show me Today' }).click();

  // Never empty: the goal's first step is up next, the habit is on Today.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: 'Up next' })).toContainText('Run a half marathon');
  await expect(stageTitle(page)).toHaveText('Pick a race and a date');
  await expect(page.getByRole('list', { name: 'Habits today' })).toContainText('Run');

  // Goal progress: measured in km, updated by hand.
  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('region', { name: 'Goals' })).toContainText('0 km of 21 km');
  await page.getByRole('link', { name: /Run a half marathon/ }).click();
  await page.getByRole('button', { name: 'Update progress' }).click();
  await page.locator('#goal-current').fill('5');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('progressbar', { name: '5 km of 21 km' })).toBeVisible();

  // Setup doesn't come back.
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/$/);
});

test('goals without a target show steps done', async ({ page }) => {
  await openApp(page, '/plan');
  await page.getByRole('button', { name: 'New goal' }).click();
  await page.locator('#mission-title').fill('Launch my app');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#mission-first-step').fill('Write landing page copy');
  await page.getByRole('button', { name: 'Create goal' }).click();
  await expect(page.getByRole('progressbar', { name: '0 of 1 step done' })).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await page.getByRole('link', { name: 'Plan' }).click();
  await expect(page.getByRole('region', { name: 'Goals' })).toContainText('1 of 1 step done');
});
