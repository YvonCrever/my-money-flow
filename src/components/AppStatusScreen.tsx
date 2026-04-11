import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppStatusScreenProps {
  mode: 'loading' | 'error';
  title: string;
  description: string;
  details?: string | null;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function AppStatusScreen({
  mode,
  title,
  description,
  details,
  primaryAction,
  secondaryAction,
}: AppStatusScreenProps) {
  const isLoading = mode === 'loading';

  return (
    <div className="themed-app min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <section className="surface-panel w-full rounded-[2rem] p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10',
                isLoading
                  ? 'bg-[linear-gradient(135deg,hsl(var(--primary)/0.92),hsl(var(--secondary)/0.74))] text-white'
                  : 'bg-destructive/10 text-destructive',
              )}
            >
              {isLoading ? (
                <LoaderCircle className="h-6 w-6 animate-spin" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-kubrick text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {isLoading ? 'Ouverture' : 'Recuperation'}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>

              {details ? (
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
                  {details}
                </pre>
              ) : null}

              {primaryAction || secondaryAction ? (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {primaryAction ? (
                    <Button type="button" onClick={primaryAction.onClick} className="rounded-full">
                      {isLoading ? null : <RotateCcw className="h-4 w-4" />}
                      {primaryAction.label}
                    </Button>
                  ) : null}

                  {secondaryAction ? (
                    <Button type="button" variant="outline" onClick={secondaryAction.onClick} className="rounded-full">
                      {secondaryAction.label}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
