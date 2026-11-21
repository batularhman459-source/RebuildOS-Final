/**
 * The app's small icon set: 24px grid, 1.8px rounded strokes, currentColor.
 * Icons support a label; they never carry meaning on their own.
 */
export type IconName =
  | 'today'
  | 'plan'
  | 'progress'
  | 'plus'
  | 'repeat'
  | 'calendar'
  | 'clock'
  | 'goal'
  | 'focus'
  | 'chevron'
  | 'leaf'
  | 'sparkle';

const PATHS: Record<IconName, string> = {
  // Sun: "today"
  today: 'M12 4V2.5M12 21.5V20M4 12H2.5M21.5 12H20M6.3 6.3 5.2 5.2M18.8 18.8l-1.1-1.1M6.3 17.7l-1.1 1.1M18.8 5.2l-1.1 1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  // Target: goals / plan
  plan: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 12h.01',
  // Rising line: progress
  progress: 'M3.5 17.5l5.5-5.5 4 4 7.5-7.5M15 8.5h5.5V14',
  plus: 'M12 5v14M5 12h14',
  repeat: 'M17 2.5l3 3-3 3M4 11.5v-1a5 5 0 0 1 5-5h11M7 21.5l-3-3 3-3M20 12.5v1a5 5 0 0 1-5 5H4',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  goal: 'M5 21V4M5 4h11l-2 4 2 4H5',
  focus: 'M6 4v16l13-8z',
  chevron: 'M9 6l6 6-6 6',
  leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7',
  sparkle: 'M12 3c.5 4.7 4.3 8.5 9 9-4.7.5-8.5 4.3-9 9-.5-4.7-4.3-8.5-9-9 4.7-.5 8.5-4.3 9-9Z',
};

interface IconProps {
  name: IconName;
  size?: number;
  /** Fill instead of stroke (used for the play triangle and the star). */
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 18, filled = name === 'focus', className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
