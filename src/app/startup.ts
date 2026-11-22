/**
 * Resolves once the startup checks (running Focus, Welcome back, first-time setup) have
 * decided where to go, so Today's check-in redirect never races ahead of them.
 */
let resolveReady: () => void = () => {};
export const startupReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function markStartupReady(): void {
  resolveReady();
}
