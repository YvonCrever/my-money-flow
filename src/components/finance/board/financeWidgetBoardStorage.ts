import {
  emptyLayouts,
  type FinanceWidgetPersistedLayouts,
  type Layouts,
} from '@/components/finance/board/financeWidgetBoardLayout';

export const FINANCE_WIDGET_LAYOUT_PREFIX = 'finance-widget-layout:';
export const FINANCE_WIDGET_HIDDEN_PREFIX = 'finance-widget-hidden:';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStorageValue<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(key: string, value: unknown) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeLayouts(value: unknown): Layouts {
  const source = typeof value === 'object' && value ? value as Partial<Layouts> : {};
  return {
    lg: Array.isArray(source.lg) ? source.lg : [],
    md: Array.isArray(source.md) ? source.md : [],
    sm: Array.isArray(source.sm) ? source.sm : [],
  };
}

export function readStoredLayouts(key: string): FinanceWidgetPersistedLayouts | null {
  const stored = readStorageValue<unknown>(key, null);
  if (!stored || typeof stored !== 'object') return null;

  const source = stored as Record<string, unknown>;
  if ('right' in source || 'bottom' in source) {
    return {
      right: sanitizeLayouts(source.right),
      bottom: sanitizeLayouts(source.bottom),
    };
  }

  return {
    right: emptyLayouts(),
    bottom: sanitizeLayouts(stored),
  };
}
