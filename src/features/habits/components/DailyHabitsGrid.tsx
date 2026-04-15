import { Check, X } from 'lucide-react';
import type { DailyGridDayView, HabitWithStates } from '@/features/habits/types';

interface DailyHabitsGridProps {
  days: DailyGridDayView[];
  habits: HabitWithStates[];
  onCellClick: (habitId: string, dateKey: string) => void;
}

export function DailyHabitsGrid({ days, habits, onCellClick }: DailyHabitsGridProps) {
  const weeks: DailyGridDayView[][] = [];
  const existingDays = days.filter((day) => day.exists);
  let currentWeek: DailyGridDayView[] = [];

  for (const day of existingDays) {
    if (currentWeek.length === 0 || currentWeek[0].weekNumber === day.weekNumber) {
      currentWeek.push(day);
      continue;
    }

    weeks.push(currentWeek);
    currentWeek = [day];
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return (
    <div className="flex flex-col" style={{ width: 'fit-content' }}>
      <div className="flex flex-col h-[4.75rem] border-b border-white/8">
        <div
          className="h-7 border-b border-white/8"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(31, 1.8rem)',
          }}
        >
          {weeks.map((week) => {
            const firstDay = week[0].dayNumber ?? 1;
            const lastDay = week[week.length - 1].dayNumber ?? firstDay;
            const spanDays = lastDay - firstDay + 1;

            return (
              <div
                key={`week-${week[0].weekNumber}`}
                style={{
                  gridColumn: `${firstDay} / span ${spanDays}`,
                }}
                className="flex items-center justify-center px-0.5 text-[10px] font-medium text-slate-500 border-r border-white/8"
              >
                W{week[0].weekNumber}
              </div>
            );
          })}
        </div>

        <div className="flex h-6 border-b border-white/8">
          {days.map((day, colIndex) => (
            <div
              key={`dow-${colIndex}`}
              style={{ width: '1.8rem' }}
              className={`flex-shrink-0 flex items-center justify-center px-0.5 text-[10px] font-medium text-slate-500 border-r border-white/8 ${
                day.exists ? 'bg-white/[0.02]' : 'bg-white/[0.01]'
              }`}
            >
              {day.exists ? day.dayOfWeekName : ''}
            </div>
          ))}
        </div>

        <div className="flex h-6 border-b border-white/8">
          {days.map((day, colIndex) => (
            <div
              key={`day-${colIndex}`}
              style={{ width: '1.8rem' }}
              className={`flex-shrink-0 flex items-center justify-center px-0.5 text-[10px] font-semibold border-r border-white/8 ${
                day.exists
                  ? 'text-slate-100 bg-white/[0.02]'
                  : 'text-slate-600 bg-white/[0.01]'
              }`}
            >
              {day.dayNumber ?? ''}
            </div>
          ))}
        </div>
      </div>

      {habits.map((habit) => (
        <div key={habit.habit.id} className="flex border-b border-white/8 h-8">
          {days.map((day, dayIndex) => {
            const state = habit.states[dayIndex];

            return (
              <div
                key={`${habit.habit.id}-${dayIndex}`}
                style={{ width: '1.8rem' }}
                className={`flex-shrink-0 h-8 border-r border-white/8 flex items-center justify-center transition-colors ${
                  day.exists && day.isModifiable
                    ? 'bg-white/[0.02] hover:bg-white/[0.06] cursor-pointer'
                    : day.exists
                      ? 'bg-white/[0.02]'
                      : 'bg-white/[0.005]'
                }`}
                onClick={() => {
                  if (day.dateKey && day.isModifiable) {
                    onCellClick(habit.habit.id, day.dateKey);
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
  );
}
