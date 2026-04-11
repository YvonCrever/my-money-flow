/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface AppChromeDrawerState {
  ownerId: string | null;
  isOpen: boolean;
}

export interface AppPageOptionsItem {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

export interface AppPageOptionsSection {
  ownerId: string;
  title: string;
  items: AppPageOptionsItem[];
}

interface AppChromeContextValue {
  actionsTarget: HTMLDivElement | null;
  inlineToolsTarget: HTMLDivElement | null;
  leadingTarget: HTMLDivElement | null;
  drawerState: AppChromeDrawerState;
  pageOptionsSection: AppPageOptionsSection | null;
  setActionsTarget: (node: HTMLDivElement | null) => void;
  setInlineToolsTarget: (node: HTMLDivElement | null) => void;
  setLeadingTarget: (node: HTMLDivElement | null) => void;
  activateDrawer: (ownerId: string) => void;
  deactivateDrawer: (ownerId: string) => void;
  setPageOptionsSection: (section: AppPageOptionsSection | null) => void;
}

const DEFAULT_DRAWER_STATE: AppChromeDrawerState = {
  ownerId: null,
  isOpen: false,
};

const AppChromeContext = createContext<AppChromeContextValue | null>(null);

export function AppChromeProvider({ children }: { children: ReactNode }) {
  const [leadingTarget, setLeadingTarget] = useState<HTMLDivElement | null>(null);
  const [inlineToolsTarget, setInlineToolsTarget] = useState<HTMLDivElement | null>(null);
  const [actionsTarget, setActionsTarget] = useState<HTMLDivElement | null>(null);
  const [drawerState, setDrawerState] = useState<AppChromeDrawerState>(DEFAULT_DRAWER_STATE);
  const [pageOptionsSection, setPageOptionsSection] = useState<AppPageOptionsSection | null>(null);

  const activateDrawer = useCallback((ownerId: string) => {
    setDrawerState((previous) => {
      if (previous.isOpen && previous.ownerId === ownerId) {
        return previous;
      }

      return {
        ownerId,
        isOpen: true,
      };
    });
  }, []);

  const deactivateDrawer = useCallback((ownerId: string) => {
    setDrawerState((previous) => {
      if (!previous.isOpen || previous.ownerId !== ownerId) {
        return previous;
      }

      return {
        ownerId: null,
        isOpen: false,
      };
    });
  }, []);

  const value = useMemo<AppChromeContextValue>(() => ({
    actionsTarget,
    inlineToolsTarget,
    leadingTarget,
    drawerState,
    pageOptionsSection,
    setActionsTarget,
    setInlineToolsTarget,
    setLeadingTarget,
    activateDrawer,
    deactivateDrawer,
    setPageOptionsSection,
  }), [
    actionsTarget,
    inlineToolsTarget,
    leadingTarget,
    drawerState,
    pageOptionsSection,
    activateDrawer,
    deactivateDrawer,
  ]);

  return (
    <AppChromeContext.Provider value={value}>
      {children}
    </AppChromeContext.Provider>
  );
}

function useAppChromeContext() {
  const context = useContext(AppChromeContext);

  if (!context) {
    throw new Error('useAppChromeContext must be used inside AppChromeProvider.');
  }

  return context;
}

export function useAppChrome() {
  const context = useAppChromeContext();

  return {
    drawerState: context.drawerState,
    pageOptionsSection: context.pageOptionsSection,
  };
}

export function useAppPageChrome(ownerId: string, enabled = true) {
  const context = useAppChromeContext();
  const { activateDrawer, deactivateDrawer } = context;

  useLayoutEffect(() => {
    if (!enabled) return undefined;

    activateDrawer(ownerId);

    return () => {
      deactivateDrawer(ownerId);
    };
  }, [activateDrawer, deactivateDrawer, enabled, ownerId]);

  return {
    actionsTarget: context.actionsTarget,
    inlineToolsTarget: context.inlineToolsTarget,
    leadingTarget: context.leadingTarget,
  };
}

export function useAppPageOptions(
  ownerId: string,
  section: Omit<AppPageOptionsSection, 'ownerId'> | null,
  enabled = true,
) {
  const { setPageOptionsSection } = useAppChromeContext();

  useLayoutEffect(() => {
    if (!enabled || !section || section.items.length === 0) {
      setPageOptionsSection(null);
      return undefined;
    }

    setPageOptionsSection({
      ownerId,
      title: section.title,
      items: section.items,
    });

    return () => {
      setPageOptionsSection(null);
    };
  }, [enabled, ownerId, section, setPageOptionsSection]);
}

function collectDrawerItems(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>('button, [role="tab"], [role="button"], a[href]'))
    .filter((element) => element.closest('.app-masthead-drawer-shell') === root)
    .filter((element) => element.dataset.mastheadPlaceholder !== 'true')
    .filter((element) => !element.hasAttribute('disabled') || element.getClientRects().length > 0);
}

