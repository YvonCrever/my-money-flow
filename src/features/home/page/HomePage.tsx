import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarRange, Sparkles, TrendingUp } from 'lucide-react';
import { FeatureLoadWarning } from '@/components/FeatureLoadWarning';
import { chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { MONTH_NAMES } from '@/types/finance';

interface HomePageProps {
  financeLoadError?: string | null;
  monthlySummary: { month: number; revenue: number; expenses: number; profit: number }[];
  selectedYear: number;
  totalRevenue: number;
}

const formatAmount = (value: number) =>
  `${value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;

export default function HomePage({ financeLoadError = null, monthlySummary, selectedYear, totalRevenue }: HomePageProps) {
  const today = new Date();
  const lastVisibleMonth = selectedYear < today.getFullYear()
    ? 11
    : selectedYear === today.getFullYear()
      ? today.getMonth()
      : -1;

  const visibleMonthlySummary = monthlySummary.filter((month) => month.month <= lastVisibleMonth);
  const annualRevenue = visibleMonthlySummary.reduce((sum, month) => sum + month.revenue, 0);
  const bestMonth = visibleMonthlySummary.reduce<{ month: number; revenue: number } | null>((best, month) => {
    if (!best || month.revenue > best.revenue) return { month: month.month, revenue: month.revenue };
    return best;
  }, null);

  const chartData = visibleMonthlySummary.map((month) => ({
    label: MONTH_NAMES[month.month].slice(0, 3),
    revenue: month.revenue,
  }));

  return (
    <div className="page-workspace">
      {financeLoadError ? (
        <FeatureLoadWarning
          title="Resume Finance indisponible"
          description={financeLoadError}
          className="mb-5"
        />
      ) : null}

      <div className="workspace-chip-row">
        <div className="workspace-chip">
          Année
          <span className="font-mono-num text-foreground">{selectedYear}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-panel rounded-[1.6rem] p-6">
          <span className="inline-flex rounded-full border border-white/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.95),hsl(var(--secondary)/0.72))] p-3 shadow-[0_14px_32px_hsl(var(--primary)/0.22)]">
            <TrendingUp className="h-6 w-6 text-white" />
          </span>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">CA du mois</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-50">{formatAmount(totalRevenue)}</p>
        </div>
        <div className="surface-panel rounded-[1.6rem] p-6">
          <span className="inline-flex rounded-full border border-white/10 bg-[linear-gradient(135deg,hsl(var(--secondary)/0.92),hsl(var(--primary)/0.74))] p-3 shadow-[0_14px_32px_hsl(var(--secondary)/0.16)]">
            <CalendarRange className="h-6 w-6 text-white" />
          </span>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">CA annuel visible</p>
          <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-50">{formatAmount(annualRevenue)}</p>
        </div>
        <div className="surface-panel rounded-[1.6rem] p-6">
          <span className="inline-flex rounded-full border border-white/10 bg-[linear-gradient(135deg,hsl(var(--accent)/0.9),hsl(var(--primary)/0.72))] p-3 shadow-[0_14px_32px_hsl(var(--accent)/0.16)]">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">Mois le plus fort</p>
          <p className="mt-3 text-2xl font-bold tracking-[-0.05em] text-slate-50">{bestMonth ? MONTH_NAMES[bestMonth.month] : '—'}</p>
          <p className="mt-1 font-mono-num text-sm text-slate-300">{bestMonth ? formatAmount(bestMonth.revenue) : 'Aucune donnée'}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-panel rounded-[1.8rem] p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <BarChart3 className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-kubrick text-[11px] text-slate-500">Annuel</p>
              <h3 className="text-lg font-semibold text-slate-100">Chiffre d’affaires {selectedYear}</h3>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="homeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                <Tooltip formatter={(value: number) => formatAmount(value)} contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2.4} fill="url(#homeRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-panel rounded-[1.8rem] p-6">
          <p className="text-kubrick text-[11px] text-slate-500">Détail</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">CA par mois</h3>
          <div className="mt-5 grid gap-3">
            {visibleMonthlySummary.length === 0 ? (
              <div className="rounded-2xl border border-white/6 bg-white/[0.03] p-4 text-sm text-slate-500">
                Aucun mois visible pour cette année.
              </div>
            ) : visibleMonthlySummary.map((month) => (
              <div key={month.month} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-slate-200">{MONTH_NAMES[month.month]}</span>
                <span className="font-mono-num text-sm text-slate-100">{formatAmount(month.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
