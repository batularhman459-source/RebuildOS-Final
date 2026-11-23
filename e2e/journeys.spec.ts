import { expect, test } from '@playwright/test';
import { addFirstAction, alsoToday, changeFeeling, checkInIfAsked, keepGoing, openApp, openPlan, quickAdd, seed, stageTitle, openDetails } from './helpers';

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
  await keepGoing(page);

  // The first finished Focus session suggests the home screen, once.
  const install = page.getByRole('dialog', { name: 'Add RebuildOS to your home screen' });
  await expect(install).toBeVisible();
  await install.getByRole('button', { name: 'Maybe later' }).click();
  await expect(install).toBeHidden();

  await expect(stageTitle(page)).toHaveText('That’s done.');
  await openDetails(page);
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
  // The main thing carries over; the rest quietly moves off Today (no overdue, no guilt).
  await expect(stageTitle(page)).toHaveText('Write landing page copy');
  await expect(page.getByRole('main')).not.toContainText('Gym: legs');
  await openPlan(page);
  await expect(page.getByRole('region', { name: 'Other tasks' }).getByText('Gym: legs')).toBeVisible();
});

test('3 · a rough day: just my minimum, and it still counts', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await quickAdd(page, 'Gym: legs');

  // No choosing: the saved minimum (goal step + 10-minute walk + clear your desk).
  await changeFeeling(page, 'Rough');
  const minimum = page.getByRole('list', { name: 'Your minimum' });
  await expect(stageTitle(page)).toContainText('Rough day.');
  await expect(minimum).toContainText('Write landing page copy');
  await expect(minimum).toContainText('10-minute walk');
  await expect(minimum).toContainText('Clear your desk');
  await expect(page.getByRole('main')).not.toContainText('Gym: legs');

  await page.getByRole('button', { name: '10-minute walk' }).click();
  await page.getByRole('button', { name: 'Clear your desk' }).click();
  await expect(page.getByText('2 of 3 done')).toBeVisible();
  await page.getByRole('button', { name: 'Write landing page copy' }).click();
  await keepGoing(page);
  await expect(stageTitle(page)).toHaveText('That’s enough.');

  // Feeling better later: switch to a good day and the rest of Today is back.
  await changeFeeling(page, 'Good');
  await expect(stageTitle(page)).toHaveText('Gym: legs');
});

