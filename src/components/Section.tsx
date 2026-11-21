import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './Section.module.css';

interface SectionProps {
  /** Becomes the region's accessible name. */
  title: string;
  /** Optional small line under the title. */
  subtitle?: string;
  /** One action on the right, e.g. "Add a task". */
  action?: { label: string; onClick: () => void; icon?: IconName };
  /** Wrap the children in a soft grouped card (lists). */
  card?: boolean;
  children: ReactNode;
  id?: string;
}

/**
 * The one section pattern used on every light screen: title (+ optional subtitle)
 * with one action on the right, then content — in a soft card when it's a list.
 */
export function Section({ title, subtitle, action, card = false, children, id }: SectionProps) {
  const headingId = id ?? `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <div className={styles.titles}>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {action && (
          <button type="button" className={styles.action} onClick={action.onClick}>
            <Icon name={action.icon ?? 'plus'} size={16} />
            {action.label}
          </button>
        )}
      </header>
      {card ? <div className={styles.card}>{children}</div> : children}
    </section>
  );
}

/** A soft grouped card on its own, for content outside a Section. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.card} ${className ?? ''}`}>{children}</div>;
}

/** A friendly empty state: what goes here, and the first thing to do. */
export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={22} />
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
      {action && (
        <button type="button" className={styles.emptyButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
