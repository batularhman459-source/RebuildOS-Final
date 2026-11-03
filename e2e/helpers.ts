import { expect, type Page } from '@playwright/test';

/**
 * Run a function against the app's IndexedDB inside the page, to set up situations
 * that would otherwise take days (yesterday's plans, three weeks away…).
 * `body` receives `stores` (actions, missions, days, meta, focusSessions) and `u`
 * (`today`, `ago(n)`: logical day keys, matching the app's 04:00 day start).
 */
export async function seed(page: Page, body: string): Promise<unknown> {
  return page.evaluate(
    (src) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('rebuildos');
        open.onsuccess = () => {
          const db = open.result;
          const names = ['actions', 'missions', 'days', 'meta', 'focusSessions'];
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

/** Open the app fresh and wait until the database exists. */
export async function openApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
}

export async function addFirstAction(page: Page, title: string): Promise<void> {
  await page.locator('#first-action').fill(title);
  await page.getByRole('button', { name: 'Add to today' }).click();
  await expect(stageTitle(page)).toHaveText(title);
}

export async function quickAdd(page: Page, title: string, opts: { estimate?: string } = {}): Promise<void> {
  await page.getByRole('button', { name: 'Add an action' }).last().click();
  const dialog = page.getByRole('dialog', { name: 'Add an action' });
  await dialog.getByPlaceholder('e.g. Book dentist').fill(title);
  if (opts.estimate) await dialog.getByRole('button', { name: opts.estimate }).click();
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).toBeHidden();
}

export function stageTitle(page: Page) {
  return page.getByRole('region', { name: 'Main action' }).locator('h1');
}

export function alsoToday(page: Page) {
  return page.getByRole('region', { name: 'Also today' });
}
