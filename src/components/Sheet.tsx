import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  children: ReactNode;
}

/** iOS sheet timing: quick start, long gentle settle. */
const SHEET_EASE = [0.32, 0.72, 0, 1] as const;

/**
 * Bottom sheet with a scrim. Close it with Escape, by tapping the scrim, or by dragging
 * the top of the sheet down. See DESIGN.md §6 Sheet.
 */
export function Sheet({ open, onClose, label, children }: SheetProps) {
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, onClose]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={styles.root}>
          <motion.div
            className={styles.scrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={styles.panel}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: 0.42, ease: SHEET_EASE } }}
            exit={{ y: '100%', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            {/* The top strip is the drag handle, like a native sheet. */}
            <div className={styles.handleArea} onPointerDown={(e) => drag.start(e)} aria-hidden="true">
              <span className={styles.grab} />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
