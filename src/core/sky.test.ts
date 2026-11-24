import { describe, expect, it } from 'vitest';
import { buildSky, nearestNode, neighbours, SKY_MAX_DAYS, SKY_REST, stepSky } from './sky';

const W = 342;
const H = 310;
let seed = 1;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

describe('buildSky', () => {
  it('draws every day since the start: stars for days that counted, dots for the rest', () => {
    const sky = buildSky(
      {
        today: '2026-11-23',
        since: '2026-11-17',
        active: new Set(['2026-11-17', '2026-11-18', '2026-11-20', '2026-11-23']),
        feelings: new Map([
          ['2026-11-18', 'rough'],
          ['2026-11-23', 'okay'],
        ]),
      },
      W,
      H,
      rand,
    );
    expect(sky.nodes.map((n) => n.kind)).toEqual(['good', 'rough', 'none', 'good', 'none', 'none', 'okay']);
    expect(sky.nodes.at(-1)?.today).toBe(true);
    expect(sky.count).toBe(4);
    // Stars link to the previous star; dots never link.
    expect(sky.links.slice(0, 3)).toEqual([
      [0, 1],
      [1, 3],
      [3, 6],
    ]);
  });

  it('caps how many days are drawn but counts all of them', () => {
    const active = new Set<string>();
    const sky = buildSky({ today: '2026-11-23', since: '2025-01-01', active: new Set([...active, '2025-01-01', '2026-11-23']), feelings: new Map() }, W, H, rand);
    expect(sky.nodes).toHaveLength(SKY_MAX_DAYS);
    expect(sky.count).toBe(2);
  });
});

describe('stepSky', () => {
  it('spreads the stars out, stays inside the sky, and comes to rest', () => {
    const active = new Set(Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`).filter((_, i) => i % 4 !== 0));
    const sky = buildSky({ today: '2026-11-30', since: '2026-11-01', active, feelings: new Map() }, W, H, rand);
    let alpha = 1;
    let steps = 0;
    while (alpha > SKY_REST && steps < 1000) {
      alpha = stepSky(sky, alpha, W, H, false);
      steps++;
    }
    expect(steps).toBeLessThan(400); // a few seconds at 60 fps, then still
    const xs = sky.nodes.map((n) => n.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(120);
    for (const n of sky.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(10);
      expect(n.x).toBeLessThanOrEqual(W - 10);
      expect(n.y).toBeGreaterThanOrEqual(10);
      expect(n.y).toBeLessThanOrEqual(H - 10);
    }
  });

  it('leaves a held star where the finger is and stays warm while holding', () => {
    const sky = buildSky({ today: '2026-11-03', since: '2026-11-01', active: new Set(['2026-11-01', '2026-11-02', '2026-11-03']), feelings: new Map() }, W, H, rand);
    sky.nodes[1]!.fixed = true;
    sky.nodes[1]!.x = 50;
    sky.nodes[1]!.y = 60;
    expect(stepSky(sky, 0.01, W, H, true)).toBe(0.35);
    expect([sky.nodes[1]!.x, sky.nodes[1]!.y]).toEqual([50, 60]);
    expect(nearestNode(sky, 52, 58)).toBe(1);
    expect(nearestNode(sky, 300, 300, 5)).toBeUndefined();
    expect([...neighbours(sky, 1)].sort()).toEqual([0, 1, 2]);
  });
});

describe('constellations', () => {
  it('links stars within a month and bridges months once', () => {
    const active = new Set(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    const sky = buildSky({ today: '2026-11-02', since: '2026-10-30', active, feelings: new Map() }, W, H, rand);
    // Chain 30→31 (October), 31→1 (the one bridge), 1→2 (November); no other links.
    expect(sky.links).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
  });

  it('finds each month’s centre', async () => {
    const { monthCentres } = await import('./sky');
    const sky = buildSky({ today: '2026-11-02', since: '2026-10-31', active: new Set(['2026-10-31', '2026-11-01', '2026-11-02']), feelings: new Map() }, W, H, rand);
    sky.nodes[0]!.x = 10;
    sky.nodes[1]!.x = 100;
    sky.nodes[2]!.x = 200;
    const c = monthCentres(sky);
    expect(c.get('2026-10')?.x).toBe(10);
    expect(c.get('2026-11')?.x).toBe(150);
    expect(c.get('2026-11')?.count).toBe(2);
  });
});

describe('milestones', () => {
  it('celebrates the first star and a few round numbers, nothing else', async () => {
    const { milestoneFor } = await import('./milestones');
    expect(milestoneFor(1)?.title).toBe('Your first star.');
    expect(milestoneFor(7)?.title).toBe('Seven stars.');
    expect(milestoneFor(8)).toBeUndefined();
  });
});
