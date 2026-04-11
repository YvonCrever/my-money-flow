import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Client, RevenueEntry } from '@/types/finance';
import { MONTH_NAMES } from '@/types/finance';
import {
  chooseAndStoreInvoiceDirectory,
  ensureInvoiceStoreReady,
  getInvoiceNumbering,
  getNextInvoiceSequence,
  getSavedInvoiceDirectory,
  markInvoiceSent,
  saveInvoiceNumbering,
  subscribeInvoiceSettingsStore,
  supportsDirectoryPicker,
  writePdfToInvoiceDirectory,
} from '@/lib/invoiceStore';
import { ensurePersonalDataStoreReady, readPersonalData, subscribePersonalDataStore } from '@/lib/personalDataStore';

interface InvoicePreviewProps {
  client: Client;
  revenues: RevenueEntry[];
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatUnit = (unit?: RevenueEntry['unit']) => {
  if (unit === 'journee') return 'j';
  if (unit === 'piece') return 'pce';
  return 'h';
};

function buildInvoiceNumber(year: number, sequence: number) {
  return `FACTURE ${year}-${sequence}`;
}

function buildYahooComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    to,
    subject,
    body,
  });

  return `https://compose.mail.yahoo.com/mailto:?${params.toString()}`;
}

function copyComputedStyles(source: HTMLElement, target: HTMLElement) {
  const computedStyle = window.getComputedStyle(source);

  for (const property of computedStyle) {
    target.style.setProperty(
      property,
      computedStyle.getPropertyValue(property),
      computedStyle.getPropertyPriority(property),
    );
  }

  const sourceChildren = Array.from(source.children) as HTMLElement[];
  const targetChildren = Array.from(target.children) as HTMLElement[];

  sourceChildren.forEach((sourceChild, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) {
      copyComputedStyles(sourceChild, targetChild);
    }
  });
}

async function createExportNode(sourceNode: HTMLDivElement) {
  const fullSizeNode = sourceNode.cloneNode(true) as HTMLDivElement;
  copyComputedStyles(sourceNode, fullSizeNode);
  fullSizeNode.style.position = 'fixed';
  fullSizeNode.style.left = '-10000px';
  fullSizeNode.style.top = '0';
  fullSizeNode.style.transform = 'none';
  fullSizeNode.style.margin = '0';
  fullSizeNode.style.width = '210mm';
  fullSizeNode.style.height = '297mm';
  fullSizeNode.style.fontKerning = 'none';
  fullSizeNode.style.textRendering = 'geometricPrecision';
  document.body.appendChild(fullSizeNode);
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return fullSizeNode;
}