export function AppChromeDrawer({
  pageAnimationOwnerId = null,
  pageAnimationToken = 0,
}: {
  pageAnimationOwnerId?: string | null;
  pageAnimationToken?: number;
}) {
  const {
    drawerState,
    setActionsTarget,
    setInlineToolsTarget,
    setLeadingTarget,
  } = useAppChromeContext();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [sequencePhase, setSequencePhase] = useState<'a' | 'b'>('a');
  const [sequenceStatus, setSequenceStatus] = useState<'idle' | 'arming' | 'running'>('idle');
  const sequenceStatusRef = useRef<'idle' | 'arming' | 'running'>('idle');
  const animationTimeoutRef = useRef<number | null>(null);
  const readinessFrameRef = useRef<number | null>(null);
  const readinessStableFramesRef = useRef(0);
  const readinessObservedItemCountRef = useRef(-1);
  const lastAnimatedTokenRef = useRef(0);
  const pendingAnimationTokenRef = useRef(0);

  const updateSequenceStatus = useCallback((nextStatus: 'idle' | 'arming' | 'running') => {
    sequenceStatusRef.current = nextStatus;
    setSequenceStatus((previousStatus) => (previousStatus === nextStatus ? previousStatus : nextStatus));
  }, []);

  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  const cancelReadinessCheck = useCallback(() => {
    if (readinessFrameRef.current !== null) {
      window.cancelAnimationFrame(readinessFrameRef.current);
      readinessFrameRef.current = null;
    }

    readinessObservedItemCountRef.current = -1;
    readinessStableFramesRef.current = 0;
  }, []);

  const syncItems = useCallback(() => {
    const items = collectDrawerItems(shellRef.current);

    items.forEach((item, index) => {
      item.classList.add('app-masthead-item', 'app-masthead-drawer-control');
      item.style.setProperty('--app-masthead-item-index', String(index));
      item.style.setProperty('--app-masthead-item-count', String(items.length));
    });

    return items.length;
  }, []);

  useLayoutEffect(() => {
    syncItems();
  }, [drawerState.isOpen, drawerState.ownerId, syncItems]);

  const startPendingSequence = useCallback(() => {
    if (!drawerState.isOpen) return;
    if (!pageAnimationOwnerId || drawerState.ownerId !== pageAnimationOwnerId) return;

    const nextToken = pendingAnimationTokenRef.current;

    if (nextToken === 0 || nextToken === lastAnimatedTokenRef.current) {
      return;
    }

    const itemCount = syncItems();

    if (itemCount === 0) {
      return;
    }

    cancelReadinessCheck();
    pendingAnimationTokenRef.current = 0;
    lastAnimatedTokenRef.current = nextToken;
    setSequencePhase((previous) => (previous === 'a' ? 'b' : 'a'));
    updateSequenceStatus('running');
    clearAnimationTimeout();

    animationTimeoutRef.current = window.setTimeout(() => {
      updateSequenceStatus('idle');
      animationTimeoutRef.current = null;
    }, 860 + itemCount * 74);
  }, [
    cancelReadinessCheck,
    clearAnimationTimeout,
    drawerState.isOpen,
    drawerState.ownerId,
    pageAnimationOwnerId,
    syncItems,
    updateSequenceStatus,
  ]);

  const schedulePendingSequence = useCallback(() => {
    if (!drawerState.isOpen) return;
    if (!pageAnimationOwnerId || drawerState.ownerId !== pageAnimationOwnerId) return;

    const nextToken = pendingAnimationTokenRef.current;

    if (nextToken === 0 || nextToken === lastAnimatedTokenRef.current) {
      return;
    }

    if (sequenceStatusRef.current === 'running') {
      return;
    }

    updateSequenceStatus('arming');
    cancelReadinessCheck();

    const measureReadiness = () => {
      readinessFrameRef.current = null;

      if (!drawerState.isOpen || !pageAnimationOwnerId || drawerState.ownerId !== pageAnimationOwnerId) {
        updateSequenceStatus('idle');
        return;
      }

      const currentToken = pendingAnimationTokenRef.current;

      if (currentToken === 0 || currentToken === lastAnimatedTokenRef.current) {
        updateSequenceStatus('idle');
        return;
      }

      const itemCount = syncItems();

      if (itemCount > 0 && itemCount === readinessObservedItemCountRef.current) {
        readinessStableFramesRef.current += 1;
      } else {
        readinessObservedItemCountRef.current = itemCount;
        readinessStableFramesRef.current = 0;
      }

      if (itemCount > 0 && readinessStableFramesRef.current >= 1) {
        startPendingSequence();
        return;
      }

      readinessFrameRef.current = window.requestAnimationFrame(measureReadiness);
    };

    readinessFrameRef.current = window.requestAnimationFrame(measureReadiness);
  }, [
    cancelReadinessCheck,
    drawerState.isOpen,
    drawerState.ownerId,
    pageAnimationOwnerId,
    startPendingSequence,
    syncItems,
    updateSequenceStatus,
  ]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof MutationObserver === 'undefined') return undefined;

    let frameId = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        syncItems();

        if (sequenceStatusRef.current === 'arming') {
          schedulePendingSequence();
        }
      });
    });

    observer.observe(shell, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [schedulePendingSequence, syncItems]);

  useLayoutEffect(() => {
    if (!drawerState.isOpen || !pageAnimationOwnerId || drawerState.ownerId !== pageAnimationOwnerId) {
      cancelReadinessCheck();
      clearAnimationTimeout();
      pendingAnimationTokenRef.current = 0;
      updateSequenceStatus('idle');
      return;
    }

    if (pageAnimationToken === 0 || pageAnimationToken <= lastAnimatedTokenRef.current) {
      if (sequenceStatusRef.current === 'arming') {
        cancelReadinessCheck();
        updateSequenceStatus('idle');
      }

      return;
    }

    pendingAnimationTokenRef.current = pageAnimationToken;
    schedulePendingSequence();
  }, [
    cancelReadinessCheck,
    clearAnimationTimeout,
    drawerState.isOpen,
    drawerState.ownerId,
    pageAnimationOwnerId,
    pageAnimationToken,
    schedulePendingSequence,
    updateSequenceStatus,
  ]);

  useLayoutEffect(() => () => {
    cancelReadinessCheck();
    clearAnimationTimeout();
  }, [cancelReadinessCheck, clearAnimationTimeout]);

  return (
    <div
      ref={shellRef}
      className="app-masthead-drawer-shell"
      data-sequence-active={sequenceStatus === 'running' ? 'true' : 'false'}
      data-sequence-phase={sequencePhase}
      data-sequence-status={sequenceStatus}
      data-owner={drawerState.ownerId ?? undefined}
      aria-hidden={!drawerState.isOpen}
    >
      <div className="app-masthead-drawer-panel">
        <div className="app-masthead-drawer-leading">
          <div
            ref={setLeadingTarget}
            className="app-masthead-drawer-slot app-masthead-drawer-slot--leading"
          />
          <div
            ref={setInlineToolsTarget}
            className="app-masthead-drawer-slot app-masthead-drawer-slot--inline"
          />
        </div>

        <div
          ref={setActionsTarget}
          className="app-masthead-drawer-slot app-masthead-drawer-slot--actions"
        />
      </div>
    </div>
  );
}
