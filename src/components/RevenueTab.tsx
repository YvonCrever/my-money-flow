import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FinanceMetricWidget, FinanceWidgetBoard, FinanceWidgetShell, type FinanceWidgetDefinition } from '@/components/finance/FinanceWidgetBoard';
import {
  FinanceLegendList,
  FinanceWidgetEmptyState,
  formatFinanceCurrency,
  formatFinanceDay,
  formatFinanceHours,
  formatFinanceListCurrency,
  formatFinancePercent,
} from '@/components/finance/financeUtils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { WorkspacePlusButton } from '@/components/ui/workspace-plus-button';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import { CHART_PALETTE, chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { getClientDisplayName, resolveClientDisplayName } from '@/lib/clientDisplay';
import { type DateSortDirection, sortEntriesByIsoDate } from '@/lib/dateSort';
import { Client, REVENUE_UNITS, RevenueEntry, RevenueUnit } from '@/types/finance';

interface RevenueTabProps {
  revenues: RevenueEntry[];
  revenueByClient: Record<string, number>;
  onAdd: (entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updated: Partial<Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>>) => void;
  clients: Client[];
  toolbarPortalTarget?: HTMLDivElement | null;
}

const REVENUE_UNIT_EDIT_LABELS: Record<RevenueUnit, string> = {
  heure: 'h',
  journee: 'j',
  piece: 'p',
};

