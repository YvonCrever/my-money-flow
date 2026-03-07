import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ExpenseEntry, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types/finance';
import { Trash2, Plus, RotateCw } from 'lucide-react';

interface ExpenseTabProps {
  expenses: ExpenseEntry[];
  expensesByCategory: Record<string, number>;
  onAdd: (entry: Omit<ExpenseEntry, 'id' | 'month' | 'year'>) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTab({ expenses, expensesByCategory, onAdd, onDelete }: ExpenseTabProps) {
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Autres');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleAdd = () => {
    if (!date || !amount) return;
    onAdd({ date, category, description, amount: Number(amount), isRecurring });
    setDate(''); setDescription(''); setAmount(''); setIsRecurring(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Input row */}
      <div className="flex items-end gap-2 flex-wrap rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={handleKeyDown} className="w-[140px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Catégorie</label>
          <Select value={category} onValueChange={v => setCategory(v as ExpenseCategory)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input value={description} onChange={e => setDescription(e.target.value)} onKeyDown={handleKeyDown} placeholder="Description" className="w-[180px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Montant (€)</label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="w-[110px]" />
        </div>
        <div className="space-y-1 flex flex-col items-center">
          <label className="text-xs font-medium text-muted-foreground">Récurrent</label>
          <Switch checked={isRecurring} onCheckedChange={setIsRecurring} className="mt-1" />
        </div>
        <Button onClick={handleAdd} size="sm" className="bg-expense text-expense-foreground hover:bg-expense/90">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Category summary */}
      {Object.keys(expensesByCategory).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(expensesByCategory).map(([cat, amt]) => (
            <div key={cat} className="rounded-lg border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">{cat}</p>
              <p className="font-mono text-sm font-semibold text-expense">{amt.toFixed(2)} €</p>
            </div>
          ))}
          <div className="rounded-lg border-2 border-expense/30 bg-expense/5 px-4 py-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-mono text-sm font-bold text-expense">{total.toFixed(2)} €</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-center">Récurrent</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucune dépense pour cette période
                </TableCell>
              </TableRow>
            ) : (
              expenses.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{new Date(e.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      {e.category}
                    </span>
                  </TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-expense">{e.amount.toFixed(2)} €</TableCell>
                  <TableCell className="text-center">
                    {e.isRecurring && <RotateCw className="h-3.5 w-3.5 mx-auto text-muted-foreground" />}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
