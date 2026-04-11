/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_MASTHEAD_MOTIONS,
  type AppMastheadMotionDefinition,
  type AppMastheadMotionId,
  applyAppMastheadMotionToDocument,
  getAppMastheadMotion,
  normalizeAppMastheadMotionId,
  persistAppMastheadMotionId,
  readStoredAppMastheadMotionId,
} from '@/lib/appMastheadMotion';

interface AppMastheadMotionContextValue {
  motions: AppMastheadMotionDefinition[];
  activeMotion: AppMastheadMotionDefinition;
  activeMotionId: AppMastheadMotionId;
  setActiveMotionId: (motionId: AppMastheadMotionId) => void;
}

const AppMastheadMotionContext = createContext<AppMastheadMotionContextValue | null>(null);

export function AppMastheadMotionProvider({ children }: { children: ReactNode }) {
  const [activeMotionId, setActiveMotionId] = useState<AppMastheadMotionId>(() => readStoredAppMastheadMotionId());

  useEffect(() => {
    const normalizedMotionId = normalizeAppMastheadMotionId(activeMotionId);
    persistAppMastheadMotionId(normalizedMotionId);
    applyAppMastheadMotionToDocument(normalizedMotionId);
  }, [activeMotionId]);

  const value = useMemo<AppMastheadMotionContextValue>(() => ({
    motions: APP_MASTHEAD_MOTIONS,
    activeMotion: getAppMastheadMotion(activeMotionId),
    activeMotionId,
    setActiveMotionId: (motionId) => setActiveMotionId(normalizeAppMastheadMotionId(motionId)),
  }), [activeMotionId]);

  return (
    <AppMastheadMotionContext.Provider value={value}>
      {children}
    </AppMastheadMotionContext.Provider>
  );
}

export function useAppMastheadMotion() {
  const context = useContext(AppMastheadMotionContext);

  if (!context) {
    throw new Error('useAppMastheadMotion must be used inside AppMastheadMotionProvider.');
  }

  return context;
}
