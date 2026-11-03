import { describe, expect, it } from 'vitest';
import { detectPlatform, isIOSSafari, shouldPromptInstall } from './install';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

describe('install rules', () => {
  it('prompts once, when due, and never once installed', () => {
    expect(shouldPromptInstall({ installed: false, due: true, shownBefore: false })).toBe(true);
    expect(shouldPromptInstall({ installed: false, due: true, shownBefore: true })).toBe(false);
    expect(shouldPromptInstall({ installed: false, due: false, shownBefore: false })).toBe(false);
    expect(shouldPromptInstall({ installed: true, due: true, shownBefore: false })).toBe(false);
  });

  it('detects the platform', () => {
    expect(detectPlatform(SAFARI, 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('other');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe('android');
  });

  it('tells Safari apart from other iPhone browsers', () => {
    expect(isIOSSafari(SAFARI)).toBe(true);
    expect(isIOSSafari(SAFARI.replace('Version/18.0', 'CriOS/130.0'))).toBe(false);
    expect(isIOSSafari(SAFARI.replace('Version/18.0', 'FxiOS/130.0'))).toBe(false);
    expect(isIOSSafari(`${SAFARI} Ddg/18.0`)).toBe(false);
    expect(isIOSSafari(`${SAFARI} DuckDuckGo/7`)).toBe(false);
  });
});
