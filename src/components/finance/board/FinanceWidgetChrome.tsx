import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface FinanceWidgetShellProps {
  kicker: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FinanceWidgetShell({ kicker, title, icon, children, className }: FinanceWidgetShellProps) {
  return (
    <article className={cn('finance-widget-shell surface-panel', className)}>
      <header className="finance-widget-shell-header finance-widget-handle">
        <div className="finance-widget-shell-heading">
          {icon ? <span className="finance-widget-shell-icon">{icon}</span> : null}
          <div>
            <p className="finance-widget-shell-kicker">{kicker}</p>
            <h3 className="finance-widget-shell-title">{title}</h3>
          </div>
        </div>
      </header>

      <div className="finance-widget-shell-body">{children}</div>
    </article>
  );
}

interface FinanceMetricWidgetProps {
  kicker: string;
  title: string;
  value: string;
  detail?: string;
  footer?: string;
  icon?: ReactNode;
}

export function FinanceMetricWidget({
  kicker,
  title,
  value,
  detail,
  footer,
  icon,
}: FinanceMetricWidgetProps) {
  return (
    <FinanceWidgetShell kicker={kicker} title={title} icon={icon}>
      <div className="finance-metric-widget">
        <p className="finance-metric-widget-value finance-number">{value}</p>
        {detail ? <p className="finance-metric-widget-detail">{detail}</p> : null}
        {footer ? <p className="finance-metric-widget-footer">{footer}</p> : null}
      </div>
    </FinanceWidgetShell>
  );
}
