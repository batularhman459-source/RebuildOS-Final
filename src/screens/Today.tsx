import { APP_LOCALE } from '../core/locale';
import { Stage } from '../components/Stage';
import styles from './Today.module.css';

const dateFormat = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

export function Today() {
  return (
    <>
      <Stage height="max(460px, 63vh)" aria-label="Today">
        <span className={styles.date}>{dateFormat.format(new Date())}</span>
        <div className={styles.spacer} />
        <h1 className={styles.question}>What’s one thing you want to get done today?</h1>
        <div className={styles.spacer} />
      </Stage>
      <section className={styles.list} aria-label="Also today" />
    </>
  );
}
