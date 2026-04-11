import type { ReactNode } from 'react';
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout/legacy';

export const FINANCE_WIDGET_BREAKPOINTS = { lg: 1180, md: 760, sm: 0 } as const;
export const FINANCE_WIDGET_COLS = { lg: 12, md: 8, sm: 4 } as const;
export const FINANCE_WIDGET_ANCHOR_MAX_COLS = { lg: 6, md: 5, sm: 4 } as const;
export const FINANCE_WIDGET_RIGHT_MIN_COLS = 3;
export const FINANCE_WIDGET_STAGE_GAP = 16;
export const FINANCE_WIDGET_ROW_HEIGHT = 24;
export const FINANCE_WIDGET_MARGIN: [number, number] = [12, 12];
export const FINANCE_WIDGET_CONTAINER_PADDING: [number, number] = [0, 0];

export type FinanceWidgetBreakpoint = keyof typeof FINANCE_WIDGET_COLS;
export type Layouts = ResponsiveLayouts<FinanceWidgetBreakpoint>;
export type FinanceWidgetRegion = 'right' | 'bottom';
type LayoutArea = Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;

export interface FinanceWidgetDefinition {
  id: string;
  node: ReactNode;
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  defaultRegion?: FinanceWidgetRegion;
}

export interface FinanceWidgetAnchorBreakpoint {
  w: number;
}

export interface FinanceWidgetAnchorDefinition {
  id: string;
  node: ReactNode;
  minRows?: number;
  fullRow?: boolean;
  lg: FinanceWidgetAnchorBreakpoint;
  md: FinanceWidgetAnchorBreakpoint;
  sm: FinanceWidgetAnchorBreakpoint;
}

export interface FinanceWidgetBoardProps {
  storageScope: string;
  widgets: FinanceWidgetDefinition[];
  emptyMessage: string;
  anchor?: FinanceWidgetAnchorDefinition;
}

export type FinanceWidgetAnchorCols = Record<FinanceWidgetBreakpoint, number>;

export interface FinanceWidgetPersistedLayouts {
  right: Layouts;
  bottom: Layouts;
}

interface PreparedWidget {
  widget: FinanceWidgetDefinition;
  index: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  region: FinanceWidgetRegion;
}

export function resolveBreakpoint(width: number): FinanceWidgetBreakpoint {
  if (width >= FINANCE_WIDGET_BREAKPOINTS.lg) return 'lg';
  if (width >= FINANCE_WIDGET_BREAKPOINTS.md) return 'md';
  return 'sm';
}

export function pxToRows(px: number, minimumRows: number) {
  const verticalMargin = FINANCE_WIDGET_MARGIN[1];
  const rows = Math.ceil((px + verticalMargin) / (FINANCE_WIDGET_ROW_HEIGHT + verticalMargin));
  return Math.max(minimumRows, rows);
}

export function colsToPx(cols: number, breakpoint: FinanceWidgetBreakpoint, stageWidth: number) {
  const totalCols = FINANCE_WIDGET_COLS[breakpoint];
  const availableWidth = stageWidth - FINANCE_WIDGET_CONTAINER_PADDING[0] * 2 - FINANCE_WIDGET_MARGIN[0] * (totalCols - 1);
  if (availableWidth <= 0) return 0;

  const columnWidth = availableWidth / totalCols;
  return cols * columnWidth + FINANCE_WIDGET_MARGIN[0] * Math.max(0, cols - 1);
}

export function pxToCols(px: number, breakpoint: FinanceWidgetBreakpoint, stageWidth: number) {
  const totalCols = FINANCE_WIDGET_COLS[breakpoint];
  const availableWidth = stageWidth - FINANCE_WIDGET_CONTAINER_PADDING[0] * 2 - FINANCE_WIDGET_MARGIN[0] * (totalCols - 1);
  if (availableWidth <= 0) return totalCols;

  const columnWidth = availableWidth / totalCols;
  const nextCols = Math.ceil((px + FINANCE_WIDGET_MARGIN[0]) / (columnWidth + FINANCE_WIDGET_MARGIN[0]));
  return Math.max(1, Math.min(totalCols, nextCols));
}

export function emptyLayouts(): Layouts {
  return { lg: [], md: [], sm: [] };
}

function overlaps(candidate: LayoutArea, existing: LayoutArea) {
  return !(
    candidate.x + candidate.w <= existing.x
    || existing.x + existing.w <= candidate.x
    || candidate.y + candidate.h <= existing.y
    || existing.y + existing.h <= candidate.y
  );
}

function getDefaultRegion(widget: FinanceWidgetDefinition): FinanceWidgetRegion {
  if (widget.defaultRegion) return widget.defaultRegion;
  return widget.defaultH <= 5 ? 'right' : 'bottom';
}

