import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RevenueEntry, Client } from '@/types/finance';
import { Trash2, Plus } from 'lucide-react';

  revenues: RevenueEntry[];
  revenueByClient: Record<string, number>;
  onAdd: (entry: Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updated: Partial<Omit<RevenueEntry, 'id' | 'month' | 'year' | 'amount'>>) => void;
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onEditClient?: (id: string, updated: Partial<Omit<Client, 'id'>>) => void;
  onRemoveClient: (id: string) => void;
}

export function RevenueTab({ revenues, revenueByClient, onAdd, onDelete, onEdit, clients, onAddClient, onEditClient, onRemoveClient }: RevenueTabProps) {
  const [date, setDate] = useState('');
  const [clientId, setClientId] = useState('');
  const [service, setService] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [hours, setHours] = useState('');
  const [showClientManager, setShowClientManager] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', address: '', siren: '' });
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editClientFields, setEditClientFields] = useState<Partial<Omit<Client, 'id'>>>({});

  const handleAdd = () => {
    if (!date || !clientId || !service || !hourlyRate || !hours) return;
    const clientObj = clients.find(c => c.id === clientId);
    onAdd({ date, client: clientObj ? clientObj.name : '', service, hourlyRate: Number(hourlyRate), hours: Number(hours) });
    setDate(''); setClientId(''); setService(''); setHourlyRate(''); setHours('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const total = revenues.reduce((s, r) => s + r.amount, 0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<RevenueEntry>>({});

  const startEdit = (r: RevenueEntry) => {
    setEditingId(r.id);
    setEditFields({
      date: r.date,
      client: r.client,
      service: r.service,
      hourlyRate: r.hourlyRate,
      hours: r.hours,
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
    });
    setEditingId(null);
    setEditFields({});
  };

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
          <div className="flex gap-1 items-center">
            <select
              className="border rounded px-2 py-1 text-sm bg-background"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button size="icon" type="button" onClick={() => setShowClientManager(v => !v)} className="h-8 w-8 px-0">👤</Button>
          </div>
          {showClientManager && (
            <div className="mt-2 p-2 border rounded bg-muted">
              <div className="flex gap-2 mb-2">
                <Input value={newClient.name} onChange={e => setNewClient(f => ({ ...f, name: e.target.value }))} placeholder="Nom" className="w-[100px]" />
                <Input value={newClient.address} onChange={e => setNewClient(f => ({ ...f, address: e.target.value }))} placeholder="Adresse" className="w-[120px]" />
                <Input value={newClient.siren} onChange={e => setNewClient(f => ({ ...f, siren: e.target.value }))} placeholder="SIREN" className="w-[90px]" />
                <Button size="sm" type="button" onClick={() => {
                  if (newClient.name && newClient.siren) { onAddClient(newClient); setNewClient({ name: '', address: '', siren: '' }); }
                }}>Ajouter</Button>
              </div>
              <ul className="space-y-1">
                {clients.map(c => (
                  <li key={c.id} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                    {editClientId === c.id ? (
                      <>
                        <Input value={editClientFields.name ?? c.name} onChange={e => setEditClientFields(f => ({ ...f, name: e.target.value }))} placeholder="Nom" className="w-[80px]" />
                        <Input value={editClientFields.address ?? c.address} onChange={e => setEditClientFields(f => ({ ...f, address: e.target.value }))} placeholder="Adresse" className="w-[100px]" />
                        <Input value={editClientFields.siren ?? c.siren} onChange={e => setEditClientFields(f => ({ ...f, siren: e.target.value }))} placeholder="SIREN" className="w-[70px]" />
                        <Button size="icon" type="button" onClick={() => { onEditClient && onEditClient(c.id, editClientFields); setEditClientId(null); setEditClientFields({}); }} className="h-6 w-6 px-0">💾</Button>
                        <Button size="icon" type="button" onClick={() => { setEditClientId(null); setEditClientFields({}); }} className="h-6 w-6 px-0">✕</Button>
                      </>
                    ) : (
                      <>
                        <span>{c.name} | {c.address} | {c.siren}</span>
                        <div className="flex gap-1">
                          <Button size="icon" type="button" onClick={() => { setEditClientId(c.id); setEditClientFields({ name: c.name, address: c.address, siren: c.siren }); }} className="h-6 w-6 px-0">✎</Button>
                          <Button size="icon" type="button" onClick={() => onRemoveClient(c.id)} className="h-6 w-6 px-0 text-destructive">✕</Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
                  {editingId === r.id ? (
                    <>
                      <TableCell><Input type="date" value={editFields.date as string} onChange={e => setEditFields(f => ({ ...f, date: e.target.value }))} /></TableCell>
                      <TableCell><Input value={editFields.client as string} onChange={e => setEditFields(f => ({ ...f, client: e.target.value }))} /></TableCell>
                      <TableCell><Input value={editFields.service as string} onChange={e => setEditFields(f => ({ ...f, service: e.target.value }))} /></TableCell>
                      <TableCell><Input type="number" value={editFields.hourlyRate as number} onChange={e => setEditFields(f => ({ ...f, hourlyRate: Number(e.target.value) }))} /></TableCell>
                      <TableCell><Input type="number" value={editFields.hours as number} onChange={e => setEditFields(f => ({ ...f, hours: Number(e.target.value) }))} /></TableCell>
                      <TableCell className="text-right font-mono font-semibold text-revenue">
                        {editFields.hourlyRate && editFields.hours ? ((Number(editFields.hourlyRate) * Number(editFields.hours)).toFixed(2) + ' €') : r.amount.toFixed(2) + ' €'}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" onClick={() => saveEdit(r.id)} className="h-7 w-7 text-revenue-foreground hover:bg-revenue/20">💾</Button>
                        <Button size="icon" onClick={cancelEdit} className="h-7 w-7 text-muted-foreground">✕</Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
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
                        <Button variant="ghost" size="icon" onClick={() => startEdit(r)} className="h-7 w-7 text-muted-foreground hover:text-primary">
                          ✎
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
