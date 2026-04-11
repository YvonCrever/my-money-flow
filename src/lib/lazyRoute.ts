import { lazy, type ComponentType } from 'react';

import { loadLazyImportWithRetry } from '@/lib/appRuntime';

export function lazyRoute<T extends ComponentType>(
  loader: () => Promise<{ default: T }>,
  label: string,
) {
  return lazy(() => loadLazyImportWithRetry(loader, label));
}
