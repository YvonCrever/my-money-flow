import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Layers3,
  NotebookPen,
  Plus,
  Trash2,
  Undo2,
} from 'lucide-react';
import { addDays, addMonths, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useCalendarData } from '@/components/CalendarDataContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as DatePickerCalendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  detectCalendarConflicts,
  formatCalendarLongDate,
  formatCalendarItemTimeRange,
  formatCalendarMonthLabel,
  formatCalendarWeekLabel,
  fromCalendarDateKey,
  getCalendarItemVisualRange,
  getEndTimeWithDayOffset,
  getMonthDays,
  getTimeSlots,
  getWeekDays,
  hoursToMinutes,
  minutesToHoursLabel,
  toCalendarDateKey,
} from '@/lib/calendar';
import { getClientDisplayName } from '@/lib/clientDisplay';
import {
  buildCategoryDraft,
  buildJournalDraft,
  buildReadingDraft,
  buildRevenueDraft,
  CATEGORY_COLOR_PRESETS,
  CONVERSION_LABELS,
  formatHoursInputValue,
  getBlockStyle,
  getCategoryOutlineStyle,
  getReferenceIcon,
  getTaskTone,
  getTimelineWindow,
  isHexColorValue,
  normalizeHexColor,
  SLOT_HEIGHT,
  SLOT_MINUTES,
  SOURCE_LABELS,
  TIMELINE_BASE_END_HOUR,
  TIMELINE_BASE_START_HOUR,
  VIEW_OPTIONS,
  type CategoryDraft,
  type DropIndicator,
  type JournalDraft,
  type ReadingDraft,
  type RevenueDraft,
  type WeekSecondaryPanel,
} from '@/features/calendar/calendarPageUtils';
import { ensureFinanceStoreReady, readFinanceClients, subscribeFinanceStore } from '@/lib/financeStore';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/finance';
import { BOOK_CATEGORIES, type BookCategory } from '@/types/reading';
import {
  TRAITEURS_CATEGORY_ID,
  type CalendarExternalReference,
  type CalendarItem,
  type CalendarTaskCategory,
  type CalendarConversionTarget,
  type CalendarView,
} from '@/types/calendar';