test('an okay day: the smaller version, and the task waits for a better day', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Run 5 km');
  await page.getByRole('button', { name: 'Run 5 km', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Edit task' });
  await sheet.getByRole('button', { name: '+ Smaller version for okay days' }).click();
  await sheet.getByLabel('Smaller version for okay days').fill('Run 2 km');
  await page.keyboard.press('Escape');

  await changeFeeling(page, 'Okay');
  await expect(stageTitle(page)).toHaveText('Run 2 km');
  await expect(page.getByText('Instead of “Run 5 km”')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await keepGoing(page);
  await expect(stageTitle(page)).toHaveText('Done. Nice.');

  await page.getByRole('button', { name: 'Feeling good? Do the full thing' }).click();
  await expect(stageTitle(page)).toHaveText('Run 5 km');
  await openDetails(page);
  await expect(page.getByText('Active on 1 of the last 7 days.')).toBeVisible();
});

test('the main thing is suggested from your goals and can be swapped', async ({ page }) => {
  await openApp(page);
  await seed(page, `
    const t = Date.now();
    stores.missions.put({ id: 'g1', title: 'Get fit', area: 'fitness', status: 'active', sortOrder: 0, createdAt: t, updatedAt: t });
    for (let i = 1; i <= 3; i++) stores.actions.put({ id: 'd' + i, title: 'Swim 1 km', missionId: 'g1', state: 'done', isMain: false, sortOrder: i, completedAt: t - i * 86400000, createdAt: t, updatedAt: t });
    stores.days.delete(u.today);
  `);
  await page.goto('/');
  await checkInIfAsked(page, 'Good');
  // Done three times lately: the app noticed and suggests it again.
  await expect(stageTitle(page)).toHaveText('Swim 1 km');
  await expect(page.getByRole('region', { name: 'Up next' })).toContainText('Get fit');

  await page.getByRole('button', { name: 'Something else' }).click();
  await expect(stageTitle(page)).toHaveText('Run 5 km');
  await changeFeeling(page, 'Okay');
  await expect(stageTitle(page)).toHaveText('Run 2 km');
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
  await changeFeeling(page, 'Rough');
  const minimum = page.getByRole('list', { name: 'Your minimum' });
  await expect(minimum.getByRole('listitem')).toHaveCount(2);
  await expect(minimum).toContainText('10-minute walk');
  await expect(minimum).toContainText('Stretch for 5 minutes');
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
  await openPlan(page);
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

  await openDetails(page);
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
  await expect(stageTitle(page)).toContainText('Rough day.');
  await expect(page.getByRole('list', { name: 'Your minimum' })).toContainText('Write landing page copy');

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

  await openPlan(page);
  await page.getByRole('link', { name: /Launch my app/ }).click();
  await page.getByRole('button', { name: 'Mark goal complete' }).click();
  await expect(page.getByRole('heading', { name: 'Goal complete.' })).toBeVisible();
});

test('close for today from Day counted, and open it again', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Day \d+ counted\.$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close for today' }).click();
  await expect(page).toHaveURL(/\/sky$/);
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(stageTitle(page)).toHaveText('Done for today.');
  // A closed day doesn't ask "How's today?" again.
  await page.reload();
  await expect(stageTitle(page)).toHaveText('Done for today.');
  await page.getByRole('button', { name: 'Open today again' }).click();
  await expect(stageTitle(page)).toHaveText('That’s done.');
});

test('two tabs: Today and Sky; Your plan and Details open from the sky', async ({ page }) => {
  await openApp(page);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText(['Today', 'Sky']);
  await openPlan(page);
  await expect(nav.getByRole('link', { name: 'Sky' })).toHaveClass(/active/);
  await page.getByRole('button', { name: 'Sky' }).click();
  await expect(page).toHaveURL(/\/sky$/);
  await openDetails(page);
  await page.getByRole('link', { name: 'Sky', exact: true }).first().click();
  await expect(page).toHaveURL(/\/sky$/);
});

test('your sky: a star for every day that counted, and you can drag it', async ({ page }) => {
  await openApp(page);
  await seed(page, `
    const t = Date.now();
    for (let i = 1; i <= 12; i++) {
      if (i % 4 === 0) continue;
      const d = u.ago(i);
      stores.days.put({ day: d, mode: i % 3 ? 'normal' : 'small', feeling: i % 3 ? 'good' : 'rough', updatedAt: t });
      stores.actions.put({ id: 'p' + i, title: 'Past ' + i, state: 'done', isMain: false, sortOrder: i, completedAt: t - i * 86400000, createdAt: t, updatedAt: t });
    }
  `);
  await page.reload();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  await expect(page.getByRole('img', { name: 'Your sky: 9 days counted' })).toBeVisible();
  const sky = page.getByRole('img', { name: /Your sky/ });
  const box = (await sky.boundingBox())!;
  await page.waitForTimeout(3000);
  // Grab the star nearest the middle and drag it to a corner.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + 20, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByText('9', { exact: true })).toBeVisible();
});

test('backup: save and restore', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await page.goto('/settings');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save a backup' }).click();
  const file = await (await download).path();

  // Change something, then restore the backup over it.
  await page.getByRole('link', { name: 'Today' }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await keepGoing(page);
  await expect(stageTitle(page)).toHaveText('That’s done.');

  await page.goto('/settings');
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('button', { name: 'Replace with backup' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(stageTitle(page)).toHaveText('Write landing page copy');
});

test('install help: Safari gets steps, other iPhone browsers are sent to Safari', async ({ page, browser }) => {
  await openApp(page, '/settings');
  await page.getByRole('button', { name: 'Add to home screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add to home screen' });
  await expect(sheet.getByText('Add to Home Screen', { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText('Don’t see it? Tap ••• first, then Share.')).toBeVisible();

  const ua = (await page.evaluate(() => navigator.userAgent)).replace(/Version\/[\d.]+/, 'CriOS/130.0');
  const other = await browser.newContext({ ...(await import('@playwright/test')).devices['iPhone 13'], userAgent: ua });
  const page2 = await other.newPage();
  await page2.goto('/settings');
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

  await openPlan(page);
  const upcomingSection = page.getByRole('region', { name: 'Other tasks' });
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

test('first-time setup: one question, one goal, go', async ({ page }) => {
  await openApp(page, '/', { setup: true });
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole('heading', { name: 'What do you want to change?' })).toBeVisible();
  await page.getByRole('button', { name: 'Fitness' }).click();

  // A suggested goal (alternatives one tap away) and a preview of the daily thing.
  await expect(page.getByRole('heading', { name: 'Your goal' })).toBeVisible();
  await expect(page.locator('#setup-goal')).toHaveValue('Get fit');
  await page.getByRole('button', { name: 'Run 5 km without stopping' }).click();
  await expect(page.locator('#setup-goal')).toHaveValue('Run 5 km without stopping');
  await expect(page.getByText('On an okay day: Run 2 km')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s go' }).click();

  // Straight into the check-in; the one thing comes from the goal.
  await checkInIfAsked(page, 'Good');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: 'Up next' })).toContainText('Run 5 km without stopping');
  await expect(stageTitle(page)).toHaveText('Run 5 km');
  await expect(page.getByRole('list', { name: 'Habits today' })).toContainText('Work out');

  await changeFeeling(page, 'Okay');
  await expect(stageTitle(page)).toHaveText('Run 2 km');

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
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await keepGoing(page);
  await openPlan(page);
  await expect(page.getByRole('region', { name: 'Goals' })).toContainText('1 of 1 step done');
});

test('weekly check-in: look back, name what got in the way, choose what comes first', async ({ page }) => {
  // A Sunday: Today offers the check-in.
  await page.clock.install({ time: new Date(2026, 10, 22, 10, 0) });
  await page.clock.resume();
  await openApp(page);
  await seed(page, `
    const t = Date.now();
    stores.missions.put({ id: 'g1', title: 'Get fit', area: 'fitness', status: 'active', sortOrder: 1, createdAt: t, updatedAt: t });
    stores.missions.put({ id: 'g2', title: 'Pass my exams', area: 'study', status: 'active', sortOrder: 2, createdAt: t, updatedAt: t });
    stores.actions.put({ id: 'w1', title: 'Run 3 km', missionId: 'g1', state: 'done', isMain: false, sortOrder: 1, completedAt: t - 86400000, createdAt: t, updatedAt: t });
    stores.actions.put({ id: 'n2', title: 'Do a past paper', missionId: 'g2', state: 'later', isMain: false, sortOrder: 2, createdAt: t, updatedAt: t });
  `);
  await page.reload();
  await page.getByRole('button', { name: /Your week, in 2 minutes/ }).click();

  await expect(page.getByRole('heading', { name: 'Your week' })).toBeVisible();
  await expect(page.getByText('Active on 1 of 7 days')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Done this week' })).toContainText('Run 3 km');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Tired' }).click();
  await expect(page.getByText('On tired days, answer “Okay”')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('radio', { name: /Pass my exams/ }).click();
  await page.getByRole('button', { name: 'Save my week' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /Your week, in 2 minutes/ })).toBeHidden();

  // Next morning: the focus goal's task is suggested first.
  await seed(page, `
    const req = stores.actions.getAll();
    req.onsuccess = () => { for (const a of req.result) if (a.isMain) { a.isMain = false; a.state = 'later'; stores.actions.put(a); } };
    stores.days.delete(u.today);
  `);
  await page.reload();
  await checkInIfAsked(page, 'Good');
  await expect(stageTitle(page)).toHaveText('Do a past paper');
});

test('journal: write about today, find it again, and open a day from a star', async ({ page }) => {
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await keepGoing(page);

  // From the sky: Journal, today's page, with prompts.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page.getByRole('heading', { name: 'Journal', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'What went well today?' }).click();
  await page.getByLabel('Today’s journal').fill('Wrote the landing page before lunch.');
  await expect(page.getByText('Saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Today’s journal')).toHaveValue('Wrote the landing page before lunch.');

  // Tap today's star in the sky: that day opens, with what got done and the journal.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  const sky = page.getByRole('img', { name: /Your sky/ });
  await page.waitForTimeout(12000); // let the sky settle
  const star = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('[role="img"] > span')] as HTMLElement[];
    const r = spans[spans.length - 1]!.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await sky.isVisible();
  await page.mouse.click(star.x, star.y);
  await expect(page).toHaveURL(/\/day\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText('Counted')).toBeVisible();
  await expect(page.getByText('Done: Write landing page copy')).toBeVisible();
  await expect(page.getByLabel(/^Journal for today/)).toHaveValue('Wrote the landing page before lunch.');
});

test('settings: version, appearance and your data in one place', async ({ page }) => {
  await openApp(page);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Appearance' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save a backup' })).toBeVisible();
  await expect(page.getByText('Version', { exact: true })).toBeVisible();
});

