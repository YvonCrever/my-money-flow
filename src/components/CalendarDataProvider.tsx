import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  CalendarItem,
  CalendarQuickAddInput,
  CalendarState,
  CalendarTaskCategory,
} from '@/types/calendar';
import { TRAITEURS_CATEGORY_ID } from '@/types/calendar';
import {
  getDefaultCategoryGoals,
  getCalendarWeekKey,
  getDurationBetweenTimes,
  getWeekPlanForDate,
} from '@/lib/calendar';
import {
  ensureCalendarStoreReady,
  isCalendarStoreReady,
  readCalendarState,
  subscribeCalendarStore,
  updateCalendarState,
} from '@/lib/calendarStore';
import { readFinanceClients } from '@/lib/financeStore';
import {
  createRevenueFromCalendarItemSnapshot,
  convertCalendarItemToJournal,
  convertCalendarItemToReading,
  convertCalendarItemToRevenue,
  revertCalendarConversion,
} from '@/lib/calendarConversions';
import {
  CalendarDataContext,
  type CalendarAddItemResult,
  type CalendarDataContextValue,
} from '@/components/CalendarDataContext';

function createItemId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
}

function getNextPosition(items: CalendarItem[], date: string) {
  const dayItems = items.filter((item) => item.date === date);
  const highestPosition = dayItems.reduce((max, item) => Math.max(max, item.position), -1);
  return highestPosition + 1;
}

function syncSelectedState(nextState: CalendarState, apply: (state: CalendarState) => void) {
  apply(nextState);
  return nextState;
}

function getResolvedPlannedMinutes(
  input: Pick<CalendarQuickAddInput, 'plannedMinutes' | 'startTime' | 'endTime' | 'endDayOffset'>,
) {
  return getDurationBetweenTimes(input.startTime, input.endTime, input.endDayOffset ?? 0) ?? input.plannedMinutes;
}

function isTraiteursCategory(categoryId: string | null | undefined) {
  return categoryId === TRAITEURS_CATEGORY_ID;
}

function normalizeCategoryUpdate(
  category: CalendarTaskCategory,
  updates: Partial<CalendarTaskCategory>,
): CalendarTaskCategory {
  const nextName = typeof updates.name === 'string' ? updates.name.trim() : category.name;
  const nextColor = typeof updates.color === 'string' ? updates.color.trim().toUpperCase() : category.color;
  const nextRevenueState = updates.isRevenueCategory ?? category.isRevenueCategory;
  const nextHourlyRate = updates.hourlyRate === undefined
    ? category.hourlyRate
    : updates.hourlyRate && updates.hourlyRate > 0
      ? updates.hourlyRate
      : null;
  const nextFinanceClientId = updates.financeClientId === undefined
    ? category.financeClientId
    : updates.financeClientId;

  return {
    ...category,
    ...updates,
    name: nextName || category.name,
    color: /^#(?:[0-9A-F]{6})$/.test(nextColor) ? nextColor : category.color,
    defaultSyncTarget: nextRevenueState ? 'finance-revenue' : updates.defaultSyncTarget ?? category.defaultSyncTarget,
    financeClientId: nextRevenueState ? nextFinanceClientId ?? null : null,
    hourlyRate: nextRevenueState ? nextHourlyRate : null,
    isRevenueCategory: nextRevenueState,
  };
}

function reindexItemsForDate(items: CalendarItem[], date: string) {
  return items
    .filter((item) => item.date === date)
    .sort((left, right) => left.position - right.position)
    .map((item, index) => ({
      ...item,
      position: index,
    }));
}