function getWidgetDimensions(
  widget: FinanceWidgetDefinition,
  breakpoint: FinanceWidgetBreakpoint,
  cols: number,
  region: FinanceWidgetRegion,
) {
  const height = Math.max(3, widget.defaultH);
  const minHeight = Math.max(3, widget.minH ?? Math.min(height, 4));

  if (breakpoint === 'sm') {
    return {
      w: cols,
      h: height,
      minW: cols,
      minH: minHeight,
    };
  }

  if (region === 'bottom' && breakpoint === 'md' && cols === FINANCE_WIDGET_COLS.md) {
    const width = widget.defaultW >= 6 ? cols : Math.max(3, Math.min(5, widget.defaultW));
    return {
      w: width,
      h: height,
      minW: widget.minW ? Math.min(cols, Math.max(2, widget.minW)) : Math.min(cols, Math.max(3, Math.min(5, widget.defaultW))),
      minH: minHeight,
    };
  }

  const width = Math.min(cols, Math.max(1, widget.defaultW));
  return {
    w: width,
    h: height,
    minW: Math.min(cols, Math.max(1, widget.minW ?? Math.min(width, 3))),
    minH: minHeight,
  };
}

function prepareWidget(
  widget: FinanceWidgetDefinition,
  index: number,
  breakpoint: FinanceWidgetBreakpoint,
  region: FinanceWidgetRegion,
  cols: number,
): PreparedWidget {
  const next = getWidgetDimensions(widget, breakpoint, cols, region);
  const width = Math.min(cols, Math.max(1, next.w));
  const height = Math.max(3, next.h);

  return {
    widget,
    index,
    w: width,
    h: height,
    minW: Math.min(cols, Math.max(1, next.minW ?? Math.min(width, 3))),
    minH: Math.max(3, next.minH ?? Math.min(height, 4)),
    region,
  };
}

function placePreparedWidget(
  prepared: PreparedWidget,
  occupied: LayoutArea[],
  xStart: number,
  xEndExclusive: number,
  yStart: number,
  yEndExclusive?: number,
): LayoutItem | null {
  const maxX = xEndExclusive - prepared.w;
  if (maxX < xStart) return null;

  const maxY = yEndExclusive ?? 512;
  for (let y = yStart; y < maxY; y += 1) {
    if (yEndExclusive !== undefined && y + prepared.h > yEndExclusive) continue;

    for (let x = xStart; x <= maxX; x += 1) {
      const candidate = { x, y, w: prepared.w, h: prepared.h };
      const collides = occupied.some((item) => overlaps(candidate, item));
      if (collides) continue;

      const layout: LayoutItem = {
        i: prepared.widget.id,
        x,
        y,
        w: prepared.w,
        h: prepared.h,
        minW: prepared.minW,
        minH: prepared.minH,
      };
      occupied.push(candidate);
      return layout;
    }
  }

  return null;
}

function buildZoneLayout(
  widgets: FinanceWidgetDefinition[],
  breakpoint: FinanceWidgetBreakpoint,
  cols: number,
  region: FinanceWidgetRegion,
  maxRows?: number,
) {
  const occupied: LayoutArea[] = [];
  const layouts: LayoutItem[] = [];
  const overflow: FinanceWidgetDefinition[] = [];

  const preparedWidgets = widgets
    .map((widget, index) => prepareWidget(widget, index, breakpoint, region, cols))
    .sort((left, right) => {
      if (region !== 'right') return left.index - right.index;
      const leftArea = left.w * left.h;
      const rightArea = right.w * right.h;
      if (leftArea !== rightArea) return leftArea - rightArea;
      if (left.w !== right.w) return left.w - right.w;
      if (left.h !== right.h) return left.h - right.h;
      return left.index - right.index;
    });

  preparedWidgets.forEach((prepared) => {
    const placed = placePreparedWidget(prepared, occupied, 0, cols, 0, maxRows);

    if (placed) {
      layouts.push(placed);
      return;
    }

    if (maxRows !== undefined) {
      overflow.push(prepared.widget);
      return;
    }

    const fallbackY = occupied.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    const fallback = {
      i: prepared.widget.id,
      x: 0,
      y: fallbackY,
      w: prepared.w,
      h: prepared.h,
      minW: prepared.minW,
      minH: prepared.minH,
    };
    layouts.push(fallback);
    occupied.push({ x: 0, y: fallbackY, w: prepared.w, h: prepared.h });
  });

  return { layouts, overflow };
}

