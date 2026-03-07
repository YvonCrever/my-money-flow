import { useEffect, useRef } from 'react';
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

  // Export all data as JSON
  const handleExport = () => {
    const exportData = {
      clients: data.clients,
      revenues: data.revenues,
      expenses: data.expenses,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mes-finances-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import data from JSON
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.clients && imported.revenues && imported.expenses) {
          localStorage.setItem('finance_clients', JSON.stringify(imported.clients));
          localStorage.setItem('finance_revenues', JSON.stringify(imported.revenues));
          localStorage.setItem('finance_expenses', JSON.stringify(imported.expenses));
          window.location.reload();
        } else {
          alert('Fichier invalide.');
        }
      } catch {
        alert('Erreur lors de l\'import.');
      }
    };
    reader.readAsText(file);
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/80 border border-primary"
              title="Exporter les données"
            >
              Exporter
            </button>
            <button
              onClick={handleImportClick}
              className="px-3 py-1 rounded bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80 border border-secondary"
              title="Importer des données"
            >
              Importer
            </button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            <MonthYearFilter
              selectedMonth={data.selectedMonth}
              selectedYear={data.selectedYear}
              onMonthChange={data.setSelectedMonth}
              onYearChange={data.setSelectedYear}
            />
          </div>
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
