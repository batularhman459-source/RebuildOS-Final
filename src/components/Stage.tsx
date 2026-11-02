import { useId, type CSSProperties, type ReactNode } from 'react';
import styles from './Stage.module.css';

interface StageProps {
  children: ReactNode;
  /** Minimum height of the stage (it grows with its content); omit for full screen. */
  height?: CSSProperties['height'];
  /** Where the Apricot glow sits, as a percentage from the top of the stage. */
  glowTop?: string;
  /** Size of the glow (1 = default). Grows gently during Focus; never pulses. */
  glowScale?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * A dark "doing" stage: full-bleed charcoal, lit from within by the Apricot glow,
 * always with grain. See DESIGN.md §6 Stage.
 */
export function Stage({ children, height, glowTop = '62%', glowScale = 1, className, ...rest }: StageProps) {
  const grainId = useId();
  return (
    <section
      className={`${styles.stage} on-stage ${className ?? ''}`}
      style={{ minHeight: height ?? '100%' }}
      aria-label={rest['aria-label']}
    >
      <div
        className={styles.glow}
        style={{ top: glowTop, transform: `translate(-50%, -50%) scale(${glowScale})` }}
        aria-hidden="true"
      />
      <svg className={styles.grain} aria-hidden="true">
        <filter id={grainId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${grainId})`} />
      </svg>
      <div className={styles.content}>{children}</div>
    </section>
  );
}
