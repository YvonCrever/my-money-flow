import { MONTH_NAMES } from '@/types/finance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  monthlySummary: { month: number; revenue: number; expenses: number; profit: number }[];
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  selectedYear: number;
}

export function Dashboard({ monthlySummary, totalRevenue, totalExpenses, profit, selectedYear }: DashboardProps) {
  const chartData = monthlySummary.map(m => ({
    name: MONTH_NAMES[m.month].slice(0, 3),
    Revenus: m.revenue,
    Dépenses: m.expenses,
    Bénéfice: m.profit,
  }));

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Revenus du mois</p>
          <p className="text-2xl font-bold font-mono text-revenue">{totalRevenue.toFixed(2)} €</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Dépenses du mois</p>
          <p className="text-2xl font-bold font-mono text-expense">{totalExpenses.toFixed(2)} €</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground mb-1">Bénéfice du mois</p>
          <p className={`text-2xl font-bold font-mono ${profit >= 0 ? 'text-revenue' : 'text-expense'}`}>
            {profit >= 0 ? '+' : ''}{profit.toFixed(2)} €
          </p>
        </div>
      </div>

      {/* Monthly comparison chart */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Comparaison mensuelle — {selectedYear}</h3>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} €`]}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220 15% 88%)', fontSize: '13px' }}
              />
              <Legend />
              <Bar dataKey="Revenus" fill="hsl(160 50% 42%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dépenses" fill="hsl(0 72% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit chart */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">Bénéfice mensuel — {selectedYear}</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}€`} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)} €`]}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220 15% 88%)', fontSize: '13px' }}
              />
              <Bar dataKey="Bénéfice" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.Bénéfice >= 0 ? 'hsl(160 50% 42%)' : 'hsl(0 72% 55%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
