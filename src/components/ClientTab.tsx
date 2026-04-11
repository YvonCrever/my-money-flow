import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, FileText, Pencil, Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FinanceMetricWidget, FinanceWidgetBoard, FinanceWidgetShell, type FinanceWidgetDefinition } from '@/components/finance/FinanceWidgetBoard';
import {
  FinanceLegendList,
  FinanceWidgetEmptyState,
  formatFinanceCurrency,
  formatFinanceListCurrency,
  formatFinancePercent,
} from '@/components/finance/financeUtils';
import { chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { getClientDisplayName } from '@/lib/clientDisplay';
import {
  ensureInvoiceStoreReady,
  getInvoiceTrackingStatus,
  subscribeInvoiceSettingsStore,
  toggleInvoiceSent,
  toggleInvoicePaymentReceived,
} from '@/lib/invoiceStore';
import { Client, MONTH_NAMES, RevenueEntry } from '@/types/finance';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import { WorkspacePlusButton } from '@/components/ui/workspace-plus-button';
import { InvoicePreview } from './InvoicePreview';

interface ClientTabProps {
  clients: Client[];
  revenues: RevenueEntry[];
  addClient: (client: Omit<Client, 'id'>) => void;
  editClient: (id: string, updated: Partial<Omit<Client, 'id'>>) => void;
  selectedMonth: number;
  selectedYear: number;
  toolbarPortalTarget?: HTMLDivElement | null;
}

interface ClientFormState {
  name: string;
  pseudo: string;
  address: string;
  siren: string;
  email: string;
}

const EMPTY_CLIENT_FORM: ClientFormState = {
  name: '',
  pseudo: '',
  address: '',
  siren: '',
  email: '',
};

export function ClientTab({
  clients,
  revenues,
  addClient,
  editClient,
  selectedMonth,
  selectedYear,
  toolbarPortalTarget,
}: ClientTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [invoiceClient, setInvoiceClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState<ClientFormState>(EMPTY_CLIENT_FORM);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<ClientFormState>(EMPTY_CLIENT_FORM);
  const [invoiceTrackingVersion, setInvoiceTrackingVersion] = useState(0);
  const today = new Date();
  const lastVisibleMonth = selectedYear < today.getFullYear()
    ? 11
    : selectedYear === today.getFullYear()
      ? today.getMonth()
      : -1;

  useEffect(() => {
    void ensureInvoiceStoreReady()
      .then(() => setInvoiceTrackingVersion((current) => current + 1))
      .catch((): void => undefined);

    return subscribeInvoiceSettingsStore(() => {
      setInvoiceTrackingVersion((current) => current + 1);
    });
  }, []);

  const clientCards = useMemo(() => clients.map((client) => {
    const fullMonthlySeries = Array.from({ length: 12 }, (_, monthIndex) => {
      const value = revenues
        .filter((revenue) => revenue.client === client.name && revenue.year === selectedYear && revenue.month === monthIndex)
        .reduce((sum, revenue) => sum + revenue.amount, 0);
      return {
        month: MONTH_NAMES[monthIndex].slice(0, 3),
        value,
        active: monthIndex === selectedMonth,
      };
    });

    const monthlySeries = fullMonthlySeries.filter((month, index) => index <= lastVisibleMonth);
    const annualTotal = fullMonthlySeries.reduce((sum, month) => sum + month.value, 0);
    const selectedMonthTotal = fullMonthlySeries[selectedMonth]?.value ?? 0;
    const averageMonth = annualTotal / 12;
    const bestMonth = monthlySeries.length > 0
      ? monthlySeries.reduce((best, month) => month.value > best.value ? month : best, monthlySeries[0])
      : null;

    return {
      client,
      displayName: getClientDisplayName(client),
      monthlySeries,
      annualTotal,
      selectedMonthTotal,
      averageMonth,
      bestMonth,
    };
  }).sort((a, b) => b.annualTotal - a.annualTotal), [clients, revenues, selectedMonth, selectedYear, lastVisibleMonth]);

  const selectedClientCard = clientCards.find((clientCard) => clientCard.client.id === selectedClientId) ?? clientCards[0] ?? null;

  const handleAddClient = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: Omit<Client, 'id'> = {
      name: newClient.name.trim(),
      pseudo: newClient.pseudo.trim() || undefined,
      address: newClient.address.trim(),
      siren: newClient.siren.trim(),
      email: newClient.email.trim(),
    };
    if (!payload.name || !payload.siren || !payload.email) return;
    addClient(payload);
    setNewClient(EMPTY_CLIENT_FORM);
    setShowAddClient(false);
  };

  const startEditClient = (client: Client) => {
    setEditClientId(client.id);
    setEditFields({
      name: client.name,
      pseudo: client.pseudo ?? '',
      address: client.address,
      siren: client.siren,
      email: client.email ?? '',
    });
  };

  const saveClientEdit = (clientId: string) => {
    const payload: Partial<Omit<Client, 'id'>> = {
      name: editFields.name.trim(),
      pseudo: editFields.pseudo.trim() || undefined,
      address: editFields.address.trim(),
      siren: editFields.siren.trim(),
      email: editFields.email.trim(),
    };
    if (!payload.name || !payload.siren || !payload.email) return;
    editClient(clientId, payload);
    setEditClientId(null);
    setEditFields(EMPTY_CLIENT_FORM);
  };

  const activeClients = clientCards.filter((clientCard) => clientCard.selectedMonthTotal > 0);
  const topClient = activeClients[0] ?? clientCards[0] ?? null;
  const selectedMonthRevenue = clientCards.reduce((sum, clientCard) => sum + clientCard.selectedMonthTotal, 0);
  const topThreeShare = selectedMonthRevenue > 0
    ? (activeClients.slice(0, 3).reduce((sum, clientCard) => sum + clientCard.selectedMonthTotal, 0) / selectedMonthRevenue) * 100
    : 0;

  const comparisonData = activeClients.map((clientCard) => ({
    id: clientCard.client.id,
    name: clientCard.displayName,
    value: clientCard.selectedMonthTotal,
  }));
  const invoiceTrackingByClientId = useMemo(
    () => new Map(
      clientCards.map((clientCard) => [
        clientCard.client.id,
        getInvoiceTrackingStatus(clientCard.client.id, selectedYear, selectedMonth),
      ]),
    ),
    [clientCards, invoiceTrackingVersion, selectedMonth, selectedYear],
  );

  const widgets = useMemo<FinanceWidgetDefinition[]>(() => [
    {
      id: 'client-count',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Clients"
          title="Nombre total"
          value={clientCards.length.toLocaleString('fr-FR')}
          detail={`${activeClients.length} actifs sur le mois`}
          footer="Le carnet client reste éditable dans la liste"
          icon={<Users className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'client-active',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Activité"
          title="Clients actifs"
          value={activeClients.length.toLocaleString('fr-FR')}
          detail={selectedMonthRevenue > 0 ? `${formatFinanceCurrency(selectedMonthRevenue)} facturés ce mois-ci` : 'Aucun client actif sur la période'}
          footer="Clients avec au moins une ligne de revenu"
          icon={<BarChart3 className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'client-top',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Leader"
          title="Top client du mois"
          value={topClient?.displayName ?? '—'}
          detail={topClient ? formatFinanceCurrency(topClient.selectedMonthTotal) : 'Aucun chiffre sur le mois'}
          footer={topClient?.bestMonth ? `Pic annuel: ${topClient.bestMonth.month}` : 'Pas de pic annuel détecté'}
          icon={<FileText className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'client-concentration',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Concentration"
          title="Part des 3 premiers"
          value={formatFinancePercent(topThreeShare)}
          detail={selectedMonthRevenue > 0 ? `${formatFinanceCurrency(selectedMonthRevenue)} facturés ce mois-ci` : 'Aucun revenu ce mois-ci'}
          footer="Mesure la dispersion du portefeuille"
          icon={<Users className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'client-focus',
      defaultW: 6,
      defaultH: 12,
      minW: 5,
      node: (
        <FinanceWidgetShell kicker="Focus" title="Évolution du client sélectionné" icon={<BarChart3 className="h-4 w-4" />}>
          {selectedClientCard ? (
            <div className="grid h-full min-h-0 gap-4">
              <div className="finance-widget-stat-grid finance-widget-stat-grid--2">
                <div className="finance-widget-stat-card">
                  <span className="finance-widget-stat-label">Mois courant</span>
                  <span className="finance-widget-stat-value finance-number">{formatFinanceCurrency(selectedClientCard.selectedMonthTotal)}</span>
                </div>
                <div className="finance-widget-stat-card">
                  <span className="finance-widget-stat-label">Année</span>
                  <span className="finance-widget-stat-value finance-number">{formatFinanceCurrency(selectedClientCard.annualTotal)}</span>
                </div>
              </div>

              <div className="finance-widget-chart finance-widget-chart--tall">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedClientCard.monthlySeries}>
                    <defs>
                      <linearGradient id="financeClientFocus" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="month" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                    <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={2.2} fill="url(#financeClientFocus)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <FinanceWidgetEmptyState message="Ajoute un client pour afficher une évolution détaillée." />
          )}
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'client-comparison',
      defaultW: 6,
      defaultH: 12,
      minW: 5,
      node: (
        <FinanceWidgetShell kicker="Vue d’ensemble" title="CA mensuel comparé" icon={<Users className="h-4 w-4" />}>
          <div className="grid h-full min-h-0 gap-4">
            <div className="finance-widget-chart">
              {comparisonData.length === 0 ? (
                <FinanceWidgetEmptyState message="Aucun chiffre mensuel par client à comparer." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} horizontal={false} />
                    <XAxis type="number" tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                    <YAxis type="category" dataKey="name" tick={chartAxisStyle} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={10} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <FinanceLegendList
              items={clientCards.map((card) => ({ id: card.client.id, name: card.displayName, value: card.annualTotal }))}
              formatter={(value) => formatFinanceCurrency(value)}
              emptyMessage="Les cumuls annuels clients apparaîtront ici."
            />
          </div>
        </FinanceWidgetShell>
      ),
    },
  ], [
    activeClients.length,
    clientCards,
    comparisonData,
    selectedClientCard,
    selectedMonthRevenue,
    topClient,
    topThreeShare,
  ]);

  const listPanel = (
    <div className="surface-panel workspace-table-shell workspace-table-shell--compact finance-list-shell">
      <Table className="workspace-table-compact finance-list-table finance-list-table--client">
        <TableHeader>
          <TableRow className="border-white/8 bg-white/[0.03]">
            <TableHead className="text-slate-400">Client</TableHead>
            <TableHead className="w-[8.5rem] text-right text-slate-400">CA mensuel</TableHead>
            <TableHead className="w-[7.25rem] px-2 text-right text-slate-400">CA annuel</TableHead>
            <TableHead className="w-[2.4rem] px-0.5 text-center text-slate-400">
              <span className="inline-flex h-[1.35rem] w-[1.35rem] items-center justify-center text-base leading-none" role="img" aria-label="Facture" title="Facture">✉️</span>
            </TableHead>
            <TableHead className="w-[2.4rem] pl-0 pr-0.5 text-center text-slate-400">
              <span className="inline-flex h-[1.35rem] w-[1.35rem] items-center justify-center text-base leading-none" role="img" aria-label="Paiement" title="Paiement">💰</span>
            </TableHead>
            <TableHead className="w-[8.75rem] pl-4 pr-0 text-right text-slate-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientCards.map((clientCard) => {
            const isEditing = editClientId === clientCard.client.id;
            const invoiceTracking = invoiceTrackingByClientId.get(clientCard.client.id);
            return (
              <TableRow key={clientCard.client.id} className="border-white/6 hover:bg-white/[0.03]">
                <TableCell>
                  {isEditing ? (
                    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                      <input className="w-full rounded border px-2 py-1 text-sm" value={editFields.name} onChange={(event) => setEditFields((fields) => ({ ...fields, name: event.target.value }))} placeholder="Nom" />
                      <input className="w-full rounded border px-2 py-1 text-sm" value={editFields.pseudo} onChange={(event) => setEditFields((fields) => ({ ...fields, pseudo: event.target.value }))} placeholder="Pseudo" />
                      <input className="w-full rounded border px-2 py-1 text-sm" value={editFields.address} onChange={(event) => setEditFields((fields) => ({ ...fields, address: event.target.value }))} placeholder="Adresse" />
                      <input className="w-full rounded border px-2 py-1 text-sm" value={editFields.siren} onChange={(event) => setEditFields((fields) => ({ ...fields, siren: event.target.value }))} placeholder="SIREN" />
                      <input type="email" className="w-full rounded border px-2 py-1 text-sm" value={editFields.email} onChange={(event) => setEditFields((fields) => ({ ...fields, email: event.target.value }))} placeholder="Adresse mail" />
                    </div>
                  ) : (
                    <span className="cell-truncate max-w-[19ch] text-lg font-semibold tracking-tight text-slate-50" title={clientCard.displayName}>{clientCard.displayName}</span>
                  )}
                </TableCell>
                <TableCell className="text-right"><div className="font-mono-num text-lg text-slate-100">{formatFinanceListCurrency(clientCard.selectedMonthTotal)}</div></TableCell>
                <TableCell className="px-2 text-right"><div className="font-mono-num text-sm text-slate-400">{formatFinanceListCurrency(clientCard.annualTotal)}</div></TableCell>
                <TableCell className="px-0.5 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={invoiceTracking?.invoiceSent ?? false}
                      onCheckedChange={() => toggleInvoiceSent(clientCard.client.id, selectedYear, selectedMonth)}
                      aria-label={`Facture envoyée pour ${clientCard.displayName} sur ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                      title={invoiceTracking?.invoiceSent ? 'Facture envoyée' : 'Facture non envoyée'}
                      className="h-[1.35rem] w-[1.35rem] rounded-none border-emerald-500/50 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white"
                    />
                  </div>
                </TableCell>
                <TableCell className="pl-0 pr-0.5 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={invoiceTracking?.paymentReceived ?? false}
                      onCheckedChange={() => toggleInvoicePaymentReceived(clientCard.client.id, selectedYear, selectedMonth)}
                      aria-label={`Paiement reçu pour ${clientCard.displayName} sur ${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
                      title={invoiceTracking?.paymentReceived ? 'Paiement reçu' : 'Paiement non reçu'}
                      className="h-[1.35rem] w-[1.35rem] rounded-none border-emerald-500/50 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white"
                    />
                  </div>
                </TableCell>
                <TableCell className="pl-4 pr-0 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <Button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => saveClientEdit(clientCard.client.id)}>Enregistrer</Button>
                      <Button type="button" variant="ghost" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10" onClick={() => { setEditClientId(null); setEditFields(EMPTY_CLIENT_FORM); }}>Annuler</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-accent/30 hover:bg-white/10 hover:text-white" onClick={() => startEditClient(clientCard.client)} title="Modifier" aria-label="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-accent/30 hover:bg-white/10 hover:text-white" onClick={() => setSelectedClientId(clientCard.client.id)} title="Voir les statistiques" aria-label="Voir les statistiques">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-accent/30 hover:bg-white/10 hover:text-white" onClick={() => setInvoiceClient(clientCard.client)} title="Sortir la facture" aria-label="Sortir la facture">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const addButton = (
    <WorkspacePlusButton
      onClick={() => setShowAddClient(true)}
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
        open={showAddClient}
        onOpenChange={setShowAddClient}
        title="Ajouter un client"
        className="max-w-[min(92vw,42rem)]"
      >
        <form className="grid gap-4" onSubmit={handleAddClient}>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nom</span>
              <input className="h-9 rounded-xl border px-3 text-sm" value={newClient.name} onChange={(event) => setNewClient((fields) => ({ ...fields, name: event.target.value }))} required />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pseudo</span>
              <input className="h-9 rounded-xl border px-3 text-sm" value={newClient.pseudo} onChange={(event) => setNewClient((fields) => ({ ...fields, pseudo: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.05fr_1.35fr]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Adresse</span>
              <input className="h-9 rounded-xl border px-3 text-sm" value={newClient.address} onChange={(event) => setNewClient((fields) => ({ ...fields, address: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</span>
              <input type="email" className="h-9 rounded-xl border px-3 text-sm" value={newClient.email} onChange={(event) => setNewClient((fields) => ({ ...fields, email: event.target.value }))} required />
            </div>
          </div>

          <div className="grid gap-2 sm:max-w-[150px]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">SIREN</span>
              <input className="h-9 rounded-xl border px-3 text-sm" value={newClient.siren} onChange={(event) => setNewClient((fields) => ({ ...fields, siren: event.target.value }))} required />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full px-4">
              <Plus className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </form>
      </WorkspacePopup>

      <FinanceWidgetBoard
        storageScope="finance-client-widgets-v8"
        widgets={widgets}
        emptyMessage="Tous les visuels clients sont masqués."
        anchor={{
          id: 'client-list-anchor',
          node: listPanel,
          minRows: 18,
          lg: { w: 6 },
          md: { w: 5 },
          sm: { w: 4 },
        }}
      />

      {invoiceClient ? (
        <InvoicePreview
          client={invoiceClient}
          revenues={revenues.filter((revenue) => {
            if (revenue.client !== invoiceClient.name) return false;
            const revenueDate = new Date(revenue.date);
            return revenueDate.getMonth() === selectedMonth && revenueDate.getFullYear() === selectedYear;
          })}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onClose={() => setInvoiceClient(null)}
        />
      ) : null}
    </div>
  );
}