export default function CalendarPage() {
  const { toast } = useToast();
  const {
    activeView,
    addItem,
    categories,
    conversions,
    convertItemToJournal,
    convertItemToReading,
    convertItemToRevenue,
    currentWeekPlan,
    deleteItem,
    externalReferences,
    isLoaded,
    items,
    reorderItem,
    revertItemConversion,
    scheduleItem,
    selectedDate,
    setActiveView,
    setSelectedDate,
    setShowCompleted,
    state,
    toggleItemComplete,
    updateCategory,
    updateItem,
    updateWeekPlan,
  } = useCalendarData();

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [draftCategoryId, setDraftCategoryId] = useState(categories[0]?.id ?? '');
  const [draftPlannedHours, setDraftPlannedHours] = useState('1');
  const [draftStartTime, setDraftStartTime] = useState('');
  const [draftTraiteurClientId, setDraftTraiteurClientId] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [weekSecondaryPanel, setWeekSecondaryPanel] = useState<WeekSecondaryPanel>('unscheduled');
  const [weekGoalDrafts, setWeekGoalDrafts] = useState<Record<string, string>>({});
  const [tasksModalCategoryId, setTasksModalCategoryId] = useState<string | null>(null);
  const [financeClients, setFinanceClients] = useState<Client[]>(() => readFinanceClients());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorHexDraft, setColorHexDraft] = useState('');
  const [conversionItemId, setConversionItemId] = useState<string | null>(null);
  const [conversionTarget, setConversionTarget] = useState<CalendarConversionTarget>('finance-revenue');
  const [revenueDraft, setRevenueDraft] = useState<RevenueDraft>({
    date: selectedDate,
    client: '',
    service: '',
    hourlyRate: '85',
    hours: '1',
  });
  const [readingDraft, setReadingDraft] = useState<ReadingDraft>({
    date: selectedDate,
    title: '',
    author: '',
    category: 'Essai',
    rating: '4',
  });
  const [journalDraft, setJournalDraft] = useState<JournalDraft>({
    date: selectedDate,
    somethingNew: '',
    somethingLearnt: '',
    couldDoneBetter: '',
    didWell: '',
  });

  useEffect(() => {
    setDraftDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    void ensureFinanceStoreReady().then(() => setFinanceClients(readFinanceClients())).catch((): void => undefined);
    return subscribeFinanceStore(() => setFinanceClients(readFinanceClients()));
  }, []);

  useEffect(() => {
    if (!draftCategoryId || categories.some((category) => category.id === draftCategoryId)) return;
    setDraftCategoryId(categories[0]?.id ?? '');
  }, [categories, draftCategoryId]);

  useEffect(() => {
    if (draftCategoryId === TRAITEURS_CATEGORY_ID) return;
    setDraftTraiteurClientId('');
  }, [draftCategoryId]);

  const conversionItem = useMemo(
    () => items.find((item) => item.id === conversionItemId) ?? null,
    [conversionItemId, items],
  );

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingCategoryId) ?? null,
    [categories, editingCategoryId],
  );

  useEffect(() => {
    if (!editingCategory) {
      setCategoryDraft(null);
      setCategoryError('');
      setIsColorPickerOpen(false);
      return;
    }

    const nextDraft = buildCategoryDraft(editingCategory);
    setCategoryDraft(nextDraft);
    setColorHexDraft(nextDraft.color);
    setCategoryError('');
  }, [editingCategory]);

  useEffect(() => {
    if (!conversionItem) return;

    setRevenueDraft(buildRevenueDraft(conversionItem));
    setReadingDraft(buildReadingDraft(conversionItem));
    setJournalDraft(buildJournalDraft(conversionItem));
    if (conversionItem.syncTarget === 'finance-revenue' || conversionItem.syncTarget === 'reading' || conversionItem.syncTarget === 'journal') {
      setConversionTarget(conversionItem.syncTarget);
    } else {
      setConversionTarget('finance-revenue');
    }
  }, [conversionItem]);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const financeClientMap = useMemo(
    () => new Map(financeClients.map((client) => [client.id, client])),
    [financeClients],
  );
  const selectedQuickAddCategory = useMemo(
    () => categoryMap.get(draftCategoryId) ?? null,
    [categoryMap, draftCategoryId],
  );
  const isTraiteursQuickAdd = selectedQuickAddCategory?.id === TRAITEURS_CATEGORY_ID;
  const isEditingTraiteursCategory = editingCategory?.id === TRAITEURS_CATEGORY_ID;
  const currentWeekCategoryGoals = useMemo(
    () => Object.fromEntries(
      categories.map((category) => [category.id, currentWeekPlan?.categoryGoals?.[category.id] ?? category.targetHoursPerWeek]),
    ) as Record<string, number>,
    [categories, currentWeekPlan?.categoryGoals],
  );

  useEffect(() => {
    setWeekGoalDrafts(
      Object.fromEntries(
        categories.map((category) => {
          const value = currentWeekCategoryGoals[category.id] ?? 0;
          return [category.id, value > 0 ? String(value) : ''];
        }),
      ),
    );
  }, [categories, currentWeekCategoryGoals]);

  const visibleItems = useMemo(
    () => (state.preferences.showCompleted ? items : items.filter((item) => item.status !== 'done')),
    [items, state.preferences.showCompleted],
  );

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const weekDayKeys = useMemo(() => new Set(weekDays.map((day) => day.date)), [weekDays]);

  const weekItems = useMemo(
    () => visibleItems.filter((item) => weekDayKeys.has(item.date)),
    [visibleItems, weekDayKeys],
  );
  const weekAllItems = useMemo(
    () => items.filter((item) => weekDayKeys.has(item.date)),
    [items, weekDayKeys],
  );

  const weekScheduledItems = useMemo(
    () => weekItems.filter((item) => item.startTime && item.endTime),
    [weekItems],
  );
  const { startHour: timelineStartHour, endHour: timelineEndHour } = useMemo(
    () => getTimelineWindow(weekScheduledItems),
    [weekScheduledItems],
  );
  const timeSlots = useMemo(
    () => getTimeSlots(timelineStartHour, timelineEndHour, SLOT_MINUTES),
    [timelineEndHour, timelineStartHour],
  );
  const timelineHeight = useMemo(
    () => ((timelineEndHour - timelineStartHour) * 60 / SLOT_MINUTES) * SLOT_HEIGHT,
    [timelineEndHour, timelineStartHour],
  );
  const hourLabelSlots = useMemo(
    () => timeSlots.slice(0, -1).filter((slot) => slot.minutes % 60 === 0),
    [timeSlots],
  );

  const weekBacklogItems = useMemo(
    () => weekItems.filter((item) => !item.startTime || !item.endTime),
    [weekItems],
  );

  const weekReferences = useMemo(
    () => externalReferences.filter((reference) => weekDayKeys.has(reference.date)),
    [externalReferences, weekDayKeys],
  );

  const selectedDayItems = useMemo(
    () => visibleItems.filter((item) => item.date === selectedDate),
    [selectedDate, visibleItems],
  );

  const selectedDayScheduledItems = selectedDayItems.filter((item) => item.startTime && item.endTime);
  const selectedDayBacklogItems = selectedDayItems.filter((item) => !item.startTime || !item.endTime);
  const selectedDayReferences = externalReferences.filter((reference) => reference.date === selectedDate);

  const weekConflicts = useMemo(() => detectCalendarConflicts(weekScheduledItems), [weekScheduledItems]);
  const activeConversions = conversions.filter((conversion) => conversion.status === 'converted');

  const conversionsByItem = useMemo(() => {
    const map = new Map<string, typeof activeConversions>();
    activeConversions.forEach((conversion) => {
      const itemConversions = map.get(conversion.itemId) ?? [];
      itemConversions.push(conversion);
      map.set(conversion.itemId, itemConversions);
    });
    return map;
  }, [activeConversions]);

  const currentMonthKey = selectedDate.slice(0, 7);
  const currentYear = selectedDate.slice(0, 4);
  const monthItems = visibleItems.filter((item) => item.date.startsWith(currentMonthKey));
  const yearItems = visibleItems.filter((item) => item.date.startsWith(currentYear));
  const selectedPeriodLabel = useMemo(() => {
    if (activeView === 'day') return formatCalendarLongDate(selectedDate);
    if (activeView === 'month') return formatCalendarMonthLabel(selectedDate);
    if (activeView === 'year') return currentYear;
    return formatCalendarWeekLabel(selectedDate);
  }, [activeView, currentYear, selectedDate]);

  const weeklyCategoryRows = useMemo(
    () => categories.map((category) => {
      const categoryItems = weekAllItems.filter((item) => item.categoryId === category.id);
      const actualMinutes = categoryItems.reduce((sum, item) => {
        if (item.actualMinutes > 0) return sum + item.actualMinutes;
        if (item.status === 'done') return sum + item.plannedMinutes;
        return sum;
      }, 0);

      return {
        category,
        actualMinutes,
        goalHours: currentWeekCategoryGoals[category.id] ?? 0,
        associatedTaskTitles: categoryItems.map((item) => item.title),
      };
    }),
    [categories, currentWeekCategoryGoals, weekAllItems],
  );
  const tasksModalCategoryRow = useMemo(
    () => weeklyCategoryRows.find((row) => row.category.id === tasksModalCategoryId) ?? null,
    [tasksModalCategoryId, weeklyCategoryRows],
  );
  const weeklyGoalChartData = useMemo(
    () => weeklyCategoryRows
      .filter((row) => row.goalHours > 0)
      .map((row) => ({
        name: row.category.name,
        value: row.goalHours,
        color: row.category.color,
      })),
    [weeklyCategoryRows],
  );
  const weeklyActualChartData = useMemo(
    () => weeklyCategoryRows
      .filter((row) => row.actualMinutes > 0)
      .map((row) => ({
        name: row.category.name,
        value: Number((row.actualMinutes / 60).toFixed(2)),
        color: row.category.color,
      })),
    [weeklyCategoryRows],
  );

  const monthSummary = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(Number(currentYear), monthIndex, 1);
    const monthKey = toCalendarDateKey(monthDate).slice(0, 7);
    const matchingItems = yearItems.filter((item) => item.date.startsWith(monthKey));
    return {
      date: toCalendarDateKey(monthDate),
      label: monthDate.toLocaleDateString('fr-FR', { month: 'long' }),
      count: matchingItems.length,
      plannedMinutes: matchingItems.reduce((sum, item) => sum + item.plannedMinutes, 0),
    };
  });

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    const resolvedPlannedMinutes = hoursToMinutes(Number(draftPlannedHours));
    const selectedCategory = selectedQuickAddCategory;
    if (!draftTitle.trim() || !selectedCategory || resolvedPlannedMinutes <= 0) return;
    const expectsFinanceRevenue = selectedCategory.isRevenueCategory || selectedCategory.id === TRAITEURS_CATEGORY_ID;

    if (selectedCategory.id === TRAITEURS_CATEGORY_ID) {
      if (financeClients.length === 0) {
        toast({
          title: 'Aucun traiteur disponible',
          description: 'Ajoute d abord un client dans Finances pour selectionner un traiteur.',
          variant: 'destructive',
        });
        return;
      }

      if (!selectedCategory.hourlyRate || selectedCategory.hourlyRate <= 0) {
        toast({
          title: 'Categorie Traiteurs incomplete',
          description: 'Configure un taux horaire valide sur la categorie Traiteurs pour envoyer automatiquement vers Finances.',
          variant: 'destructive',
        });
        return;
      }

      if (!draftTraiteurClientId) {
        toast({
          title: 'Selectionne un traiteur',
          description: 'Choisis le client Finance a rattacher a cette tache Traiteurs.',
          variant: 'destructive',
        });
        return;
      }

      if (!financeClientMap.has(draftTraiteurClientId)) {
        toast({
          title: 'Traiteur introuvable',
          description: 'Le client selectionne n existe plus. Choisis-en un autre avant de creer la tache.',
          variant: 'destructive',
        });
        return;
      }
    }

    const { endTime, endDayOffset } = getEndTimeWithDayOffset(draftStartTime || null, resolvedPlannedMinutes);

    const result = await addItem({
      title: draftTitle.trim(),
      date: draftDate,
      categoryId: selectedCategory.id,
      plannedMinutes: resolvedPlannedMinutes,
      startTime: draftStartTime || null,
      endTime,
      endDayOffset,
      financeClientIdOverride: selectedCategory.id === TRAITEURS_CATEGORY_ID ? draftTraiteurClientId : null,
    });

    if (expectsFinanceRevenue && !result.revenueRecordId) {
      const descriptions: Record<typeof result.revenueStatus, string> = {
        created: '',
        'not-applicable': 'La categorie revenue n a pas pu creer de ligne finance.',
        'missing-hourly-rate': 'Configure un taux horaire valide sur cette categorie pour envoyer la ligne vers Finances.',
        'missing-category-client': 'Configure un client Finance sur cette categorie pour activer l envoi automatique.',
        'missing-item-client': 'Selectionne un traiteur pour rattacher cette tache au bon client Finance.',
        'invalid-client': 'Le client selectionne n existe plus. Recharge la selection avant de reessayer.',
      };

      toast({
        title: 'Tache ajoutee sans revenu',
        description: descriptions[result.revenueStatus],
        variant: 'destructive',
      });
    }

    setDraftTitle('');
    setDraftPlannedHours('1');
    setDraftStartTime('');
    setDraftCategoryId(selectedCategory.id);
    setDraftTraiteurClientId('');
    setIsQuickAddOpen(false);

    if (expectsFinanceRevenue && result.revenueRecordId) {
      toast({
        title: 'Revenu ajoute',
        description: `${draftTitle.trim()} a aussi ete cree dans Revenus.`,
      });
    }
  };

  const openCategoryEditor = (category: CalendarTaskCategory) => {
    setEditingCategoryId(category.id);
  };

  const handleCategoryColorPick = (color: string) => {
    const normalized = normalizeHexColor(color);
    setCategoryDraft((current) => (
      current
        ? {
            ...current,
            color: normalized,
          }
        : current
    ));
    setColorHexDraft(normalized);
    setCategoryError('');
    setIsColorPickerOpen(false);
  };

  const handleCategorySave = () => {
    if (!isLoaded) return;
    if (!editingCategory || !categoryDraft) return;

    const nextName = categoryDraft.name.trim();
    const nextColor = normalizeHexColor(categoryDraft.color);
    const nextHourlyRate = Number(categoryDraft.hourlyRate);

    if (!nextName) {
      setCategoryError('Le nom de categorie est obligatoire.');
      return;
    }

    if (!isHexColorValue(nextColor)) {
      setCategoryError('Choisis une couleur hex valide.');
      return;
    }

    if (categoryDraft.isRevenueCategory) {
      if (!isEditingTraiteursCategory && !categoryDraft.financeClientId) {
        setCategoryError('Selectionne un client Finance pour activer Revenu.');
        return;
      }

      if (!isEditingTraiteursCategory && !financeClientMap.has(categoryDraft.financeClientId)) {
        setCategoryError('Le client Finance selectionne n existe plus.');
        return;
      }

      if (!Number.isFinite(nextHourlyRate) || nextHourlyRate <= 0) {
        setCategoryError('Renseigne un taux horaire valide pour cette categorie.');
        return;
      }
    }

    updateCategory(editingCategory.id, {
      name: nextName,
      color: nextColor,
      isRevenueCategory: categoryDraft.isRevenueCategory,
      financeClientId: categoryDraft.isRevenueCategory
        ? (isEditingTraiteursCategory ? null : categoryDraft.financeClientId)
        : null,
      hourlyRate: categoryDraft.isRevenueCategory ? nextHourlyRate : null,
    });

    toast({
      title: 'Categorie mise a jour',
      description: `${nextName} a ete enregistree.`,
    });
    setEditingCategoryId(null);
  };

  const handleShiftPeriod = (direction: -1 | 1) => {
    const currentDate = fromCalendarDateKey(selectedDate);

    if (activeView === 'day') {
      setSelectedDate(toCalendarDateKey(addDays(currentDate, direction)));
      return;
    }

    if (activeView === 'month') {
      setSelectedDate(toCalendarDateKey(addMonths(currentDate, direction)));
      return;
    }

    if (activeView === 'year') {
      setSelectedDate(toCalendarDateKey(addYears(currentDate, direction)));
      return;
    }

    setSelectedDate(toCalendarDateKey(addDays(currentDate, direction * 7)));
  };

  const handleCategoryGoalDraftChange = (categoryId: string, value: string) => {
    setWeekGoalDrafts((current) => ({
      ...current,
      [categoryId]: value,
    }));
  };

  const handleCategoryGoalCommit = (categoryId: string) => {
    if (!isLoaded) return;
    const rawValue = weekGoalDrafts[categoryId] ?? '';
    const parsedValue = Number(rawValue);
    const normalizedValue = rawValue.trim() === '' || !Number.isFinite(parsedValue) ? 0 : parsedValue;

    updateWeekPlan({
      categoryGoals: {
        [categoryId]: normalizedValue,
      },
    });
  };

  const handleActualMinutesCommit = (itemId: string, value: string) => {
    if (!isLoaded) return;
    const parsedValue = Number(value);
    const normalizedValue = value.trim() === '' || !Number.isFinite(parsedValue)
      ? 0
      : hoursToMinutes(parsedValue);

    updateItem(itemId, {
      actualMinutes: normalizedValue,
    });
  };

  const currentWeekStartKey = weekDays[0]?.date ?? selectedDate;

  const handleTimelineAutoScroll = (event: React.DragEvent<HTMLDivElement>) => {
    const container = timelineScrollRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (event.clientX <= rect.left + 72) {
      container.scrollBy({ left: -18 });
    } else if (event.clientX >= rect.right - 72) {
      container.scrollBy({ left: 18 });
    }

    if (event.clientY <= rect.top + 72) {
      container.scrollBy({ top: -18 });
    } else if (event.clientY >= rect.bottom - 72) {
      container.scrollBy({ top: 18 });
    }
  };

  const handleDropToBacklog = (date: string, position: number) => {
    if (!isLoaded) return;
    if (!draggedItemId) return;
    updateItem(draggedItemId, {
      date,
      startTime: null,
      endTime: null,
    });
    reorderItem(draggedItemId, date, position);
    setDraggedItemId(null);
    setDropIndicator(null);
  };

  const handleDropToSlot = (date: string, startTime: string) => {
    if (!isLoaded) return;
    if (!draggedItemId) return;
    const movingItem = items.find((item) => item.id === draggedItemId);
    if (!movingItem) return;

    const duration = Math.max(movingItem.plannedMinutes || 60, SLOT_MINUTES);
    const { endTime, endDayOffset } = getEndTimeWithDayOffset(startTime, duration);
    if (!endTime) return;
    scheduleItem(draggedItemId, date, startTime, endTime, endDayOffset);
    setDraggedItemId(null);
    setDropIndicator(null);
  };

  const openConversionDialog = (item: CalendarItem, target?: CalendarConversionTarget) => {
    setConversionItemId(item.id);
    setConversionTarget(target ?? (item.syncTarget === 'finance-revenue' || item.syncTarget === 'reading' || item.syncTarget === 'journal'
      ? item.syncTarget
      : 'finance-revenue'));
  };

  const handleSubmitConversion = async () => {
    if (!conversionItem) return;

    if (conversionTarget === 'finance-revenue') {
      if (!revenueDraft.client.trim() || !revenueDraft.service.trim()) return;
      const success = await convertItemToRevenue(conversionItem.id, {
        date: revenueDraft.date,
        client: revenueDraft.client.trim(),
        service: revenueDraft.service.trim(),
        hourlyRate: Number(revenueDraft.hourlyRate) || 0,
        hours: Number(revenueDraft.hours) || 0,
      });

      if (success) {
        toast({
          title: 'Conversion vers Revenus',
          description: `${conversionItem.title} a ete convertie en revenu.`,
        });
        setConversionItemId(null);
      }
      return;
    }

    if (conversionTarget === 'reading') {
      if (!readingDraft.title.trim() || !readingDraft.author.trim()) return;
      const success = await convertItemToReading(conversionItem.id, {
        date: readingDraft.date,
        title: readingDraft.title.trim(),
        author: readingDraft.author.trim(),
        category: readingDraft.category,
        rating: Number(readingDraft.rating) || 0,
      });

      if (success) {
        toast({
          title: 'Conversion vers Lecture',
          description: `${conversionItem.title} a ete convertie en entree lecture.`,
        });
        setConversionItemId(null);
      }
      return;
    }

    const success = await convertItemToJournal(conversionItem.id, {
      date: journalDraft.date,
      somethingNew: journalDraft.somethingNew.trim(),
      somethingLearnt: journalDraft.somethingLearnt.trim(),
      couldDoneBetter: journalDraft.couldDoneBetter.trim(),
      didWell: journalDraft.didWell.trim(),
    });

    if (success) {
      toast({
        title: 'Conversion vers Journal',
        description: `${conversionItem.title} a ete convertie en entree journal.`,
      });
      setConversionItemId(null);
    }
  };

  const renderTaskBadges = (item: CalendarItem) => {
    const category = categoryMap.get(item.categoryId);
    const itemConversions = conversionsByItem.get(item.id) ?? [];

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {category ? (
          <Badge variant="outline" className="gap-1 border-border/70 bg-background/70 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
            {category.name}
          </Badge>
        ) : null}
        <Badge variant="outline" className="gap-1 border-border/70 bg-background/70 text-[11px]">
          <Clock3 className="h-3.5 w-3.5" />
          {minutesToHoursLabel(item.plannedMinutes)}
        </Badge>
        {item.startTime && item.endTime ? (
          <Badge variant="outline" className="border-border/70 bg-background/70 text-[11px]">
            {formatCalendarItemTimeRange(item)}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-border/70 bg-background/70 text-[11px]">
            Sans horaire
          </Badge>
        )}
        {itemConversions.map((conversion) => (
          <Badge key={conversion.id} variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-200">
            Converti: {CONVERSION_LABELS[conversion.target]}
          </Badge>
        ))}
      </div>
    );
  };

  const renderBacklogCard = (item: CalendarItem, position: number, dayDate: string) => {
    const itemConversions = conversionsByItem.get(item.id) ?? [];
    const category = categoryMap.get(item.categoryId);

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => setDraggedItemId(item.id)}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDropIndicator(null);
        }}
        className={cn(
          'rounded-[1.2rem] border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_hsl(var(--background)/0.14)]',
          getTaskTone(item, false),
        )}
        style={category ? getCategoryOutlineStyle(category.color) : undefined}
      >
        <div className="flex items-start gap-3">
          <Checkbox checked={item.status === 'done'} onCheckedChange={() => toggleItemComplete(item.id)} className="mt-1" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn('text-sm font-semibold text-foreground', item.status === 'done' && 'line-through opacity-70')}>
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => deleteItem(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {renderTaskBadges(item)}
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Select value={item.categoryId} onValueChange={(value) => updateItem(item.id, { categoryId: value })}>
                <SelectTrigger className="h-8 min-w-[11rem] rounded-full border-border/70 bg-background/75 px-3 text-xs text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs text-muted-foreground">
                <span>Reel</span>
                <Input
                  key={`${item.id}-${item.actualMinutes}`}
                  type="number"
                  min="0"
                  step="0.25"
                  defaultValue={formatHoursInputValue(item.actualMinutes)}
                  onBlur={(event) => handleActualMinutesCommit(item.id, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }
                  }}
                  className="h-7 w-16 border-0 bg-transparent px-0 text-right text-xs text-foreground shadow-none focus-visible:ring-0"
                  placeholder="0"
                />
                <span>h</span>
              </label>
              <Button type="button" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => openConversionDialog(item)}>
                Convertir
              </Button>
              {item.startTime && item.endTime ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => {
                    updateItem(item.id, { startTime: null, endTime: null });
                    reorderItem(item.id, dayDate, position);
                  }}
                >
                  Passer sans horaire
                </Button>
              ) : null}
              {itemConversions.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">{itemConversions.length} conversion(s) active(s)</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReferenceCard = (reference: CalendarExternalReference) => {
    const Icon = getReferenceIcon(reference.source);

    return (
      <div key={reference.id} className="rounded-[1.1rem] border border-border/70 bg-background/60 p-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80">
            <Icon className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{reference.title}</p>
              <Badge variant="outline" className="border-border/70 text-[11px]">
                {SOURCE_LABELS[reference.source]}
              </Badge>
            </div>
            {reference.summary ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{reference.summary}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-5">
        {!isLoaded ? (
          <div className="rounded-[1.2rem] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            Chargement du calendrier et de ses donnees...
          </div>
        ) : null}
        <section className="surface-panel rounded-[1.8rem] p-5">
          <Tabs
            value={activeView}
            onValueChange={(value) => {
              if (!isLoaded) return;
              setActiveView(value as CalendarView);
            }}
            className={cn('space-y-5', !isLoaded && 'pointer-events-none opacity-60')}
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:w-auto sm:grid-cols-4">
                {VIEW_OPTIONS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
                ))}
              </TabsList>

              <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-white/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.92),hsl(var(--secondary)/0.74))] text-white shadow-[0_14px_28px_hsl(var(--primary)/0.22)] hover:bg-[linear-gradient(135deg,hsl(var(--primary)/0.92),hsl(var(--secondary)/0.74))] hover:text-white hover:opacity-95"
                  onClick={() => setIsQuickAddOpen(true)}
                  disabled={!isLoaded}
                >
                  <Plus className="h-4.5 w-4.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleShiftPeriod(-1)} disabled={!isLoaded}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[14rem] justify-center rounded-full px-4 text-sm whitespace-nowrap"
                  onClick={() => setIsDatePickerOpen(true)}
                  disabled={!isLoaded}
                >
                  {selectedPeriodLabel}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleShiftPeriod(1)} disabled={!isLoaded}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="week" className="space-y-5">
                  <div key={currentWeekStartKey} className="animate-rise-fade rounded-[1.6rem] border border-border/70 bg-background/55 p-4">
                    <div
                      ref={timelineScrollRef}
                      onDragOver={handleTimelineAutoScroll}
                      className="overflow-auto rounded-[1.4rem] border border-border/70 bg-background/45"
                    >
                      <div className="grid min-w-[1260px] grid-cols-[72px_repeat(7,minmax(170px,1fr))] gap-3 p-3">
                        <div className="relative">
                          <div className="h-[4.4rem]" />
                          <div className="relative" style={{ height: `${timelineHeight}px` }}>
                            {hourLabelSlots.map((slot) => (
                              <div
                                key={slot.value}
                                className="absolute left-0 right-0 flex items-start justify-end pr-2 text-[11px] text-muted-foreground"
                                style={{ top: `${((slot.minutes - (timelineStartHour * 60)) / SLOT_MINUTES) * SLOT_HEIGHT - 8}px` }}
                              >
                                {slot.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {weekDays.map((day) => {
                          const dayScheduledItems = weekScheduledItems.filter((item) => item.date === day.date);
                          const dayBacklogItems = weekBacklogItems
                            .filter((item) => item.date === day.date)
                            .sort((left, right) => left.position - right.position);

                          return (
                            <div key={day.date} className="space-y-3">
                              <button
                                type="button"
                                className={cn(
                                  'w-full rounded-[1.3rem] border border-border/70 bg-background/70 px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5',
                                  day.date === selectedDate && 'shadow-[0_0_0_1px_hsl(var(--primary)/0.38)]',
                                )}
                                onClick={() => setSelectedDate(day.date)}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{day.shortLabel}</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{day.dayNumber}</p>
                                  </div>
                                  {day.isToday ? (
                                    <Badge className="bg-[linear-gradient(135deg,hsl(var(--primary)/0.92),hsl(var(--secondary)/0.74))] text-white">
                                      Aujourd'hui
                                    </Badge>
                                  ) : null}
                                </div>
                              </button>

                              <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-2.5">
                                <div className="relative rounded-[1.1rem] border border-border/70 bg-background/70" style={{ height: `${timelineHeight}px` }}>
                                  {timeSlots.slice(0, -1).map((slot, slotIndex) => (
                                    <div
                                      key={slot.value}
                                      onDragOver={(event) => {
                                        event.preventDefault();
                                        setDropIndicator({ kind: 'slot', date: day.date, startTime: slot.value });
                                      }}
                                      onDragLeave={() => {
                                        if (dropIndicator?.kind === 'slot' && dropIndicator.date === day.date && dropIndicator.startTime === slot.value) {
                                          setDropIndicator(null);
                                        }
                                      }}
                                      onDrop={() => handleDropToSlot(day.date, slot.value)}
                                      className={cn(
                                        'absolute left-0 right-0 transition',
                                        slotIndex > 0 && 'border-t border-border/60',
                                        dropIndicator?.kind === 'slot'
                                          && dropIndicator.date === day.date
                                          && dropIndicator.startTime === slot.value
                                          && 'bg-primary/12',
                                      )}
                                      style={{
                                        top: `${((slot.minutes - (timelineStartHour * 60)) / SLOT_MINUTES) * SLOT_HEIGHT}px`,
                                        height: `${SLOT_HEIGHT}px`,
                                      }}
                                    />
                                  ))}

                                  {dayScheduledItems.map((item) => {
                                    const style = getBlockStyle(item, timelineStartHour);
                                    if (!style) return null;
                                    const isConflicting = weekConflicts.has(item.id);
                                    const category = categoryMap.get(item.categoryId);

                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        draggable
                                        onDragStart={() => setDraggedItemId(item.id)}
                                        onDragEnd={() => {
                                          setDraggedItemId(null);
                                          setDropIndicator(null);
                                        }}
                                        onClick={() => {
                                          setSelectedDate(item.date);
                                          setActiveView('day');
                                        }}
                                        className={cn(
                                          'absolute left-2 right-2 overflow-hidden rounded-[1rem] border px-3 py-2 text-left shadow-[0_14px_26px_hsl(var(--background)/0.16)]',
                                          getTaskTone(item, isConflicting),
                                        )}
                                        style={{
                                          ...style,
                                          ...(category && !isConflicting ? getCategoryOutlineStyle(category.color) : {}),
                                        }}
                                      >
                                        <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {formatCalendarItemTimeRange(item)}
                                        </p>
                                        {isConflicting ? (
                                          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-rose-200">Conflit</p>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(day.date);
                                    setWeekSecondaryPanel('unscheduled');
                                  }}
                                  onDragOver={(event) => {
                                    event.preventDefault();
                                    setDropIndicator({ kind: 'backlog', date: day.date, position: dayBacklogItems.length });
                                  }}
                                  onDragLeave={() => {
                                    if (dropIndicator?.kind === 'backlog' && dropIndicator.date === day.date && dropIndicator.position === dayBacklogItems.length) {
                                      setDropIndicator(null);
                                    }
                                  }}
                                  onDrop={() => {
                                    handleDropToBacklog(day.date, dayBacklogItems.length);
                                    setSelectedDate(day.date);
                                    setWeekSecondaryPanel('unscheduled');
                                  }}
                                  className={cn(
                                    'flex items-center rounded-[1.15rem] border px-3 py-2.5 text-left transition duration-200',
                                    'border-border/70 bg-background/55 hover:border-primary/30 hover:bg-background/70',
                                    selectedDate === day.date && weekSecondaryPanel === 'unscheduled' && 'border-primary/35 bg-background/72 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]',
                                    dropIndicator?.kind === 'backlog'
                                      && dropIndicator.date === day.date
                                      && dropIndicator.position === dayBacklogItems.length
                                      && 'border-primary/50 bg-primary/10',
                                  )}
                                >
                                  <span className="text-xs font-medium text-foreground">Sans horaire</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(day.date);
                                    setWeekSecondaryPanel('references');
                                  }}
                                  className={cn(
                                    'flex items-center rounded-[1.15rem] border px-3 py-2.5 text-left transition duration-200',
                                    'border-border/70 bg-background/55 hover:border-primary/30 hover:bg-background/70',
                                    selectedDate === day.date && weekSecondaryPanel === 'references' && 'border-primary/35 bg-background/72 shadow-[0_0_0_1px_hsl(var(--primary)/0.2)]',
                                  )}
                                >
                                  <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
                                    <Layers3 className="h-3.5 w-3.5 text-muted-foreground" />
                                    Donnees liees
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
                    <div className="rounded-[1.45rem] border border-border/70 bg-background/50 p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Categories</p>
                        <Badge variant="outline" className="rounded-full border-border/70 bg-background/65 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {weeklyCategoryRows.length}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-[minmax(0,1.55fr)_82px_84px_72px] items-center gap-2 px-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        <span>Catégorie</span>
                        <span className="text-center">Actual</span>
                        <span className="text-center">Goal</span>
                        <span className="text-center">Tâches</span>
                      </div>

                      <div className="mt-2 grid gap-1.5">
                        {weeklyCategoryRows.map((row) => {
                          const taskCount = row.associatedTaskTitles.length;

                          return (
                            <div
                              key={row.category.id}
                              className="grid grid-cols-[minmax(0,1.55fr)_82px_84px_72px] items-center gap-2 rounded-[1rem] border bg-background/62 px-2.5 py-2 shadow-[0_10px_22px_hsl(var(--background)/0.06)]"
                              style={getCategoryOutlineStyle(row.category.color)}
                            >
                              <button
                                type="button"
                                onClick={() => openCategoryEditor(row.category)}
                                className="flex min-w-0 items-center gap-2 rounded-full border border-transparent px-1.5 py-1 text-left transition hover:border-border/70 hover:bg-background/65"
                              >
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.category.color }} />
                                <span className="truncate text-sm font-medium text-foreground">{row.category.name}</span>
                                {row.category.isRevenueCategory ? (
                                  <Badge variant="outline" className="rounded-full border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0 text-[8px] uppercase tracking-[0.16em] text-emerald-200">
                                    Revenu
                                  </Badge>
                                ) : null}
                              </button>

                              <div className="text-center font-mono text-sm font-semibold text-foreground">
                                {minutesToHoursLabel(row.actualMinutes)}
                              </div>

                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={weekGoalDrafts[row.category.id] ?? ''}
                                onChange={(event) => handleCategoryGoalDraftChange(row.category.id, event.target.value)}
                                onBlur={() => handleCategoryGoalCommit(row.category.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.currentTarget.blur();
                                  }
                                }}
                                className="h-7 min-w-0 rounded-full border-border/60 bg-background/75 px-2 text-center text-xs"
                                placeholder="0"
                              />

                              {taskCount > 0 ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-7 rounded-full border border-border/60 px-2 font-mono text-xs text-foreground"
                                  onClick={() => setTasksModalCategoryId(row.category.id)}
                                >
                                  {taskCount}
                                </Button>
                              ) : (
                                <span className="text-center font-mono text-xs text-muted-foreground">0</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[1.35rem] border border-border/70 bg-background/52 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Weekly Goals</p>
                        <div className="mt-3 h-[230px]">
                          {weeklyGoalChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={weeklyGoalChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={44}
                                  outerRadius={74}
                                  paddingAngle={2}
                                  stroke="none"
                                >
                                  {weeklyGoalChartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} h`, 'Goal']}
                                  contentStyle={{
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(15,23,42,0.92)',
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-border/60 text-sm text-muted-foreground">
                              0 h
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-border/70 bg-background/52 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Weekly Actual</p>
                        <div className="mt-3 h-[230px]">
                          {weeklyActualChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={weeklyActualChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  innerRadius={44}
                                  outerRadius={74}
                                  paddingAngle={2}
                                  stroke="none"
                                >
                                  {weeklyActualChartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} h`, 'Actual']}
                                  contentStyle={{
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(15,23,42,0.92)',
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center rounded-[1rem] border border-dashed border-border/60 text-sm text-muted-foreground">
                              0 h
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{formatCalendarLongDate(selectedDate)}</p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">
                          {weekSecondaryPanel === 'unscheduled' ? 'Sans horaire' : 'Donnees liees'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={weekSecondaryPanel === 'unscheduled' ? 'default' : 'outline'}
                          className="rounded-full"
                          onClick={() => setWeekSecondaryPanel('unscheduled')}
                        >
                          Sans horaire
                        </Button>
                        <Button
                          type="button"
                          variant={weekSecondaryPanel === 'references' ? 'default' : 'outline'}
                          className="rounded-full"
                          onClick={() => setWeekSecondaryPanel('references')}
                        >
                          Donnees liees
                        </Button>
                      </div>
                    </div>

                    {weekSecondaryPanel === 'unscheduled' ? (
                      <div
                        className="mt-4 grid gap-3"
                        onDragOver={(event) => {
                          event.preventDefault();
                          handleTimelineAutoScroll(event);
                        }}
                      >
                        <div
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDropIndicator({ kind: 'backlog', date: selectedDate, position: 0 });
                          }}
                          onDrop={() => handleDropToBacklog(selectedDate, 0)}
                          className={cn(
                            'h-3 rounded-full transition',
                            dropIndicator?.kind === 'backlog'
                              && dropIndicator.date === selectedDate
                              && dropIndicator.position === 0
                              && 'bg-primary/30',
                          )}
                        />

                        {selectedDayBacklogItems.length === 0 ? (
                          <div
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDropIndicator({ kind: 'backlog', date: selectedDate, position: 0 });
                            }}
                            onDrop={() => handleDropToBacklog(selectedDate, 0)}
                            className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground"
                          >
                            Aucune tache sans horaire pour ce jour.
                          </div>
                        ) : selectedDayBacklogItems.map((item, index) => (
                          <div key={item.id} className="grid gap-3">
                            {renderBacklogCard(item, index, selectedDate)}
                            <div
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDropIndicator({ kind: 'backlog', date: selectedDate, position: index + 1 });
                              }}
                              onDrop={() => handleDropToBacklog(selectedDate, index + 1)}
                              className={cn(
                                'h-3 rounded-full transition',
                                dropIndicator?.kind === 'backlog'
                                  && dropIndicator.date === selectedDate
                                  && dropIndicator.position === index + 1
                                  && 'bg-primary/30',
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {selectedDayReferences.length === 0 ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                            Aucune donnee liee pour ce jour.
                          </div>
                        ) : selectedDayReferences.map(renderReferenceCard)}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="day" className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
                  <div className="space-y-4">
                    <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Jour</p>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{formatCalendarLongDate(selectedDate)}</h3>
                    </div>

                    <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Blocs horaires</p>
                      <div className="mt-4 grid gap-3">
                        {selectedDayScheduledItems.length === 0 ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                            Aucun bloc horaire pour ce jour.
                          </div>
                        ) : selectedDayScheduledItems.map((item) => renderBacklogCard(item, item.position, selectedDate))}
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sans horaire</p>
                      <div className="mt-4 grid gap-3">
                        {selectedDayBacklogItems.length === 0 ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                            Aucune tache sans horaire pour ce jour.
                          </div>
                        ) : selectedDayBacklogItems.map((item) => renderBacklogCard(item, item.position, selectedDate))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Donnees liees</p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">Jour</h3>
                        </div>
                        <CalendarDays className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="mt-4 grid gap-3">
                        {selectedDayReferences.length === 0 ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                            Aucune donnee liee pour ce jour.
                          </div>
                        ) : selectedDayReferences.map(renderReferenceCard)}
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-border/70 bg-background/55 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Conversions</p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">Actives</h3>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                      </div>
                      <div className="mt-4 grid gap-3">
                        {activeConversions.filter((conversion) => selectedDayItems.some((item) => item.id === conversion.itemId)).length === 0 ? (
                          <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                            Aucune conversion active sur cette journee.
                          </div>
                        ) : activeConversions
                          .filter((conversion) => selectedDayItems.some((item) => item.id === conversion.itemId))
                          .map((conversion) => (
                            <div key={conversion.id} className="rounded-[1.1rem] border border-border/70 bg-background/60 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{conversion.summary}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {CONVERSION_LABELS[conversion.target]} · {conversion.recordDate}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="h-8 rounded-full px-3 text-xs"
                                  onClick={async () => {
                                    const reverted = await revertItemConversion(conversion.id);
                                    if (reverted) {
                                      toast({
                                        title: 'Conversion annulee',
                                        description: `${conversion.summary} a ete retire du module cible.`,
                                      });
                                    }
                                  }}
                                >
                                  <Undo2 className="h-3.5 w-3.5" />
                                  Revert
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="month" className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Mois</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{formatCalendarMonthLabel(selectedDate)}</h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {monthDays.map((day) => {
                      const dayItems = monthItems.filter((item) => item.date === day.date);
                      const dayRefs = externalReferences.filter((reference) => reference.date === day.date);

                      return (
                        <button
                          key={day.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(day.date);
                            setActiveView('day');
                          }}
                          className="rounded-[1.3rem] border border-border/70 bg-background/55 p-4 text-left transition duration-200 hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                {fromCalendarDateKey(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                              </p>
                              <p className={cn('mt-1 text-lg font-semibold text-foreground', !day.isCurrentMonth && 'opacity-45')}>
                                {day.dayNumber}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {dayItems.slice(0, 3).map((item) => (
                              <div key={item.id} className="truncate rounded-full border border-border/70 px-3 py-1 text-[11px] text-foreground">
                                {item.title}
                              </div>
                            ))}
                            {dayRefs.slice(0, 2).map((reference) => (
                              <div key={reference.id} className="truncate rounded-full border border-border/70 px-3 py-1 text-[11px] text-muted-foreground">
                                {SOURCE_LABELS[reference.source]} · {reference.title}
                              </div>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="year" className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Annee</p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">{currentYear}</h3>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {monthSummary.map((month) => (
                      <button
                        key={month.date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(month.date);
                          setActiveView('month');
                        }}
                        className="rounded-[1.35rem] border border-border/70 bg-background/55 p-4 text-left transition duration-200 hover:-translate-y-0.5"
                      >
                        <p className="text-sm font-semibold capitalize text-foreground">{month.label}</p>
                        <p className="mt-3 text-sm text-muted-foreground">{minutesToHoursLabel(month.plannedMinutes)}</p>
                      </button>
                    ))}
                  </div>
                </TabsContent>
          </Tabs>
        </section>
      </div>

      <WorkspacePopup
        open={isQuickAddOpen}
        onOpenChange={(open) => {
          if (!isLoaded && open) return;
          setIsQuickAddOpen(open);
        }}
        title="Ajouter une tache"
        className="max-w-[min(92vw,32rem)]"
      >
        <form className="grid gap-4" onSubmit={handleCreateItem}>
          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tache</span>
            <Input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Ex. Bloc client, gym, lecture..."
              autoFocus
              disabled={!isLoaded}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Categorie</span>
            <Select value={draftCategoryId} onValueChange={setDraftCategoryId} disabled={!isLoaded}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une categorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isTraiteursQuickAdd ? (
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Traiteur</span>
              <Select value={draftTraiteurClientId || undefined} onValueChange={setDraftTraiteurClientId} disabled={!isLoaded}>
                <SelectTrigger disabled={!isLoaded || financeClients.length === 0}>
                  <SelectValue placeholder={financeClients.length > 0 ? 'Selectionner un traiteur' : 'Aucun client Finance'} />
                </SelectTrigger>
                <SelectContent>
                  {financeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {getClientDisplayName(client)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {financeClients.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ajoute d abord un client dans Finances pour selectionner un traiteur.</p>
              ) : null}
              {!selectedQuickAddCategory?.hourlyRate || selectedQuickAddCategory.hourlyRate <= 0 ? (
                <p className="text-xs text-muted-foreground">Configure un taux horaire sur la categorie Traiteurs pour envoyer automatiquement la ligne vers Finances.</p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
              <Input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} disabled={!isLoaded} />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Debut</span>
              <Input type="time" value={draftStartTime} onChange={(event) => setDraftStartTime(event.target.value)} disabled={!isLoaded} />
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Duree</span>
            <Input type="number" min="0.25" step="0.25" value={draftPlannedHours} onChange={(event) => setDraftPlannedHours(event.target.value)} disabled={!isLoaded} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="rounded-full" disabled={!isLoaded}>
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </form>
      </WorkspacePopup>

      <WorkspacePopup
        open={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        title="Choisir une date"
        className="max-w-[min(92vw,26rem)]"
        bodyClassName="space-y-4"
      >
        <DatePickerCalendar
          mode="single"
          locale={fr}
          selected={fromCalendarDateKey(selectedDate)}
          onSelect={(date) => {
            if (!date) return;
            setSelectedDate(toCalendarDateKey(date));
            setIsDatePickerOpen(false);
          }}
        />
        <div className="grid gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setSelectedDate(toCalendarDateKey(new Date()));
              setIsDatePickerOpen(false);
            }}
          >
            Aujourd'hui
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setShowCompleted(!state.preferences.showCompleted)}
          >
            {state.preferences.showCompleted ? 'Masquer terminees' : 'Afficher terminees'}
          </Button>
        </div>
      </WorkspacePopup>

      <WorkspacePopup
        open={Boolean(tasksModalCategoryRow)}
        onOpenChange={(open) => {
          if (!open) {
            setTasksModalCategoryId(null);
          }
        }}
        title={tasksModalCategoryRow ? `Taches · ${tasksModalCategoryRow.category.name}` : 'Taches'}
        className="max-w-[min(92vw,30rem)]"
        bodyClassName="space-y-4"
      >
        {tasksModalCategoryRow ? (
          tasksModalCategoryRow.associatedTaskTitles.length > 0 ? (
            <div className="grid gap-2">
              {tasksModalCategoryRow.associatedTaskTitles.map((taskTitle, index) => (
                <div
                  key={`${tasksModalCategoryRow.category.id}-${index}`}
                  className="rounded-[1rem] border bg-background/65 px-3 py-2.5 text-sm text-foreground"
                  style={getCategoryOutlineStyle(tasksModalCategoryRow.category.color)}
                >
                  {taskTitle}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
              Aucune tache pour cette categorie cette semaine.
            </div>
          )
        ) : null}
      </WorkspacePopup>

      <WorkspacePopup
        open={Boolean(editingCategory && categoryDraft)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategoryId(null);
          }
        }}
        title={categoryDraft?.name.trim() || editingCategory?.name || 'Categorie'}
        className="max-w-[min(92vw,34rem)]"
        bodyClassName="space-y-5"
      >
        {editingCategory && categoryDraft ? (
          <>
            <div className="rounded-[1.3rem] border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full shadow-[0_0_0_4px_hsl(var(--background)/0.88)]" style={{ backgroundColor: categoryDraft.color }} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{categoryDraft.name || editingCategory.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {categoryDraft.isRevenueCategory
                      ? isEditingTraiteursCategory
                        ? 'Categorie revenu · client choisi a chaque tache'
                        : `Categorie revenu${categoryDraft.financeClientId ? ` · ${financeClientMap.get(categoryDraft.financeClientId) ? getClientDisplayName(financeClientMap.get(categoryDraft.financeClientId)!) : 'Client non trouve'}` : ''}`
                      : 'Categorie planner'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category-name">Nom</Label>
                <Input
                  id="category-name"
                  value={categoryDraft.name}
                  onChange={(event) => {
                    setCategoryDraft((current) => current ? { ...current, name: event.target.value } : current);
                    setCategoryError('');
                  }}
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <Label>Couleur</Label>
                <button
                  type="button"
                  onClick={() => setIsColorPickerOpen(true)}
                  className="flex items-center justify-between rounded-[1.15rem] border border-border/70 bg-background/65 px-3 py-3 text-left transition hover:border-primary/35 hover:bg-background/80"
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="h-5 w-5 rounded-full border border-white/30" style={{ backgroundColor: categoryDraft.color }} />
                    <span className="text-sm font-medium text-foreground">{categoryDraft.color}</span>
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Changer</span>
                </button>
              </div>

              <div className="rounded-[1.2rem] border border-border/70 bg-background/55 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Revenu</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cree automatiquement une ligne dans Revenus a la creation d une tache.
                    </p>
                  </div>
                  <Switch
                    checked={categoryDraft.isRevenueCategory}
                    onCheckedChange={(checked) => {
                      setCategoryDraft((current) => current ? { ...current, isRevenueCategory: checked } : current);
                      setCategoryError('');
                    }}
                  />
                </div>

                {categoryDraft.isRevenueCategory ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {isEditingTraiteursCategory ? (
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Client Finance</Label>
                        <div className="rounded-[1rem] border border-border/70 bg-background/65 px-3 py-3 text-sm text-muted-foreground">
                          Le client Finance sera choisi directement dans la popup d ajout pour chaque tache Traiteurs.
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="category-client">Client Finance</Label>
                        <Select
                          value={categoryDraft.financeClientId || undefined}
                          onValueChange={(value) => {
                            setCategoryDraft((current) => current ? { ...current, financeClientId: value } : current);
                            setCategoryError('');
                          }}
                        >
                          <SelectTrigger id="category-client">
                            <SelectValue placeholder={financeClients.length > 0 ? 'Selectionner un client' : 'Aucun client'} />
                          </SelectTrigger>
                          <SelectContent>
                            {financeClients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>{getClientDisplayName(client)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {financeClients.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Ajoute d abord un client dans Finances pour activer cette categorie.</p>
                        ) : null}
                      </div>
                    )}

                    <div className={`grid gap-2 ${isEditingTraiteursCategory ? 'md:col-span-2' : ''}`}>
                      <Label htmlFor="category-hourly-rate">Taux horaire</Label>
                      <div className="relative">
                        <Input
                          id="category-hourly-rate"
                          type="number"
                          min="0"
                          step="0.5"
                          value={categoryDraft.hourlyRate}
                          onChange={(event) => {
                            setCategoryDraft((current) => current ? { ...current, hourlyRate: event.target.value } : current);
                            setCategoryError('');
                          }}
                          className="pr-10"
                          placeholder="0"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-sm text-muted-foreground">€</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {categoryError ? (
                <div className="rounded-[1rem] border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {categoryError}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setEditingCategoryId(null)}>
                Annuler
              </Button>
              <Button type="button" className="rounded-full" onClick={handleCategorySave}>
                Enregistrer
              </Button>
            </div>
          </>
        ) : null}
      </WorkspacePopup>

      <WorkspacePopup
        open={isColorPickerOpen}
        onOpenChange={setIsColorPickerOpen}
        title="Couleur"
        className="max-w-[min(92vw,26rem)]"
        bodyClassName="space-y-5"
      >
        {categoryDraft ? (
          <>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORY_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleCategoryColorPick(color)}
                  className={cn(
                    'h-14 rounded-[1rem] border transition hover:scale-[1.03] hover:shadow-[0_16px_32px_hsl(var(--background)/0.18)]',
                    normalizeHexColor(categoryDraft.color) === color
                      ? 'border-white/80 shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3px_rgba(255,255,255,0.55)]'
                      : 'border-white/15',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Choisir ${color}`}
                />
              ))}
            </div>

            <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 rounded-full border border-white/20" style={{ backgroundColor: categoryDraft.color }} />
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hex</p>
                  <Input
                    value={colorHexDraft}
                    onChange={(event) => {
                      const nextValue = event.target.value.toUpperCase();
                      setColorHexDraft(nextValue);
                      if (isHexColorValue(normalizeHexColor(nextValue))) {
                        setCategoryDraft((current) => current ? { ...current, color: normalizeHexColor(nextValue) } : current);
                      }
                    }}
                    placeholder="#2563EB"
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsColorPickerOpen(false)}>
                Fermer
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => {
                  const normalized = normalizeHexColor(colorHexDraft);
                  if (!isHexColorValue(normalized)) return;
                  handleCategoryColorPick(normalized);
                }}
              >
                Utiliser cette couleur
              </Button>
            </div>
          </>
        ) : null}
      </WorkspacePopup>

      <Dialog open={Boolean(conversionItem)} onOpenChange={(open) => { if (!open) setConversionItemId(null); }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-[1.8rem] border-border/70">
          <DialogHeader>
            <DialogTitle>Convertir une tache en donnee metier</DialogTitle>
            <DialogDescription>
              Flux en deux temps: une tache calendrier reste une tache, puis tu confirmes explicitement sa conversion vers un module.
            </DialogDescription>
          </DialogHeader>

          {conversionItem ? (
            <div className="space-y-5">
              <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">{conversionItem.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatCalendarLongDate(conversionItem.date)}</p>
                {renderTaskBadges(conversionItem)}
              </div>

              <Tabs value={conversionTarget} onValueChange={(value) => setConversionTarget(value as CalendarConversionTarget)} className="space-y-4">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
                  <TabsTrigger value="finance-revenue">Revenu</TabsTrigger>
                  <TabsTrigger value="reading">Lecture</TabsTrigger>
                  <TabsTrigger value="journal">Journal</TabsTrigger>
                </TabsList>

                <TabsContent value="finance-revenue" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
                      <Input type="date" value={revenueDraft.date} onChange={(event) => setRevenueDraft((draft) => ({ ...draft, date: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client</span>
                      <Input value={revenueDraft.client} onChange={(event) => setRevenueDraft((draft) => ({ ...draft, client: event.target.value }))} placeholder="Nom du client" />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prestation</span>
                      <Input value={revenueDraft.service} onChange={(event) => setRevenueDraft((draft) => ({ ...draft, service: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Taux horaire</span>
                      <Input type="number" min="0" value={revenueDraft.hourlyRate} onChange={(event) => setRevenueDraft((draft) => ({ ...draft, hourlyRate: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Heures</span>
                      <Input type="number" min="0.5" step="0.5" value={revenueDraft.hours} onChange={(event) => setRevenueDraft((draft) => ({ ...draft, hours: event.target.value }))} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reading" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
                      <Input type="date" value={readingDraft.date} onChange={(event) => setReadingDraft((draft) => ({ ...draft, date: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Auteur</span>
                      <Input value={readingDraft.author} onChange={(event) => setReadingDraft((draft) => ({ ...draft, author: event.target.value }))} placeholder="Auteur" />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Titre</span>
                      <Input value={readingDraft.title} onChange={(event) => setReadingDraft((draft) => ({ ...draft, title: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Categorie</span>
                      <Select value={readingDraft.category} onValueChange={(value) => setReadingDraft((draft) => ({ ...draft, category: value as BookCategory }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOK_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Note</span>
                      <Input type="number" min="0.5" max="5" step="0.5" value={readingDraft.rating} onChange={(event) => setReadingDraft((draft) => ({ ...draft, rating: event.target.value }))} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="journal" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
                      <Input type="date" value={journalDraft.date} onChange={(event) => setJournalDraft((draft) => ({ ...draft, date: event.target.value }))} />
                    </div>
                    <Textarea value={journalDraft.somethingNew} onChange={(event) => setJournalDraft((draft) => ({ ...draft, somethingNew: event.target.value }))} placeholder="Something new that I did today" />
                    <Textarea value={journalDraft.somethingLearnt} onChange={(event) => setJournalDraft((draft) => ({ ...draft, somethingLearnt: event.target.value }))} placeholder="Something that I learnt today" />
                    <Textarea value={journalDraft.couldDoneBetter} onChange={(event) => setJournalDraft((draft) => ({ ...draft, couldDoneBetter: event.target.value }))} placeholder="Something I could’ve done better today" />
                    <Textarea value={journalDraft.didWell} onChange={(event) => setJournalDraft((draft) => ({ ...draft, didWell: event.target.value }))} placeholder="Something I did well today" />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Conversions actives pour cette tache</p>
                <div className="mt-3 grid gap-3">
                  {(conversionsByItem.get(conversionItem.id) ?? []).length === 0 ? (
                    <div className="rounded-[1.1rem] border border-dashed border-border/70 px-3 py-4 text-center text-sm text-muted-foreground">
                      Aucune conversion active.
                    </div>
                  ) : (conversionsByItem.get(conversionItem.id) ?? []).map((conversion) => (
                    <div key={conversion.id} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-background/70 p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{conversion.summary}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {CONVERSION_LABELS[conversion.target]} · {conversion.recordDate}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={async () => {
                          const reverted = await revertItemConversion(conversion.id);
                          if (reverted) {
                            toast({
                              title: 'Conversion annulee',
                              description: `${conversion.summary} a ete retire du module cible.`,
                            });
                          }
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                        Revert
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" className="rounded-full" onClick={handleSubmitConversion}>
                  Confirmer la conversion vers {CONVERSION_LABELS[conversionTarget]}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
