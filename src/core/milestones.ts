/**
 * Moments in the sky: the first star, and a few round numbers. Days that count are
 * celebrated; days that don't are never mentioned.
 */
export interface Milestone {
  title: string;
  line: string;
}

const MILESTONES: Record<number, Milestone> = {
  1: { title: 'Your first star.', line: 'Your sky starts here. Every day that counts adds one, and none are ever taken away.' },
  7: { title: 'Seven stars.', line: 'A week’s worth of showing up. Not in a row, just yours.' },
  30: { title: 'Thirty stars.', line: 'A month of days that counted. Look at your sky.' },
  50: { title: 'Fifty stars.', line: 'Fifty days you didn’t give up on yourself.' },
  100: { title: 'A hundred stars.', line: 'One hundred days that counted. That’s a rebuild.' },
  365: { title: 'A year of stars.', line: '365 days that counted. Keep going.' },
};

export function milestoneFor(total: number): Milestone | undefined {
  return MILESTONES[total];
}
