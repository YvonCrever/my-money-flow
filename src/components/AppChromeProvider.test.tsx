import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useLayoutEffect, useState } from 'react';

import { AppChromeDrawer, AppChromeProvider, useAppPageChrome } from '@/components/AppChromeProvider';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';

interface DrawerHarnessProps {
  ownerId: string;
  pageAnimationOwnerId: string | null;
  pageAnimationToken: number;
  delayedPortalMount?: boolean;
  extraMutationDelayMs?: number | null;
}

function DrawerPortalContent({
  ownerId,
  delayedPortalMount = false,
  extraMutationDelayMs = null,
}: Pick<DrawerHarnessProps, 'ownerId' | 'delayedPortalMount' | 'extraMutationDelayMs'>) {
  const { leadingTarget } = useAppPageChrome(ownerId);
  const [itemCount, setItemCount] = useState(delayedPortalMount ? 0 : 2);

  useLayoutEffect(() => {
    if (!delayedPortalMount) {
      setItemCount(2);
      return undefined;
    }

    let isCancelled = false;
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      if (isCancelled) return;

      setItemCount(1);
      secondFrameId = window.requestAnimationFrame(() => {
        if (isCancelled) return;
        setItemCount(2);
      });
    });

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [delayedPortalMount]);

  useEffect(() => {
    if (extraMutationDelayMs === null) return undefined;

    const timeoutId = window.setTimeout(() => {
      setItemCount((currentCount) => currentCount + 1);
    }, extraMutationDelayMs);

    return () => window.clearTimeout(timeoutId);
  }, [extraMutationDelayMs]);

  return (
    <ToolbarPortal target={leadingTarget}>
      {Array.from({ length: itemCount }, (_, index) => (
        <button key={index} type="button">
          {`Item ${index + 1}`}
        </button>
      ))}
    </ToolbarPortal>
  );
}

function DrawerHarness({
  ownerId,
  pageAnimationOwnerId,
  pageAnimationToken,
  delayedPortalMount = false,
  extraMutationDelayMs = null,
}: DrawerHarnessProps) {
  return (
    <AppChromeProvider>
      <AppChromeDrawer
        pageAnimationOwnerId={pageAnimationOwnerId}
        pageAnimationToken={pageAnimationToken}
      />
      <DrawerPortalContent
        ownerId={ownerId}
        delayedPortalMount={delayedPortalMount}
        extraMutationDelayMs={extraMutationDelayMs}
      />
    </AppChromeProvider>
  );
}

let pendingAnimationFrames = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 0;

async function flushAnimationFrames(frameCount = 1) {
  for (let currentFrame = 0; currentFrame < frameCount; currentFrame += 1) {
    await act(async () => {
      const callbacks = [...pendingAnimationFrames.values()];
      pendingAnimationFrames.clear();

      callbacks.forEach((callback) => {
        callback(performance.now());
      });

      await Promise.resolve();
    });
  }
}

async function flushUntil(predicate: () => boolean, frameLimit = 12) {
  for (let currentFrame = 0; currentFrame < frameLimit; currentFrame += 1) {
    if (predicate()) {
      return;
    }

    await flushAnimationFrames(1);
  }

  if (!predicate()) {
    throw new Error('condition was not reached within the expected animation frames');
  }
}

describe('AppChromeDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pendingAnimationFrames = new Map();
    nextAnimationFrameId = 0;

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      nextAnimationFrameId += 1;
      pendingAnimationFrames.set(nextAnimationFrameId, callback);
      return nextAnimationFrameId;
    });

    vi.stubGlobal('cancelAnimationFrame', (frameId: number) => {
      pendingAnimationFrames.delete(frameId);
    });
  });

  afterEach(() => {
    pendingAnimationFrames.clear();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('waits for portal content to stabilize, then runs only one sequence for the same token', async () => {
    const { container, rerender } = render(
      <DrawerHarness
        ownerId="finance"
        pageAnimationOwnerId="finance"
        pageAnimationToken={1}
        delayedPortalMount
      />,
    );

    const shell = container.querySelector('.app-masthead-drawer-shell') as HTMLDivElement | null;
    expect(shell).not.toBeNull();
    if (!shell) {
      throw new Error('drawer shell not mounted');
    }

    await flushUntil(() => shell.getAttribute('data-sequence-status') === 'arming');
    await flushUntil(() => shell.getAttribute('data-sequence-status') === 'running');

    const phaseAfterFirstRun = shell.getAttribute('data-sequence-phase');
    expect(phaseAfterFirstRun).toBe('b');

    rerender(
      <DrawerHarness
        ownerId="finance"
        pageAnimationOwnerId="finance"
        pageAnimationToken={1}
        delayedPortalMount
        extraMutationDelayMs={10}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(10);
      await Promise.resolve();
    });

    await flushAnimationFrames(4);

    expect(shell).toHaveAttribute('data-sequence-phase', phaseAfterFirstRun);

    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(shell).toHaveAttribute('data-sequence-status', 'idle');

    expect(shell).toHaveAttribute('data-sequence-phase', phaseAfterFirstRun);
  });

});
