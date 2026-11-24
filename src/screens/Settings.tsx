import { PageHeader } from '../components/PageHeader';
import { YourData } from '../components/YourData';
import { Feedback } from '../components/Feedback';
import { Star } from '../components/Star';
import styles from './Screen.module.css';
import own from './Settings.module.css';

/**
 * Settings and info: appearance, your data, and what RebuildOS is. Sections are
 * separate so more (reminders, account) can slot in later.
 */
export function Settings() {
  return (
    <div className={styles.screen}>
      <PageHeader back={{ to: '/sky', label: 'Sky' }} title="Settings" />

      <YourData />

      <Feedback />

      <section className={own.about} aria-labelledby="about-heading">
        <h2 id="about-heading" className={own.heading}>
          About RebuildOS
        </h2>
        <div className={own.card}>
          <div className={own.brand}>
            <Star size={28} variant="solid" />
            <div>
              <p className={own.name}>RebuildOS</p>
              <p className={own.tagline}>One thing a day. Rough days count too.</p>
            </div>
          </div>
          <ul className={own.points}>
            <li>Each morning, say how today feels. The day adapts: the one thing, a smaller version, or just your minimum.</li>
            <li>Every day that counts adds a star to your sky. Stars are never taken away.</li>
            <li>No streaks, no points, no overdue lists.</li>
          </ul>
        </div>
        <dl className={own.info}>
          <div>
            <dt>Version</dt>
            <dd>{__APP_VERSION__}</dd>
          </div>
          <div>
            <dt>Your data</dt>
            <dd>Stored only on this phone</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