export function buildDefaultLayouts(
  widgets: FinanceWidgetDefinition[],
  anchor: FinanceWidgetAnchorDefinition | undefined,
  rightMaxRows: number,
  anchorCols?: FinanceWidgetAnchorCols,
): FinanceWidgetPersistedLayouts {
  const layouts: FinanceWidgetPersistedLayouts = {
    right: emptyLayouts(),
    bottom: emptyLayouts(),
  };

  const preferredRight = widgets.filter((widget) => getDefaultRegion(widget) === 'right');
  const preferredBottom = widgets.filter((widget) => getDefaultRegion(widget) !== 'right');

  (Object.keys(FINANCE_WIDGET_COLS) as FinanceWidgetBreakpoint[]).forEach((breakpoint) => {
    const totalCols = FINANCE_WIDGET_COLS[breakpoint];
    const reservedCols = anchor
      ? (anchor.fullRow
        ? totalCols
        : anchorCols?.[breakpoint] ?? Math.min(totalCols, Math.max(1, anchor[breakpoint].w)))
      : 0;
    const rightCols = Math.max(0, totalCols - reservedCols);
    const hasRightZone = Boolean(anchor && breakpoint !== 'sm' && rightCols >= FINANCE_WIDGET_RIGHT_MIN_COLS);

    if (!hasRightZone) {
      layouts.right[breakpoint] = [];
      layouts.bottom[breakpoint] = buildZoneLayout(widgets, breakpoint, totalCols, 'bottom').layouts;
      return;
    }

    const rightResult = buildZoneLayout(preferredRight, breakpoint, rightCols, 'right', rightMaxRows);
    layouts.right[breakpoint] = rightResult.layouts;
    layouts.bottom[breakpoint] = buildZoneLayout(
      [...preferredBottom, ...rightResult.overflow],
      breakpoint,
      totalCols,
      'bottom',
    ).layouts;
  });

  return layouts;
}

function mergeZoneLayouts(
  defaultLayouts: Layouts,
  storedLayouts: Layouts | undefined,
  visibleIds: Set<string>,
  colsByBreakpoint: Record<FinanceWidgetBreakpoint, number>,
  maxRowsByBreakpoint?: Partial<Record<FinanceWidgetBreakpoint, number>>,
): Layouts {
  const nextLayouts = emptyLayouts();

  (Object.keys(defaultLayouts) as FinanceWidgetBreakpoint[]).forEach((breakpoint) => {
    const defaults = defaultLayouts[breakpoint] ?? [];
    const defaultById = new Map(defaults.map((item) => [item.i, item]));
    const occupied: LayoutArea[] = [];
    const accepted: LayoutItem[] = [];
    const cols = colsByBreakpoint[breakpoint];
    const maxRows = maxRowsByBreakpoint?.[breakpoint];

    (storedLayouts?.[breakpoint] ?? [])
      .filter((item) => visibleIds.has(item.i) && defaultById.has(item.i))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .forEach((item) => {
        const fallback = defaultById.get(item.i);
        if (!fallback) return;

        const minW = Math.min(cols, Math.max(1, fallback.minW ?? 1));
        const width = Math.min(cols, Math.max(minW, item.w));
        const normalized = {
          ...fallback,
          ...item,
          x: Math.max(0, Math.min(item.x, cols - width)),
          w: width,
          h: Math.max(fallback.minH ?? 3, item.h),
          minW,
          minH: fallback.minH,
        };

        if (maxRows !== undefined && normalized.y + normalized.h > maxRows) return;
        if (occupied.some((candidate) => overlaps(normalized, candidate))) return;

        occupied.push(normalized);
        accepted.push(normalized);
      });

    const acceptedIds = new Set(accepted.map((item) => item.i));
    const missing = defaults.filter((item) => visibleIds.has(item.i) && !acceptedIds.has(item.i));
    nextLayouts[breakpoint] = [...accepted, ...missing];
  });

  return nextLayouts;
}

export function mergeLayouts(
  defaultLayouts: FinanceWidgetPersistedLayouts,
  storedLayouts: FinanceWidgetPersistedLayouts | null,
  visibleIds: Set<string>,
  anchor: FinanceWidgetAnchorDefinition | undefined,
  anchorCols: FinanceWidgetAnchorCols | undefined,
  rightMaxRows: number,
): FinanceWidgetPersistedLayouts {
  const rightColsByBreakpoint = {
    lg: anchor && anchorCols ? Math.max(1, FINANCE_WIDGET_COLS.lg - anchorCols.lg) : FINANCE_WIDGET_COLS.lg,
    md: anchor && anchorCols ? Math.max(1, FINANCE_WIDGET_COLS.md - anchorCols.md) : FINANCE_WIDGET_COLS.md,
    sm: 1,
  } satisfies Record<FinanceWidgetBreakpoint, number>;

  return {
    right: mergeZoneLayouts(
      defaultLayouts.right,
      storedLayouts?.right,
      visibleIds,
      rightColsByBreakpoint,
      { lg: rightMaxRows, md: rightMaxRows, sm: 0 },
    ),
    bottom: mergeZoneLayouts(
      defaultLayouts.bottom,
      storedLayouts?.bottom,
      visibleIds,
      FINANCE_WIDGET_COLS,
    ),
  };
}
