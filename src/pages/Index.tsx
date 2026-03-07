import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthYearFilter } from '@/components/MonthYearFilter';
import { RevenueTab } from '@/components/RevenueTab';
import { ExpenseTab } from '@/components/ExpenseTab';
import { Dashboard } from '@/components/Dashboard';
import { ClientTab } from '@/components/ClientTab';
import useFinanceData from '@/hooks/useFinanceData';
import { MONTH_NAMES } from '@/types/finance';
import { TrendingUp, TrendingDown, LayoutDashboard } from 'lucide-react';

const Index = () => {
  const data = useFinanceData();

  // Apply recurring expenses when month/year changes
  useEffect(() => {
    data.applyRecurring(data.selectedMonth, data.selectedYear);
  }, [data.selectedMonth, data.selectedYear]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Mes Finances</h1>
            <p className="text-sm text-muted-foreground">
              {MONTH_NAMES[data.selectedMonth]} {data.selectedYear}
            </p>
          </div>
          <MonthYearFilter
            selectedMonth={data.selectedMonth}
            selectedYear={data.selectedYear}
            onMonthChange={data.setSelectedMonth}
            onYearChange={data.setSelectedYear}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="revenus" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Revenus
            </TabsTrigger>
            <TabsTrigger value="depenses" className="gap-1.5">
              <TrendingDown className="h-4 w-4" />
              Dépenses
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5">
              <span className="h-4 w-4 inline-block">👤</span>
              Clients
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clients">
            <ClientTab clients={data.clients} revenues={data.revenues} />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard
              monthlySummary={data.monthlySummary}
              totalRevenue={data.totalRevenue}
              totalExpenses={data.totalExpenses}
              profit={data.profit}
              selectedYear={data.selectedYear}
            />
          </TabsContent>

          <TabsContent value="revenus">
            <RevenueTab
              revenues={data.filteredRevenues}
              revenueByClient={data.revenueByClient}
              onAdd={data.addRevenue}
              onDelete={data.deleteRevenue}
              onEdit={data.editRevenue}
              clients={data.clients}
              onAddClient={data.addClient}
              onEditClient={data.editClient}
              onRemoveClient={data.removeClient}
            />
          </TabsContent>

          <TabsContent value="depenses">
            <ExpenseTab
              expenses={data.filteredExpenses}
              expensesByCategory={data.expensesByCategory}
              onAdd={data.addExpense}
              onDelete={data.deleteExpense}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