export function RevenueTab({
  revenues,
  revenueByClient,
  onAdd,
  onDelete,
  onEdit,
  clients,
  toolbarPortalTarget,
}: RevenueTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [service, setService] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hours, setHours] = useState('');
  const [unit, setUnit] = useState<RevenueUnit>('heure');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<RevenueEntry>>({});
  const [dateSortDirection, setDateSortDirection] = useState<DateSortDirection>('desc');

  const handleAdd = () => {
    if (!date || !clientId || !service || !hourlyRate || !hours) return;
    const clientObj = clients.find((client) => client.id === clientId);
    onAdd({
      date,
      client: clientObj ? clientObj.name : '',
      service,
      hourlyRate: Number(hourlyRate),
      hours: Number(hours),
      unit,
    });
    setDate('');
    setClientId('');
    setService('');
    setHourlyRate('');
    setHours('');
    setUnit('heure');
    setIsAddOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleAdd();
  };

  const startEdit = (revenue: RevenueEntry) => {
    setEditingId(revenue.id);
    setEditFields({
      date: revenue.date,
      client: revenue.client,
      service: revenue.service,
      hourlyRate: revenue.hourlyRate,
      hours: revenue.hours,
      unit: revenue.unit || 'heure',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFields({});
  };

  const saveEdit = (id: string) => {
    onEdit(id, {
      date: editFields.date,
      client: editFields.client,
      service: editFields.service,
      hourlyRate: Number(editFields.hourlyRate),
      hours: Number(editFields.hours),
      unit: (editFields.unit as RevenueUnit | undefined) ?? 'heure',
    });
    setEditingId(null);
    setEditFields({});
  };

  const sortedRevenues = useMemo(
    () => sortEntriesByIsoDate(revenues, dateSortDirection),
    [revenues, dateSortDirection],
  );

  const totalRevenue = useMemo(() => revenues.reduce((sum, revenue) => sum + revenue.amount, 0), [revenues]);
  const totalHours = useMemo(() => revenues.reduce((sum, revenue) => sum + revenue.hours, 0), [revenues]);
  const effectiveHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;
  const estimatedAmount = hourlyRate && hours ? Number(hourlyRate) * Number(hours) : 0;

  const revenuePieData = useMemo(
    () => Object.entries(revenueByClient)
      .map(([legalName, value]) => ({
        id: legalName,
        name: resolveClientDisplayName(legalName, clients),
        value,
      }))
      .sort((a, b) => b.value - a.value),
    [clients, revenueByClient],
  );

  const unitMixData = useMemo(() => {
    const totals = new Map<string, number>();
    revenues.forEach((revenue) => {
      const label = REVENUE_UNITS.find((option) => option.value === revenue.unit)?.label ?? 'Heure(s)';
      totals.set(label, (totals.get(label) ?? 0) + revenue.amount);
    });
    return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
  }, [revenues]);

  const revenueByDay = useMemo(() => {
    const totals = new Map<string, number>();
    revenues
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((revenue) => {
        totals.set(revenue.date, (totals.get(revenue.date) ?? 0) + revenue.amount);
      });

    let cumulative = 0;
    return Array.from(totals.entries()).map(([day, amount]) => {
      cumulative += amount;
      return {
        day,
        label: formatFinanceDay(day),
        amount,
        cumulative,
      };
    });
  }, [revenues]);

  const serviceLeaderboard = useMemo(() => {
    const totals = new Map<string, number>();
    revenues.forEach((revenue) => {
      totals.set(revenue.service, (totals.get(revenue.service) ?? 0) + revenue.amount);
    });
    return Array.from(totals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [revenues]);

  const peakRevenueDay = revenueByDay.reduce<{ label: string; value: number } | null>((peak, day) => {
    if (!peak || day.amount > peak.value) return { label: day.label, value: day.amount };
    return peak;
  }, null);

  const averageRevenuePerEntry = revenues.length > 0 ? totalRevenue / revenues.length : 0;
  const topClient = revenuePieData[0];
  const topClientShare = totalRevenue > 0 && topClient ? (topClient.value / totalRevenue) * 100 : 0;
  const activeServices = serviceLeaderboard.length;
  const strongestUnit = unitMixData[0];

  const widgets = useMemo<FinanceWidgetDefinition[]>(() => [
    {
      id: 'revenue-total',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Revenus"
          title="CA du mois"
          value={formatFinanceCurrency(totalRevenue)}
          detail={`${revenues.length} entrée${revenues.length > 1 ? 's' : ''}`}
          footer={topClient ? `Client dominant: ${topClient.name}` : 'Ajoute une entrée pour démarrer'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-hours',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Temps"
          title="Heures travaillées"
          value={formatFinanceHours(totalHours)}
          detail={revenues.length > 0 ? `${(totalHours / revenues.length).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h par entrée` : 'Aucune heure saisie'}
          footer="Somme des heures sur la période"
          icon={<Clock3 className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-effective-rate',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Taux horaire"
          title="Moyenne effective"
          value={formatFinanceCurrency(effectiveHourlyRate)}
          detail={totalHours > 0 ? `${formatFinanceCurrency(totalRevenue)} / ${formatFinanceHours(totalHours)}` : 'Dès qu’un revenu comporte des heures'}
          footer="Revenu total / heures totales"
          icon={<Target className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-average-entry',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Moyenne"
          title="Panier par entrée"
          value={formatFinanceCurrency(averageRevenuePerEntry)}
          detail={revenues.length > 0 ? `${formatFinanceCurrency(totalRevenue)} répartis sur ${revenues.length} lignes` : 'Aucune entrée'}
          footer={activeServices > 0 ? `${activeServices} prestation${activeServices > 1 ? 's' : ''} active${activeServices > 1 ? 's' : ''}` : 'Aucune prestation saisie'}
          icon={<Sparkles className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-peak-day',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Pic"
          title="Meilleure journée"
          value={peakRevenueDay?.label ?? '—'}
          detail={peakRevenueDay ? formatFinanceCurrency(peakRevenueDay.value) : 'Ajoute des revenus pour faire ressortir un pic'}
          footer="Montant journalier le plus élevé"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-top-client-share',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Concentration"
          title="Part du meilleur client"
          value={formatFinancePercent(topClientShare)}
          detail={topClient ? `${topClient.name} représente ${formatFinanceCurrency(topClient.value)}` : 'Aucun client facturé'}
          footer={strongestUnit ? `Unité dominante: ${strongestUnit.name}` : 'Aucune unité dominante'}
          icon={<PieChartIcon className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'revenue-client-split',
      defaultW: 7,
      defaultH: 11,
      minW: 6,
      node: (
        <FinanceWidgetShell kicker="Répartition" title="Qui génère le chiffre d’affaires" icon={<PieChartIcon className="h-4 w-4" />}>
          <div className="finance-widget-split finance-widget-split--chart">
            <div className="finance-widget-chart finance-widget-chart--tall">
              {revenuePieData.length === 0 ? (
                <FinanceWidgetEmptyState message="Ajoute des revenus pour afficher la répartition client." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenuePieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                      {revenuePieData.map((entry, index) => (
                        <Cell key={entry.id} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <FinanceLegendList
              items={revenuePieData}
              formatter={(value) => formatFinanceCurrency(value)}
              emptyMessage="Aucune ventilation client pour le moment."
            />
          </div>
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'revenue-cumulative',
      defaultW: 7,
      defaultH: 11,
      minW: 6,
      node: (
        <FinanceWidgetShell kicker="Trajectoire" title="Revenu cumulé sur le mois" icon={<TrendingUp className="h-4 w-4" />}>
          {revenueByDay.length === 0 ? (
            <FinanceWidgetEmptyState message="Ajoute des revenus pour suivre la courbe cumulée." />
          ) : (
            <div className="finance-widget-chart finance-widget-chart--tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="financeRevenueFlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.52} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                  <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-1))" strokeWidth={2.2} fill="url(#financeRevenueFlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'revenue-operations',
      defaultW: 5,
      defaultH: 11,
      minW: 5,
      node: (
        <FinanceWidgetShell kicker="Rythme" title="Montants quotidiens et prestations" icon={<Sparkles className="h-4 w-4" />}>
          <div className="finance-widget-chart">
            {revenueByDay.length === 0 ? (
              <FinanceWidgetEmptyState message="Le graphique quotidien apparaîtra dès la première entrée." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                  <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                  <Bar dataKey="amount" fill="hsl(var(--chart-3))" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="finance-widget-stat-grid finance-widget-stat-grid--2">
            <div className="finance-widget-stat-card">
              <span className="finance-widget-stat-label">Prestations actives</span>
              <span className="finance-widget-stat-value finance-number">{activeServices}</span>
            </div>
            <div className="finance-widget-stat-card">
              <span className="finance-widget-stat-label">Unité dominante</span>
              <span className="finance-widget-stat-value">{strongestUnit?.name ?? '—'}</span>
            </div>
          </div>

          {serviceLeaderboard.length === 0 ? (
            <FinanceWidgetEmptyState message="Les prestations les plus rentables apparaîtront ici." />
          ) : (
            <div className="finance-widget-ranking">
              {serviceLeaderboard.map((serviceItem) => (
                <div key={serviceItem.name} className="finance-widget-ranking-item">
                  <div className="finance-widget-ranking-header">
                    <span className="cell-truncate" title={serviceItem.name}>{serviceItem.name}</span>
                    <span className="finance-number">{formatFinanceCurrency(serviceItem.value)}</span>
                  </div>
                  <div className="finance-widget-ranking-bar">
                    <span style={{ width: `${Math.max(12, (serviceItem.value / (serviceLeaderboard[0]?.value || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </FinanceWidgetShell>
      ),
    },
  ], [
    activeServices,
    averageRevenuePerEntry,
    effectiveHourlyRate,
    peakRevenueDay,
    revenueByDay,
    revenuePieData,
    revenues.length,
    serviceLeaderboard,
    strongestUnit,
    topClient,
    topClientShare,
    totalHours,
    totalRevenue,
  ]);

  const listPanel = (
    <div className="surface-panel workspace-table-shell workspace-table-shell--compact finance-list-shell">
      <Table className="workspace-table-compact finance-list-table finance-list-table--revenue">
        <TableHeader>
          <TableRow className="border-white/6 bg-white/[0.03]">
            <TableHead className="text-slate-400" aria-sort={dateSortDirection === 'desc' ? 'descending' : 'ascending'}>
              <button
                type="button"
                onClick={() => setDateSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
                className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-inherit transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label={dateSortDirection === 'desc' ? 'Trier les revenus du plus ancien au plus récent' : 'Trier les revenus du plus récent au plus ancien'}
              >
                <span>Date</span>
                {dateSortDirection === 'desc' ? (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </TableHead>
            <TableHead className="text-slate-400">Client</TableHead>
            <TableHead className="text-slate-400">Prestation</TableHead>
            <TableHead className="text-right text-slate-400">Prix</TableHead>
            <TableHead className="w-[38px] text-right text-slate-400">Nb</TableHead>
            <TableHead className="w-[30px] text-center text-slate-400">U</TableHead>
            <TableHead className="finance-list-head-amount text-right text-slate-400">Montant</TableHead>
            <TableHead className="w-[76px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revenues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-slate-500">Aucun revenu pour cette période</TableCell>
            </TableRow>
          ) : (
            sortedRevenues.map((revenue) => (
              <TableRow key={revenue.id} className="border-white/6 hover:bg-white/[0.03]">
                {editingId === revenue.id ? (
                  <>
                    <TableCell><Input type="date" value={editFields.date as string} onChange={(event) => setEditFields((fields) => ({ ...fields, date: event.target.value }))} /></TableCell>
                    <TableCell><Input value={editFields.client as string} onChange={(event) => setEditFields((fields) => ({ ...fields, client: event.target.value }))} /></TableCell>
                    <TableCell><Input value={editFields.service as string} onChange={(event) => setEditFields((fields) => ({ ...fields, service: event.target.value }))} /></TableCell>
                    <TableCell><Input type="number" value={editFields.hourlyRate as number} onChange={(event) => setEditFields((fields) => ({ ...fields, hourlyRate: Number(event.target.value) }))} /></TableCell>
                    <TableCell><Input type="number" value={editFields.hours as number} onChange={(event) => setEditFields((fields) => ({ ...fields, hours: Number(event.target.value) }))} /></TableCell>
                    <TableCell>
                      <select
                        aria-label="Unité"
                        className="mx-auto block h-9 w-11 rounded-xl border border-white/10 bg-white/5 pl-2 pr-5 text-center text-sm"
                        value={(editFields.unit as RevenueUnit | undefined) ?? 'heure'}
                        onChange={(event) => setEditFields((fields) => ({ ...fields, unit: event.target.value as RevenueUnit }))}
                      >
                        {REVENUE_UNITS.map((option) => (
                          <option key={option.value} value={option.value}>{REVENUE_UNIT_EDIT_LABELS[option.value]}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-right font-mono-num font-semibold text-slate-100">
                      {editFields.hourlyRate && editFields.hours ? formatFinanceCurrency(Number(editFields.hourlyRate) * Number(editFields.hours)) : formatFinanceCurrency(revenue.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" onClick={() => saveEdit(revenue.id)} className="h-8 w-8 rounded-full border border-white/10 bg-white/5"><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" onClick={cancelEdit} className="h-8 w-8 rounded-full border border-white/10 bg-white/5"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-mono-num text-sm text-slate-300">{formatFinanceDay(revenue.date)}</TableCell>
                    <TableCell className="font-medium text-slate-100">
                      <span className="cell-truncate finance-revenue-client-text" title={resolveClientDisplayName(revenue.client, clients)}>
                        {resolveClientDisplayName(revenue.client, clients)}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-300"><span className="cell-truncate finance-revenue-service-text" title={revenue.service}>{revenue.service}</span></TableCell>
                    <TableCell className="text-right font-mono-num text-slate-300">{formatFinanceListCurrency(revenue.hourlyRate)}</TableCell>
                    <TableCell className="w-[38px] text-right font-mono-num text-slate-300">{revenue.hours}</TableCell>
                    <TableCell className="w-[30px] text-center text-slate-400">
                      {revenue.unit === 'journee' ? 'j' : revenue.unit === 'piece' ? 'p' : 'h'}
                    </TableCell>
                    <TableCell className="text-right font-mono-num font-semibold text-slate-100">{formatFinanceListCurrency(revenue.amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onDelete(revenue.id)} className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(revenue)} className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const addButton = (
    <WorkspacePlusButton
      onClick={() => setIsAddOpen(true)}
      label="Ajouter"
      showLabel
      surface={toolbarPortalTarget ? 'masthead' : 'default'}
    />
  );

  return (
    <div className="finance-scope space-y-4">
      {toolbarPortalTarget !== undefined ? (
        toolbarPortalTarget ? (
          <ToolbarPortal target={toolbarPortalTarget}>
            {addButton}
          </ToolbarPortal>
        ) : null
      ) : (
        <div className="flex justify-end">
          {addButton}
        </div>
      )}

      <WorkspacePopup
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Ajouter un revenu"
        className="max-w-[min(92vw,40rem)]"
      >
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); handleAdd(); }}>
          <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} onKeyDown={handleKeyDown} className="h-9" />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client</span>
              <select
                className="h-9 min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
              >
                <option value="">Sélectionner...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{getClientDisplayName(client)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prestation</span>
            <Input value={service} onChange={(event) => setService(event.target.value)} onKeyDown={handleKeyDown} placeholder="Description" className="h-9" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[132px_110px_132px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prix</span>
              <Input type="number" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="h-9" />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Qté</span>
              <Input type="number" value={hours} onChange={(event) => setHours(event.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="h-9" />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Unité</span>
              <select
                className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                value={unit}
                onChange={(event) => setUnit(event.target.value as RevenueUnit)}
              >
                {REVENUE_UNITS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-end">
              <div className="workspace-chip">
                Projeté
                <span className="font-mono-num text-slate-100">{estimatedAmount ? formatFinanceCurrency(estimatedAmount) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-4">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </form>
      </WorkspacePopup>

      <FinanceWidgetBoard
        storageScope="finance-revenue-widgets-v8"
        widgets={widgets}
        emptyMessage="Tous les visuels de revenus sont masqués."
        anchor={{
          id: 'revenue-list-anchor',
          node: listPanel,
          minRows: 18,
          lg: { w: 6 },
          md: { w: 5 },
          sm: { w: 4 },
        }}
      />
    </div>
  );
}
