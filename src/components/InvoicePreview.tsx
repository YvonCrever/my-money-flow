import React from 'react';
import { Client, RevenueEntry } from '@/types/finance';

interface InvoicePreviewProps {
  client: Client;
  revenues: RevenueEntry[];
  onClose: () => void;
}

// À personnaliser : tes coordonnées
const MY_INFO = {
  name: 'Ton Nom',
  address: 'Ton adresse',
  siret: 'Ton SIRET',
  email: 'ton@email.com',
  phone: '06 00 00 00 00',
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ client, revenues, onClose }) => {
  // Regrouper par mois/année
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthRevenues = revenues.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const total = monthRevenues.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-2xl relative print:w-[800px] print:h-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-lg" title="Fermer">✕</button>
        <div className="flex justify-between mb-8">
          <div>
            <div className="font-bold text-lg">{MY_INFO.name}</div>
            <div>{MY_INFO.address}</div>
            <div>SIRET : {MY_INFO.siret}</div>
            <div>{MY_INFO.email}</div>
            <div>{MY_INFO.phone}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{client.name}</div>
            <div>{client.address}</div>
            <div>SIREN : {client.siren}</div>
          </div>
        </div>
        <div className="mb-4 flex justify-between">
          <div>Facture n° {year}{String(month+1).padStart(2,'0')}-{client.siren}</div>
          <div>Date : {now.toLocaleDateString('fr-FR')}</div>
        </div>
        <table className="w-full border mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Prestation</th>
              <th className="border px-2 py-1">Taux horaire</th>
              <th className="border px-2 py-1">Heures</th>
              <th className="border px-2 py-1">Montant</th>
            </tr>
          </thead>
          <tbody>
            {monthRevenues.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4">Aucune prestation ce mois</td></tr>
            ) : monthRevenues.map(r => (
              <tr key={r.id}>
                <td className="border px-2 py-1">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                <td className="border px-2 py-1">{r.service}</td>
                <td className="border px-2 py-1">{r.hourlyRate.toFixed(2)} €</td>
                <td className="border px-2 py-1">{r.hours}</td>
                <td className="border px-2 py-1">{r.amount.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-right font-bold text-lg mb-2">Total à payer : {total.toFixed(2)} €</div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/80 border border-primary print:hidden"
            onClick={() => window.print()}
          >
            Imprimer / PDF
          </button>
          <button
            className="px-3 py-1 rounded bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80 border border-secondary print:hidden"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};