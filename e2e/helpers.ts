import { expect, type Page } from '@playwright/test';

/**
 * Run a function against the app's IndexedDB inside the page, to set up situations
 * that would otherwise take days (yesterday's plans, three weeks away…).
 * `body` receives `stores` (actions, missions, days, meta, focusSessions, habits, habitChecks) and `u`
 * (`today`, `ago(n)`: logical day keys, matching the app's 04:00 day start).
 */
export async function seed(page: Page, body: string): Promise<unknown> {
  return page.evaluate(
    (src) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('rebuildos');
        open.onsuccess = () => {
          const db = open.result;
          const names = ['actions', 'missions', 'days', 'meta', 'focusSessions', 'habits', 'habitChecks', 'journal'];
          const tx = db.transaction(names, 'readwrite');
          const stores = Object.fromEntries(names.map((n) => [n, tx.objectStore(n)]));
          const pad = (n: number) => String(n).padStart(2, '0');
          const key = (d: Date) => {
            const s = new Date(d.getTime());
            s.setHours(s.getHours() - 4);
            return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
          };
          const u = {
            today: key(new Date()),
            ago: (n: number) => {
              const d = new Date();
              d.setDate(d.getDate() - n);
              return key(d);
            },
          };
          let result: unknown;
          Promise.resolve(new Function('stores', 'u', src)(stores, u)).then((v) => (result = v));
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      }),
    body,
  );
}

/**
 * Open the app and wait until it's ready. A brand-new person is sent to the
 * first-time setup; unless `setup` is true, skip it the way a person would.
 */
export async function openApp(page: Page, path = '/', opts: { setup?: boolean; feeling?: 'Good' | 'Okay' | 'Rough' } = {}): Promise<void> {
  // Every visit starts on Today (setup, then the check-in); then go where the test wants.
  await page.goto(opts.setup ? path : '/');
  await expect(page.locator('main')).toBeVisible();
  if (opts.setup) return;
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
  if (page.url().endsWith('/setup')) {
    await page.getByRole('button', { name: 'Skip for now' }).click();
  }
  await checkInIfAsked(page, opts.feeling ?? 'Good');
  if (path !== '/') {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
  }
}

/** Change today's check-in answer from the pill on Today. */
export async function changeFeeling(page: Page, feeling: 'Good' | 'Okay' | 'Rough'): Promise<void> {
  await page.getByRole('button', { name: /day, change$/ }).click();
  await expect(page).toHaveURL(/\/checkin$/);
  await page.getByRole('button', { name: new RegExp(`^${feeling}`) }).click();
  await expect(page).not.toHaveURL(/checkin/);
}

/** The big title on Day counted ("Day 4 counted.", or a milestone like "Your first star."). */
export function countedHeading(page: Page) {
  return page.getByRole('region', { name: 'Day counted' }).getByRole('heading', { level: 1 });
}

/** The home-screen suggestion appears once, back on Today after a day counts. */
export async function dismissInstallPrompt(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Add RebuildOS to your home screen' });
  // It appears shortly after Today loads; give it a moment, then close it if it came.
  const came = await dialog
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);
  if (!came) return;
  await dialog.getByRole('button', { name: 'Maybe later' }).click();
  await expect(dialog).toBeHidden();
}

/** After the day counts: add the star to the sky, then go back to Today. */
export async function keepGoing(page: Page): Promise<void> {
  await expect(countedHeading(page)).toBeVisible();
  await page.getByRole('button', { name: 'Add it to your sky' }).click();
  await expect(page).toHaveURL(/\/sky$/);
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(400);
  await dismissInstallPrompt(page);
}

/** Answer "How's today?" when the app asks it. */
export async function checkInIfAsked(page: Page, feeling: 'Good' | 'Okay' | 'Rough' = 'Good'): Promise<void> {
  await page.waitForTimeout(300);
  if (page.url().endsWith('/checkin')) {
    await page.getByRole('button', { name: new RegExp(`^${feeling}`) }).click();
    await expect(page).not.toHaveURL(/checkin/);
  }
}

export async function addFirstAction(page: Page, title: string): Promise<void> {
  await page.locator('#first-action').fill(title);
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(stageTitle(page)).toHaveText(title);
}

export async function quickAdd(page: Page, title: string, opts: { estimate?: string } = {}): Promise<void> {
  await page.getByRole('button', { name: 'Add a task' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'New task' });
  await dialog.getByPlaceholder('What do you need to do?').fill(title);
  if (opts.estimate) {
    await dialog.getByRole('button', { name: /^More options/ }).click();
    await dialog.getByRole('button', { name: opts.estimate }).click();
  }
  await dialog.getByRole('button', { name: 'Add task' }).click();
  await expect(dialog).toBeHidden();
}

export function stageTitle(page: Page) {
  return page.getByRole('region', { name: 'Up next' }).locator('h1');
}

export function alsoToday(page: Page) {
  return page.getByRole('region', { name: 'Also today' });
}

/** Your plan opens from the sky. */
export async function openPlan(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  await page.getByRole('link', { name: 'Your plan' }).click();
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible();
}

/** Details (the numbers, backup, appearance) open from the sky. */
export async function openDetails(page: Page): Promise<void> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Sky' }).click();
  await page.getByRole('link', { name: 'Details' }).click();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
}
