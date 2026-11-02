import { useId } from 'react';

const STAR_PATH =
  'M12 1.5c.6 5.6 4.9 9.9 10.5 10.5-5.6.6-9.9 4.9-10.5 10.5C11.4 16.9 7.1 12.6 1.5 12 7.1 11.4 11.4 7.1 12 1.5z';

interface StarProps {
  size?: number;
  /** solid: apricot (on light) · gradient: brand gradient (on dark) · empty: inactive day */
  variant?: 'solid' | 'gradient' | 'empty';
  label?: string;
}

/** The four-point Rebuild star — the only brand mark. Never decorative filler. */
export function Star({ size = 16, variant = 'solid', label }: StarProps) {
  const gradientId = useId();
  const fill =
    variant === 'gradient' ? `url(#${gradientId})` : variant === 'empty' ? '#D9D5CF' : 'var(--apricot)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id={gradientId} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#FFF6EE" />
            <stop offset="0.55" stopColor="#FFE3CC" />
            <stop offset="1" stopColor="#F49A70" />
          </linearGradient>
        </defs>
      )}
      <path fill={fill} d={STAR_PATH} />
    </svg>
  );
}
