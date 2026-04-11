import { useEffect } from 'react';
import { useAppPageChrome } from '@/components/AppChromeProvider';
import { FeatureLoadWarning } from '@/components/FeatureLoadWarning';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthYearFilter } from '@/components/MonthYearFilter';
import { RevenueTab } from '@/components/RevenueTab';
import { ExpenseTab } from '@/components/ExpenseTab';
import { Dashboard } from '@/components/Dashboard';
import { ClientTab } from '@/components/ClientTab';
import { DataTab } from '@/components/DataTab';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import type { FinancePageTab } from '@/features/finance/financeTabs';
import useFinanceData from '@/hooks/useFinanceData';
import { ArrowLeft, LayoutDashboard, TrendingDown, TrendingUp, Users } from 'lucide-react';

type FinanceData = ReturnType<typeof useFinanceData>;

interface FinancePageProps {
  data: FinanceData;
  activeTab: FinancePageTab;
  onTabChange: (tab: FinancePageTab) => void;
}

export default function FinancePage({ data, activeTab, onTabChange }: FinancePageProps) {
  const { actionsTarget, inlineToolsTarget, leadingTarget } = useAppPageChrome('finance');
  const isDataRoute = activeTab === 'donnees';

  useEffect(() => {
    if (!data.isLoaded) return;
    data.applyRecurring(data.selectedMonth, data.selectedYear);
  }, [data.applyRecurring, data.isLoaded, data.selectedMonth, data.selectedYear]);

  return (
    <div className="page-workspace finance-scope">
      {data.loadError ? (
        <FeatureLoadWarning
          title="Probleme de stockage des Finances"
          description={data.loadError}
          className="mb-5"
        />
      ) : null}

      <Tabs value={activeTab} onValueChange={(tab) => onTabChange(tab as FinancePageTab)} className="space-y-4">
        <ToolbarPortal target={leadingTarget}>
          <TabsList aria-label="Navigation finance" className="page-subnav-tabs h-auto w-full sm:w-auto">
            <TabsTrigger value="dashboard" className="app-masthead-item app-masthead-tab-trigger gap-1.5">
              <LayoutDashboard className="h-4 w-4 sm:hidden" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="revenus" className="app-masthead-item app-masthead-tab-trigger gap-1.5">
              <TrendingUp className="h-4 w-4 sm:hidden" />
              Revenus
            </TabsTrigger>
            <TabsTrigger value="depenses" className="app-masthead-item app-masthead-tab-trigger gap-1.5">
              <TrendingDown className="h-4 w-4 sm:hidden" />
              Dépenses
            </TabsTrigger>
            <TabsTrigger value="clients" className="app-masthead-item app-masthead-tab-trigger gap-1.5">
              <Users className="h-4 w-4 sm:hidden" />
              Clients
            </TabsTrigger>
          </TabsList>
        </ToolbarPortal>

        {!isDataRoute ? (
          <ToolbarPortal target={actionsTarget}>
            <MonthYearFilter
              selectedMonth={data.selectedMonth}
              selectedYear={data.selectedYear}
              onMonthChange={data.setSelectedMonth}
              onYearChange={data.setSelectedYear}
              compact
            />
          </ToolbarPortal>
        ) : null}

        <TabsContent value="clients" className="mt-0">
          <ClientTab
            clients={data.clients}
            revenues={data.revenues}
            addClient={data.addClient}
            editClient={data.editClient}
            selectedMonth={data.selectedMonth}
            selectedYear={data.selectedYear}
            toolbarPortalTarget={inlineToolsTarget ?? null}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-0">
          <Dashboard
            monthlySummary={data.monthlySummary}
            totalRevenue={data.totalRevenue}
            totalExpenses={data.totalExpenses}
            profit={data.profit}
            selectedYear={data.selectedYear}
            revenueByClient={data.revenueByClient}
            clients={data.clients}
            revenues={data.filteredRevenues}
          />
        </TabsContent>

        <TabsContent value="revenus" className="mt-0">
          <RevenueTab
            revenues={data.filteredRevenues}
            revenueByClient={data.revenueByClient}
            onAdd={data.addRevenue}
            onDelete={data.deleteRevenue}
            onEdit={data.editRevenue}
            clients={data.clients}
            toolbarPortalTarget={inlineToolsTarget ?? null}
          />
        </TabsContent>

        <TabsContent value="depenses" className="mt-0">
          <ExpenseTab
            expenses={data.filteredExpenses}
            expensesByCategory={data.expensesByCategory}
            onAdd={data.addExpense}
            onDelete={data.deleteExpense}
            onEdit={data.editExpense}
            toolbarPortalTarget={inlineToolsTarget ?? null}
          />
        </TabsContent>

        <TabsContent value="donnees" className="mt-0">
          <div className="space-y-4">
            <section className="surface-panel flex flex-col gap-4 rounded-[1.8rem] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">Administration</p>
                <h2 className="text-lg font-semibold text-slate-100">Données & sauvegardes</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Centre local du profil, des sauvegardes et de la restauration, accessible depuis Options.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => onTabChange('dashboard')}
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au dashboard
              </Button>
            </section>

            <DataTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
