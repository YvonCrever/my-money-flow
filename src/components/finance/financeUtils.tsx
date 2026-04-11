import type { ReactNode } from 'react';

import { CHART_PALETTE } from '@/lib/chartTheme';
import { cn } from '@/lib/utils';

export function formatFinanceCurrency(value: number, digits = 2) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} €`;
}

export function formatFinanceListCurrency(value: number) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} €`;
}

export function formatFinanceCompactCurrency(value: number) {
  return value.toLocaleString('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function formatFinanceHours(value: number) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  })} h`;
}

export function formatFinancePercent(value: number, digits = 0) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
}

export function formatFinanceDay(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function formatFinanceMonthShort(monthLabel: string) {
  return monthLabel.slice(0, 3);
}

export function FinanceWidgetEmptyState({ message, className }: { message: string; className?: string }) {
  return <div className={cn('finance-widget-empty', className)}>{message}</div>;
}

interface FinanceLegendListItem {
  id?: string;
  name: string;
  value: number;
  suffix?: ReactNode;
}

interface FinanceLegendListProps {
  items: FinanceLegendListItem[];
  formatter?: (value: number) => string;
  emptyMessage: string;
  maxItems?: number;
}

export function FinanceLegendList({
  items,
  formatter = (value) => value.toLocaleString('fr-FR'),
  emptyMessage,
  maxItems = 6,
}: FinanceLegendListProps) {
  if (items.length === 0) {
    return <FinanceWidgetEmptyState message={emptyMessage} />;
  }

  return (
    <div className="finance-legend-list">
      {items.slice(0, maxItems).map((item, index) => (
        <div key={item.id ?? `${item.name}-${index}`} className="finance-legend-list-item">
          <div className="finance-legend-list-label">
            <span
              className="finance-legend-list-dot"
              style={{ backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }}
            />
            <span className="cell-truncate" title={item.name}>
              {item.name}
            </span>
          </div>
          <span className="finance-number">
            {formatter(item.value)}
            {item.suffix ?? null}
          </span>
        </div>
      ))}
    </div>
  );
}
