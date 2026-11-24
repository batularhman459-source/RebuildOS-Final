import { describe, expect, it } from 'vitest';
import { backupNudgeDue } from './safety';

describe('backup reminder', () => {
  it('waits until there is something worth keeping', () => {
    expect(backupNudgeDue(3, undefined, undefined, '2026-11-24')).toBe(false);
    expect(backupNudgeDue(5, undefined, undefined, '2026-11-24')).toBe(true);
  });

  it('comes back two weeks after a backup, and stays quiet a week after "Not now"', () => {
    expect(backupNudgeDue(20, '2026-11-20', undefined, '2026-11-24')).toBe(false);
    expect(backupNudgeDue(20, '2026-11-01', undefined, '2026-11-24')).toBe(true);
    expect(backupNudgeDue(20, undefined, '2026-11-20', '2026-11-24')).toBe(false);
    expect(backupNudgeDue(20, undefined, '2026-11-10', '2026-11-24')).toBe(true);
  });
});
