import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BadgeEuro,
  Clock3,
  PiggyBank,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

import { FinanceMetricWidget, FinanceWidgetBoard, FinanceWidgetShell, type FinanceWidgetDefinition } from '@/components/finance/FinanceWidgetBoard';
import {
  FinanceLegendList,
  FinanceWidgetEmptyState,
  formatFinanceCurrency,
  formatFinanceDay,
  formatFinanceHours,
  formatFinancePercent,
} from '@/components/finance/financeUtils';
import { chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { resolveClientDisplayName } from '@/lib/clientDisplay';
import { Client, MONTH_NAMES, RevenueEntry } from '@/types/finance';

interface DashboardProps {
  monthlySummary: { month: number; revenue: number; expenses: number; profit: number }[];
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  selectedYear: number;
  revenueByClient?: Record<string, number>;
  clients?: Client[];
  revenues?: RevenueEntry[];
}

export function Dashboard({
  monthlySummary,
  totalRevenue,
  totalExpenses,
  profit,
  selectedYear,
  revenueByClient = {},
  clients = [],
  revenues = [],
}: DashboardProps) {
  const today = new Date();
  const lastVisibleMonth = selectedYear < today.getFullYear()
    ? 11
    : selectedYear === today.getFullYear()
      ? today.getMonth()
      : -1;

  const visibleMonthlySummary = monthlySummary.filter((month) => month.month <= lastVisibleMonth);

  const chartData = useMemo(() => visibleMonthlySummary.map((entry) => ({
    name: MONTH_NAMES[entry.month].slice(0, 3),
    Revenus: entry.revenue,
    Dépenses: entry.expenses,
    Bénéfice: entry.profit,
  })), [visibleMonthlySummary]);

  const totalHours = useMemo(
    () => revenues.reduce((sum, revenue) => sum + revenue.hours, 0),
    [revenues],
  );

  const effectiveHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const clientRevenueData = useMemo(
    () => Object.entries(revenueByClient)
      .map(([legalName, value]) => ({
        id: legalName,
        name: resolveClientDisplayName(legalName, clients),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    [clients, revenueByClient],
  );

  const bestMonth = useMemo(
    () => visibleMonthlySummary.reduce<{ label: string; value: number } | null>((best, month) => {
      if (!best || month.profit > best.value) {
        return { label: MONTH_NAMES[month.month], value: month.profit };
      }
      return best;
    }, null),
    [visibleMonthlySummary],
  );

  const averageProfit = visibleMonthlySummary.length > 0
    ? visibleMonthlySummary.reduce((sum, month) => sum + month.profit, 0) / visibleMonthlySummary.length
    : 0;

  const activeClientCount = clientRevenueData.length;

  const widgets = useMemo<FinanceWidgetDefinition[]>(() => [
    {
      id: 'dashboard-revenue',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Revenus"
          title="Chiffre du mois"
          value={formatFinanceCurrency(totalRevenue)}
          detail={`${revenues.length} entrée${revenues.length > 1 ? 's' : ''} sur la période`}
          footer={bestMonth ? `Pic annuel: ${bestMonth.label}` : 'Aucun pic annuel disponible'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-expenses',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Dépenses"
          title="Sorties du mois"
          value={formatFinanceCurrency(totalExpenses)}
          detail={totalRevenue > 0 ? `${formatFinancePercent((totalExpenses / totalRevenue) * 100)} du CA` : 'Aucun revenu pour comparer'}
          footer={`Profit moyen mensuel: ${formatFinanceCurrency(averageProfit)}`}
          icon={<TrendingDown className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-profit',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Profit"
          title="Résultat net"
          value={formatFinanceCurrency(profit)}
          detail={profit >= 0 ? 'Mois actuellement positif' : 'Mois actuellement négatif'}
          footer={bestMonth ? `Meilleur mois: ${bestMonth.label}` : 'Historique insuffisant'}
          icon={<PiggyBank className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-margin',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Marge"
          title="Taux de profit"
          value={formatFinancePercent(margin)}
          detail={totalRevenue > 0 ? `${formatFinanceCurrency(profit)} sur ${formatFinanceCurrency(totalRevenue)}` : 'Calculé dès qu’un revenu existe'}
          footer="Profit / revenus du mois"
          icon={<Sparkles className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-hours',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Temps"
          title="Heures travaillées"
          value={formatFinanceHours(totalHours)}
          detail={revenues.length > 0 ? `${(totalHours / revenues.length).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h par entrée` : 'Ajoute des revenus pour calculer le temps'}
          footer="Total des heures saisies sur le mois"
          icon={<Clock3 className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-hourly-rate',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Taux horaire"
          title="Moyenne effective"
          value={formatFinanceCurrency(effectiveHourlyRate)}
          detail={totalHours > 0 ? `${formatFinanceCurrency(totalRevenue)} / ${formatFinanceHours(totalHours)}` : 'Dès que des heures sont saisies'}
          footer="Revenu total / heures totales"
          icon={<BadgeEuro className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'dashboard-comparison',
      defaultW: 8,
      defaultH: 11,
      minW: 6,
      node: (
        <FinanceWidgetShell kicker="Comparaison" title={`Revenus, dépenses et bénéfice ${selectedYear}`} icon={<Sparkles className="h-4 w-4" />}>
          {chartData.length === 0 ? (
            <FinanceWidgetEmptyState message="Aucune activité sur l’année sélectionnée." />
          ) : (
            <div className="finance-widget-chart finance-widget-chart--tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                  <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="Revenus" fill="hsl(var(--chart-1))" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="Dépenses" fill="hsl(var(--chart-4))" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="Bénéfice" fill="hsl(var(--chart-2))" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'dashboard-clients',
      defaultW: 4,
      defaultH: 11,
      minW: 4,
      node: (
        <FinanceWidgetShell kicker="Clients" title="Qui porte le mois" icon={<Users className="h-4 w-4" />}>
          <div className="finance-widget-stat-grid">
            <div className="finance-widget-stat-card">
              <span className="finance-widget-stat-label">Clients actifs</span>
              <span className="finance-widget-stat-value finance-number">{activeClientCount}</span>
            </div>
            <div className="finance-widget-stat-card">
              <span className="finance-widget-stat-label">Meilleur client</span>
              <span className="finance-widget-stat-value">{clientRevenueData[0]?.name ?? '—'}</span>
              <span className="text-sm text-muted-foreground">
                {clientRevenueData[0] ? formatFinanceCurrency(clientRevenueData[0].value) : 'Aucun revenu'}
              </span>
            </div>
          </div>
          <FinanceLegendList
            items={clientRevenueData}
            formatter={(value) => formatFinanceCurrency(value)}
            emptyMessage={clients.length === 0 ? 'Ajoute des clients pour alimenter ce classement.' : 'Aucun revenu client ce mois-ci.'}
          />
        </FinanceWidgetShell>
      ),
    },
  ], [
    activeClientCount,
    averageProfit,
    bestMonth,
    chartData,
    clientRevenueData,
    clients.length,
    effectiveHourlyRate,
    margin,
    profit,
    revenues.length,
    selectedYear,
    totalExpenses,
    totalHours,
    totalRevenue,
  ]);

  return (
    <div className="finance-scope space-y-4">
      <FinanceWidgetBoard
        storageScope="finance-dashboard-widgets-v1"
        widgets={widgets}
        emptyMessage="Tous les visuels du dashboard sont masqués."
      />
    </div>
  );
}
