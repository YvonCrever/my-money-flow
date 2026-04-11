import { useEffect, useState } from 'react';

import type { JournalEntry, JournalMediaItem } from '@/types/journal';

export const TODAY_EVERYDAY_START_DATE = '2026-01-09';
export const MAX_MEDIA_FILE_SIZE = 175_000_000;

export const QUESTION_DEFINITIONS = [
  {
    key: 'somethingNew',
    label: 'Something new that I did today',
    shortLabel: 'New',
    placeholder: 'What felt new, unexpected, or worth remembering today?',
    toneClassName: 'toev-answer-tone toev-answer-tone--new',
  },
  {
    key: 'somethingLearnt',
    label: 'Something that I learnt today',
    shortLabel: 'Learned',
    placeholder: 'What did you understand better or take away today?',
    toneClassName: 'toev-answer-tone toev-answer-tone--learned',
  },
  {
    key: 'couldDoneBetter',
    label: 'Something I could have done better today',
    shortLabel: 'Improve',
    placeholder: 'What would you like to handle better next time?',
    toneClassName: 'toev-answer-tone toev-answer-tone--improve',
  },
  {
    key: 'didWell',
    label: 'Something I did well today',
    shortLabel: 'Did well',
    placeholder: 'What did you do well and want to keep building on?',
    toneClassName: 'toev-answer-tone toev-answer-tone--did-well',
  },
] as const;

export const JOURNAL_MODE_OPTIONS = [
  { value: 'scroll', label: 'Scroll' },
  { value: 'mosaic', label: 'Mosaic' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'media', label: 'Media' },
] as const;

export type QuestionKey = (typeof QUESTION_DEFINITIONS)[number]['key'];
export type JournalMode = (typeof JOURNAL_MODE_OPTIONS)[number]['value'];

export interface JournalDraft {
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
  mediaItems: JournalMediaItem[];
}

export interface TimelineMonthGroup {
  monthKey: string;
  dates: string[];
}

export interface JournalMediaMoment {
  entry: JournalEntry;
  mediaItem: JournalMediaItem;
  index: number;
}

export interface ScrollModeEntry {
  entry: JournalEntry;
  monthLabel: string | null;
  leftMediaItems: JournalMediaItem[];
  rightMediaItems: JournalMediaItem[];
}

export function createEmptyDraft(): JournalDraft {
  return {
    somethingNew: '',
    somethingLearnt: '',
    couldDoneBetter: '',
    didWell: '',
    mediaItems: [],
  };
}

