import { motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Stage } from '../components/Stage';
import { Star } from '../components/Star';
import { APP_LOCALE } from '../core/locale';
import type { Feeling } from '../core/types';
import { checkIn } from '../data/checkin';
import styles from './CheckIn.module.css';

const longDate = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const ease = [0.2, 0.8, 0.2, 1] as const;

const OPTIONS: { feeling: Feeling; title: string; text: string; icon: string }[] = [
  {
    feeling: 'good',
    title: 'Good',
    text: 'Give me the main thing.',
    icon: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2.5v2 M12 19.5v2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M2.5 12h2 M19.5 12h2 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  },
  { feeling: 'okay', title: 'Okay', text: 'Something small but real.', icon: 'M3 17h18 M7 17a5 5 0 0 1 10 0 M12 6.5v2 M5.6 9.6l1.4 1.4 M18.4 9.6L17 11' },
  {
    feeling: 'rough',
    title: 'Rough',
    text: 'Just my minimum. It still counts.',
    icon: 'M7.5 15h9.5a3.5 3.5 0 0 0 0.3-7a5 5 0 0 0-9.4 1.3a2.9 2.9 0 0 0-0.4 5.7z M9 18l-1 2.5 M13 18l-1 2.5 M17 18l-1 2.5',
  },
];

const list: Variants = { show: { transition: { staggerChildren: 0.08, delayChildren: 0.18 } } };
const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/**
 * "How's today?" — the one question the app asks each day. The answer shapes Today:
 * good = the main thing, okay = its smaller version, rough = My minimum day.
 */
export function CheckIn() {
  const day = useDay();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Feeling | null>(null);

  async function pick(feeling: Feeling) {
    if (picked) return;
    setPicked(feeling);
    // Let the choice light up before moving on; the save runs meanwhile.
    const [started] = await Promise.all([checkIn(day, feeling), new Promise((r) => setTimeout(r, 260))]);
    navigate(started ? '/' : '/minimum', { replace: true });
  }

  return (
    <div className={styles.root}>
      <Stage glowTop="58%" aria-label="Check in">
        <motion.p className={styles.date} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          {longDate.format(new Date())}
        </motion.p>
        <div className={styles.spacer} />
        <motion.div className={styles.head} initial="hidden" animate="show" variants={item}>
          <Star size={30} variant="gradient" />
          <h1 className={styles.title}>How’s today?</h1>
          <p className={styles.subtitle}>Be honest. Your day adapts to it.</p>
        </motion.div>

        <motion.div className={styles.options} role="group" aria-label="How today feels" initial="hidden" animate="show" variants={list}>
          {OPTIONS.map((o) => (
            <motion.button
              key={o.feeling}
              type="button"
              variants={item}
              className={`${styles.option} ${picked === o.feeling ? styles.picked : ''} ${picked && picked !== o.feeling ? styles.dimmed : ''}`}
              onClick={() => void pick(o.feeling)}
              aria-pressed={picked === o.feeling}
            >
              <span className={styles.icon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={o.icon} />
                </svg>
              </span>
              <span className={styles.text}>
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.optionText}>{o.text}</span>
              </span>
              <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          ))}
        </motion.div>
        <div className={styles.spacer} />
        <motion.p className={styles.foot} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
          You can change it any time
        </motion.p>
      </Stage>
    </div>
  );
}
