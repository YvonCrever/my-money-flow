import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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
  PieChart as PieChartIcon,
  Plus,
  RotateCw,
  TrendingDown,
  UtensilsCrossed,
  WalletCards,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FinanceMetricWidget, FinanceWidgetBoard, FinanceWidgetShell, type FinanceWidgetDefinition } from '@/components/finance/FinanceWidgetBoard';
import {
  FinanceLegendList,
  FinanceWidgetEmptyState,
  formatFinanceCurrency,
  formatFinanceDay,
  formatFinanceListCurrency,
  formatFinancePercent,
} from '@/components/finance/financeUtils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import { WorkspacePlusButton } from '@/components/ui/workspace-plus-button';
import { CHART_PALETTE, chartAxisStyle, chartGridStroke, chartTooltipStyle } from '@/lib/chartTheme';
import { type DateSortDirection, sortEntriesByIsoDate } from '@/lib/dateSort';
import { EXPENSE_CATEGORIES, ExpenseCategory, ExpenseEntry } from '@/types/finance';

interface ExpenseTabProps {
  expenses: ExpenseEntry[];
  expensesByCategory: Record<string, number>;
  onAdd: (entry: Omit<ExpenseEntry, 'id' | 'month' | 'year'>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updated: Partial<Omit<ExpenseEntry, 'id' | 'month' | 'year'>>) => void;
  toolbarPortalTarget?: HTMLDivElement | null;
}

