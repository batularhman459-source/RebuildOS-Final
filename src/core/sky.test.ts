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
