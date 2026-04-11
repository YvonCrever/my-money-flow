import { useEffect, useMemo, useRef, useState } from 'react';
import { Responsive } from 'react-grid-layout/legacy';
import { RotateCcw, X } from 'lucide-react';

import {
  FinanceMetricWidget,
  FinanceWidgetShell,
} from '@/components/finance/board/FinanceWidgetChrome';
import {
  buildDefaultLayouts,
  colsToPx,
  FINANCE_WIDGET_ANCHOR_MAX_COLS,
  FINANCE_WIDGET_BREAKPOINTS,
  FINANCE_WIDGET_COLS,
  FINANCE_WIDGET_RIGHT_MIN_COLS,
  FINANCE_WIDGET_STAGE_GAP,
  FINANCE_WIDGET_CONTAINER_PADDING,
  FINANCE_WIDGET_MARGIN,
  FINANCE_WIDGET_ROW_HEIGHT,
  mergeLayouts,
  pxToCols,
  pxToRows,
  resolveBreakpoint,
  type FinanceWidgetAnchorCols,
  type FinanceWidgetBoardProps,
  type FinanceWidgetBreakpoint,
  type FinanceWidgetDefinition,
  type FinanceWidgetPersistedLayouts,
  type Layouts,
} from '@/components/finance/board/financeWidgetBoardLayout';
import {
  FINANCE_WIDGET_HIDDEN_PREFIX,
  FINANCE_WIDGET_LAYOUT_PREFIX,
  readStoredLayouts,
  readStorageValue,
  writeStorageValue,
} from '@/components/finance/board/financeWidgetBoardStorage';
import { cn } from '@/lib/utils';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = Responsive;

export type { FinanceWidgetDefinition } from '@/components/finance/board/financeWidgetBoardLayout';
export { FinanceWidgetShell, FinanceMetricWidget };

