import { describe, expect, it } from 'vitest';
import { detectPlatform, shouldPromptInstall, shouldRequireInstall } from './install';

describe('install rules', () => {
  it('requires install on a phone browser from the third day', () => {
    expect(shouldRequireInstall({ installed: false, isPhone: true, openDays: 2 })).toBe(false);
    expect(shouldRequireInstall({ installed: false, isPhone: true, openDays: 3 })).toBe(true);
    expect(shouldRequireInstall({ installed: true, isPhone: true, openDays: 9 })).toBe(false);
    expect(shouldRequireInstall({ installed: false, isPhone: false, openDays: 9 })).toBe(false);
  });

  it('prompts once, when due', () => {
    expect(shouldPromptInstall({ installed: false, due: true, shownBefore: false })).toBe(true);
    expect(shouldPromptInstall({ installed: false, due: true, shownBefore: true })).toBe(false);
    expect(shouldPromptInstall({ installed: false, due: false, shownBefore: false })).toBe(false);
  });

  it('detects the platform', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('other');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe('android');
  });
});
