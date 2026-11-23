import { expect, test, type Page } from '@playwright/test';
import { addFirstAction, openApp } from './helpers';

/**
 * Idle screens must draw nothing. A looping animation (or a blur over one) keeps an
 * iPhone redrawing every frame and makes the app lag after its entrance animations.
 */
async function framesWhileIdle(page: Page, wait: number, ms = 2000): Promise<number> {
  await page.waitForTimeout(wait); // let entrance animations (and the sky's layout) finish
  const cdp = await page.context().newCDPSession(page);
  const events: { name: string }[] = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...(d.value as { name: string }[])));
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['cc', 'viz', 'devtools.timeline'] }, transferMode: 'ReportEvents' });
  await page.waitForTimeout(ms);
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  await cdp.detach();
  return events.filter((e) => e.name === 'MainFrame.Draw').length;
}

test('idle screens draw no frames', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await addFirstAction(page, 'Write landing page copy');
  for (const path of ['/', '/checkin', '/sky', '/progress', '/week', '/journal', '/settings']) {
    await page.goto(path);
    // The sky moves calmly for about ten seconds before it is still.
    expect(await framesWhileIdle(page, path === '/sky' ? 12000 : 2500), `${path} keeps redrawing while idle`).toBeLessThanOrEqual(2);
  }
});
