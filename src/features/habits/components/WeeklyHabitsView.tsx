import { Check, X } from 'lucide-react';
import type {
  WeeklyGridWeekView,
  WeeklyHabitAnalysisData,
  WeeklyHabitWithStates,
  WeeklyMonthlyStats,
} from '@/features/habits/types';

interface WeeklyHabitsViewProps {
  weeks: WeeklyGridWeekView[];
  habits: WeeklyHabitWithStates[];
  analyses: WeeklyHabitAnalysisData[];
  monthlyStats: WeeklyMonthlyStats;
  onCellClick: (habitId: string, weekNumber: number) => void;
}

function ProgressBar({ percentage }: { percentage: number }) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  return (
    <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
      <div
        className="h-full bg-slate-400/50 transition-all duration-300"
        style={{ width: `${clampedPercentage}%` }}
      />
    </div>
  );
}

export function WeeklyHabitsView({
  weeks,
  habits,
  analyses,
  monthlyStats,
  onCellClick,
}: WeeklyHabitsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'max-content auto max-content' }}
      >
        <div />

        <div className="border border-white/8 bg-white/[0.02] p-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase">Goal</span>
              <span className="text-sm font-semibold text-slate-100">{monthlyStats.goal}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase">Completed</span>
              <span className="text-sm font-semibold text-slate-100">{monthlyStats.completed}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase">%T</span>
              <span className="text-sm font-semibold text-slate-100">{monthlyStats.percentageT}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-500 uppercase">%C</span>
              <span className="text-sm font-semibold text-slate-100">{monthlyStats.percentageC}%</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block" />
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'max-content auto max-content' }}
      >
        <div className="flex flex-col border border-white/8 min-w-[12rem]">
          <div className="flex items-center h-10 pl-4 pr-3 border-b border-white/8">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Habitudes
            </span>
          </div>
          {habits.map((habit) => (
            <div
              key={habit.habit.id}
              className="flex items-center h-8 px-3 border-b border-white/8 bg-white/[0.01]"
            >
              <span className="text-xs font-medium text-slate-100 truncate">
                {habit.habit.name}
              </span>
            </div>
          ))}
        </div>

        <div className="border border-white/8">
          <div className="flex h-10 border-b border-white/8">
            {weeks.map((week) => (
              <div
                key={week.weekNumber}
                style={{ minWidth: '5rem' }}
                className="flex-1 flex items-center justify-center text-[10px] font-medium text-slate-500 border-r border-white/8"
              >
                {week.label}
              </div>
            ))}
          </div>

          {habits.map((habit) => (
            <div key={habit.habit.id} className="flex h-8 border-b border-white/8">
              {weeks.map((week) => {
                const state = habit.states[week.weekNumber - 1] ?? 'empty';

                return (
                  <div
                    key={week.weekNumber}
                    style={{ minWidth: '5rem' }}
                    className={`flex-1 flex items-center justify-center border-r border-white/8 transition-colors ${
                      week.isModifiable
                        ? 'bg-white/[0.02] hover:bg-white/[0.06] cursor-pointer'
                        : 'bg-white/[0.005]'
                    }`}
                    onClick={() => {
                      if (week.isModifiable) {
                        onCellClick(habit.habit.id, week.weekNumber);
                      }
                    }}
                  >
                    {state === 'done' ? (
                      <Check size={14} className="text-green-500" strokeWidth={3} />
                    ) : null}
                    {state === 'not-done' ? (
                      <X size={14} className="text-red-500" strokeWidth={3} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="hidden lg:flex border border-white/8 bg-white/[0.02]">
          <div className="flex flex-col w-full">
            <div className="flex flex-col h-10 border-b border-white/8 px-2">
              <div className="flex items-center h-5 border-b border-white/8">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Analyse
                </span>
              </div>
              <div className="flex flex-1 gap-1">
                <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600">
                  Goal
                </div>
                <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600">
                  Actual
                </div>
                <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600">
                  %T
                </div>
                <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600">
                  %C
                </div>
              </div>
            </div>

            {analyses.map((analysis) => (
              <div key={analysis.habitId} className="flex flex-col h-12 border-b border-white/8 p-2 gap-1">
                <div className="flex gap-1 h-5">
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-500">
                    {analysis.goal}
                  </div>
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-400">
                    {analysis.actual}
                  </div>
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-300 font-medium">
                    {analysis.percentageT}%
                  </div>
                  <div className="flex-1 flex items-center justify-center text-[9px] text-slate-300 font-medium">
                    {analysis.percentageC}%
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <ProgressBar percentage={analysis.percentageT} />
                  </div>
                  <div className="flex-1">
                    <ProgressBar percentage={analysis.percentageC} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
