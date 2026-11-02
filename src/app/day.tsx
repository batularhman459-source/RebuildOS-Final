import { createContext, useContext, type ReactNode } from 'react';
import type { DayKey } from '../core/types';
import { useToday } from '../data/useToday';

const DayContext = createContext<DayKey | null>(null);

/** Provides the current logical day app-wide and runs the overnight rule when it changes. */
export function DayProvider({ children }: { children: ReactNode }) {
  const day = useToday();
  return <DayContext.Provider value={day}>{children}</DayContext.Provider>;
}

export function useDay(): DayKey {
  const day = useContext(DayContext);
  if (!day) throw new Error('useDay must be used inside DayProvider');
  return day;
}
