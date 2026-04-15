import { useState } from 'react';
import { useAppPageChrome } from '@/components/AppChromeProvider';
import { FeatureLoadWarning } from '@/components/FeatureLoadWarning';
import { MonthYearFilter } from '@/components/MonthYearFilter';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { DailyHabitsView } from '@/features/habits/components/DailyHabitsView';
import { HabitManagerModal } from '@/features/habits/components/HabitManagerModal';
import { WeeklyHabitsView } from '@/features/habits/components/WeeklyHabitsView';
import { useHabitTrackerData } from '@/features/habits/store/useHabitTrackerData';

export default function HabitTrackerPage() {
  const { actionsTarget, leadingTarget } = useAppPageChrome('habits');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const habitTrackerData = useHabitTrackerData(selectedYear, selectedMonth);

  return (
    <div className="page-workspace">
      <ToolbarPortal target={leadingTarget}>
        <button
          type="button"
          onClick={() => setIsManagerOpen(true)}
          className="app-masthead-item px-4 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
        >
          Gérer
        </button>

        <div className="page-subnav-tabs h-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`app-masthead-item app-masthead-tab-trigger text-sm font-medium transition-colors ${
              viewMode === 'day' ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`app-masthead-item app-masthead-tab-trigger text-sm font-medium transition-colors ${
              viewMode === 'week' ? 'text-slate-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Week
          </button>
        </div>
      </ToolbarPortal>

      <ToolbarPortal target={actionsTarget}>
        <MonthYearFilter
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
          compact
        />
      </ToolbarPortal>

      {habitTrackerData.loadError ? (
        <FeatureLoadWarning
          title="Probleme de stockage du Habit Tracker"
          description={habitTrackerData.loadError}
          className="mb-5"
        />
      ) : null}

      {viewMode === 'day' ? (
        <DailyHabitsView
          days={habitTrackerData.dailyView.days}
          habits={habitTrackerData.dailyView.habits}
          habitAnalyses={habitTrackerData.dailyView.habitAnalyses}
          statistics={habitTrackerData.dailyView.statistics}
          mood={habitTrackerData.dailyView.mood}
          sleep={habitTrackerData.dailyView.sleep}
          onCellClick={habitTrackerData.toggleDailyEntry}
          onMoodChange={habitTrackerData.setMood}
          onSleepChange={habitTrackerData.setSleep}
        />
      ) : (
        <WeeklyHabitsView
          weeks={habitTrackerData.weeklyView.weeks}
          habits={habitTrackerData.weeklyView.habits}
          analyses={habitTrackerData.weeklyView.analyses}
          monthlyStats={habitTrackerData.weeklyView.monthlyStats}
          onCellClick={habitTrackerData.toggleWeeklyHabit}
        />
      )}

      {isManagerOpen ? (
        <HabitManagerModal
          habitsDaily={habitTrackerData.managerHabitsDaily}
          habitsWeekly={habitTrackerData.managerHabitsWeekly}
          onAddDaily={habitTrackerData.addDailyHabit}
          onRenameDaily={habitTrackerData.renameDailyHabit}
          onArchiveDaily={habitTrackerData.archiveDailyHabit}
          onAddWeekly={habitTrackerData.addWeeklyHabit}
          onRenameWeekly={habitTrackerData.renameWeeklyHabit}
          onDeleteWeekly={habitTrackerData.removeWeeklyHabit}
          onClose={() => setIsManagerOpen(false)}
        />
      ) : null}
    </div>
  );
}
