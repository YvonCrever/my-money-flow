import { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  subtitle: ReactNode;
  action?: ReactNode;
}

export function PageHero({ title, subtitle, action }: PageHeroProps) {
  return (
    <header className="page-shell">
      <div className="animate-ambient-drift absolute -left-8 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.28)_0%,transparent_68%)]" />
      <div
        className="animate-ambient-drift absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.18)_0%,transparent_72%)]"
        style={{ animationDelay: '1.6s' }}
      />
      <div className="container mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-6">
        <div className="relative z-10 text-left">
          <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-50">{title}</h1>
          <div className="mt-2 text-sm text-slate-400">{subtitle}</div>
        </div>
        {action ? (
          <div className="relative z-10 flex items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
