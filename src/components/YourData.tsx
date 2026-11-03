import { useRef, useState, type ChangeEvent } from 'react';
import { parseBackup, type Backup } from '../core/backup';
import { formatShortDay } from '../core/locale';
import { restoreBackup, saveBackup } from '../data/backup';
import { isInstalled } from '../data/install';
import { InstallSteps } from './InstallSteps';
import { Sheet } from './Sheet';
import forms from './forms.module.css';
import styles from './YourData.module.css';

function isoDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Install, back up and restore. Everything lives on this device until accounts exist. */
export function YourData() {
  const [installOpen, setInstallOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const installed = isInstalled();

  async function exportData() {
    const result = await saveBackup();
    setMessage(result === 'cancelled' ? null : 'Backup saved. Keep it somewhere safe, like Files or iCloud Drive.');
  }

  async function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setMessage(parsed.reason);
      return;
    }
    setMessage(null);
    setPending(parsed.backup);
  }

  async function confirmRestore() {
    if (!pending) return;
    await restoreBackup(pending);
    setPending(null);
    setMessage('Backup restored.');
  }

  return (
    <section aria-labelledby="data-heading" className={styles.section}>
      <h2 id="data-heading" className={styles.heading}>
        Your data
      </h2>
      <p className={styles.caption}>Everything is stored on this phone. A backup keeps it safe if you change phones.</p>
      <div className={styles.list}>
        {!installed && (
          <button type="button" className={styles.row} onClick={() => setInstallOpen(true)}>
            Add to home screen
          </button>
        )}
        <button type="button" className={styles.row} onClick={() => void exportData()}>
          Save a backup
        </button>
        <button type="button" className={styles.row} onClick={() => fileRef.current?.click()}>
          Restore from a backup
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => void chooseFile(e)} />
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      <Sheet open={installOpen} onClose={() => setInstallOpen(false)} label="Add to home screen">
        <h2 className={forms.title}>Add to home screen</h2>
        <InstallSteps />
      </Sheet>

      <Sheet open={pending !== null} onClose={() => setPending(null)} label="Restore backup">
        {pending && (
          <>
            <h2 className={forms.title}>Restore this backup?</h2>
            <p className={styles.sheetText}>
              It’s from {formatShortDay(isoDay(pending.exportedAt))} and has {pending.tables.actions.filter((a) => !a.deletedAt).length} actions and{' '}
              {pending.tables.missions.filter((m) => !m.deletedAt).length} Missions. It will replace everything currently on this phone.
            </p>
            <button type="button" className={forms.primary} onClick={() => void confirmRestore()}>
              Replace with backup
            </button>
            <button type="button" className={styles.cancel} onClick={() => setPending(null)}>
              Cancel
            </button>
          </>
        )}
      </Sheet>
    </section>
  );
}
