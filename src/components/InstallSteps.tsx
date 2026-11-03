import { useState } from 'react';
import { currentPlatform, inIOSSafari, promptInstall, useCanPromptInstall } from '../data/install';
import styles from './InstallSteps.module.css';

/**
 * How to put RebuildOS on the home screen, for the device and browser in hand.
 * Each step shows what the person will actually see, so there's nothing to decode.
 */
export function InstallSteps() {
  const canPrompt = useCanPromptInstall();
  const platform = currentPlatform();

  if (canPrompt) {
    return (
      <button type="button" className={styles.install} onClick={() => void promptInstall()}>
        Install RebuildOS
      </button>
    );
  }

  if (platform === 'ios' && !inIOSSafari()) return <OpenInSafari />;

  if (platform === 'ios') {
    return (
      <ol className={styles.steps}>
        <li>
          <span className={styles.num}>1</span>
          <div className={styles.stepBody}>
            <span>
              Tap the <strong>Share</strong> button in Safari
            </span>
            <span className={styles.mock} aria-hidden="true">
              <span className={styles.mockIcon}>
                <ShareIcon />
              </span>
            </span>
            <span className={styles.hint}>Don’t see it? Tap ••• first, then Share.</span>
          </div>
        </li>
        <li>
          <span className={styles.num}>2</span>
          <div className={styles.stepBody}>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>
            </span>
            <span className={styles.mockRow} aria-hidden="true">
              <span>Add to Home Screen</span>
              <AddIcon />
            </span>
          </div>
        </li>
        <li>
          <span className={styles.num}>3</span>
          <div className={styles.stepBody}>
            <span>
              Tap <strong>Add</strong>, then open RebuildOS from your home screen
            </span>
          </div>
        </li>
      </ol>
    );
  }

  return (
    <ol className={styles.steps}>
      <li>
        <span className={styles.num}>1</span>
        <div className={styles.stepBody}>
          <span>
            Open your browser’s menu <strong>⋮</strong>
          </span>
        </div>
      </li>
      <li>
        <span className={styles.num}>2</span>
        <div className={styles.stepBody}>
          <span>
            Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
          </span>
        </div>
      </li>
      <li>
        <span className={styles.num}>3</span>
        <div className={styles.stepBody}>
          <span>Open RebuildOS from your home screen</span>
        </div>
      </li>
    </ol>
  );
}

/** Other iPhone browsers may not be able to add web apps to the home screen; Safari always can. */
function OpenInSafari() {
  const [copied, setCopied] = useState(false);
  const url = window.location.origin;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.safari}>
      <p>
        To add RebuildOS to your home screen, open it in <strong>Safari</strong>. This browser may not be able to do it.
      </p>
      <div className={styles.link}>
        <span className={styles.url}>{url.replace(/^https?:\/\//, '')}</span>
        <button type="button" className={styles.copy} onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      <p className={styles.hint}>Then paste it into Safari’s address bar. Everything you’ve added here stays in this browser, so start fresh in Safari or use a backup.</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