async function copyTextToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  return false;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  client,
  revenues,
  selectedMonth,
  selectedYear,
  onClose,
}) => {
  const PREVIEW_SCALE = 0.6;
  const invoiceRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [supportsAutoSave, setSupportsAutoSave] = useState(false);
  const [hasSavedDirectory, setHasSavedDirectory] = useState(false);
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [isNumberModified, setIsNumberModified] = useState(false);
  const [invoiceIssueDateStr, setInvoiceIssueDateStr] = useState('');
  const [lastExportedInvoiceFileName, setLastExportedInvoiceFileName] = useState('');
  const [personalData, setPersonalData] = useState(() => readPersonalData());
  const [invoiceSettingsVersion, setInvoiceSettingsVersion] = useState(0);

  const monthRevenues = revenues.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const total = monthRevenues.reduce((s, r) => s + r.amount, 0);
  const defaultInvoiceDate = useMemo(
    () => new Date(selectedYear, selectedMonth + 1, 0),
    [selectedMonth, selectedYear],
  );

  useEffect(() => {
    const defaultDate = `${defaultInvoiceDate.getFullYear()}-${String(defaultInvoiceDate.getMonth() + 1).padStart(2, '0')}-${String(defaultInvoiceDate.getDate()).padStart(2, '0')}`;
    setInvoiceIssueDateStr(defaultDate);
  }, [defaultInvoiceDate]);

  const invoiceDate = invoiceIssueDateStr ? new Date(`${invoiceIssueDateStr}T00:00:00`) : defaultInvoiceDate;
  const dueDate = useMemo(() => {
    const next = new Date(invoiceDate);
    next.setDate(next.getDate() + 10);
    return next;
  }, [invoiceDate]);

  const autoInvoiceNumber = useMemo(() => {
    const numbering = getInvoiceNumbering(selectedYear);
    const sequence = getNextInvoiceSequence(selectedYear, numbering);
    return buildInvoiceNumber(selectedYear, sequence);
  }, [invoiceSettingsVersion, selectedYear]);

  useEffect(() => {
    setCustomInvoiceNumber(autoInvoiceNumber);
    setIsNumberModified(false);
  }, [autoInvoiceNumber]);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      ensureInvoiceStoreReady(),
      ensurePersonalDataStoreReady(),
    ]).then(() => {
      if (!isMounted) return;
      setPersonalData(readPersonalData());
      setInvoiceSettingsVersion((current) => current + 1);
    }).catch((): void => undefined);

    setSupportsAutoSave(supportsDirectoryPicker());

    if (!supportsDirectoryPicker()) {
      return;
    }

    void getSavedInvoiceDirectory()
      .then((handle) => {
        if (isMounted) {
          setHasSavedDirectory(Boolean(handle));
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasSavedDirectory(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => subscribeInvoiceSettingsStore(() => {
    setInvoiceSettingsVersion((current) => current + 1);
  }), []);

  useEffect(() => subscribePersonalDataStore(() => {
    setPersonalData(readPersonalData());
  }), []);

  const invoiceNumber = customInvoiceNumber.trim() || autoInvoiceNumber;

  const myInfo = personalData;
  const fallbackIdentity = {
    name: 'Robin Kerjosse',
    address: '10, rue nouvelle 94130 Nogent sur Marne',
    city: '',
    siren: '880 756 143',
  };
  const invoiceMonthLabel = MONTH_NAMES[selectedMonth].toLowerCase();

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;

    setIsExporting(true);
    const previousTitle = document.title;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // Ensure fonts are loaded before rasterizing text to avoid glyph overlap.
      if (typeof document !== 'undefined' && 'fonts' in document) {
        try {
          const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
          await fonts?.ready;
        } catch {
          // Continue even if the fonts API is unavailable.
        }
      }

      document.title = invoiceNumber;

      // Capture a full-size clone to keep exported PDF aligned with the invoice layout.
      const fullSizeNode = await createExportNode(invoiceRef.current);

      const canvas = await html2canvas(fullSizeNode, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: fullSizeNode.scrollWidth,
        height: fullSizeNode.scrollHeight,
        windowWidth: fullSizeNode.scrollWidth,
        windowHeight: fullSizeNode.scrollHeight,
      });

      document.body.removeChild(fullSizeNode);

      const imageData = canvas.toDataURL('image/jpeg', 0.86);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imageData, 'JPEG', 0, 0, 210, 297, undefined, 'MEDIUM');

      const fileName = `${invoiceNumber}.pdf`;
      const pdfBlob = pdf.output('blob');
      let savedToCustomDirectory = false;

      try {
        savedToCustomDirectory = await writePdfToInvoiceDirectory(pdfBlob, fileName, true);
      } catch (error) {
        if ((error as DOMException | undefined)?.name === 'AbortError') {
          toast({
            title: 'Enregistrement annulé',
            description: 'Le dossier n’a pas été sélectionné. Téléchargement classique utilisé.',
          });
        } else {
          toast({
            title: 'Enregistrement automatique indisponible',
            description: 'Le PDF a été téléchargé via le navigateur.',
          });
        }
      }

      if (!isNumberModified && invoiceNumber === autoInvoiceNumber) {
        const numbering = getInvoiceNumbering(selectedYear);
        const sequence = getNextInvoiceSequence(selectedYear, numbering);
        saveInvoiceNumbering(selectedYear, sequence);
      }

      if (savedToCustomDirectory) {
        setHasSavedDirectory(true);
        setLastExportedInvoiceFileName(fileName);
        toast({
          title: 'Facture enregistrée',
          description: 'Le PDF a été enregistré dans le dossier autorisé.',
        });
      } else {
        setLastExportedInvoiceFileName(fileName);
        pdf.save(fileName);
      }
    } finally {
      document.title = previousTitle;
      setIsExporting(false);
    }
  };

  const handleOpenYahooMail = async () => {
    if (!client.email) {
      toast({
        title: 'Email client manquant',
        description: 'Ajoute une adresse email au client pour preparer le brouillon Yahoo Mail.',
      });
      return;
    }

    if (!lastExportedInvoiceFileName) {
      toast({
        title: 'Aucune facture exportee',
        description: 'Telecharge d’abord la facture avant de preparer le mail.',
      });
      return;
    }

    const subject = `Facture Robin Kerjosse - ${invoiceMonthLabel} ${selectedYear}`;
    const body = [
      'Bonjour,',
      '',
      `Vous trouverez ci-joint ma facture pour le mois de ${invoiceMonthLabel} ${selectedYear}.`,
      '',
      'Bien à vous,',
      '',
      'Robin Kerjosse',
    ].join('\n');

    let copiedToClipboard = false;
    try {
      copiedToClipboard = await copyTextToClipboard(body);
    } catch {
      copiedToClipboard = false;
    }

    const mailWindow = window.open(
      buildYahooComposeUrl(client.email, subject, ''),
      '_blank',
    );

    if (!mailWindow) {
      toast({
        title: 'Ouverture du mail bloquée',
        description: 'Autorise les popups pour ouvrir Yahoo Mail depuis la facture.',
        variant: 'destructive',
      });
      return;
    }

    try {
      mailWindow.opener = null;
    } catch {
      // Ignore if the browser prevents mutating opener.
    }

    markInvoiceSent(client.id, selectedYear, selectedMonth);
    onClose();

    toast({
      title: copiedToClipboard ? 'Brouillon Yahoo Mail ouvert' : 'Brouillon Yahoo Mail ouvert',
      description: copiedToClipboard
        ? 'Le texte du message a ete copie. Colle-le dans Yahoo Mail pour garder les retours a la ligne.'
        : 'Yahoo Mail n’accepte pas bien les retours a la ligne par URL. Colle le texte du message manuellement.',
    });
  };

  const handleChangeDirectory = async () => {
    try {
      const handle = await chooseAndStoreInvoiceDirectory();
      setHasSavedDirectory(Boolean(handle));

      if (handle) {
        toast({
          title: 'Dossier enregistré',
          description: `Les prochaines factures seront enregistrées dans « ${handle.name} ».`,
        });
      }
    } catch (error) {
      if ((error as DOMException | undefined)?.name === 'AbortError') {
        return;
      }

      toast({
        title: 'Impossible de changer le dossier',
        description: 'Réessayez depuis un navigateur compatible.',
      });
    }
  };

  return (
    <div data-invoice-static="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white">
      <div className="relative flex max-h-[94vh] w-full max-w-[920px] flex-col overflow-hidden rounded bg-white p-4 shadow-lg print:max-h-none print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <button onClick={onClose} className="absolute right-3 top-2 z-10 text-lg print:hidden" title="Fermer">✕</button>

        <div className="mt-6 flex-1 overflow-y-auto rounded border border-slate-200 bg-slate-100 p-3">
          <div className="mx-auto min-h-fit" style={{ width: `${210 * PREVIEW_SCALE}mm` }}>
            <div style={{ width: '210mm', minHeight: '297mm', transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
              <div
                ref={invoiceRef}
                data-invoice-static="true"
                className="invoice-print-root mx-auto flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white px-[14mm] py-[11mm] text-slate-900"
              >
                <div className="mb-6 flex items-start justify-end border-b border-slate-300 pb-4">
                  <div className="w-[340px] text-right text-sm text-slate-800">
                    <div
                      className="h-[32px] text-lg font-bold tracking-wide text-slate-900"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {invoiceNumber}
                    </div>
                    <div className="grid grid-cols-[1fr_118px] justify-end gap-x-1">
                      <span className="font-semibold text-right">Date de facturation :</span>
                      <span className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(invoiceDate)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[1fr_118px] justify-end gap-x-1">
                      <span className="font-semibold text-right">Date d'échéance :</span>
                      <span className="text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatDate(dueDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-8 text-sm text-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Émetteur</div>
                    <div className="whitespace-pre-line font-semibold text-slate-900">{myInfo.companyName || fallbackIdentity.name}</div>
                    <div className="whitespace-pre-line">{myInfo.address || fallbackIdentity.address}</div>
                    {myInfo.city ? <div>{myInfo.city}</div> : (fallbackIdentity.city ? <div>{fallbackIdentity.city}</div> : null)}
                    <div>SIREN : {myInfo.siret || fallbackIdentity.siren}</div>
                    {myInfo.email ? <div>{myInfo.email}</div> : null}
                    {myInfo.phone ? <div>{myInfo.phone}</div> : null}
                  </div>
                  <div className="space-y-0.5 text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</div>
                    <div className="font-semibold text-slate-900">{client.name}</div>
                    <div className="whitespace-pre-line">{client.address}</div>
                    <div>SIREN : {client.siren}</div>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded border border-slate-300">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border-b border-slate-300 px-3 py-2 text-left font-semibold">Description</th>
                        <th className="w-[118px] border-b border-slate-300 px-3 py-2 text-right font-semibold">Date</th>
                        <th className="border-b border-slate-300 px-3 py-2 text-right font-semibold">Quantité</th>
                        <th className="border-b border-slate-300 px-3 py-2 text-left font-semibold">Unité</th>
                        <th className="border-b border-slate-300 px-3 py-2 text-right font-semibold">Prix unitaire</th>
                        <th className="border-b border-slate-300 px-3 py-2 text-right font-semibold">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRevenues.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-slate-500">Aucune entrée de revenu pour cette période.</td>
                        </tr>
                      ) : monthRevenues.map(r => (
                        <tr key={r.id} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2">{r.service}</td>
                          <td className="px-3 py-2 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatDate(new Date(r.date))}
                          </td>
                          <td className="px-3 py-2 text-right">{r.hours}</td>
                          <td className="px-3 py-2">{formatUnit(r.unit)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(r.hourlyRate)} €</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(r.amount)} €</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-3 py-3 pr-2 text-right font-semibold">Net à payer</td>
                        <td className="px-3 py-3 pl-2 text-right text-base font-bold whitespace-nowrap">{formatCurrency(total)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {(myInfo.bic || myInfo.iban) ? (
                  <div className="mt-8 grid grid-cols-[auto_1fr] text-sm text-slate-800">
                    <div className="font-semibold">Paiement à effectuer à :</div>
                    <div className="pl-1">{myInfo.bic || ''}</div>
                    <div />
                    <div className="pl-1">{myInfo.iban || ''}</div>
                  </div>
                ) : null}

                <div className="mt-auto pt-12 text-center text-xs leading-5 text-slate-700">
                  TVA non applicable, article 293 B du CGI.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4 print:hidden">
          <div className="mr-2 flex items-center gap-2">
            <label className="text-xs font-medium text-slate-700">Date de facturation</label>
            <input
              type="date"
              value={invoiceIssueDateStr}
              onChange={(e) => setInvoiceIssueDateStr(e.target.value)}
              className="h-8 rounded border border-slate-300 px-2 text-xs text-slate-900"
            />
          </div>
          <div className="mr-2 flex items-center gap-2">
            <label className="text-xs font-medium text-slate-700">Numéro facture</label>
            <input
              value={customInvoiceNumber}
              onChange={(e) => {
                const nextValue = e.target.value;
                setCustomInvoiceNumber(nextValue);
                setIsNumberModified(nextValue.trim() !== autoInvoiceNumber);
              }}
              className="h-8 w-[180px] rounded border border-slate-300 px-2 text-xs text-slate-900"
            />
            {isNumberModified ? <span className="text-xs text-amber-600">Modifié</span> : null}
          </div>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            {isExporting ? 'Génération PDF...' : 'Télécharger'}
          </button>
          <button
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleOpenYahooMail}
            type="button"
            disabled={!lastExportedInvoiceFileName}
          >
            Préparer dans Yahoo Mail
          </button>
          {supportsAutoSave ? (
            <button
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              onClick={handleChangeDirectory}
              type="button"
            >
              {hasSavedDirectory ? 'Changer le dossier' : 'Choisir le dossier'}
            </button>
          ) : null}
          <button
            className="rounded border border-secondary bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
