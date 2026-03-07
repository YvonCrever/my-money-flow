import { useState } from 'react';
import { Client, RevenueEntry, MONTH_NAMES } from '@/types/finance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';

interface ClientTabProps {
  clients: Client[];
  revenues: RevenueEntry[];
}

export function ClientTab({ clients, revenues }: ClientTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const clientStats = (client: Client) => {
    // Regrouper les revenus par mois pour ce client
    const byMonth = Array(12).fill(0);
    revenues.filter(r => r.client === client.name).forEach(r => {
      const d = new Date(r.date);
      byMonth[d.getMonth()] += r.amount;
    });
    return byMonth;
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-lg font-bold mb-2">Liste des clients</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>SIREN</TableHead>
              <TableHead>Chiffre d'affaires (année)</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(client => {
              const total = revenues.filter(r => r.client === client.name).reduce((s, r) => s + r.amount, 0);
              return (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.address}</TableCell>
                  <TableCell>{client.siren}</TableCell>
                  <TableCell>{total.toFixed(2)} €</TableCell>
                  <TableCell>
                    <button className="underline text-primary" onClick={() => setSelectedClientId(client.id)}>
                      Voir stats
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {selectedClientId && (() => {
        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return null;
        const stats = clientStats(client);
        return (
          <Card className="p-4 mt-4">
            <h3 className="text-md font-semibold mb-2">Évolution du CA pour {client.name}</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {MONTH_NAMES.map(m => <TableHead key={m}>{m.slice(0,3)}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    {stats.map((v, i) => <TableCell key={i}>{v.toFixed(2)} €</TableCell>)}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            {/* Graphique simple (barres horizontales) */}
            <div className="mt-4 flex gap-1 items-end h-32">
              {stats.map((v, i) => (
                <div key={i} className="flex flex-col items-center" style={{width: '24px'}}>
                  <div style={{height: `${Math.max(4, v/10)}px`}} className="w-3 bg-primary rounded-t" />
                  <span className="text-[10px] mt-1">{MONTH_NAMES[i].slice(0,3)}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
