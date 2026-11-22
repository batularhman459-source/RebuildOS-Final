import type { AreaId, HabitSchedule, Mission } from './types';

/**
 * Life areas: what someone wants to change. Each area brings ready-made ideas so
 * nobody has to invent tasks from nothing. Every task comes with a smaller version
 * for okay days. Written so an AI suggestion could later provide the same shape.
 */

export interface TaskIdea {
  title: string;
  /** The okay-day version. */
  smaller: string;
  minutes?: number;
}

export interface Area {
  id: AreaId;
  label: string;
  /** Short description for the setup chip. */
  hint: string;
  /** Suggested goal names, most common first. */
  goals: string[];
  /** Task ideas for the main thing, most useful first. */
  ideas: TaskIdea[];
  habits: { title: string; schedule: HabitSchedule }[];
  /** Tiny things for a rough day. */
  minimum: string[];
  /** Words in a goal title that point to this area (lower case). */
  keywords: string[];
}

export const AREAS: Area[] = [
  {
    id: 'fitness',
    label: 'Fitness',
    hint: 'Move more, get stronger',
    goals: ['Get fit', 'Run 5 km without stopping', 'Go to the gym 3 times a week'],
    ideas: [
      { title: 'Run 5 km', smaller: 'Run 2 km', minutes: 35 },
      { title: 'Full workout', smaller: '15-minute home workout', minutes: 45 },
      { title: 'Go to the gym', smaller: '20 minutes of anything', minutes: 60 },
      { title: '45-minute walk', smaller: '15-minute walk', minutes: 45 },
    ],
    habits: [
      { title: 'Work out', schedule: { kind: 'weekly', times: 3 } },
      { title: '10-minute walk', schedule: { kind: 'daily' } },
    ],
    minimum: ['10-minute walk', 'Stretch for 5 minutes'],
    keywords: ['run', 'fit', 'gym', 'workout', 'train', 'marathon', 'km', 'lift', 'muscle', 'sport', 'walk', 'weight'],
  },
  {
    id: 'study',
    label: 'School & study',
    hint: 'Grades, exams, focus',
    goals: ['Pass my exams', 'Get better grades', 'Keep up with homework'],
    ideas: [
      { title: 'Revise one topic', smaller: 'Read my notes for 15 minutes', minutes: 45 },
      { title: 'Do a past paper', smaller: 'Do 3 questions', minutes: 60 },
      { title: 'Finish my homework', smaller: 'Start the hardest part', minutes: 45 },
      { title: 'Make flashcards for one chapter', smaller: 'Make 10 flashcards', minutes: 30 },
    ],
    habits: [{ title: 'Revise for 25 minutes', schedule: { kind: 'daily' } }],
    minimum: ['Pack my bag for tomorrow', 'Read my notes for 10 minutes'],
    keywords: ['exam', 'study', 'revise', 'school', 'grade', 'homework', 'maths', 'math', 'uni', 'class', 'test', 'abitur', 'course'],
  },
  {
    id: 'money',
    label: 'Money',
    hint: 'Save, spend less, earn',
    goals: ['Save €1,000', 'Stop overspending', 'Earn some money on the side'],
    ideas: [
      { title: 'Go through last month’s spending', smaller: 'Check this week’s spending', minutes: 30 },
      { title: 'Make a budget for the month', smaller: 'Write down my 3 biggest costs', minutes: 30 },
      { title: 'Cancel subscriptions I don’t use', smaller: 'List my subscriptions', minutes: 20 },
      { title: 'Apply for a side job', smaller: 'Look at 3 job ads', minutes: 45 },
    ],
    habits: [{ title: 'Note what I spent', schedule: { kind: 'daily' } }],
    minimum: ['Note what I spent today'],
    keywords: ['save', 'money', '€', '$', 'budget', 'spend', 'earn', 'debt', 'job', 'salary', 'invest'],
  },
  {
    id: 'project',
    label: 'A project',
    hint: 'Build or launch something',
    goals: ['Launch my project', 'Finish my app', 'Start a YouTube channel'],
    ideas: [
      { title: 'Work on my project for an hour', smaller: '20 minutes on the smallest next step', minutes: 60 },
      { title: 'Finish one feature', smaller: 'Write down the next 3 steps', minutes: 60 },
      { title: 'Show it to one person', smaller: 'Write the message', minutes: 20 },
    ],
    habits: [{ title: 'Work on it for 30 minutes', schedule: { kind: 'weekly', times: 5 } }],
    minimum: ['Write down one idea for my project'],
    keywords: ['project', 'launch', 'build', 'app', 'business', 'channel', 'website', 'start', 'brand', 'shop'],
  },
  {
    id: 'skill',
    label: 'A new skill',
    hint: 'Language, music, code…',
    goals: ['Learn a new language', 'Learn to code', 'Learn an instrument'],
    ideas: [
      { title: 'Practise for 45 minutes', smaller: 'Practise for 15 minutes', minutes: 45 },
      { title: 'Do one lesson', smaller: 'Review the last lesson', minutes: 30 },
      { title: 'Build or play something small', smaller: 'Watch one tutorial', minutes: 45 },
    ],
    habits: [{ title: 'Practise for 15 minutes', schedule: { kind: 'daily' } }],
    minimum: ['Practise for 5 minutes'],
    keywords: ['learn', 'language', 'skill', 'practise', 'practice', 'code', 'coding', 'guitar', 'piano', 'spanish', 'english', 'draw'],
  },
  {
    id: 'mind',
    label: 'Mind & mood',
    hint: 'Calmer, less stressed',
    goals: ['Feel calmer', 'Less time on my phone', 'Be kinder to myself'],
    ideas: [
      { title: 'Phone-free evening', smaller: 'One phone-free hour', minutes: 60 },
      { title: 'Journal for 15 minutes', smaller: 'Write 3 lines', minutes: 15 },
      { title: 'Go outside for an hour', smaller: 'Go outside for 10 minutes', minutes: 60 },
    ],
    habits: [{ title: 'Journal', schedule: { kind: 'daily' } }],
    minimum: ['Write 3 lines in my journal', 'Go outside for 10 minutes'],
    keywords: ['calm', 'stress', 'mind', 'mood', 'anxiety', 'phone', 'screen', 'journal', 'meditat', 'mental', 'happy'],
  },
  {
    id: 'sleep',
    label: 'Sleep & routine',
    hint: 'Better sleep, steady days',
    goals: ['Fix my sleep', 'Wake up earlier', 'Have a steady morning routine'],
    ideas: [
      { title: 'In bed by 23:00', smaller: 'Screens off 30 minutes before bed', minutes: 30 },
      { title: 'Do my full morning routine', smaller: 'Make my bed and drink water', minutes: 30 },
      { title: 'Plan tomorrow tonight', smaller: 'Write tomorrow’s main thing', minutes: 10 },
    ],
    habits: [{ title: 'In bed on time', schedule: { kind: 'daily' } }],
    minimum: ['Make my bed', 'Drink a glass of water'],
    keywords: ['sleep', 'bed', 'wake', 'morning', 'routine', 'tired', 'early'],
  },
  {
    id: 'social',
    label: 'People',
    hint: 'Friends, family, confidence',
    goals: ['See my friends more', 'Be more confident', 'Call my family more'],
    ideas: [
      { title: 'Meet up with a friend', smaller: 'Message a friend', minutes: 90 },
      { title: 'Call my family', smaller: 'Send a voice message', minutes: 30 },
      { title: 'Go to one event', smaller: 'Find one event to go to', minutes: 120 },
    ],
    habits: [{ title: 'Reach out to someone', schedule: { kind: 'weekly', times: 3 } }],
    minimum: ['Message one person'],
    keywords: ['friend', 'family', 'social', 'people', 'confiden', 'date', 'call', 'meet'],
  },
];

export function areaById(id: AreaId | undefined): Area | undefined {
  return id ? AREAS.find((a) => a.id === id) : undefined;
}

/** The goal's area: set explicitly, else guessed from words in its name. */
export function areaOf(goal: Pick<Mission, 'area' | 'title'>): Area | undefined {
  if (goal.area) return areaById(goal.area);
  const words = goal.title.toLowerCase();
  let best: { area: Area; hits: number } | undefined;
  for (const area of AREAS) {
    const hits = area.keywords.filter((k) => words.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { area, hits };
  }
  return best?.area;
}
