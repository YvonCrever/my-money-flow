import { AnalysisBlock } from '@/features/habits/components/AnalysisBlock';
import { DailyHabitsGrid } from '@/features/habits/components/DailyHabitsGrid';
import { MoodSleepBlock } from '@/features/habits/components/MoodSleepBlock';
import { StatisticsBlock } from '@/features/habits/components/StatisticsBlock';
import type {
  DailyGridDayView,
  DailyStatisticsViewModel,
  HabitAnalysisData,
  HabitWithStates,
  MoodSleepValues,
} from '@/features/habits/types';

interface DailyHabitsViewProps {
  days: DailyGridDayView[];
  habits: HabitWithStates[];
  habitAnalyses: HabitAnalysisData[];
  statistics: DailyStatisticsViewModel;
  mood: MoodSleepValues;
  sleep: MoodSleepValues;
  onCellClick: (habitId: string, dateKey: string) => void;
  onMoodChange: (dateKey: string, value: number | null) => void;
  onSleepChange: (dateKey: string, value: number | null) => void;
}

export function DailyHabitsView({
  days,
  habits,
  habitAnalyses,
  statistics,
  mood,
  sleep,
  onCellClick,
  onMoodChange,
  onSleepChange,
}: DailyHabitsViewProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'max-content auto max-content' }}
    >
      <StatisticsBlock statistics={statistics} />

      <div className="flex flex-col border border-white/8 min-w-[12rem]">
        <div className="flex items-center h-[4.75rem] pl-4 pr-3 border-b border-white/8">
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Habitudes
          </div>
        </div>
        {habits.map((habit) => (
          <div
            key={habit.habit.id}
            className="flex items-center h-8 px-3 border-b border-white/8 bg-white/[0.01]"
          >
            <div className="text-xs font-medium text-slate-100 truncate">
              {habit.habit.name}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <DailyHabitsGrid
            days={days}
            habits={habits}
            onCellClick={onCellClick}
          />
        </div>
      </div>

      <div className="hidden lg:flex border border-white/8 bg-white/[0.02]">
        <AnalysisBlock habitAnalyses={habitAnalyses} />
      </div>

      <MoodSleepBlock
        days={days}
        mood={mood}
        sleep={sleep}
        onMoodChange={onMoodChange}
        onSleepChange={onSleepChange}
      />
    </div>
  );
}
