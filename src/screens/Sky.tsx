import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDay } from '../app/day';
import { Icon } from '../components/Icon';
import { Star } from '../components/Star';
import { dayKey } from '../core/day';
import { activeDays } from '../core/progress';
import { buildSky, nearestNode, neighbours, SKY_REST, STAR_SIZE, stepSky, type Sky as SkyModel, type StarKind } from '../core/sky';
import type { DayKey, Feeling } from '../core/types';
import { weekReviewDue } from '../core/week';
import { db } from '../data/db';
import { getWeekReviews } from '../data/week';
import styles from './Sky.module.css';

const dayOf = (t: number) => dayKey(new Date(t));
const ease = [0.2, 0.8, 0.2, 1] as const;

const FILL: Record<StarKind, string> = {
  good: '#F49A70',
  okay: '#E8906A',
  rough: '#C98563',
  none: 'rgba(255,255,255,0.28)',
};
const STAR_PATH = 'M12 2C12.6 8.2 15.8 11.4 22 12C15.8 12.6 12.6 15.8 12 22C11.4 15.8 8.2 12.6 2 12C8.2 11.4 11.4 8.2 12 2Z';

/**
 * Your sky: every day that counted is a star, and none are ever taken away. The stars
 * burst out, settle like a graph of linked notes, and can be dragged; then everything is
 * still (frames stop), so the phone isn't redrawing all the time.
 */
