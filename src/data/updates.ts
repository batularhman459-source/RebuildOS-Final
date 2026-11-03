import { registerSW } from 'virtual:pwa-register';

/**
 * Keep the installed app up to date.
 *
 * On iPhone, a home-screen app is usually paused rather than closed, so it can keep
 * showing an old version for a long time. We therefore check for a new version every
 * time the app comes back to the front (and hourly while open). When one is found it
 * is installed and the app reloads into it. All data lives in IndexedDB and Focus time
 * is derived from timestamps, so a reload never loses anything that was saved.
 */
export function keepAppUpdated(): void {
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => undefined);
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('pageshow', check);
      window.setInterval(check, 60 * 60 * 1000);
    },
  });
}
