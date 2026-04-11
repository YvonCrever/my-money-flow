export type AppThemeId =
  | 'theme-1'
  | 'theme-2'
  | 'theme-3'
  | 'theme-4'
  | 'theme-5'
  | 'theme-6'
  | 'theme-7'
  | 'theme-8'
  | 'theme-9'
  | 'theme-10'
  | 'theme-11';

export interface AppThemeDefinition {
  id: AppThemeId;
  order: number;
  name: string;
  shortLabel: string;
  description: string;
  preview: string;
  mode: 'dark' | 'light';
}

export const APP_THEME_STORAGE_KEY = 'ycaro_app_theme';
export const DEFAULT_APP_THEME_ID: AppThemeId = 'theme-1';

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: 'theme-1',
    order: 1,
    name: 'Prisme Nocturne',
    shortLabel: 'Actuel',
    description: 'Le thème actuel, nocturne, néon et cinématographique.',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-2',
    order: 2,
    name: 'Aurore de Verre',
    shortLabel: 'Glass',
    description: 'Pastels translucides, halos diffus et surfaces givrées.',
    preview: 'linear-gradient(135deg, #8dd3ff 0%, #f7b4ff 50%, #fce7f3 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-3',
    order: 3,
    name: 'Béton Pop',
    shortLabel: 'Brutalist',
    description: 'Contours épais, contrastes francs et énergie néo-brutaliste.',
    preview: 'linear-gradient(135deg, #ff8a00 0%, #ffe66d 48%, #1f2937 48%, #1f2937 100%)',
    mode: 'light',
  },
  {
    id: 'theme-4',
    order: 4,
    name: 'Monochrome Editorial',
    shortLabel: 'Swiss',
    description: 'Grille éditoriale, noir et blanc, accent rouge signalétique.',
    preview: 'linear-gradient(135deg, #fafaf9 0%, #fafaf9 62%, #111827 62%, #ef4444 100%)',
    mode: 'light',
  },
  {
    id: 'theme-5',
    order: 5,
    name: 'Velours Luxe',
    shortLabel: 'Luxury',
    description: 'Noir velours, or rosé, serif haut de gamme et détails précieux.',
    preview: 'linear-gradient(135deg, #2c1428 0%, #7c5c48 46%, #f3d7bf 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-6',
    order: 6,
    name: 'Argile Douce',
    shortLabel: 'Soft UI',
    description: 'Reliefs souples, tons crème et sensation organique.',
    preview: 'linear-gradient(135deg, #f7efe7 0%, #f5cbb1 55%, #d8906d 100%)',
    mode: 'light',
  },
  {
    id: 'theme-7',
    order: 7,
    name: 'Signal CRT',
    shortLabel: 'Terminal',
    description: 'Écran cathodique, scanlines, vert phosphore et contrôle précis.',
    preview: 'linear-gradient(135deg, #06130c 0%, #0f3d2e 50%, #6cff8f 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-8',
    order: 8,
    name: 'Atelier Solaire',
    shortLabel: 'Bauhaus',
    description: 'Papier chaud, formes franches et palette solaire moderniste.',
    preview: 'linear-gradient(135deg, #fff1c2 0%, #ff7a59 48%, #0ea5e9 100%)',
    mode: 'light',
  },
  {
    id: 'theme-9',
    order: 9,
    name: 'Marée Data',
    shortLabel: 'Fintech',
    description: 'Bleus profonds, structure nette et ambiance cockpit.',
    preview: 'linear-gradient(135deg, #07152c 0%, #0f3d6e 50%, #7ee7ff 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-10',
    order: 10,
    name: 'Orbit Chrome',
    shortLabel: 'Y2K',
    description: 'Chrome candy, saturation forte et accent arcade futuriste.',
    preview: 'linear-gradient(135deg, #1f1147 0%, #ff4fd8 50%, #66e7ff 100%)',
    mode: 'dark',
  },
  {
    id: 'theme-11',
    order: 11,
    name: 'Papier Brut',
    shortLabel: 'Craft',
    description: 'Matières chaudes, encres profondes et finition atelier.',
    preview: 'linear-gradient(135deg, #f1e5cf 0%, #d6a67a 52%, #5f3f2c 100%)',
    mode: 'light',
  },
];

export function normalizeAppThemeId(value?: string | null): AppThemeId {
  const match = APP_THEMES.find((theme) => theme.id === value);
  return match?.id ?? DEFAULT_APP_THEME_ID;
}

export function getAppTheme(themeId?: string | null) {
  const normalizedId = normalizeAppThemeId(themeId);
  return APP_THEMES.find((theme) => theme.id === normalizedId) ?? APP_THEMES[0];
}

export function readStoredAppThemeId() {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_THEME_ID;
  }

  try {
    return normalizeAppThemeId(window.localStorage.getItem(APP_THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_APP_THEME_ID;
  }
}

export function persistAppThemeId(themeId: AppThemeId) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore storage write failures so theme persistence never blocks app rendering.
  }
}

export function applyAppThemeToDocument(
  themeId: AppThemeId,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
) {
  if (!doc) {
    return;
  }

  const theme = getAppTheme(themeId);
  const root = doc.documentElement;
  const { body } = doc;
  const isDarkTheme = theme.mode === 'dark';

  root.dataset.appTheme = theme.id;
  root.style.colorScheme = theme.mode;
  root.classList.toggle('dark', isDarkTheme);
  delete root.dataset.themeReloading;

  if (body) {
    body.dataset.appTheme = theme.id;
    body.style.colorScheme = theme.mode;
    body.classList.toggle('dark', isDarkTheme);
  }
}