export function FinanceWidgetBoard({
  storageScope,
  widgets,
  emptyMessage,
  anchor,
}: FinanceWidgetBoardProps) {
  const hiddenStorageKey = `${FINANCE_WIDGET_HIDDEN_PREFIX}${storageScope}`;
  const layoutStorageKey = `${FINANCE_WIDGET_LAYOUT_PREFIX}${storageScope}`;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const anchorMeasureRef = useRef<HTMLDivElement | null>(null);
  const listZoneRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState<number>(0);
  const [anchorWidth, setAnchorWidth] = useState<number>(0);
  const [listZoneHeight, setListZoneHeight] = useState<number>(0);
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => readStorageValue<string[]>(hiddenStorageKey, []));

  useEffect(() => {
    if (!stageRef.current || typeof ResizeObserver === 'undefined') return;

    const element = stageRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setStageWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!anchorMeasureRef.current || typeof ResizeObserver === 'undefined') return;

    const element = anchorMeasureRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setAnchorWidth(Math.ceil(Math.max(element.scrollWidth, entry.contentRect.width)));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [anchor?.id]);

  useEffect(() => {
    if (!listZoneRef.current || typeof ResizeObserver === 'undefined') return;

    const element = listZoneRef.current;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setListZoneHeight(Math.ceil(entry.contentRect.height));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [anchor?.id]);

  const anchorRows = useMemo(
    () => {
      if (!anchor) return 0;
      return listZoneHeight > 0 ? pxToRows(listZoneHeight, anchor.minRows ?? 14) : (anchor.minRows ?? 14);
    },
    [anchor, listZoneHeight],
  );

  const activeBreakpoint = useMemo(
    () => resolveBreakpoint(stageWidth || (typeof window !== 'undefined' ? window.innerWidth : FINANCE_WIDGET_BREAKPOINTS.lg)),
    [stageWidth],
  );

  const anchorCols = useMemo<FinanceWidgetAnchorCols | undefined>(() => {
    if (!anchor) return undefined;

    const defaults: FinanceWidgetAnchorCols = {
      lg: Math.min(FINANCE_WIDGET_COLS.lg, Math.max(1, anchor.lg.w)),
      md: Math.min(FINANCE_WIDGET_COLS.md, Math.max(1, anchor.md.w)),
      sm: Math.min(FINANCE_WIDGET_COLS.sm, Math.max(1, anchor.sm.w)),
    };

    if (!anchorWidth || !stageWidth) return defaults;

    return {
      lg: activeBreakpoint === 'lg'
        ? Math.min(FINANCE_WIDGET_ANCHOR_MAX_COLS.lg, Math.max(defaults.lg, pxToCols(anchorWidth, 'lg', stageWidth)))
        : defaults.lg,
      md: activeBreakpoint === 'md'
        ? Math.min(FINANCE_WIDGET_ANCHOR_MAX_COLS.md, Math.max(defaults.md, pxToCols(anchorWidth, 'md', stageWidth)))
        : defaults.md,
      sm: activeBreakpoint === 'sm'
        ? Math.min(FINANCE_WIDGET_ANCHOR_MAX_COLS.sm, Math.max(defaults.sm, pxToCols(anchorWidth, 'sm', stageWidth)))
        : defaults.sm,
    };
  }, [activeBreakpoint, anchor?.lg.w, anchor?.md.w, anchor?.sm.w, anchorWidth, stageWidth]);

  const anchorWidthPx = useMemo(() => {
    if (!anchor || !anchorCols || !stageWidth) return undefined;
    return colsToPx(anchorCols[activeBreakpoint], activeBreakpoint, stageWidth);
  }, [activeBreakpoint, anchor?.id, anchorCols, stageWidth]);

  const rightCols = useMemo<Record<FinanceWidgetBreakpoint, number>>(() => ({
    lg: anchor && anchorCols ? Math.max(1, FINANCE_WIDGET_COLS.lg - anchorCols.lg) : FINANCE_WIDGET_COLS.lg,
    md: anchor && anchorCols ? Math.max(1, FINANCE_WIDGET_COLS.md - anchorCols.md) : FINANCE_WIDGET_COLS.md,
    sm: 1,
  }), [anchor?.id, anchorCols]);

  const rightZoneWidth = useMemo(() => {
    if (!anchor || !anchorWidthPx || !stageWidth) return 0;
    return Math.max(0, stageWidth - anchorWidthPx - FINANCE_WIDGET_STAGE_GAP);
  }, [anchor?.id, anchorWidthPx, stageWidth]);

  const hasRightZone = Boolean(
    anchor
    && activeBreakpoint !== 'sm'
    && rightCols[activeBreakpoint] >= FINANCE_WIDGET_RIGHT_MIN_COLS
    && rightZoneWidth > 0,
  );

  const visibleWidgets = useMemo(
    () => widgets.filter((widget) => !hiddenIds.includes(widget.id)),
    [hiddenIds, widgets],
  );

  const defaultLayouts = useMemo(
    () => buildDefaultLayouts(visibleWidgets, anchor, anchorRows, anchorCols),
    [anchor?.fullRow, anchor?.id, anchor?.lg.w, anchor?.md.w, anchor?.minRows, anchor?.sm.w, anchorCols, anchorRows, visibleWidgets],
  );

  const [layouts, setLayouts] = useState<FinanceWidgetPersistedLayouts>(() => {
    const storedLayouts = readStoredLayouts(layoutStorageKey);
    return mergeLayouts(
      defaultLayouts,
      storedLayouts,
      new Set(visibleWidgets.map((widget) => widget.id)),
      anchor,
      anchorCols,
      anchorRows,
    );
  });

  useEffect(() => {
    const storedLayouts = readStoredLayouts(layoutStorageKey);
    setLayouts(
      mergeLayouts(
        defaultLayouts,
        storedLayouts,
        new Set(visibleWidgets.map((widget) => widget.id)),
        anchor,
        anchorCols,
        anchorRows,
      ),
    );
  }, [anchor?.fullRow, anchor?.id, anchor?.lg.w, anchor?.md.w, anchor?.minRows, anchor?.sm.w, anchorCols, anchorRows, defaultLayouts, layoutStorageKey, visibleWidgets]);

  useEffect(() => {
    writeStorageValue(hiddenStorageKey, hiddenIds);
  }, [hiddenIds, hiddenStorageKey]);

  useEffect(() => {
    writeStorageValue(layoutStorageKey, layouts);
  }, [layoutStorageKey, layouts]);

  const handleRemoveWidget = (widgetId: string) => {
    setHiddenIds((previous) => (previous.includes(widgetId) ? previous : [...previous, widgetId]));
  };

  const handleReset = () => {
    setHiddenIds([]);
    setLayouts(buildDefaultLayouts(widgets, anchor, anchorRows, anchorCols));
  };

  const hiddenCount = widgets.length - visibleWidgets.length;
  const showEmptyState = !anchor && visibleWidgets.length === 0;
  const rightIds = new Set((hasRightZone ? layouts.right[activeBreakpoint] : []).map((item) => item.i));
  const bottomIds = new Set((layouts.bottom[activeBreakpoint] ?? []).map((item) => item.i));
  const rightWidgets = visibleWidgets.filter((widget) => rightIds.has(widget.id));
  const bottomWidgets = visibleWidgets.filter((widget) => bottomIds.has(widget.id) && !rightIds.has(widget.id));

  return (
    <section className="finance-widget-board">
      {!anchor ? (
        <div className="finance-widget-board-actions">
          <button
            type="button"
            className="finance-widget-board-reset finance-widget-no-drag"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
            {hiddenCount > 0 ? `Réinitialiser (${hiddenCount} masqué${hiddenCount > 1 ? 's' : ''})` : 'Réinitialiser'}
          </button>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="finance-widget-board-empty">
          <p>{emptyMessage}</p>
          <button type="button" className="finance-widget-board-reset" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Réafficher les widgets
          </button>
        </div>
      ) : (
        <div
          ref={stageRef}
          className={cn(
            'finance-widget-stage',
            anchor && 'finance-widget-stage--anchored',
            anchor ? (hasRightZone ? 'finance-widget-stage--split' : 'finance-widget-stage--stacked') : 'finance-widget-stage--single',
          )}
          style={anchor && hasRightZone && anchorWidthPx
            ? { gridTemplateColumns: `${anchorWidthPx}px minmax(0, 1fr)` }
            : undefined}
        >
          {anchor ? (
            <div ref={anchorMeasureRef} className="finance-anchor-measure" aria-hidden="true">
              {anchor.node}
            </div>
          ) : null}

          {anchor ? (
            <div ref={listZoneRef} className="finance-widget-list-zone">
              <div className="finance-anchor-visible">
                {anchor.node}
                <div className="finance-anchor-actions">
                  <button
                    type="button"
                    className="finance-widget-board-reset finance-widget-no-drag"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {hiddenCount > 0 ? `Réinitialiser (${hiddenCount} masqué${hiddenCount > 1 ? 's' : ''})` : 'Réinitialiser'}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {anchor && hasRightZone ? (
            <div
              className="finance-widget-right-zone"
              style={listZoneHeight > 0 ? { minHeight: `${listZoneHeight}px` } : undefined}
            >
              {stageWidth > 0 && rightZoneWidth > 0 && rightWidgets.length > 0 ? (
                <ResponsiveGridLayout
                  className="finance-widget-grid finance-widget-grid--right"
                  width={rightZoneWidth}
                  breakpoint={activeBreakpoint}
                  layouts={layouts.right}
                  breakpoints={FINANCE_WIDGET_BREAKPOINTS}
                  cols={rightCols}
                  rowHeight={FINANCE_WIDGET_ROW_HEIGHT}
                  maxRows={anchorRows}
                  margin={FINANCE_WIDGET_MARGIN}
                  containerPadding={FINANCE_WIDGET_CONTAINER_PADDING}
                  compactType="vertical"
                  preventCollision
                  useCSSTransforms
                  draggableHandle=".finance-widget-handle"
                  draggableCancel=".finance-widget-no-drag,.recharts-wrapper,.recharts-surface,button,input,select,textarea"
                  resizeHandles={['se']}
                  onLayoutChange={(_, nextLayouts) => setLayouts((previous) => ({ ...previous, right: nextLayouts as Layouts }))}
                >
                  {rightWidgets.map((widget) => (
                    <div key={widget.id} className="finance-widget-grid-item">
                      <div className="finance-widget-grid-frame">
                        <button
                          type="button"
                          className="finance-widget-remove finance-widget-no-drag"
                          onClick={() => handleRemoveWidget(widget.id)}
                          aria-label="Masquer ce visuel"
                          title="Masquer ce visuel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {widget.node}
                      </div>
                    </div>
                  ))}
                </ResponsiveGridLayout>
              ) : null}
            </div>
          ) : null}

          <div className="finance-widget-bottom-zone">
            {anchor && visibleWidgets.length === 0 ? (
              <div className="finance-widget-board-empty">
                <p>{emptyMessage}</p>
                <button type="button" className="finance-widget-board-reset" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  Réafficher les widgets
                </button>
              </div>
            ) : stageWidth > 0 ? (
              <ResponsiveGridLayout
                className="finance-widget-grid finance-widget-grid--bottom"
                width={stageWidth}
                breakpoint={activeBreakpoint}
                layouts={layouts.bottom}
                breakpoints={FINANCE_WIDGET_BREAKPOINTS}
                cols={FINANCE_WIDGET_COLS}
                rowHeight={FINANCE_WIDGET_ROW_HEIGHT}
                margin={FINANCE_WIDGET_MARGIN}
                containerPadding={FINANCE_WIDGET_CONTAINER_PADDING}
                compactType="vertical"
                preventCollision={Boolean(anchor)}
                useCSSTransforms
                draggableHandle=".finance-widget-handle"
                draggableCancel=".finance-widget-no-drag,.recharts-wrapper,.recharts-surface,button,input,select,textarea"
                resizeHandles={['se']}
                onLayoutChange={(_, nextLayouts) => setLayouts((previous) => ({ ...previous, bottom: nextLayouts as Layouts }))}
              >
                {bottomWidgets.map((widget) => (
                  <div key={widget.id} className="finance-widget-grid-item">
                    <div className="finance-widget-grid-frame">
                      <button
                        type="button"
                        className="finance-widget-remove finance-widget-no-drag"
                        onClick={() => handleRemoveWidget(widget.id)}
                        aria-label="Masquer ce visuel"
                        title="Masquer ce visuel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      {widget.node}
                    </div>
                  </div>
                ))}
              </ResponsiveGridLayout>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
