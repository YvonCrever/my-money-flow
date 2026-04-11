const activeTimings = new Map<string, number>();
let firstVisibleRenderMarked = false;

function isDevTimingEnabled() {
  return import.meta.env.DEV;
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function formatDuration(durationMs: number) {
  return durationMs >= 100 ? `${durationMs.toFixed(0)}ms` : `${durationMs.toFixed(1)}ms`;
}

export function startDevTiming(label: string) {
  if (!isDevTimingEnabled()) {
    return () => {};
  }

  activeTimings.set(label, getNow());

  return () => {
    endDevTiming(label);
  };
}

export function endDevTiming(label: string) {
  if (!isDevTimingEnabled()) {
    return;
  }

  const startedAt = activeTimings.get(label);
  if (typeof startedAt !== 'number') {
    return;
  }

  activeTimings.delete(label);
  console.info(`[dev-timing] ${label}: ${formatDuration(getNow() - startedAt)}`);
}

export async function timeDevAsync<T>(label: string, runner: () => Promise<T> | T): Promise<T> {
  const stopTiming = startDevTiming(label);

  try {
    return await runner();
  } finally {
    stopTiming();
  }
}

export function markFirstVisibleRender() {
  if (!isDevTimingEnabled() || firstVisibleRenderMarked) {
    return;
  }

  firstVisibleRenderMarked = true;
  endDevTiming('first-visible-render');
}