export function draftFromEntry(entry: JournalEntry | null): JournalDraft {
  if (!entry) return createEmptyDraft();

  return {
    somethingNew: entry.somethingNew,
    somethingLearnt: entry.somethingLearnt,
    couldDoneBetter: entry.couldDoneBetter,
    didWell: entry.didWell,
    mediaItems: entry.mediaItems,
  };
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDate() {
  return toDateKey(new Date());
}

export function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(value: string) {
  return parseDate(value).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(value: string) {
  return parseDate(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMonthLabelFromKey(value: string) {
  return parseDate(`${value}-01`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthKey(value: string) {
  return value.slice(0, 7);
}

export function isMeaningfulEntry(entry: Pick<JournalEntry, 'somethingNew' | 'somethingLearnt' | 'couldDoneBetter' | 'didWell' | 'mediaItems' | 'moodId'>) {
  return Boolean(
    entry.somethingNew.trim()
      || entry.somethingLearnt.trim()
      || entry.couldDoneBetter.trim()
      || entry.didWell.trim()
      || entry.moodId
      || entry.mediaItems.length > 0,
  );
}

export function buildMissingDates(entries: JournalEntry[], startDateKey: string) {
  const endDate = new Date();
  const startDate = parseDate(startDateKey);
  const existingDates = new Set(entries.filter(isMeaningfulEntry).map((entry) => entry.date));
  const missing: string[] = [];

  for (
    let cursor = new Date(startDate);
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const value = toDateKey(cursor);
    if (!existingDates.has(value)) missing.push(value);
  }

  return missing;
}

function distributeScrollMediaItems(mediaItems: JournalMediaItem[]) {
  const leftMediaItems: JournalMediaItem[] = [];
  const rightMediaItems: JournalMediaItem[] = [];

  for (const mediaItem of mediaItems) {
    const targetRail = rightMediaItems.length <= leftMediaItems.length ? rightMediaItems : leftMediaItems;
    targetRail.push(mediaItem);
  }

  return { leftMediaItems, rightMediaItems };
}

export function buildScrollModeEntries(entries: JournalEntry[]): ScrollModeEntry[] {
  return entries.map((entry, index) => {
    const previousEntry = entries[index - 1];
    const monthKey = getMonthKey(entry.date);
    const monthLabel = !previousEntry || getMonthKey(previousEntry.date) !== monthKey
      ? formatMonthLabelFromKey(monthKey)
      : null;

    return {
      entry,
      monthLabel,
      ...distributeScrollMediaItems(entry.mediaItems),
    };
  });
}

export function useViewportReveal({
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.16,
}: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(() => (
    typeof window === 'undefined' || typeof IntersectionObserver === 'undefined'
  ));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const minimumRatio = Math.max(0.01, threshold * 0.6);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry.isIntersecting && entry.intersectionRatio >= minimumRatio;
        setIsVisible(nextVisible);
      },
      {
        rootMargin,
        threshold: [0, threshold, Math.min(1, threshold + 0.2)],
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, prefersReducedMotion, rootMargin, threshold]);

  return {
    isVisible,
    setNode,
  };
}

export function buildTimelineMonthGroups(startDateKey: string, endDateKey: string) {
  const groups: TimelineMonthGroup[] = [];
  const endDate = parseDate(endDateKey);

  for (
    let cursor = parseDate(startDateKey);
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
  ) {
    const dateKey = toDateKey(cursor);
    const monthKey = getMonthKey(dateKey);
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.monthKey !== monthKey) {
      groups.push({
        monthKey,
        dates: [dateKey],
      });
      continue;
    }

    currentGroup.dates.push(dateKey);
  }

  return groups;
}

export function buildAnsweredSections(entry: Pick<JournalEntry, QuestionKey>) {
  return QUESTION_DEFINITIONS
    .map((question) => ({
      ...question,
      value: entry[question.key].trim(),
    }))
    .filter((section) => section.value.length > 0);
}

export function buildEntryPreview(entry: JournalEntry) {
  const answeredSections = buildAnsweredSections(entry);
  if (answeredSections.length > 0) {
    return answeredSections[0].value.replace(/\s+/g, ' ');
  }

  return `${entry.mediaItems.length} media item${entry.mediaItems.length > 1 ? 's' : ''}`;
}

export function getEntrySignalTone(entry: JournalEntry | null) {
  if (!entry) return 'empty';

  const hasText = buildAnsweredSections(entry).length > 0;
  const hasMedia = entry.mediaItems.length > 0;

  if (hasText && hasMedia) return 'burst';
  if (hasMedia) return 'media';
  if (hasText) return 'note';
  return 'empty';
}

export function pickRandomEntryDate(entries: JournalEntry[], current: string | null) {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0].date;

  let nextDate = current;

  while (nextDate === current) {
    nextDate = entries[Math.floor(Math.random() * entries.length)]?.date ?? entries[0].date;
  }

  return nextDate;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function reorderMediaItems(mediaItems: JournalMediaItem[], draggedId: string, targetId: string) {
  if (draggedId === targetId) return mediaItems;

  const currentIndex = mediaItems.findIndex((mediaItem) => mediaItem.id === draggedId);
  const targetIndex = mediaItems.findIndex((mediaItem) => mediaItem.id === targetId);
  if (currentIndex < 0 || targetIndex < 0) return mediaItems;

  const nextItems = mediaItems.slice();
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);
  return nextItems;
}
