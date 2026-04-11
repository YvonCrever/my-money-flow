import { useMemo, useState } from 'react';
import { Check, Database, Palette, RefreshCw, Settings2, Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppChrome } from '@/components/AppChromeProvider';
import { useAppMastheadMotion } from '@/components/AppMastheadMotionProvider';
import { useAppTheme } from '@/components/AppThemeProvider';

interface AppOptionsMenuProps {
  onOpenFinanceData: () => void;
}

export function AppOptionsMenu({ onOpenFinanceData }: AppOptionsMenuProps) {
  const { pageOptionsSection } = useAppChrome();
  const { activeTheme, changeTheme, themes } = useAppTheme();
  const { activeMotion, activeMotionId, motions, setActiveMotionId } = useAppMastheadMotion();
  const [isMotionPickerOpen, setIsMotionPickerOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);

  const pendingTheme = useMemo(
    () => themes.find((theme) => theme.id === pendingThemeId) ?? null,
    [pendingThemeId, themes],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="app-options-button h-9 gap-2 px-3.5"
          >
            <Settings2 className="h-4 w-4" />
            Options
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="app-options-menu w-[20rem] rounded-[1.35rem] p-2">
          {pageOptionsSection && pageOptionsSection.items.length > 0 ? (
            <>
              <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {pageOptionsSection.title}
              </DropdownMenuLabel>

              {pageOptionsSection.items.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="app-options-item gap-3 rounded-[1rem] px-3 py-3"
                  onSelect={item.onSelect}
                >
                  <span className="app-options-icon">
                    <Settings2 className="h-4 w-4" />
                  </span>
                  <div className="grid gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    {item.description ? (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="my-2" />
            </>
          ) : null}

          <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Personnalisation
          </DropdownMenuLabel>

          <DropdownMenuItem
            className="app-options-item gap-3 rounded-[1rem] px-3 py-3"
            onSelect={() => setIsThemePickerOpen(true)}
          >
            <span className="app-options-icon">
              <Palette className="h-4 w-4" />
            </span>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-foreground">Thèmes UI / UX</span>
              <span className="text-xs text-muted-foreground">
                Ouvrir la fenêtre de sélection des 11 thèmes.
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="app-options-item gap-3 rounded-[1rem] px-3 py-3"
            onSelect={() => setIsMotionPickerOpen(true)}
          >
            <span className="app-options-icon">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-foreground">Animation du masthead</span>
              <span className="text-xs text-muted-foreground">
                {activeMotion.name}
                {' '}
                · appliquée en direct sans rechargement.
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuLabel className="px-3 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Données
          </DropdownMenuLabel>

          <DropdownMenuItem className="app-options-item gap-3 rounded-[1rem] px-3 py-3" onSelect={onOpenFinanceData}>
            <span className="app-options-icon">
              <Database className="h-4 w-4" />
            </span>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-foreground">Finances · Données & sauvegardes</span>
              <span className="text-xs text-muted-foreground">Ouvre le centre local de profil, sauvegardes et restauration.</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isMotionPickerOpen} onOpenChange={setIsMotionPickerOpen}>
        <DialogContent className="app-theme-picker max-h-[86vh] max-w-5xl overflow-hidden rounded-[1.8rem] border-border/70 p-0">
          <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-3 text-left">
              <span className="app-options-icon">
                <Sparkles className="h-4 w-4" />
              </span>
              <span>Animations du masthead</span>
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              Choisis comment le drawer secondaire du haut s’ouvre et change de contenu. L’animation active est
              {' '}
              {activeMotion.name}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="app-theme-picker-grid max-h-[calc(86vh-7rem)] overflow-y-auto px-6 py-5">
            {motions.map((motion) => {
              const isActive = motion.id === activeMotionId;

              return (
                <button
                  key={motion.id}
                  type="button"
                  className={`app-theme-card app-motion-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => setActiveMotionId(motion.id)}
                >
                  <span className="app-theme-card-preview app-motion-card-preview" style={{ background: motion.preview }} />
                  <span className="app-theme-card-copy">
                    <span className="app-theme-card-head">
                      <span className="app-theme-card-title">{motion.name}</span>
                      {isActive ? (
                        <span className="app-theme-card-badge">
                          <Check className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : motion.recommended ? (
                        <span className="app-theme-card-badge app-motion-card-badge">
                          Recommandee
                        </span>
                      ) : null}
                    </span>
                    <span className="app-theme-card-label">{motion.shortLabel}</span>
                    <span className="app-theme-card-description">{motion.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isThemePickerOpen} onOpenChange={setIsThemePickerOpen}>
        <DialogContent className="app-theme-picker max-h-[86vh] max-w-5xl overflow-hidden rounded-[1.8rem] border-border/70 p-0">
          <DialogHeader className="border-b border-border/60 px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-3 text-left">
              <span className="app-options-icon">
                <Palette className="h-4 w-4" />
              </span>
              <span>Choisir un thème global</span>
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed">
              Le thème actuel est le thème {activeTheme.order} · {activeTheme.name}. Les factures restent volontairement inchangées.
            </DialogDescription>
          </DialogHeader>

          <div className="app-theme-picker-grid max-h-[calc(86vh-7rem)] overflow-y-auto px-6 py-5">
            {themes.map((theme) => {
              const isActive = theme.id === activeTheme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`app-theme-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    if (isActive) return;
                    setIsThemePickerOpen(false);
                    setPendingThemeId(theme.id);
                  }}
                >
                  <span className="app-theme-card-preview" style={{ background: theme.preview }} />
                  <span className="app-theme-card-copy">
                    <span className="app-theme-card-head">
                      <span className="app-theme-card-title">Thème {theme.order} · {theme.name}</span>
                      {isActive ? (
                        <span className="app-theme-card-badge">
                          <Check className="h-3.5 w-3.5" />
                          Actif
                        </span>
                      ) : null}
                    </span>
                    <span className="app-theme-card-label">{theme.shortLabel}</span>
                    <span className="app-theme-card-description">{theme.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingTheme)} onOpenChange={(open) => { if (!open) setPendingThemeId(null); }}>
        <AlertDialogContent className="app-theme-confirm max-w-xl rounded-[1.6rem] border-border/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-left">
              <span className="app-theme-preview h-11 w-11 shrink-0" style={{ background: pendingTheme?.preview }} />
              <span>
                Appliquer le thème {pendingTheme?.order} · {pendingTheme?.name} ?
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left leading-relaxed">
              {pendingTheme?.description}
              {' '}
              Si vous confirmez, le nouveau thème est appliqué immédiatement dans l’application, sans rechargement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={() => {
                if (!pendingTheme) return;
                changeTheme(pendingTheme.id);
                setPendingThemeId(null);
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Appliquer maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
