import { describe, expect, it, vi } from 'vitest';

import {
  getAppErrorDescription,
  isChunkLoadError,
  isIgnorableRuntimeError,
  loadLazyImportWithRetry,
  normalizeAppError,
} from '@/lib/appRuntime';

describe('app runtime helpers', () => {
  it('normalizes unknown errors into Error instances', () => {
    expect(normalizeAppError('boom').message).toBe('boom');
    expect(normalizeAppError(null).message).toContain('erreur');
  });

  it('detects chunk load errors from common browser messages', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 8 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Regular runtime error'))).toBe(false);
  });

  it('retries one time on chunk load errors before succeeding', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('Loading chunk 4 failed'))
      .mockResolvedValueOnce({ default: 'ok' });

    await expect(loadLazyImportWithRetry(loader, 'TestPage')).resolves.toEqual({ default: 'ok' });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('returns a storage-oriented message for IndexedDB boot failures', () => {
    expect(getAppErrorDescription(new Error('Failed to open IndexedDB'))).toContain('stockage local');
  });

  it('ignores known non-fatal ResizeObserver browser errors', () => {
    expect(isIgnorableRuntimeError(new Error('ResizeObserver loop limit exceeded'))).toBe(true);
    expect(isIgnorableRuntimeError(new Error('Regular runtime error'))).toBe(false);
  });
});