export function ExpenseTab({ expenses, expensesByCategory, onAdd, onDelete, onEdit, toolbarPortalTarget }: ExpenseTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Autres');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<ExpenseEntry>>({});
  const [dateSortDirection, setDateSortDirection] = useState<DateSortDirection>('desc');

  const handleAdd = () => {
    if (!date || !amount) return;
    onAdd({ date, category, description, amount: Number(amount), isRecurring });
    setDate('');
    setDescription('');
    setAmount('');
    setIsRecurring(false);
    setIsAddOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleAdd();
  };

  const totalExpenses = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const sortedExpenses = useMemo(
    () => sortEntriesByIsoDate(expenses, dateSortDirection),
    [expenses, dateSortDirection],
  );
  const expensesPieData = useMemo(
    () => Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    [expensesByCategory],
  );

  const expensesByDay = useMemo(() => {
    const totals = new Map<string, number>();
    expenses
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((expense) => {
        totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
      });

    let cumulative = 0;
    return Array.from(totals.entries()).map(([day, dayAmount]) => {
      cumulative += dayAmount;
      return {
        day,
        label: formatFinanceDay(day),
        amount: dayAmount,
        cumulative,
      };
    });
  }, [expenses]);

  const foodByDay = useMemo(() => {
    const foodMap = new Map<string, { maison: number; exterieur: number }>();
    expenses
      .filter((expense) => expense.category === 'Alimentation maison' || expense.category === 'Alimentation extérieur')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((expense) => {
        const current = foodMap.get(expense.date) ?? { maison: 0, exterieur: 0 };
        if (expense.category === 'Alimentation maison') current.maison += expense.amount;
        if (expense.category === 'Alimentation extérieur') current.exterieur += expense.amount;
        foodMap.set(expense.date, current);
      });

    return Array.from(foodMap.entries()).map(([day, totals]) => ({
      day,
      label: formatFinanceDay(day),
      maison: totals.maison,
      exterieur: totals.exterieur,
    }));
  }, [expenses]);

  const leisureStats = useMemo(() => {
    const entries = expenses.filter((expense) => expense.category === 'Loisirs');
    const totalLeisure = entries.reduce((sum, expense) => sum + expense.amount, 0);
    const uniqueDays = new Set(entries.map((expense) => expense.date)).size;
    const uniqueWeeks = new Set(
      entries.map((expense) => {
        const dateValue = new Date(expense.date);
        const startOfYear = new Date(dateValue.getFullYear(), 0, 1);
        const diff = Math.floor((dateValue.getTime() - startOfYear.getTime()) / 86400000);
        return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
      }),
    ).size;

    return {
      perDay: uniqueDays > 0 ? totalLeisure / uniqueDays : 0,
      perWeek: uniqueWeeks > 0 ? totalLeisure / uniqueWeeks : 0,
    };
  }, [expenses]);

  const recurringShare = useMemo(() => {
    const recurringTotal = expenses.filter((expense) => expense.isRecurring).reduce((sum, expense) => sum + expense.amount, 0);
    return totalExpenses > 0 ? (recurringTotal / totalExpenses) * 100 : 0;
  }, [expenses, totalExpenses]);

  const topCategory = expensesPieData[0];
  const averageExpensePerEntry = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  const widgets = useMemo<FinanceWidgetDefinition[]>(() => [
    {
      id: 'expense-total',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Dépenses"
          title="Sorties du mois"
          value={formatFinanceCurrency(totalExpenses)}
          detail={`${expenses.length} entrée${expenses.length > 1 ? 's' : ''}`}
          footer={topCategory ? `Catégorie dominante: ${topCategory.name}` : 'Aucune dépense saisie'}
          icon={<TrendingDown className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'expense-count',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Flux"
          title="Nombre d’entrées"
          value={expenses.length.toLocaleString('fr-FR')}
          detail={expenses.length > 0 ? `${formatFinanceCurrency(averageExpensePerEntry)} par ligne` : 'Ajoute une première dépense'}
          footer="Chaque ligne reste éditable dans la liste"
          icon={<WalletCards className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'expense-average',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Moyenne"
          title="Montant par entrée"
          value={formatFinanceCurrency(averageExpensePerEntry)}
          detail={expenses.length > 0 ? `${formatFinanceCurrency(totalExpenses)} répartis sur ${expenses.length} lignes` : 'Aucune donnée'}
          footer="Permet de sentir la taille moyenne des sorties"
          icon={<PieChartIcon className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'expense-recurring',
      defaultRegion: 'right',
      defaultW: 3,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Récurrence"
          title="Part récurrente"
          value={formatFinancePercent(recurringShare)}
          detail="Poids des dépenses marquées comme récurrentes"
          footer={foodByDay.length > 0 ? `${foodByDay.length} jour${foodByDay.length > 1 ? 's' : ''} avec dépenses alimentaires` : 'Aucun flux alimentaire détecté'}
          icon={<RotateCw className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'expense-top-category',
      defaultRegion: 'right',
      defaultW: 4,
      defaultH: 5,
      node: (
        <FinanceMetricWidget
          kicker="Dominante"
          title="Catégorie la plus lourde"
          value={topCategory?.name ?? '—'}
          detail={topCategory ? formatFinanceCurrency(topCategory.value) : 'Aucune catégorie dominante'}
          footer={leisureStats.perWeek > 0 ? `Loisirs actifs: ${formatFinanceCurrency(leisureStats.perWeek)} / semaine` : 'Loisirs non détectés'}
          icon={<TrendingDown className="h-4 w-4" />}
        />
      ),
    },
    {
      id: 'expense-split',
      defaultW: 4,
      defaultH: 11,
      minW: 4,
      node: (
        <FinanceWidgetShell kicker="Répartition" title="Où part l’argent" icon={<PieChartIcon className="h-4 w-4" />}>
          <div className="finance-widget-split finance-widget-split--chart">
            <div className="finance-widget-chart finance-widget-chart--tall">
              {expensesPieData.length === 0 ? (
                <FinanceWidgetEmptyState message="Ajoute des dépenses pour afficher les catégories." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensesPieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                      {expensesPieData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <FinanceLegendList
              items={expensesPieData}
              formatter={(value) => formatFinanceCurrency(value)}
              emptyMessage="Aucune catégorie n’est encore alimentée."
            />
          </div>
        </FinanceWidgetShell>
      ),
    },
    {
      id: 'expense-tempo',
      defaultW: 8,
      defaultH: 13,
      minW: 6,
      node: (
        <FinanceWidgetShell kicker="Tempo" title="Cumul, rythme quotidien et alimentation" icon={<UtensilsCrossed className="h-4 w-4" />}>
          <div className="grid h-full min-h-0 gap-4">
            <div className="finance-widget-chart">
              {expensesByDay.length === 0 ? (
                <FinanceWidgetEmptyState message="La courbe de dépense apparaîtra avec tes premières sorties." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={expensesByDay}>
                    <defs>
                      <linearGradient id="financeExpenseFlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.36} />
                        <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                    <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="cumulative" stroke="hsl(var(--chart-4))" strokeWidth={2.2} fill="url(#financeExpenseFlow)" />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="finance-widget-chart">
                {foodByDay.length === 0 ? (
                  <FinanceWidgetEmptyState message="Les dépenses alimentation maison / extérieur apparaîtront ici." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={foodByDay}>
                      <CartesianGrid strokeDasharray="2 10" stroke={chartGridStroke} vertical={false} />
                      <XAxis dataKey="label" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={chartAxisStyle} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                      <Tooltip formatter={(value: number) => formatFinanceCurrency(value)} contentStyle={chartTooltipStyle} />
                      <Bar dataKey="maison" name="Maison" stackId="food" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="exterieur" name="Extérieur" stackId="food" fill="hsl(var(--chart-5))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="finance-widget-stat-grid">
                <div className="finance-widget-stat-card">
                  <span className="finance-widget-stat-label">Loisirs / jour actif</span>
                  <span className="finance-widget-stat-value finance-number">{formatFinanceCurrency(leisureStats.perDay)}</span>
                </div>
                <div className="finance-widget-stat-card">
                  <span className="finance-widget-stat-label">Loisirs / semaine active</span>
                  <span className="finance-widget-stat-value finance-number">{formatFinanceCurrency(leisureStats.perWeek)}</span>
                </div>
              </div>
            </div>
          </div>
        </FinanceWidgetShell>
      ),
    },
  ], [
    averageExpensePerEntry,
    expenses.length,
    expensesByDay,
    expensesPieData,
    foodByDay,
    leisureStats.perDay,
    leisureStats.perWeek,
    recurringShare,
    topCategory,
    totalExpenses,
  ]);

  const listPanel = (
    <div className="surface-panel workspace-table-shell workspace-table-shell--compact finance-list-shell">
      <Table className="workspace-table-compact finance-list-table finance-list-table--expense">
        <TableHeader>
          <TableRow className="border-white/6 bg-white/[0.03]">
            <TableHead className="text-slate-400" aria-sort={dateSortDirection === 'desc' ? 'descending' : 'ascending'}>
              <button
                type="button"
                onClick={() => setDateSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
                className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-inherit transition-colors hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                aria-label={dateSortDirection === 'desc' ? 'Trier les dépenses du plus ancien au plus récent' : 'Trier les dépenses du plus récent au plus ancien'}
              >
                <span>Date</span>
                {dateSortDirection === 'desc' ? (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </TableHead>
            <TableHead className="text-slate-400">Catégorie</TableHead>
            <TableHead className="text-slate-400">Description</TableHead>
            <TableHead className="text-right text-slate-400">Montant</TableHead>
            <TableHead className="text-center text-slate-400">Récurrent</TableHead>
            <TableHead className="w-[76px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-slate-500">Aucune dépense pour cette période</TableCell>
            </TableRow>
          ) : (
            sortedExpenses.map((expense) => {
              const isEditing = editingId === expense.id;
              return (
                <TableRow key={expense.id} className="border-white/6 hover:bg-white/[0.03]">
                  <TableCell className="font-mono-num text-sm text-slate-300">
                    {isEditing ? (
                      <Input type="date" value={(editFields.date as string) || ''} onChange={(event) => setEditFields((fields) => ({ ...fields, date: event.target.value }))} />
                    ) : formatFinanceDay(expense.date)}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={(editFields.category as ExpenseCategory) || expense.category} onValueChange={(value) => setEditFields((fields) => ({ ...fields, category: value as ExpenseCategory }))}>
                        <SelectTrigger className="w-[150px] rounded-xl border border-white/10 bg-white/5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((expenseCategory) => (
                            <SelectItem key={expenseCategory} value={expenseCategory}>{expenseCategory}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="cell-badge">{expense.category}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input value={(editFields.description as string) || ''} onChange={(event) => setEditFields((fields) => ({ ...fields, description: event.target.value }))} />
                    ) : (
                      <span className="cell-truncate max-w-[16rem] text-slate-300" title={expense.description}>{expense.description}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono-num font-semibold text-slate-100">
                    {isEditing ? (
                      <Input type="number" value={(editFields.amount as number) || ''} onChange={(event) => setEditFields((fields) => ({ ...fields, amount: Number(event.target.value) }))} />
                    ) : formatFinanceListCurrency(expense.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                      <Switch checked={!!editFields.isRecurring} onCheckedChange={(value) => setEditFields((fields) => ({ ...fields, isRecurring: value }))} />
                    ) : (
                      expense.isRecurring ? <RotateCw className="mx-auto h-3.5 w-3.5 text-slate-400" /> : null
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          onClick={() => {
                            if (editFields.date && editFields.category && editFields.amount !== undefined) {
                              onEdit(expense.id, {
                                date: editFields.date,
                                category: editFields.category,
                                description: editFields.description,
                                amount: Number(editFields.amount),
                                isRecurring: editFields.isRecurring,
                              });
                              setEditingId(null);
                              setEditFields({});
                            }
                          }}
                          className="h-8 w-8 rounded-full border border-white/10 bg-white/5"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" onClick={() => { setEditingId(null); setEditFields({}); }} className="h-8 w-8 rounded-full border border-white/10 bg-white/5">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)} className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingId(expense.id); setEditFields({ ...expense }); }} className="h-8 w-8 rounded-full text-slate-400 hover:bg-white/5 hover:text-white">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
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
        title="Ajouter une dépense"
        className="max-w-[min(92vw,38rem)]"
      >
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); handleAdd(); }}>
          <div className="grid gap-4 sm:grid-cols-[156px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} onKeyDown={handleKeyDown} className="h-9" />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Catégorie</span>
              <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
                <SelectTrigger className="h-9 w-full rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((expenseCategory) => (
                    <SelectItem key={expenseCategory} value={expenseCategory}>{expenseCategory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</span>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} onKeyDown={handleKeyDown} placeholder="Description" className="h-9" />
          </div>

          <div className="grid gap-4 sm:grid-cols-[132px_1fr_auto]">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Montant</span>
              <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="h-9" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Récurrent</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-300">{isRecurring ? 'Oui' : 'Non'}</span>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
            </div>
            <div className="flex items-end justify-end">
              <div className="workspace-chip">
                Total
                <span className="font-mono-num text-slate-100">{formatFinanceCurrency(totalExpenses)}</span>
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
        storageScope="finance-expense-widgets-v8"
        widgets={widgets}
        emptyMessage="Tous les visuels de dépenses sont masqués."
        anchor={{
          id: 'expense-list-anchor',
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
