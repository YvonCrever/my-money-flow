import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RevenueEntry } from '@/types/finance';
import { Trash2, Plus } from 'lucide-react';

interface RevenueTabProps {
  revenues: RevenueEntry[];
  revenueByClient: Record<string, number>;
  onAdd: (entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) => void;
  onDelete: (id: string) => void;
}

export function RevenueTab({ revenues, revenueByClient, onAdd, onDelete }: RevenueTabProps) {
  const [date, setDate] = useState('');
  const [client, setClient] = useState('');
  const [service, setService] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hours, setHours] = useState('');

  const handleAdd = () => {
    if (!date || !client || !service || !hourlyRate || !hours) return;
    onAdd({ date, client, service, hourlyRate: Number(hourlyRate), hours: Number(hours) });
    setDate(''); setClient(''); setService(''); setHourlyRate(''); setHours('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const total = revenues.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Input row */}
      <div className="flex items-end gap-2 flex-wrap rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={handleKeyDown} className="w-[140px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Client</label>
          <Input value={client} onChange={e => setClient(e.target.value)} onKeyDown={handleKeyDown} placeholder="Nom du client" className="w-[150px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Prestation</label>
          <Input value={service} onChange={e => setService(e.target.value)} onKeyDown={handleKeyDown} placeholder="Description" className="w-[180px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Taux horaire (€)</label>
          <Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="w-[110px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Heures</label>
          <Input type="number" value={hours} onChange={e => setHours(e.target.value)} onKeyDown={handleKeyDown} placeholder="0" className="w-[80px]" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Montant</label>
          <div className="h-9 flex items-center px-3 rounded-md bg-muted font-mono text-sm w-[100px]">
            {hourlyRate && hours ? `${(Number(hourlyRate) * Number(hours)).toFixed(2)} €` : '—'}
          </div>
        </div>
        <Button onClick={handleAdd} size="sm" className="bg-revenue text-revenue-foreground hover:bg-revenue/90">
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Revenue by client summary */}
      {Object.keys(revenueByClient).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(revenueByClient).map(([cl, amt]) => (
            <div key={cl} className="rounded-lg border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">{cl}</p>
              <p className="font-mono text-sm font-semibold text-revenue">{amt.toFixed(2)} €</p>
            </div>
          ))}
          <div className="rounded-lg border-2 border-revenue/30 bg-revenue/5 px-4 py-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-mono text-sm font-bold text-revenue">{total.toFixed(2)} €</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Prestation</TableHead>
              <TableHead className="text-right">Taux</TableHead>
              <TableHead className="text-right">Heures</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucun revenu pour cette période
                </TableCell>
              </TableRow>
            ) : (
              revenues.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{new Date(r.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="font-medium">{r.client}</TableCell>
                  <TableCell>{r.service}</TableCell>
                  <TableCell className="text-right font-mono">{r.hourlyRate.toFixed(2)} €</TableCell>
                  <TableCell className="text-right font-mono">{r.hours}h</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-revenue">{r.amount.toFixed(2)} €</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
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
