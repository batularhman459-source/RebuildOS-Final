import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ActionSheet } from '../components/ActionSheet';
import { AddSheet } from '../components/AddSheet';
import { NewMissionSheet } from '../components/NewMissionSheet';

interface SheetsApi {
  /** Open quick add. Optionally pre-select a Mission (e.g. from a Mission's page). */
  openAdd: (destination: 'today' | 'later', missionId?: string) => void;
  openAction: (id: string) => void;
  openNewMission: () => void;
}

const SheetsContext = createContext<SheetsApi | null>(null);

/** App-wide sheets (Add, Edit action, New Mission), so any screen or the dock can open them. */
export function SheetsProvider({ children }: { children: ReactNode }) {
  const [add, setAdd] = useState<{ destination: 'today' | 'later'; missionId?: string } | null>(null);
  const [actionId, setActionId] = useState<string | undefined>();
  const [newMission, setNewMission] = useState(false);

  const openAdd = useCallback((destination: 'today' | 'later', missionId?: string) => setAdd({ destination, missionId }), []);
  const openAction = useCallback((id: string) => setActionId(id), []);
  const openNewMission = useCallback(() => setNewMission(true), []);
  const closeAdd = useCallback(() => setAdd(null), []);
  const closeAction = useCallback(() => setActionId(undefined), []);
  const closeNewMission = useCallback(() => setNewMission(false), []);
  const api = useMemo(() => ({ openAdd, openAction, openNewMission }), [openAdd, openAction, openNewMission]);

  return (
    <SheetsContext.Provider value={api}>
      {children}
      <AddSheet
        open={add !== null}
        onClose={closeAdd}
        defaultDestination={add?.destination ?? 'today'}
        defaultMissionId={add?.missionId}
      />
      <ActionSheet actionId={actionId} onClose={closeAction} />
      <NewMissionSheet open={newMission} onClose={closeNewMission} />
    </SheetsContext.Provider>
  );
}

export function useSheets(): SheetsApi {
  const ctx = useContext(SheetsContext);
  if (!ctx) throw new Error('useSheets must be used inside SheetsProvider');
  return ctx;
}
