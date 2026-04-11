import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  APP_THEMES,
  type AppThemeDefinition,
  type AppThemeId,
  applyAppThemeToDocument,
  getAppTheme,
  normalizeAppThemeId,
  persistAppThemeId,
  readStoredAppThemeId,
} from '@/lib/appThemes';

interface AppThemeContextValue {
  themes: AppThemeDefinition[];
  activeTheme: AppThemeDefinition;
  activeThemeId: AppThemeId;
  changeTheme: (themeId: AppThemeId) => boolean;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [activeThemeId, setActiveThemeId] = useState<AppThemeId>(() => readStoredAppThemeId());

  useEffect(() => {
    persistAppThemeId(activeThemeId);
    applyAppThemeToDocument(activeThemeId);
  }, [activeThemeId]);

  const changeTheme = useCallback((themeId: AppThemeId) => {
    const nextThemeId = normalizeAppThemeId(themeId);
    if (nextThemeId === activeThemeId) {
      return false;
    }

    persistAppThemeId(nextThemeId);
    applyAppThemeToDocument(nextThemeId);
    setActiveThemeId(nextThemeId);

    return true;
  }, [activeThemeId]);

  const value = useMemo<AppThemeContextValue>(() => ({
    themes: APP_THEMES,
    activeTheme: getAppTheme(activeThemeId),
    activeThemeId,
    changeTheme,
  }), [activeThemeId, changeTheme]);

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider.');
  }

  return context;
}