export function Sky() {
  const today = useDay();
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const [actions, sessions, checks, days, reviews] = await Promise.all([
      db.actions.toArray(),
      db.focusSessions.toArray(),
      db.habitChecks.toArray(),
      db.days.toArray(),
      getWeekReviews(),
    ]);
    const wins = days.filter((d) => d.smallWin).map((d) => d.day);
    const active = activeDays(actions, sessions, dayOf, checks, wins);
    const feelings = new Map<DayKey, Feeling>(days.filter((d) => d.feeling).map((d) => [d.day, d.feeling!]));
    const since = [...active, ...days.map((d) => d.day)].sort()[0] ?? today;
    return { active, feelings, since, weekDue: weekReviewDue(today, new Set(reviews.map((r) => r.week))) };
  }, [today]);

  return (
    <div className={styles.root}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.content}>
        {data && (
          <>
            <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
              <p className={styles.kicker}>Your sky</p>
              <p className={styles.count}>
                <span className={styles.number}>{data.active.size}</span>
                <span>{data.active.size === 1 ? 'day counted' : 'days counted'}</span>
              </p>
              <p className={styles.lead}>Every day that counts adds a star. None are ever taken away.</p>
            </motion.header>

            <SkyGraph today={today} active={data.active} feelings={data.feelings} since={data.since} />

            <p className={styles.legend}>
              <span>Drag a star · big = good day, small = rough day</span>
            </p>

            <div className={styles.spacer} />

            {data.weekDue && (
              <button type="button" className={styles.week} onClick={() => navigate('/week')}>
                <Star size={16} variant="gradient" />
                <span>Your week, in 2 minutes</span>
                <Icon name="chevron" size={16} />
              </button>
            )}
            <div className={styles.links}>
              <Link to="/plan" className={styles.linkButton}>
                Your plan
              </Link>
              <Link to="/progress" className={styles.linkButton}>
                Details
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface GraphProps {
  today: DayKey;
  active: ReadonlySet<DayKey>;
  feelings: ReadonlyMap<DayKey, Feeling>;
  since: DayKey;
}

function SkyGraph({ today, active, feelings, since }: GraphProps) {
  const box = useRef<HTMLDivElement>(null);
  const stars = useRef<(HTMLSpanElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height: HEIGHT } = size;
  const sim = useRef({ alpha: 1, raf: 0, held: undefined as number | undefined });
  const key = [...active].sort().join(',');

  useEffect(() => {
    const measure = () => setSize({ width: box.current?.clientWidth ?? 0, height: box.current?.clientHeight ?? 0 });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Rebuilt only when the days themselves change.
  const sky = useMemo<SkyModel | null>(
    () => (width && HEIGHT ? buildSky({ today, active, feelings, since }, width, HEIGHT) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, HEIGHT, today, key, since],
  );

  function paint(s: SkyModel) {
    const lit = sim.current.held !== undefined ? neighbours(s, sim.current.held) : undefined;
    s.nodes.forEach((n, i) => {
      const el = stars.current[i];
      if (!el) return;
      const size = STAR_SIZE[n.kind] + (n.today && n.kind !== 'none' ? 8 : 0);
      el.style.transform = `translate3d(${n.x - size / 2}px, ${n.y - size / 2}px, 0)`;
      el.style.opacity = lit && !lit.has(i) ? '0.3' : '1';
    });
    s.links.forEach(([a, b], i) => {
      const el = lines.current[i];
      if (!el) return;
      const p = s.nodes[a]!;
      const q = s.nodes[b]!;
      el.setAttribute('x1', p.x.toFixed(1));
      el.setAttribute('y1', p.y.toFixed(1));
      el.setAttribute('x2', q.x.toFixed(1));
      el.setAttribute('y2', q.y.toFixed(1));
      const on = lit && (lit.has(a) && lit.has(b)) && (a === sim.current.held || b === sim.current.held);
      el.setAttribute('stroke', on ? 'rgba(255,227,204,0.7)' : lit ? 'rgba(255,227,204,0.07)' : 'rgba(255,227,204,0.18)');
    });
  }

  function run() {
    const s = sky;
    if (!s || sim.current.raf) return;
    const frame = () => {
      sim.current.alpha = stepSky(s, sim.current.alpha, width, HEIGHT, sim.current.held !== undefined);
      paint(s);
      sim.current.raf = sim.current.alpha > SKY_REST || sim.current.held !== undefined ? requestAnimationFrame(frame) : 0;
    };
    sim.current.raf = requestAnimationFrame(frame);
  }

  useEffect(() => {
    if (!sky) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    sim.current.alpha = 1;
    if (reduce) {
      // Lay it out at once, no movement.
      while (sim.current.alpha > SKY_REST) sim.current.alpha = stepSky(sky, sim.current.alpha, width, HEIGHT, false);
      paint(sky);
    } else run();
    return () => {
      cancelAnimationFrame(sim.current.raf);
      sim.current.raf = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sky]);

  function point(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!sky) return;
    const p = point(e);
    const i = nearestNode(sky, p.x, p.y);
    if (i === undefined) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    sim.current.held = i;
    const n = sky.nodes[i]!;
    n.fixed = true;
    n.x = p.x;
    n.y = p.y;
    sim.current.alpha = Math.max(sim.current.alpha, 0.5);
    run();
  }

  function move(e: PointerEvent<HTMLDivElement>) {
    if (!sky || sim.current.held === undefined) return;
    const p = point(e);
    const n = sky.nodes[sim.current.held]!;
    n.x = Math.min(width - 10, Math.max(10, p.x));
    n.y = Math.min(HEIGHT - 10, Math.max(10, p.y));
  }

  function up() {
    if (!sky || sim.current.held === undefined) return;
    sky.nodes[sim.current.held]!.fixed = false;
    sim.current.held = undefined;
    sim.current.alpha = Math.max(sim.current.alpha, 0.3);
    run();
  }

  return (
    <div
      ref={box}
      className={styles.graph}
      role="img"
      aria-label={`Your sky: ${active.size} ${active.size === 1 ? 'day' : 'days'} counted`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {sky && (
        <>
          <svg className={styles.lines} width={width} height={HEIGHT} aria-hidden="true">
            {sky.links.map((_, i) => (
              <line key={i} ref={(el) => void (lines.current[i] = el)} strokeWidth={1} stroke="rgba(255,227,204,0.18)" />
            ))}
          </svg>
          {sky.nodes.map((n, i) => {
            const size = STAR_SIZE[n.kind] + (n.today && n.kind !== 'none' ? 8 : 0);
            return (
              <span key={n.day} ref={(el) => void (stars.current[i] = el)} className={styles.star} style={{ width: size, height: size }} aria-hidden="true">
                <svg viewBox="0 0 24 24" width={size} height={size} className={n.today && n.kind !== 'none' ? styles.todayStar : undefined}>
                  <path d={STAR_PATH} fill={n.today && n.kind !== 'none' ? '#FFE3CC' : FILL[n.kind]} />
                </svg>
              </span>
            );
          })}
        </>
      )}
    </div>
  );
}
