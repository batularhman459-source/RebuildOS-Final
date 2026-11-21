import { useState } from 'react';
import { formatDuration } from '../core/focus';
import { APP_LOCALE } from '../core/locale';
import { niceMinutesMax } from '../core/progress';
import styles from './FocusChart.module.css';

interface FocusChartProps {
  data: { day: string; minutes: number }[];
  today: string;
}

const W = 340;
const H = 150;
const PAD = { top: 22, right: 8, bottom: 24, left: 30 };
const narrow = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'narrow' });
const long = new Intl.DateTimeFormat(APP_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });

function axisLabel(min: number): string {
  if (min === 0) return '0';
  return min % 60 === 0 ? `${min / 60}h` : `${min}m`;
}

/**
 * Focused time per day, as thin bars with rounded tops anchored to the baseline.
 * One series in ink (no legend needed); a recessive axis; a tooltip for every bar
 * on hover, tap or keyboard focus; and a table version for screen readers.
 */
export function FocusChart({ data, today }: FocusChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMinutesMax(Math.max(0, ...data.map((d) => d.minutes)));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const col = plotW / data.length;
  const barW = Math.min(14, col - 4);
  const y = (m: number) => PAD.top + plotH - (m / max) * plotH;
  const total = data.reduce((t, d) => t + d.minutes, 0);
  const shown = active !== null ? data[active] : undefined;

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="group" aria-label={`Focused time per day for the last ${data.length} days, ${formatDuration(total * 60_000)} in total`}>
        {/* Recessive grid: half and top of the scale. */}
        {[max / 2, max].map((m) => (
          <g key={m}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)} className={styles.grid} />
            <text x={PAD.left - 6} y={y(m) + 4} className={styles.axisText} textAnchor="end">
              {axisLabel(m)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} className={styles.baseline} />

        {data.map((d, i) => {
          const cx = PAD.left + col * i + col / 2;
          const h = Math.max(0, y(0) - y(d.minutes));
          const r = Math.min(4, barW / 2, h);
          const x = cx - barW / 2;
          const top = y(0) - h;
          // Rounded top corners only; square at the baseline.
          const path =
            h > 0
              ? `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y(0)} Z`
              : '';
          const isToday = d.day === today;
          const date = new Date(`${d.day}T12:00:00`);
          return (
            <g key={d.day}>
              {path && <path d={path} className={`${styles.bar} ${active === i ? styles.barActive : ''}`} />}
              {i % 2 === (data.length - 1) % 2 && (
                <text x={cx} y={H - 6} className={`${styles.axisText} ${isToday ? styles.today : ''}`} textAnchor="middle">
                  {isToday ? 'Today' : narrow.format(date)}
                </text>
              )}
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={PAD.left + col * i}
                y={PAD.top}
                width={col}
                height={plotH}
                className={styles.hit}
                role="button"
                tabIndex={0}
                aria-label={`${long.format(date)}: ${d.minutes > 0 ? formatDuration(d.minutes * 60_000) : 'no focus'}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                onPointerDown={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
      </svg>

      <p className={styles.readout} aria-live="polite">
        {shown ? (
          <>
            <strong>{shown.minutes > 0 ? formatDuration(shown.minutes * 60_000) : 'No focus'}</strong> · {long.format(new Date(`${shown.day}T12:00:00`))}
          </>
        ) : total > 0 ? (
          <>
            <strong>{formatDuration(total * 60_000)}</strong> focused in {data.length} days · tap a bar for a day
          </>
        ) : (
          'Your focus time will show here after your first Focus session.'
        )}
      </p>

      <table className="visually-hidden">
        <caption>Focused minutes per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Minutes</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{long.format(new Date(`${d.day}T12:00:00`))}</td>
              <td>{d.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
