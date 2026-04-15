import { useEffect, useState } from 'react';
import { Archive, Trash2, X } from 'lucide-react';
import type { HabitListItem } from '@/features/habits/types';

interface HabitSectionProps {
  title: string;
  habits: HabitListItem[];
  newName: string;
  actionTitle: string;
  ActionIcon: typeof Archive;
  onNewNameChange: (value: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onAction: (id: string) => void;
}

function createDraftMap(habits: HabitListItem[]) {
  return habits.reduce<Record<string, string>>((drafts, habit) => {
    drafts[habit.id] = habit.name;
    return drafts;
  }, {});
}

function HabitSection({
  title,
  habits,
  newName,
  actionTitle,
  ActionIcon,
  onNewNameChange,
  onAdd,
  onRename,
  onAction,
}: HabitSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() => createDraftMap(habits));

  useEffect(() => {
    setDrafts(createDraftMap(habits));
  }, [habits]);

  function commitRename(habit: HabitListItem) {
    const nextName = drafts[habit.id]?.trim() ?? '';

    if (!nextName) {
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [habit.id]: habit.name,
      }));
      return;
    }

    if (nextName !== habit.name) {
      onRename(habit.id, nextName);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </div>

      <div className="flex flex-col gap-1">
        {habits.length === 0 ? (
          <div className="text-xs text-slate-600 py-1">Aucune habitude</div>
        ) : null}

        {habits.map((habit) => (
          <div key={habit.id} className="flex items-center gap-2">
            <input
              type="text"
              value={drafts[habit.id] ?? habit.name}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [habit.id]: nextValue,
                }));
              }}
              onBlur={() => commitRename(habit)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              className="flex-1 bg-white/[0.04] border border-white/8 text-xs text-slate-100 px-2 py-1 outline-none focus:border-white/20 transition-colors"
            />

            <button
              type="button"
              onClick={() => onAction(habit.id)}
              className="text-slate-600 hover:text-slate-100 transition-colors flex-shrink-0"
              title={actionTitle}
            >
              <ActionIcon size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newName}
          onChange={(event) => onNewNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onAdd();
            }
          }}
          placeholder="Nouvelle habitude..."
          className="flex-1 bg-white/[0.04] border border-white/8 text-xs text-slate-300 placeholder:text-slate-600 px-2 py-1 outline-none focus:border-white/20 transition-colors"
        />
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-slate-400 hover:text-slate-100 border border-white/8 px-2 py-1 transition-colors hover:border-white/20 flex-shrink-0"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

interface HabitManagerModalProps {
  habitsDaily: HabitListItem[];
  habitsWeekly: HabitListItem[];
  onAddDaily: (name: string) => void;
  onRenameDaily: (id: string, newName: string) => void;
  onArchiveDaily: (id: string) => void;
  onAddWeekly: (name: string) => void;
  onRenameWeekly: (id: string, newName: string) => void;
  onDeleteWeekly: (id: string) => void;
  onClose: () => void;
}

export function HabitManagerModal({
  habitsDaily,
  habitsWeekly,
  onAddDaily,
  onRenameDaily,
  onArchiveDaily,
  onAddWeekly,
  onRenameWeekly,
  onDeleteWeekly,
  onClose,
}: HabitManagerModalProps) {
  const [newDailyName, setNewDailyName] = useState('');
  const [newWeeklyName, setNewWeeklyName] = useState('');

  function handleAddDaily() {
    const name = newDailyName.trim();
    if (!name) return;
    onAddDaily(name);
    setNewDailyName('');
  }

  function handleAddWeekly() {
    const name = newWeeklyName.trim();
    if (!name) return;
    onAddWeekly(name);
    setNewWeeklyName('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-slate-950 border border-white/10 p-5 flex flex-col gap-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-100">Gérer les habitudes</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <HabitSection
          title="Habitudes journalières"
          habits={habitsDaily}
          newName={newDailyName}
          actionTitle="Archiver"
          ActionIcon={Archive}
          onNewNameChange={setNewDailyName}
          onAdd={handleAddDaily}
          onRename={onRenameDaily}
          onAction={onArchiveDaily}
        />

        <div className="border-t border-white/8" />

        <HabitSection
          title="Habitudes hebdomadaires"
          habits={habitsWeekly}
          newName={newWeeklyName}
          actionTitle="Retirer"
          ActionIcon={Trash2}
          onNewNameChange={setNewWeeklyName}
          onAdd={handleAddWeekly}
          onRename={onRenameWeekly}
          onAction={onDeleteWeekly}
        />
      </div>
    </div>
  );
}