export function CalendarDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CalendarState>(() => readCalendarState());
  const [isLoaded, setIsLoaded] = useState(() => isCalendarStoreReady());
  const isLoadedRef = useRef(isLoaded);

  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);

  useEffect(() => {
    let isActive = true;

    void ensureCalendarStoreReady()
      .then(() => {
        if (!isActive) return;
        setState(readCalendarState());
        setIsLoaded(isCalendarStoreReady());
      })
      .catch(() => {
        if (!isActive) return;
        setState(readCalendarState());
        setIsLoaded(isCalendarStoreReady());
      });

    const unsubscribe = subscribeCalendarStore(() => {
      if (!isActive) return;
      setState(readCalendarState());
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const currentWeekPlan = useMemo(
    () => getWeekPlanForDate(state.weekPlans, state.preferences.selectedDate),
    [state.preferences.selectedDate, state.weekPlans],
  );
  const unloadedAddItemResult = useMemo<CalendarAddItemResult>(() => ({
    itemId: '',
    revenueRecordId: null,
    revenueStatus: 'not-applicable' as const,
  }), []);

  const value = useMemo<CalendarDataContextValue>(() => ({
    isLoaded,
    state,
    activeView: state.preferences.activeView,
    selectedDate: state.preferences.selectedDate,
    categories: state.categories,
    items: state.items,
    conversions: state.conversions,
    weekPlans: state.weekPlans,
    externalReferences: state.externalReferences,
    currentWeekPlan,
    setSelectedDate: (date) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        preferences: {
          ...currentState.preferences,
          selectedDate: date,
        },
      }));

      syncSelectedState(nextState, setState);
    },
    setActiveView: (view) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        preferences: {
          ...currentState.preferences,
          activeView: view,
        },
      }));

      syncSelectedState(nextState, setState);
    },
    setShowCompleted: (value) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        preferences: {
          ...currentState.preferences,
          showCompleted: value,
        },
      }));

      syncSelectedState(nextState, setState);
    },
    addItem: async (input) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) {
        return unloadedAddItemResult;
      }

      const now = new Date().toISOString();
      const itemId = `calendar-item-${createItemId()}`;
      const plannedMinutes = getResolvedPlannedMinutes(input);
      const category = state.categories.find((entry) => entry.id === input.categoryId) ?? null;
      const isTraiteursItem = isTraiteursCategory(category?.id);
      const revenueClientId = isTraiteursItem
        ? input.financeClientIdOverride ?? null
        : category?.financeClientId ?? null;

      const nextState = updateCalendarState((currentState) => {
        const nextItem: CalendarItem = {
          id: itemId,
          title: input.title,
          description: input.description ?? '',
          date: input.date,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          endDayOffset: input.endDayOffset ?? 0,
          plannedMinutes,
          actualMinutes: input.actualMinutes ?? 0,
          categoryId: input.categoryId,
          status: 'todo',
          priority: input.priority ?? 'medium',
          scope: input.scope ?? 'week',
          syncTarget: input.syncTarget ?? (category?.isRevenueCategory ? 'finance-revenue' : category?.defaultSyncTarget ?? null),
          linkedRecordId: null,
          checklist: [],
          tags: input.tags ?? [],
          position: getNextPosition(currentState.items, input.date),
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          financeClientIdOverride: isTraiteursItem ? input.financeClientIdOverride ?? null : null,
        };

        return {
          ...currentState,
          items: [
            ...currentState.items,
            nextItem,
          ],
          preferences: {
            ...currentState.preferences,
            selectedDate: input.date,
          },
        };
      });

      syncSelectedState(nextState, setState);
      let revenueRecordId: string | null = null;
      let revenueStatus: 'created' | 'not-applicable' | 'missing-hourly-rate' | 'missing-category-client' | 'missing-item-client' | 'invalid-client' = 'not-applicable';

      if (
        (category?.isRevenueCategory || isTraiteursItem)
        && plannedMinutes > 0
      ) {
        if (!category?.hourlyRate) {
          return { itemId, revenueRecordId, revenueStatus: 'missing-hourly-rate' as const };
        }

        if (!revenueClientId) {
          return {
            itemId,
            revenueRecordId,
            revenueStatus: isTraiteursItem ? 'missing-item-client' as const : 'missing-category-client' as const,
          };
        }

        const client = readFinanceClients().find((entry) => entry.id === revenueClientId);

        if (client) {
          const revenueRecord = await createRevenueFromCalendarItemSnapshot({
            date: input.date,
            client: client.name,
            service: input.title,
            hourlyRate: category.hourlyRate,
            hours: plannedMinutes / 60,
          });
          revenueRecordId = revenueRecord.id;
          revenueStatus = 'created';
        } else {
          revenueStatus = 'invalid-client';
        }
      }

      return { itemId, revenueRecordId, revenueStatus };
    },
    updateCategory: (categoryId, updates) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        categories: currentState.categories.map((category) => (
          category.id === categoryId
            ? normalizeCategoryUpdate(category, updates)
            : category
        )),
      }));

      syncSelectedState(nextState, setState);
    },
    updateItem: (itemId, updates) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        items: currentState.items.map((item) => {
          if (item.id !== itemId) return item;

          const nextDate = updates.date ?? item.date;
          const completedStatus = updates.status ?? item.status;
          const nextStartTime = updates.startTime === undefined ? item.startTime : updates.startTime;
          const nextEndTime = updates.endTime === undefined ? item.endTime : updates.endTime;
          const nextEndDayOffset = nextStartTime && nextEndTime
            ? (updates.endDayOffset ?? item.endDayOffset ?? 0)
            : 0;

          return {
            ...item,
            ...updates,
            position: updates.position ?? (
              nextDate !== item.date
                ? getNextPosition(currentState.items.filter((currentItem) => currentItem.id !== itemId), nextDate)
                : item.position
            ),
            plannedMinutes: getDurationBetweenTimes(nextStartTime, nextEndTime, nextEndDayOffset)
              ?? updates.plannedMinutes
              ?? item.plannedMinutes,
            endDayOffset: nextEndDayOffset,
            completedAt: completedStatus === 'done'
              ? item.completedAt ?? new Date().toISOString()
              : completedStatus === 'cancelled'
                ? item.completedAt
                : null,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));

      syncSelectedState(nextState, setState);
    },
    deleteItem: (itemId) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        items: currentState.items.filter((item) => item.id !== itemId),
      }));

      syncSelectedState(nextState, setState);
    },
    toggleItemComplete: (itemId) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        items: currentState.items.map((item) => {
          if (item.id !== itemId) return item;

          const isDone = item.status === 'done';

          return {
            ...item,
            status: isDone ? 'todo' : 'done',
            completedAt: isDone ? null : new Date().toISOString(),
            actualMinutes: isDone ? item.actualMinutes : Math.max(item.actualMinutes, item.plannedMinutes),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));

      syncSelectedState(nextState, setState);
    },
    moveItemToDate: (itemId, date) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        items: currentState.items.map((item) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            date,
            position: getNextPosition(currentState.items.filter((currentItem) => currentItem.id !== itemId), date),
            updatedAt: new Date().toISOString(),
          };
        }),
        preferences: {
          ...currentState.preferences,
          selectedDate: date,
        },
      }));

      syncSelectedState(nextState, setState);
    },
    reorderItem: (itemId, date, position) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => {
        const movingItem = currentState.items.find((item) => item.id === itemId);
        if (!movingItem) return currentState;

        const remainingItems = currentState.items.filter((item) => item.id !== itemId);
        const targetItems = remainingItems
          .filter((item) => item.date === date)
          .sort((left, right) => left.position - right.position);

        const nextPosition = Math.max(0, Math.min(position, targetItems.length));
        const movedItem: CalendarItem = {
          ...movingItem,
          date,
          position: nextPosition,
          updatedAt: new Date().toISOString(),
        };

        targetItems.splice(nextPosition, 0, movedItem);

        const reindexedTarget = targetItems.map((item, index) => ({
          ...item,
          position: index,
        }));
        const previousDate = movingItem.date;
        const reindexedPrevious = previousDate === date
          ? []
          : reindexItemsForDate(remainingItems, previousDate);
        const untouchedItems = remainingItems.filter((item) => (
          item.date !== date && item.date !== previousDate
        ));

        return {
          ...currentState,
          items: [
            ...untouchedItems,
            ...reindexedPrevious,
            ...reindexedTarget,
          ],
          preferences: {
            ...currentState.preferences,
            selectedDate: date,
          },
        };
      });

      syncSelectedState(nextState, setState);
    },
    scheduleItem: (itemId, date, startTime, endTime, endDayOffset = 0) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        items: currentState.items.map((item) => (
          item.id === itemId
            ? {
                ...item,
                date,
                startTime,
                endTime,
                endDayOffset,
                plannedMinutes: getDurationBetweenTimes(startTime, endTime, endDayOffset) ?? item.plannedMinutes,
                updatedAt: new Date().toISOString(),
              }
            : item
        )),
        preferences: {
          ...currentState.preferences,
          selectedDate: date,
        },
      }));

      syncSelectedState(nextState, setState);
    },
    convertItemToRevenue: async (itemId, input) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return false;

      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return false;

      const result = await convertCalendarItemToRevenue(item, input);
      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        conversions: [
          ...currentState.conversions,
          {
            id: `calendar-conversion-${createItemId()}`,
            itemId,
            target: result.target,
            recordId: result.recordId,
            recordDate: result.recordDate,
            summary: result.summary,
            status: 'converted',
            createdAt: new Date().toISOString(),
            revertedAt: null,
          },
        ],
      }));

      syncSelectedState(nextState, setState);
      return true;
    },
    convertItemToReading: async (itemId, input) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return false;

      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return false;

      const result = await convertCalendarItemToReading(item, input);
      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        conversions: [
          ...currentState.conversions,
          {
            id: `calendar-conversion-${createItemId()}`,
            itemId,
            target: result.target,
            recordId: result.recordId,
            recordDate: result.recordDate,
            summary: result.summary,
            status: 'converted',
            createdAt: new Date().toISOString(),
            revertedAt: null,
          },
        ],
      }));

      syncSelectedState(nextState, setState);
      return true;
    },
    convertItemToJournal: async (itemId, input) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return false;

      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return false;

      const result = await convertCalendarItemToJournal(item, input);
      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        conversions: [
          ...currentState.conversions,
          {
            id: `calendar-conversion-${createItemId()}`,
            itemId,
            target: result.target,
            recordId: result.recordId,
            recordDate: result.recordDate,
            summary: result.summary,
            status: 'converted',
            createdAt: new Date().toISOString(),
            revertedAt: null,
          },
        ],
      }));

      syncSelectedState(nextState, setState);
      return true;
    },
    revertItemConversion: async (conversionId) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return false;

      const conversion = state.conversions.find((entry) => entry.id === conversionId && entry.status === 'converted');
      if (!conversion) return false;

      await revertCalendarConversion(conversion.target, conversion.recordId);
      const nextState = updateCalendarState((currentState) => ({
        ...currentState,
        conversions: currentState.conversions.map((entry) => (
          entry.id === conversionId
            ? {
                ...entry,
                status: 'reverted',
                revertedAt: new Date().toISOString(),
              }
            : entry
        )),
      }));

      syncSelectedState(nextState, setState);
      return true;
    },
    updateWeekPlan: (updates) => {
      if (!isLoadedRef.current || !isCalendarStoreReady()) return;

      const nextState = updateCalendarState((currentState) => {
        const weekKey = getCalendarWeekKey(currentState.preferences.selectedDate);
        const existingWeekPlan = currentState.weekPlans.find((weekPlan) => weekPlan.weekKey === weekKey);
        const defaultCategoryGoals = getDefaultCategoryGoals(currentState.categories);

        if (!existingWeekPlan) {
          return {
            ...currentState,
            weekPlans: [
              ...currentState.weekPlans,
              {
                weekKey,
                headline: updates.headline ?? '',
                focus: updates.focus ?? '',
                notes: updates.notes ?? '',
                targetHours: updates.targetHours ?? 0,
                categoryGoals: {
                  ...defaultCategoryGoals,
                  ...(updates.categoryGoals ?? {}),
                },
                review: updates.review ?? '',
                updatedAt: new Date().toISOString(),
              },
            ],
          };
        }

        return {
          ...currentState,
          weekPlans: currentState.weekPlans.map((weekPlan) => (
            weekPlan.weekKey === weekKey
              ? {
                  ...weekPlan,
                  ...updates,
                  categoryGoals: {
                    ...defaultCategoryGoals,
                    ...weekPlan.categoryGoals,
                    ...(updates.categoryGoals ?? {}),
                  },
                  updatedAt: new Date().toISOString(),
                }
              : weekPlan
          )),
        };
      });

      syncSelectedState(nextState, setState);
    },
  }), [currentWeekPlan, isLoaded, state, unloadedAddItemResult]);

  return (
    <CalendarDataContext.Provider value={value}>
      {children}
    </CalendarDataContext.Provider>
  );
}

export { useCalendarData } from '@/components/CalendarDataContext';
