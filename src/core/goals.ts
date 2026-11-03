import { doneActions, openActions } from './missions';
import type { Action, GoalMeasure, Mission } from './types';

/**
 * Goal progress, in honest terms the person recognises:
 * - with a measurable target: "12 of 21 km", and a bar for how far along they are;
 * - otherwise: "5 of 8 steps done". (Adding steps can lower the share — that's honest:
 *   the goal got clearer, not further away. The count of steps done never goes down.)
 */

export type GoalProgress =
  | { kind: 'measure'; current: number; target: number; unit: string; fraction: number; label: string }
  | { kind: 'steps'; done: number; total: number; fraction: number; label: string }
  | { kind: 'none'; fraction: 0; label: string };

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** "1,250" — numbers in the app's English style, no needless decimals. */
export function formatAmount(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-GB', { maximumFractionDigits: 2 });
}

/** "€1,250" for currency symbols that go first; "12 km" for everything else. */
export function withUnit(n: number, unit: string): string {
  const u = unit.trim();
  if (!u) return formatAmount(n);
  if (/^[€$£¥₹]$/.test(u)) return `${u}${formatAmount(n)}`;
  return `${formatAmount(n)} ${u}`;
}

export function measureFraction(m: GoalMeasure): number {
  const start = m.start ?? 0;
  const span = m.target - start;
  if (span === 0) return m.current === m.target ? 1 : 0;
  return clamp01((m.current - start) / span);
}

export function goalProgress(mission: Mission, actions: readonly Action[]): GoalProgress {
  const m = mission.measure;
  if (m && m.target !== (m.start ?? 0)) {
    return {
      kind: 'measure',
      current: m.current,
      target: m.target,
      unit: m.unit,
      fraction: measureFraction(m),
      label: `${withUnit(m.current, m.unit)} of ${withUnit(m.target, m.unit)}`,
    };
  }
  const done = doneActions(mission.id, actions).length;
  const total = done + openActions(mission.id, actions).length;
  if (total === 0) return { kind: 'none', fraction: 0, label: 'No steps yet' };
  return { kind: 'steps', done, total, fraction: done / total, label: `${done} of ${total} ${total === 1 ? 'step' : 'steps'} done` };
}

/** Parse what someone types into a number field ("1.250", "1,5", "12") — forgiving of commas. */
export function parseAmount(input: string): number | undefined {
  const cleaned = input.trim().replace(/\s/g, '');
  if (!cleaned) return undefined;
  // "1.250,5" (German) → 1250.5; "1,250.5" (English) → 1250.5; "1,5" → 1.5
  let normal = cleaned;
  if (/,\d{1,2}$/.test(cleaned) && !/\.\d{1,2}$/.test(cleaned)) normal = cleaned.replace(/\./g, '').replace(',', '.');
  else normal = cleaned.replace(/,/g, '');
  const n = Number(normal);
  return Number.isFinite(n) ? n : undefined;
}
