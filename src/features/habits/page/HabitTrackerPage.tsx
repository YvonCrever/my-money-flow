const STATIC_DAYS = [
  { label: 'Lun', value: '01' },
  { label: 'Mar', value: '02' },
  { label: 'Mer', value: '03' },
  { label: 'Jeu', value: '04' },
  { label: 'Ven', value: '05' },
] as const;

const STATIC_HABITS = [
  {
    name: 'Faire son lit',
    days: [true, true, false, true, true],
  },
  {
    name: 'Douche froide',
    days: [false, true, false, false, true],
  },
  {
    name: "Sortir prendre l'air",
    days: [true, false, true, true, false],
  },
] as const;

export default function HabitTrackerPage() {
  return (
    <div className="page-workspace" data-testid="habit-tracker-page">
      <section className="surface-panel rounded-[1.8rem] p-6 sm:p-8">
        <div className="workspace-chip-row">
          <div className="workspace-chip">
            Feature
            <span className="font-mono-num text-foreground">Habit Tracker</span>
          </div>
        </div>

        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-[-0.05em] text-slate-50">Habit Tracker</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Espace dédié au suivi quotidien des habitudes.
            Cette étape valide la structure visuelle de la grille avec quelques données statiques.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="surface-panel rounded-[1.8rem] p-6" data-testid="habit-tracker-grid">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">
            Grille
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-100">Structure visuelle du tracker</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Les habitudes sont affichées en lignes et quelques jours sont affichés en colonnes.
            Les cellules sont purement visuelles à ce stade.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="min-w-[14rem] px-4 pb-2 text-left text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Habitude
                  </th>
                  {STATIC_DAYS.map((day) => (
                    <th
                      key={day.value}
                      className="min-w-[4.5rem] px-2 pb-2 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500"
                    >
                      <div>{day.label}</div>
                      <div className="mt-1 text-sm font-medium text-slate-200">{day.value}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {STATIC_HABITS.map((habit) => (
                  <tr key={habit.name}>
                    <td className="rounded-l-[1.3rem] border border-white/8 border-r-0 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-3 w-3 shrink-0 rounded-full bg-secondary/80" aria-hidden="true" />
                        <span className="text-sm font-medium text-slate-100">{habit.name}</span>
                      </div>
                    </td>

                    {habit.days.map((isDone, index) => (
                      <td
                        key={`${habit.name}-${STATIC_DAYS[index].value}`}
                        className={`border-y border-white/8 px-2 py-4 ${
                          index === habit.days.length - 1
                            ? 'rounded-r-[1.3rem] border-r'
                            : 'border-r-0'
                        } bg-white/[0.03] text-center`}
                      >
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                            isDone
                              ? 'border-secondary/40 bg-secondary/20 text-slate-100'
                              : 'border-white/10 bg-white/[0.04] text-slate-500'
                          }`}
                          aria-hidden="true"
                        >
                          {isDone ? '●' : '○'}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-panel rounded-[1.8rem] p-6">
          <p className="text-kubrick text-[11px] uppercase tracking-[0.22em] text-slate-500">
            État actuel
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>La route de la feature reste branchée dans l&apos;application.</li>
            <li>Les habitudes sont affichées en lignes.</li>
            <li>Quelques jours sont affichés en colonnes.</li>
            <li>Les cellules sont uniquement visuelles.</li>
            <li>Aucune interaction, statistique ou logique métier n&apos;est encore ajoutée.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
