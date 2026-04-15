import type { DailyGridDayView, MoodSleepValues } from '@/features/habits/types';

interface MoodSleepBlockProps {
  days: DailyGridDayView[];
  mood: MoodSleepValues;
  sleep: MoodSleepValues;
  onMoodChange: (dateKey: string, value: number | null) => void;
  onSleepChange: (dateKey: string, value: number | null) => void;
}

const AZERTY_MAP: Record<string, number> = {
  '&': 1, 'é': 2, '"': 3, "'": 4, '(': 5,
  '§': 6, 'è': 7, '!': 8, 'ç': 9, 'à': 10,
};

export function MoodSleepBlock({
  days,
  mood,
  sleep,
  onMoodChange,
  onSleepChange,
}: MoodSleepBlockProps) {
  function renderRow(
    values: MoodSleepValues,
    max: number,
    onChange: (dateKey: string, value: number | null) => void,
  ) {
    return (
      <div className="flex h-7">
        {days.map((day, dayIndex) => {
          const value = values[dayIndex];

          return (
            <div
              key={dayIndex}
              style={{ width: '1.8rem' }}
              className={`flex-shrink-0 h-7 border-r border-white/8 flex items-center justify-center ${
                day.exists && day.isModifiable ? '' : 'bg-white/[0.005]'
              }`}
            >
              {day.exists && day.isModifiable && day.dateKey ? (
                <input
                  type="text"
                  inputMode="numeric"
                  value={value != null ? String(value) : ''}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => {
                    const mapped = AZERTY_MAP[event.key];
                    if (mapped !== undefined) {
                      onChange(day.dateKey!, mapped <= max ? mapped : max);
                      event.preventDefault();
                      return;
                    }

                    if (event.key.length === 1 && !/\d/.test(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) => {
                    const raw = event.target.value.replace(/\D/g, '');
                    if (raw === '' || raw === '0') {
                      onChange(day.dateKey!, null);
                      return;
                    }

                    const nextValue = parseInt(raw, 10);
                    if (nextValue >= 1 && nextValue <= max) {
                      onChange(day.dateKey!, nextValue);
                    } else if (nextValue > max) {
                      onChange(day.dateKey!, max);
                    }
                  }}
                  className="w-full text-center bg-transparent text-xs text-slate-300 outline-none"
                />
              ) : (
                <span className={`text-xs ${day.exists && value != null ? 'text-slate-500' : ''}`}>
                  {day.exists && value != null ? value : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="border border-white/8 min-w-[12rem]">
        <div className="flex items-center h-7 pl-4 pr-3 border-b border-white/8">
          <span className="text-xs text-slate-500">Mood</span>
        </div>
        <div className="flex items-center h-7 pl-4 pr-3">
          <span className="text-xs text-slate-500">Sleep</span>
        </div>
      </div>

      <div className="border border-white/8 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex flex-col" style={{ width: 'fit-content' }}>
            <div className="border-b border-white/8">
              {renderRow(mood, 10, onMoodChange)}
            </div>
            {renderRow(sleep, 12, onSleepChange)}
          </div>
        </div>
      </div>

      <div className="hidden lg:block" />
    </>
  );
}
