import { addDays, daysBetween } from './day';
import type { DayKey, Feeling } from './types';

/**
 * Your sky: every day that counted is a star; stars are never taken away. Days that
 * didn't count are faint dots. Stars link to the day before and (often) to the same day a
 * week earlier, which gives the graph its loops. Laid out with a small force simulation
 * that cools down and stops (no endless animation). Pure: the screen runs the frames.
 */

export type StarKind = 'good' | 'okay' | 'rough' | 'none';

export interface SkyNode {
  day: DayKey;
  kind: StarKind;
  today: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Held by a finger: the simulation leaves it where it is. */
  fixed: boolean;
}

export interface Sky {
  nodes: SkyNode[];
  links: [number, number][];
  count: number;
}

/** At most this many days are drawn (the count still includes every day ever). */
export const SKY_MAX_DAYS = 120;
export const STAR_SIZE: Record<StarKind, number> = { good: 18, okay: 14, rough: 10, none: 4 };

export interface SkyInput {
  today: DayKey;
  /** Every day that counted. */
  active: ReadonlySet<DayKey>;
  /** Check-in answers by day (older days may have none). */
  feelings: ReadonlyMap<DayKey, Feeling>;
  /** First day the person used the app. */
  since: DayKey;
}

/**
 * Builds the sky with every star near the centre, ready to burst outwards.
 * `random` is injectable for tests.
 */
export function buildSky(input: SkyInput, width: number, height: number, random: () => number = Math.random): Sky {
  const span = Math.min(SKY_MAX_DAYS, Math.max(1, daysBetween(input.since, input.today) + 1));
  const first = addDays(input.today, -(span - 1));
  const cx = width / 2;
  const cy = height / 2;
  const nodes: SkyNode[] = Array.from({ length: span }, (_, i) => {
    const day = addDays(first, i);
    const kind: StarKind = input.active.has(day) ? (input.feelings.get(day) ?? 'good') : 'none';
    const a = random() * Math.PI * 2;
    const r = random() * 18;
    return { day, kind, today: day === input.today, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0, fixed: false };
  });
  const stars = nodes.map((n, i) => (n.kind === 'none' ? -1 : i)).filter((i) => i >= 0);
  const links: [number, number][] = [];
  for (let k = 1; k < stars.length; k++) links.push([stars[k - 1]!, stars[k]!]);
  for (const i of stars) if (i >= 7 && nodes[i - 7]!.kind !== 'none' && random() < 0.7) links.push([i - 7, i]);
  return { nodes, links, count: input.active.size };
}

/**
 * One step of the layout. `alpha` (1 → 0) is the temperature: forces shrink as it
 * cools, so the sky settles. Returns the next alpha.
 */
export function stepSky(sky: Sky, alpha: number, width: number, height: number, holding: boolean): number {
  const n = sky.nodes;
  for (let i = 0; i < n.length; i++) {
    for (let j = i + 1; j < n.length; j++) {
      const p = n[i]!;
      const q = n[j]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d2 = Math.max(dx * dx + dy * dy, 30);
      const d = Math.sqrt(d2);
      const f = ((p.kind !== 'none' && q.kind !== 'none' ? 1300 : 600) * alpha) / d2;
      p.vx -= (dx / d) * f;
      p.vy -= (dy / d) * f;
      q.vx += (dx / d) * f;
      q.vy += (dy / d) * f;
    }
  }
  for (const [a, b] of sky.links) {
    const p = n[a]!;
    const q = n[b]!;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const k = ((d - 46) / d) * 0.08 * alpha;
    p.vx += dx * k;
    p.vy += dy * k;
    q.vx -= dx * k;
    q.vy -= dy * k;
  }
  for (const o of n) {
    if (o.fixed) {
      o.vx = 0;
      o.vy = 0;
      continue;
    }
    o.vx += (width / 2 - o.x) * 0.008 * alpha;
    o.vy += (height / 2 - o.y) * 0.008 * alpha;
    o.vx *= 0.6;
    o.vy *= 0.6;
    o.x = Math.min(width - 10, Math.max(10, o.x + o.vx));
    o.y = Math.min(height - 10, Math.max(10, o.y + o.vy));
  }
  return holding ? Math.max(alpha, 0.35) : alpha * 0.972;
}

/** Below this temperature the sky is considered still and the frames stop. */
export const SKY_REST = 0.004;

/** The node nearest to a point, within `radius`. */
export function nearestNode(sky: Sky, x: number, y: number, radius = 28): number | undefined {
  let best: number | undefined;
  let bestD = radius * radius;
  sky.nodes.forEach((o, i) => {
    const d = (o.x - x) ** 2 + (o.y - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/** A node and everything linked to it (for highlighting while dragging). */
export function neighbours(sky: Sky, i: number): Set<number> {
  const set = new Set([i]);
  for (const [a, b] of sky.links) {
    if (a === i) set.add(b);
    if (b === i) set.add(a);
  }
  return set;
}
