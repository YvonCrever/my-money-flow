import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Download, FolderCog, HardDriveDownload, ShieldCheck, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  chooseAndStoreBackupDirectory,
  downloadManualBackup,
  getSavedBackupDirectory,
  getStorageHealth,
  isAutoBackupEnabled,
  parseAppBackupText,
  restoreAppBackup,
  runAutoBackupNow,
} from '@/lib/appBackup';
import {
  ensurePersonalDataStoreReady,
  readPersonalData,
  subscribePersonalDataStore,
  writePersonalData,
} from '@/lib/personalDataStore';
import { ensureInvoiceStoreReady } from '@/lib/invoiceStore';
import { useToast } from '@/hooks/use-toast';
import type { AppBackupEnvelopeV1, PersonalData, StorageHealth } from '@/types/storage';

function formatDateTime(value: string | null) {
  if (!value) return 'Aucun snapshot local encore écrit';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

function getMigrationLabel(status: StorageHealth['migrationStatus']) {
  if (status === 'ready') return 'Migration locale finalisée';
  if (status === 'partial') return 'Migration en cours';
  return 'Migration en attente';
}

function getBrowserSupportLabel(status: StorageHealth['browserSupport']) {
  if (status === 'full') return 'Support complet';
  if (status === 'partial') return 'Support partiel';
  return 'Support insuffisant';
}

function getDatasetRestoreList(dataset: keyof AppBackupEnvelopeV1['datasets']) {
  return [dataset];
}

export function DataTab() {
  const { toast } = useToast();
  const [data, setData] = useState<PersonalData>(() => readPersonalData());
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [hasBackupDirectory, setHasBackupDirectory] = useState(false);
  const [backupPreview, setBackupPreview] = useState<AppBackupEnvelopeV1 | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const autoBackupEnabled = isAutoBackupEnabled();

  const previewRows = useMemo(() => {
    if (!backupPreview) return [];

    return [
      { id: 'finance' as const, label: 'Finances', detail: `${backupPreview.stats.revenuesCount} revenus, ${backupPreview.stats.expensesCount} dépenses, ${backupPreview.stats.clientsCount} clients` },
      { id: 'reading' as const, label: 'Lecture', detail: `${backupPreview.stats.readingBooksCount} livres` },
      { id: 'calendar' as const, label: 'Calendrier', detail: `${backupPreview.stats.calendarItemsCount} tâches` },
      { id: 'journal' as const, label: 'Journal', detail: `${backupPreview.stats.journalEntriesCount} entrées, ${backupPreview.stats.journalMediaCount} médias` },
      { id: 'personalData' as const, label: 'Profil', detail: 'Coordonnées entreprise et bancaires' },
      { id: 'invoiceSettings' as const, label: 'Facturation', detail: 'Numérotation et réglages facture' },
    ];
  }, [backupPreview]);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        await Promise.all([
          ensurePersonalDataStoreReady(),
          ensureInvoiceStoreReady(),
        ]);

        const [storageHealth, backupDirectory] = await Promise.all([
          getStorageHealth(),
          getSavedBackupDirectory(),
        ]);

        if (!isMounted) return;
        setData(readPersonalData());
        setHealth(storageHealth);
        setHasBackupDirectory(Boolean(backupDirectory));
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    const unsubscribe = subscribePersonalDataStore(() => {
      if (!isMounted) return;
      setData(readPersonalData());
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const timeout = window.setTimeout(() => {
      writePersonalData(data);
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [data, isHydrated]);

  const refreshHealth = async () => {
    const [storageHealth, backupDirectory] = await Promise.all([
      getStorageHealth(),
      getSavedBackupDirectory(),
    ]);

    setHealth(storageHealth);
    setHasBackupDirectory(Boolean(backupDirectory));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleManualExport = async () => {
    setIsBusy(true);
    try {
      await downloadManualBackup();
      toast({
        title: 'Sauvegarde exportée',
        description: 'Le fichier JSON complet de l’application a été téléchargé.',
      });
    } catch (error) {
      toast({
        title: 'Export impossible',
        description: error instanceof Error ? error.message : 'La sauvegarde complète n’a pas pu être générée.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleChooseBackupDirectory = async () => {
    setIsBusy(true);
    try {
      const handle = await chooseAndStoreBackupDirectory();
      if (!handle) {
        toast({
          title: 'Dossier non configuré',
          description: 'Le dossier de sauvegarde automatique n’a pas été validé.',
          variant: 'destructive',
        });
        return;
      }

      await refreshHealth();
      toast({
        title: 'Dossier local configuré',
        description: autoBackupEnabled
          ? `Les snapshots automatiques seront écrits dans ${handle.name}.`
          : `Le dossier local ${handle.name} est prêt pour les snapshots manuels pendant la stabilisation.`,
      });
    } catch (error) {
      toast({
        title: 'Configuration impossible',
        description: error instanceof Error ? error.message : 'Le dossier de sauvegarde n’a pas pu être configuré.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunBackupNow = async () => {
    setIsBusy(true);
    try {
      const success = await runAutoBackupNow();
      if (!success) {
        await handleManualExport();
        return;
      }

      await refreshHealth();
      toast({
        title: 'Snapshot local écrit',
        description: 'La sauvegarde automatique a été mise à jour dans le dossier autorisé.',
      });
    } catch (error) {
      toast({
        title: 'Sauvegarde automatique échouée',
        description: error instanceof Error ? error.message : 'Le snapshot local n’a pas pu être écrit.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleBackupImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsBusy(true);
    try {
      const text = await file.text();
      const parsed = parseAppBackupText(text);
      setBackupPreview(parsed);
      toast({
        title: 'Sauvegarde chargée',
        description: 'L’aperçu a été validé. Tu peux restaurer tout ou un module précis.',
      });
    } catch (error) {
      setBackupPreview(null);
      toast({
        title: 'Import invalide',
        description: error instanceof Error ? error.message : 'Le fichier ne correspond pas à une sauvegarde Ycaro valide.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRestore = async (datasets?: Array<keyof AppBackupEnvelopeV1['datasets']>) => {
    if (!backupPreview) return;

    setIsBusy(true);
    try {
      await restoreAppBackup(backupPreview, datasets);
      await refreshHealth();
      toast({
        title: 'Restauration terminée',
        description: datasets?.length
          ? 'Le module sélectionné a été restauré depuis la sauvegarde.'
          : 'Toute l’application a été restaurée depuis la sauvegarde.',
      });
    } catch (error) {
      toast({
        title: 'Restauration échouée',
        description: error instanceof Error ? error.message : 'La restauration n’a pas pu être appliquée.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-panel rounded-[1.8rem] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-kubrick text-[11px] uppercase tracking-[0.24em] text-slate-500">Données & sauvegardes</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">Centre de confiance local-first</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Toutes les données clés sont maintenant centralisées dans une base locale unique, avec export global
              et restauration ciblée. Pendant la stabilisation, le déclenchement automatique des snapshots est
              temporairement suspendu pour privilégier la fluidité et la fiabilité d’affichage.
              Le backup manuel reste complet et constitue la sauvegarde de référence.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={handleManualExport} disabled={isBusy} className="gap-2 rounded-full">
              <Download className="h-4 w-4" />
              Exporter toute l’application
            </Button>
            <Button type="button" variant="outline" onClick={handleRunBackupNow} disabled={isBusy} className="gap-2 rounded-full">
              <HardDriveDownload className="h-4 w-4" />
              Sauvegarder maintenant
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="surface-panel rounded-[1.6rem] p-5">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.2em] text-slate-500">Migration</p>
          <p className="mt-3 text-lg font-semibold text-slate-50">{health ? getMigrationLabel(health.migrationStatus) : 'Analyse…'}</p>
          <p className="mt-2 text-sm text-slate-400">Les anciens stockages navigateur restent en filet de sécurité tant que la migration n’est pas revue.</p>
        </div>
        <div className="surface-panel rounded-[1.6rem] p-5">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.2em] text-slate-500">Dernier snapshot</p>
          <p className="mt-3 text-lg font-semibold text-slate-50">{health ? formatDateTime(health.lastBackupAt) : 'Analyse…'}</p>
          <p className="mt-2 text-sm text-slate-400">
            {autoBackupEnabled
              ? 'Le fichier auto est mis à jour après les mutations importantes quand un dossier a été autorisé, sans embarquer les médias lourds du Journal.'
              : 'Pendant la stabilisation, ce snapshot n’est mis à jour que si tu cliques manuellement sur “Sauvegarder maintenant”.'}
          </p>
        </div>
        <div className="surface-panel rounded-[1.6rem] p-5">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.2em] text-slate-500">Compatibilité</p>
          <p className="mt-3 text-lg font-semibold text-slate-50">{health ? getBrowserSupportLabel(health.browserSupport) : 'Analyse…'}</p>
          <p className="mt-2 text-sm text-slate-400">Chrome et Edge desktop restent les navigateurs prioritaires pour le stockage local avancé et les snapshots locaux.</p>
        </div>
        <div className="surface-panel rounded-[1.6rem] p-5">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.2em] text-slate-500">Persistance</p>
          <p className="mt-3 text-lg font-semibold text-slate-50">
            {health?.persistenceGranted === null ? 'Statut inconnu' : health.persistenceGranted ? 'Stockage persistant accordé' : 'Stockage persistant non garanti'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {hasBackupDirectory
              ? autoBackupEnabled
                ? 'Dossier auto configuré.'
                : 'Dossier local configuré, mais déclenchement auto suspendu.'
              : 'Aucun dossier local configuré pour l’instant.'}
          </p>
        </div>
      </section>

      {health?.browserSupport !== 'full' ? (
        <section className="surface-panel rounded-[1.6rem] border border-amber-500/20 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-full bg-amber-500/14 p-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-amber-100">Support navigateur partiel</p>
              <p className="text-sm leading-relaxed text-amber-50/85">
                Le site reste utilisable, mais pour réduire au maximum le risque de perte et bénéficier du meilleur support
                média/sauvegarde, privilégie Chrome ou Edge sur desktop.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {!hasBackupDirectory ? (
        <section className="surface-panel rounded-[1.6rem] border border-sky-500/20 bg-sky-500/8 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-sky-500/14 p-2 text-sky-100">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-slate-50">Filet de sécurité recommandé</p>
                <p className="text-sm text-slate-300">
                  Tant qu’aucun dossier local n’est autorisé, pense à exporter l’application régulièrement.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleChooseBackupDirectory} disabled={isBusy} className="gap-2 rounded-full">
                <FolderCog className="h-4 w-4" />
                Choisir un dossier local
              </Button>
              <Button type="button" onClick={handleManualExport} disabled={isBusy} className="gap-2 rounded-full">
                <Download className="h-4 w-4" />
                Export manuel visible
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-panel rounded-[1.8rem] p-6">
          <div className="mb-5">
            <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">Profil & identité</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-50">Données personnelles et de facturation</h3>
          </div>

          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Nom de l'entreprise</label>
              <input name="companyName" value={data.companyName} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Adresse</label>
              <input name="address" value={data.address} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Ville</label>
              <input name="city" value={data.city} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">SIREN</label>
              <input name="siret" value={data.siret} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
              <input name="email" value={data.email} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Téléphone</label>
              <input name="phone" value={data.phone} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">BIC</label>
              <input name="bic" value={data.bic} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">IBAN</label>
              <input name="iban" value={data.iban} onChange={handleChange} className="w-full rounded-xl bg-background px-3 py-2" />
            </div>
          </form>
        </div>

        <div className="surface-panel rounded-[1.8rem] p-6">
          <div className="mb-5">
            <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">Sauvegardes locales</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-50">Export, import et restauration</h3>
          </div>

          <div className="grid gap-3">
            <Button type="button" variant="outline" onClick={handleChooseBackupDirectory} disabled={isBusy || !health?.autoBackupAvailable} className="justify-start gap-2 rounded-full">
              <FolderCog className="h-4 w-4" />
              {hasBackupDirectory ? 'Changer le dossier local' : 'Configurer le dossier local'}
            </Button>
            <Button type="button" variant="outline" onClick={() => backupInputRef.current?.click()} disabled={isBusy} className="justify-start gap-2 rounded-full">
              <Upload className="h-4 w-4" />
              Importer une sauvegarde
            </Button>
            <input ref={backupInputRef} type="file" accept="application/json" className="hidden" onChange={handleBackupImport} />
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
            L’export manuel contient les finances, la lecture, le calendrier, le journal avec médias, le profil et la
            numérotation de facture dans un seul JSON versionné.
          </div>
        </div>
      </section>

      {backupPreview ? (
        <section className="surface-panel rounded-[1.8rem] p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">Aperçu import</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-50">Sauvegarde du {formatDateTime(backupPreview.createdAt)}</h3>
              <p className="mt-2 text-sm text-slate-300">Version app: {backupPreview.appVersion} · format: {backupPreview.version}</p>
            </div>
            <Button type="button" onClick={() => handleRestore()} disabled={isBusy} className="gap-2 rounded-full">
              <Upload className="h-4 w-4" />
              Restaurer toute l’application
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {previewRows.map((row) => (
              <div key={row.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-slate-100">{row.label}</p>
                <p className="mt-2 text-sm text-slate-400">{row.detail}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full rounded-full"
                  disabled={isBusy}
                  onClick={() => handleRestore(getDatasetRestoreList(row.id))}
                >
                  Restaurer ce module
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
