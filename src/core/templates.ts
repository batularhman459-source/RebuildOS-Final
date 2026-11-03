import type { HabitSchedule } from './types';

/**
 * Starting points for the first-time setup. Every suggestion can be changed or
 * removed; they exist so nobody starts in front of an empty app. Written so an AI
 * suggestion could later provide the same shape.
 */
export interface GoalTemplate {
  id: string;
  /** Chip label in setup. */
  label: string;
  /** Pre-filled goal name (editable). */
  goal: string;
  doneWhen?: string;
  measure?: { target: number; unit: string };
  /** First steps, most useful first. */
  steps: string[];
  habits: { title: string; schedule: HabitSchedule }[];
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'exam',
    label: 'Pass an exam',
    goal: 'Pass my exam',
    doneWhen: 'I’ve sat the exam feeling prepared',
    steps: ['List every topic on the exam', 'Make a revision timetable', 'Do one past paper', 'Go over my weakest topic'],
    habits: [{ title: 'Revise for 25 minutes', schedule: { kind: 'daily' } }],
  },
  {
    id: 'fit',
    label: 'Get fit',
    goal: 'Get fit',
    doneWhen: 'Working out is a normal part of my week',
    steps: ['Plan three workouts for this week', 'Go for a 20-minute run or walk', 'Find a gym or a home routine'],
    habits: [
      { title: 'Work out', schedule: { kind: 'weekly', times: 3 } },
      { title: '10-minute walk', schedule: { kind: 'daily' } },
    ],
  },
  {
    id: 'run',
    label: 'Run a race',
    goal: 'Run a half marathon',
    measure: { target: 21, unit: 'km' },
    steps: ['Pick a race and a date', 'Run 3 km at an easy pace', 'Get proper running shoes'],
    habits: [{ title: 'Run', schedule: { kind: 'weekly', times: 3 } }],
  },
  {
    id: 'project',
    label: 'Build a project',
    goal: 'Launch my project',
    doneWhen: 'It’s live and someone has used it',
    steps: ['Write down what “launched” means', 'List the next five steps', 'Do the smallest first step'],
    habits: [{ title: 'Work on it for 30 minutes', schedule: { kind: 'weekly', times: 5 } }],
  },
  {
    id: 'skill',
    label: 'Learn a skill',
    goal: 'Learn a new language',
    steps: ['Choose a course or an app', 'Learn the 50 most common words', 'Have one short conversation'],
    habits: [{ title: 'Practise for 15 minutes', schedule: { kind: 'daily' } }],
  },
  {
    id: 'money',
    label: 'Save money',
    goal: 'Save €1,000',
    measure: { target: 1000, unit: '€' },
    steps: ['Look at last month’s spending', 'Set up an automatic transfer', 'Cancel one subscription I don’t use'],
    habits: [{ title: 'Note what I spent', schedule: { kind: 'daily' } }],
  },
  {
    id: 'own',
    label: 'Something else',
    goal: '',
    steps: [],
    habits: [],
  },
];

export function templateById(id: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.id === id);
}
