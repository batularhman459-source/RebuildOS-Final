import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActionSheet } from '../components/ActionSheet';
import { AddSheet } from '../components/AddSheet';

interface SheetsApi {
  openAdd: (destination: 'today' | 'later') => void;
  openAction: (id: string) => void;
}

const SheetsContext = createContext<SheetsApi | null>(null);

/** App-wide sheets (Add, Edit action), so any screen or the dock can open them. */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [addFor, setAddFor] = useState<'today' | 'later' | null>(null);
  const [actionId, setActionId] = useState<string | undefined>();

  const openAdd = useCallback((d: 'today' | 'later') => setAddFor(d), []);
  const openAction = useCallback((id: string) => setActionId(id), []);
  const closeAdd = useCallback(() => setAddFor(null), []);
  const closeAction = useCallback(() => setActionId(undefined), []);
  const api = useMemo(() => ({ openAdd, openAction }), [openAdd, openAction]);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      <AddSheet open={addFor !== null} onClose={closeAdd} defaultDestination={addFor ?? 'today'} />
      <ActionSheet actionId={actionId} onClose={closeAction} />
    </SheetsContext.Provider>
  );
}

export function useSheets(): SheetsApi {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside SheetsProvider');
  return ctx;
}
