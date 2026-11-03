import type { CSSProperties, ReactNode } from 'react';
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
 *
 * Performance (iPhone): grain is a static tiled image, not a live SVG filter or blend mode,
 * and the glow only changes in small steps, so animations over a stage stay smooth.
 */
export function Stage({ children, height, glowTop = '62%', glowScale = 1, className, ...rest }: StageProps) {
  return (
    <section
      className={`${styles.stage} on-stage ${className ?? ''}`}
      style={{ minHeight: height ?? '100%' }}
      aria-label={rest['aria-label']}
    >
      <div
        className={styles.glow}
        style={{ top: glowTop, transform: `translate3d(-50%, -50%, 0) scale(${Math.round(glowScale * 20) / 20})` }}
        aria-hidden="true"
      />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </section>
  );
}
