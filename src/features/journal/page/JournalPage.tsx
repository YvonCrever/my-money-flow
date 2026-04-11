import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useAppPageChrome, useAppPageOptions } from '@/components/AppChromeProvider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ToolbarPortal } from '@/components/ui/toolbar-portal';
import { WorkspacePlusButton } from '@/components/ui/workspace-plus-button';
import { WorkspacePopup } from '@/components/ui/workspace-popup';
import {
  buildAnsweredSections,
  buildEntryPreview,
  buildMissingDates,
  buildScrollModeEntries,
  buildTimelineMonthGroups,
  createEmptyDraft,
  draftFromEntry,
  formatDateLabel,
  formatMonthLabelFromKey,
  formatShortDate,
  formatTime,
  getEntrySignalTone,
  JOURNAL_MODE_OPTIONS,
  MAX_MEDIA_FILE_SIZE,
  pickRandomEntryDate,
  QUESTION_DEFINITIONS,
  reorderMediaItems,
  todayDate,
  TODAY_EVERYDAY_START_DATE,
  toDateKey,
  type JournalMediaMoment,
  type JournalMode,
  type QuestionKey,
  type ScrollModeEntry,
  type TimelineMonthGroup,
  type JournalDraft,
  isMeaningfulEntry,
  parseDate,
} from '@/features/journal/journalPageUtils';
import {
  JournalAnswerCopy,
  JournalEditorMediaGrid,
  JournalFeedMediaGrid,
  JournalScrollEntry,
  JournalMediaAsset,
} from '@/features/journal/components/JournalPageSections';
import useJournalData from '@/hooks/useJournalData';
import { useToast } from '@/hooks/use-toast';
import {
  fileToJournalMediaItem,
} from '@/lib/journalMedia';
import { getJournalStorageErrorMessage } from '@/lib/journalStorageErrors';
import { cn } from '@/lib/utils';
import { JournalEntry, JournalMediaItem } from '@/types/journal';

export default function JournalPage() {
  const { leadingTarget } = useAppPageChrome('journal');
  const { toast } = useToast();
  const {
    entries,
    isLoaded,
    loadError,
    corruptedImportDates,
    hasCorruptedImportMedia,
    saveEntry,
    deleteEntry,
  } = useJournalData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const entryRefs = useRef<Record<string, HTMLElement | null>>({});
  const pendingScrollDateRef = useRef<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [editorDate, setEditorDate] = useState(todayDate());
  const [editorSourceDate, setEditorSourceDate] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<JournalDraft>(createEmptyDraft);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [journalMode, setJournalMode] = useState<JournalMode>('scroll');
  const [shuffleDate, setShuffleDate] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);

  const currentDate = todayDate();
  const journalEntries = useMemo(() => entries.filter(isMeaningfulEntry), [entries]);
  const chronologicalEntries = useMemo(
    () => journalEntries.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [journalEntries],
  );
  const entryMap = useMemo(
    () => new Map(chronologicalEntries.map((entry) => [entry.date, entry])),
    [chronologicalEntries],
  );
  const missingDates = useMemo(
    () => buildMissingDates(entries, TODAY_EVERYDAY_START_DATE),
    [entries],
  );
  const firstMissingDate = missingDates[0] ?? currentDate;
  const scrollModeEntries = useMemo(() => buildScrollModeEntries(chronologicalEntries), [chronologicalEntries]);
  const timelineMonthGroups = useMemo(
    () => buildTimelineMonthGroups(TODAY_EVERYDAY_START_DATE, currentDate),
    [currentDate],
  );
  const mediaMoments = useMemo<JournalMediaMoment[]>(
    () => chronologicalEntries.flatMap((entry) => entry.mediaItems.map((mediaItem, index) => ({
      entry,
      mediaItem,
      index,
    }))),
    [chronologicalEntries],
  );
  const recordedDates = useMemo(() => chronologicalEntries.map((entry) => entry.date), [chronologicalEntries]);
  const selectedEntry = entryMap.get(selectedDate) ?? null;
  const selectedCalendarDate = entryMap.has(selectedDate) ? selectedDate : firstMissingDate;
  const editorExistingEntry = editorSourceDate ? entryMap.get(editorSourceDate) ?? null : null;
  const shuffleEntry = shuffleDate ? entryMap.get(shuffleDate) ?? null : null;

  const pageOptionsSection = useMemo(() => ({
    title: 'Page active',
    items: [
      {
        id: 'journal-open-date-picker',
        label: 'Choisir une date',
        description: 'Ouvre le calendrier du journal pour naviguer vers un jour existant ou ajouter un jour manquant.',
        onSelect: () => setCalendarOpen(true),
      },
    ],
  }), []);

  useAppPageOptions('journal', pageOptionsSection);

  useEffect(() => {
    if (!isLoaded) return;

    setSelectedDate((previous) => {
      if (entryMap.has(previous)) return previous;
      return chronologicalEntries[chronologicalEntries.length - 1]?.date ?? firstMissingDate;
    });
  }, [chronologicalEntries, entryMap, firstMissingDate, isLoaded]);

  useEffect(() => {
    if (chronologicalEntries.length === 0) {
      setShuffleDate(null);
      return;
    }

    if (!shuffleDate || !entryMap.has(shuffleDate)) {
      setShuffleDate(chronologicalEntries[chronologicalEntries.length - 1]?.date ?? null);
    }
  }, [chronologicalEntries, entryMap, shuffleDate]);

  useEffect(() => {
    if (journalMode !== 'scroll') return;

    const targetDate = pendingScrollDateRef.current;
    if (!targetDate) return;

    const targetNode = entryRefs.current[targetDate];
    if (!targetNode) return;

    pendingScrollDateRef.current = null;

    const animationFrame = window.requestAnimationFrame(() => {
      targetNode.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [journalMode, scrollModeEntries, selectedDate]);

  const openEditorForDate = (date: string, sourceDate: string | null = entryMap.has(date) ? date : null) => {
    const entry = sourceDate ? entryMap.get(sourceDate) ?? null : null;
    setEditorSourceDate(entry?.date ?? null);
    setEditorDate(date);
    setDraft(draftFromEntry(entry));
    setEditorOpen(true);
  };

  const openPrimaryEditor = () => {
    if (missingDates.length > 0) {
      openEditorForDate(firstMissingDate, null);
      return;
    }

    const fallbackDate = selectedEntry?.date ?? currentDate;
    openEditorForDate(fallbackDate, entryMap.has(fallbackDate) ? fallbackDate : null);
  };

  const scrollToEntry = (date: string) => {
    pendingScrollDateRef.current = date;
    setJournalMode('scroll');
    setSelectedDate(date);

    if (journalMode === 'scroll' && selectedDate === date) {
      const targetNode = entryRefs.current[date];
      if (targetNode) {
        window.requestAnimationFrame(() => {
          targetNode.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
    }
  };

  const handleJumpToDate = (date: string) => {
    const entry = entryMap.get(date);
    setCalendarOpen(false);

    if (entry) {
      scrollToEntry(entry.date);
      return;
    }

    openEditorForDate(date, null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const oversizedFile = files.find((file) => file.size > MAX_MEDIA_FILE_SIZE);
    if (oversizedFile) {
      toast({
        title: 'File too large',
        description: `${oversizedFile.name} is above the size limit for this journal.`,
      });
      event.target.value = '';
      return;
    }

    setDraft((previous) => ({
      ...previous,
      mediaItems: [
        ...previous.mediaItems,
        ...files.map((file) => fileToJournalMediaItem(file, 'manual')),
      ],
    }));

    event.target.value = '';
  };

  const handleRemoveMedia = (mediaId: string) => {
    setDraft((previous) => ({
      ...previous,
      mediaItems: previous.mediaItems.filter((mediaItem) => mediaItem.id !== mediaId),
    }));
  };

  const handleReorderMedia = (draggedId: string, targetId: string) => {
    setDraft((previous) => ({
      ...previous,
      mediaItems: reorderMediaItems(previous.mediaItems, draggedId, targetId),
    }));
  };

  const handleDeleteByDate = async (dateToDelete: string, shouldCloseEditor: boolean) => {
    const remainingEntries = chronologicalEntries.filter((entry) => entry.date !== dateToDelete);
    const nextFocusDate = remainingEntries[remainingEntries.length - 1]?.date ?? firstMissingDate;

    try {
      await deleteEntry(dateToDelete);
      setSelectedDate(nextFocusDate);

      if (shouldCloseEditor) {
        setEditorOpen(false);
        setEditorSourceDate(null);
        setDraft(createEmptyDraft());
      }

      toast({
        title: 'Entry deleted',
        description: `${formatShortDate(dateToDelete)} was removed from the journal.`,
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: getJournalStorageErrorMessage(error),
      });
    }
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    const nextEntry: Omit<JournalEntry, 'updatedAt'> = {
      date: editorDate,
      somethingNew: draft.somethingNew.trim(),
      somethingLearnt: draft.somethingLearnt.trim(),
      couldDoneBetter: draft.couldDoneBetter.trim(),
      didWell: draft.didWell.trim(),
      moodId: null,
      mediaItems: draft.mediaItems,
    };

    if (!isMeaningfulEntry(nextEntry)) {
      toast({
        title: 'Empty day',
        description: 'Add at least some text or one media item before saving.',
      });
      return;
    }

    if (editorSourceDate && editorSourceDate !== editorDate && entryMap.has(editorDate)) {
      toast({
        title: 'Date already used',
        description: 'Another journal entry already exists on that date.',
      });
      return;
    }

    const isEditingExisting = Boolean(editorExistingEntry);

    setIsSaving(true);
    try {
      await saveEntry(nextEntry);

      if (editorSourceDate && editorSourceDate !== editorDate) {
        await deleteEntry(editorSourceDate);
      }

      pendingScrollDateRef.current = editorDate;
      setSelectedDate(editorDate);
      setJournalMode('scroll');
      setEditorOpen(false);
      setEditorSourceDate(null);

      toast({
        title: isEditingExisting ? 'Day updated' : 'Day added',
        description: `${formatShortDate(editorDate)} is now part of the journal.`,
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: getJournalStorageErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleShuffle = () => {
    setIsShuffling(true);

    window.setTimeout(() => {
      setShuffleDate(pickRandomEntryDate(chronologicalEntries, shuffleDate));
      setIsShuffling(false);
    }, 220);
  };

  const renderScrollMode = () => (
    <div className="toev-mode-shell">
      <div className="toev-journal-mode-stage is-into-scroll">
        <div className="toev-scroll-stream">
          {scrollModeEntries.map((scrollModeEntry) => (
            <div
              key={scrollModeEntry.entry.date}
              ref={(node) => {
                entryRefs.current[scrollModeEntry.entry.date] = node;
              }}
              className="toev-scroll-entry scroll-mt-[calc(var(--app-masthead-offset)+1rem)]"
            >
              <JournalScrollEntry
                autoPlayKey={scrollModeEntry.entry.date}
                entry={scrollModeEntry.entry}
                isFocused={selectedDate === scrollModeEntry.entry.date}
                leftMediaItems={scrollModeEntry.leftMediaItems}
                monthLabel={scrollModeEntry.monthLabel}
                onDelete={() => {
                  void handleDeleteByDate(scrollModeEntry.entry.date, false);
                }}
                onEdit={() => {
                  openEditorForDate(scrollModeEntry.entry.date, scrollModeEntry.entry.date);
                }}
                onSelect={() => setSelectedDate(scrollModeEntry.entry.date)}
                rightMediaItems={scrollModeEntry.rightMediaItems}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMosaicMode = () => (
    <div className="toev-mode-shell">
      <div className="toev-journal-mode-stage is-into-mosaic">
        <div className="toev-mosaic-grid">
          {chronologicalEntries.map((entry) => (
            <article key={entry.date} className="toev-mosaic-card">
              <div className="toev-mosaic-meta">
                <div className="min-w-0">
                  <p className="toev-mosaic-date">{formatDateLabel(entry.date)}</p>
                  <p className="toev-mosaic-caption">{buildEntryPreview(entry)}</p>
                </div>

                <button
                  type="button"
                  className="toev-icon-action toev-icon-action-subtle"
                  onClick={() => openEditorForDate(entry.date, entry.date)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>

              {entry.mediaItems.length > 0 ? (
                <div className="toev-mosaic-media-shell overflow-hidden rounded-[1.3rem] border border-slate-900/10 bg-slate-950/5">
                  <JournalFeedMediaGrid mediaItems={entry.mediaItems.slice(0, 2)} autoPlayKey={`mosaic-${entry.date}`} />
                </div>
              ) : (
                <div className="toev-mosaic-empty">
                  No media on this day.
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="toev-mosaic-count">
                  {entry.mediaItems.length} media item{entry.mediaItems.length > 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  className="toev-mosaic-open"
                  onClick={() => scrollToEntry(entry.date)}
                >
                  Read
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimelineMode = () => (
    <div className="toev-mode-shell">
      <div className="toev-timeline-layout">
        <div className="grid gap-5">
          {timelineMonthGroups.map((group) => (
            <section key={group.monthKey} className="grid gap-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/55" />
                <span className="text-kubrick text-[10px] toev-meta-copy">
                  {formatMonthLabelFromKey(group.monthKey)}
                </span>
                <div className="h-px flex-1 bg-border/55" />
              </div>

              <div className="toev-timeline-grid">
                {group.dates.map((date) => {
                  const entry = entryMap.get(date) ?? null;
                  const tone = getEntrySignalTone(entry);

                  return (
                    <button
                      key={date}
                      type="button"
                      className={cn(
                        'toev-day-cell',
                        tone === 'note' && 'is-note',
                        tone === 'media' && 'is-media',
                        tone === 'burst' && 'is-burst',
                        tone === 'empty' && 'is-empty',
                        selectedDate === date && 'is-selected',
                      )}
                      onClick={() => {
                        if (entry) {
                          scrollToEntry(date);
                          return;
                        }

                        openEditorForDate(date, null);
                      }}
                    >
                      <span className="toev-day-number">{parseDate(date).getDate()}</span>
                      {entry ? (
                        <span className="toev-day-meta">
                          {entry.mediaItems.length > 0 ? `${entry.mediaItems.length}m` : 'text'}
                        </span>
                      ) : (
                        <span className="toev-day-empty-mark">+</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="toev-timeline-sidepanel">
          <div className="toev-timeline-legend">
            <p className="text-kubrick text-[10px] toev-sidepanel-kicker">Legend</p>
            <p><span className="toev-legend-dot is-note" />Text only</p>
            <p><span className="toev-legend-dot is-media" />Media only</p>
            <p><span className="toev-legend-dot is-burst" />Text + media</p>
            <p><span className="toev-legend-dot is-empty" />Missing day</p>
          </div>

          <div className="toev-mood-summary">
            <p className="text-kubrick text-[10px] toev-sidepanel-kicker">Overview</p>
            <div className="toev-mood-summary-row">
              <span>Recorded days</span>
              <strong>{chronologicalEntries.length}</strong>
            </div>
            <div className="toev-mood-summary-row">
              <span>Missing days</span>
              <strong>{missingDates.length}</strong>
            </div>
            <div className="toev-mood-summary-row">
              <span>Media notes</span>
              <strong>{mediaMoments.length}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );

  const renderShuffleMode = () => (
    <div className="toev-mode-shell">
      {shuffleEntry ? (
        <div className={cn('toev-shuffle-stage', isShuffling && 'is-shuffling')}>
          <article className="toev-shuffle-card">
            <div className="toev-shuffle-copy">
              <div className="toev-shuffle-header flex items-center justify-between gap-3">
                <div>
                  <p className="text-kubrick text-[10px] toev-sidepanel-kicker">Random day</p>
                  <h2 className="toev-shuffle-title">
                    {formatDateLabel(shuffleEntry.date)}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="toev-action-button toev-action-button--ghost rounded-full px-3"
                    onClick={handleShuffle}
                  >
                    Shuffle
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="toev-action-button toev-action-button--ghost rounded-full px-3"
                    onClick={() => scrollToEntry(shuffleEntry.date)}
                  >
                    Open
                  </Button>
                </div>
              </div>

              <JournalAnswerCopy
                answeredSections={buildAnsweredSections(shuffleEntry)}
                emptyMessage="This day is mostly visual."
              />
            </div>

            <div className="toev-shuffle-media">
              {shuffleEntry.mediaItems.length > 0 ? (
                <JournalFeedMediaGrid mediaItems={shuffleEntry.mediaItems} autoPlayKey={`shuffle-${shuffleEntry.date}`} />
              ) : (
                <div className="toev-media-empty">
                  No media attached to this day.
                </div>
              )}
            </div>
          </article>
        </div>
      ) : (
        <div className="toev-journal-empty">
          <Sparkles className="h-5 w-5 text-secondary" />
          <p>No recorded day available yet.</p>
        </div>
      )}
    </div>
  );

  const renderMediaMode = () => (
    <div className="toev-mode-shell">
      {mediaMoments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mediaMoments.map((moment) => (
            <article key={`${moment.entry.date}-${moment.mediaItem.id}`} className="surface-panel toev-media-spotlight overflow-hidden rounded-[1.8rem]">
              <JournalMediaAsset mediaItem={moment.mediaItem} autoPlayKey={`media-${moment.entry.date}-${moment.index}`} />

              <div className="grid gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-kubrick text-[10px] toev-meta-copy">{formatShortDate(moment.entry.date)}</p>
                    <p className="toev-media-meta">{buildEntryPreview(moment.entry)}</p>
                  </div>

                  <button
                    type="button"
                    className="toev-icon-action toev-icon-action-subtle"
                    onClick={() => openEditorForDate(moment.entry.date, moment.entry.date)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="toev-meta-copy text-xs">
                    {moment.mediaItem.type === 'video' ? 'Video' : 'Photo'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="toev-action-button toev-action-button--ghost rounded-full px-3"
                    onClick={() => scrollToEntry(moment.entry.date)}
                  >
                    Read day
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="toev-journal-empty">
          <ImagePlus className="h-5 w-5 text-secondary" />
          <p>No image or video has been added yet.</p>
        </div>
      )}
    </div>
  );

  const renderCurrentMode = () => {
    switch (journalMode) {
      case 'mosaic':
        return renderMosaicMode();
      case 'timeline':
        return renderTimelineMode();
      case 'shuffle':
        return renderShuffleMode();
      case 'media':
        return renderMediaMode();
      case 'scroll':
      default:
        return renderScrollMode();
    }
  };

  return (
    <div className="page-workspace">
      {loadError ? (
        <div className="toev-journal-alert toev-journal-alert--error mb-5 rounded-[1.4rem] border border-rose-200/15 bg-rose-200/[0.04] p-4 text-sm text-rose-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Probleme de stockage du Journal</p>
              <p className="mt-1 text-rose-50/90">{loadError}</p>
            </div>
          </div>
        </div>
      ) : null}

      {hasCorruptedImportMedia ? (
        <div className="toev-journal-alert toev-journal-alert--warning mb-5 rounded-[1.4rem] border border-amber-200/15 bg-amber-200/[0.04] p-4 text-sm text-amber-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Des photos importees doivent etre reparees</p>
                <p className="mt-1 text-amber-50/90">
                  {corruptedImportDates.length} journée{corruptedImportDates.length > 1 ? 's pointent' : ' pointe'} encore vers un ancien import photo corrompu.
                  Réimporte le `.docx` d'origine depuis Extraction pour les restaurer.
                </p>
              </div>
            </div>
            <Link
              to="/extraction"
              className="toev-alert-link toev-alert-link--warning inline-flex h-9 items-center justify-center rounded-full border border-amber-200/20 bg-amber-100/10 px-4 text-xs font-medium text-amber-50 hover:bg-amber-100/15"
            >
              Ouvrir Extraction
            </Link>
          </div>
        </div>
      ) : null}

      <ToolbarPortal target={leadingTarget}>
        <WorkspacePlusButton
          label="Ajouter"
          showLabel
          surface="masthead"
          onClick={openPrimaryEditor}
          disabled={!isLoaded}
        />

        <div className="page-subnav-tabs app-masthead-tablist h-auto w-full sm:w-auto">
          {JOURNAL_MODE_OPTIONS.map((modeOption) => (
            <button
              key={modeOption.value}
              type="button"
              className={cn(
                'app-masthead-item app-masthead-tab-trigger inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium tracking-[0.01em] ring-offset-background transition-all duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5',
                journalMode === modeOption.value && 'is-active',
              )}
              onClick={() => setJournalMode(modeOption.value)}
            >
              {modeOption.label}
            </button>
          ))}
        </div>
      </ToolbarPortal>

      {chronologicalEntries.length === 0 ? (
        <div className="surface-panel toev-journal-empty-panel rounded-[1.9rem] p-10 text-center">
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
            <span className="toev-empty-orb inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/55">
              <Sparkles className="h-5 w-5 text-secondary" />
            </span>
            <div>
              <p className="text-kubrick text-[11px] toev-meta-copy">Journal</p>
              <h2 className="toev-empty-title">No day recorded yet</h2>
              <p className="toev-empty-copy">
                Start with the first missing day. The continuous journal will build itself from there.
              </p>
            </div>
            <WorkspacePlusButton
              label="Ajouter"
              showLabel
              onClick={openPrimaryEditor}
              className="mt-2"
            />
          </div>
        </div>
      ) : (
        renderCurrentMode()
      )}

      <WorkspacePopup
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        title="Choisir une date"
        description="Ouvre une journée existante ou va directement au prochain jour manquant."
        className="max-w-[min(92vw,32rem)]"
        bodyClassName="space-y-4"
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="toev-journal-popover-kicker">Journal</p>
            <p className="toev-journal-popover-copy">Open an existing day or jump straight to the next missing one.</p>
          </div>
          {missingDates.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="toev-action-button toev-action-button--ghost toev-action-button--compact h-8 rounded-full px-3 text-xs"
              onClick={() => handleJumpToDate(firstMissingDate)}
            >
              Next missing
            </Button>
          ) : null}
        </div>

        <Calendar
          mode="single"
          selected={parseDate(selectedCalendarDate)}
          onSelect={(date) => {
            if (!date) return;
            handleJumpToDate(toDateKey(date));
          }}
          month={parseDate(selectedCalendarDate)}
          defaultMonth={parseDate(TODAY_EVERYDAY_START_DATE)}
          modifiers={{
            missing: missingDates.map((date) => parseDate(date)),
            recorded: recordedDates.map((date) => parseDate(date)),
          }}
          modifiersClassNames={{
            missing: 'toev-journal-calendar-day--missing',
            recorded: 'toev-journal-calendar-day--recorded',
          }}
          className="toev-journal-calendar"
          classNames={{
            day_selected: 'toev-journal-calendar-day--selected',
            day_today: 'toev-journal-calendar-day--today',
            caption_label: 'toev-journal-calendar-caption',
            head_cell: 'toev-journal-calendar-head-cell',
            day: 'toev-journal-calendar-day',
          }}
        />
      </WorkspacePopup>

      <WorkspacePopup
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditorSourceDate(null);
          }
        }}
        title={editorExistingEntry ? 'Edit day' : 'Add day'}
        className="max-w-[min(96vw,74rem)]"
        bodyClassName="space-y-5"
      >
        <form className="grid gap-5" onSubmit={handleSave}>
          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="grid gap-4">
              <div className="toev-card toev-editor-panel">
                <span className="toev-editor-section-kicker">Date</span>
                <Input
                  type="date"
                  value={editorDate}
                  max={currentDate}
                  min={TODAY_EVERYDAY_START_DATE}
                  onChange={(event) => setEditorDate(event.target.value)}
                  className="toev-editor-input mt-3 h-10"
                />
                <p className="toev-editor-copy mt-3">{formatDateLabel(editorDate)}</p>
              </div>

              <div className="toev-card toev-editor-panel">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="toev-editor-section-kicker">Media</p>
                    <p className="toev-editor-copy mt-1">
                      {draft.mediaItems.length} item{draft.mediaItems.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="toev-action-button toev-action-button--ghost rounded-full px-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {QUESTION_DEFINITIONS.map((question) => (
                <div key={question.key} className="toev-card toev-editor-panel">
                  <label className={cn('mb-2 block text-[11px] uppercase tracking-[0.16em]', question.toneClassName)}>
                    {question.label}
                  </label>
                  <Textarea
                    rows={5}
                    value={draft[question.key]}
                    placeholder={question.placeholder}
                    onChange={(event) => setDraft((previous) => ({ ...previous, [question.key]: event.target.value }))}
                    className="toev-editor-textarea min-h-[8.5rem]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="toev-editor-section-kicker">Media order</p>
              <p className="toev-meta-copy text-xs">Drag and drop to reorder photos and videos for this day.</p>
            </div>
            <JournalEditorMediaGrid
              mediaItems={draft.mediaItems}
              autoPlayKey={`editor-${editorDate}`}
              onRemove={handleRemoveMedia}
              onReorder={handleReorderMedia}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {editorExistingEntry ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="toev-action-button toev-action-button--danger rounded-full px-4"
                  onClick={() => void handleDeleteByDate(editorSourceDate ?? editorDate, true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="toev-action-button toev-action-button--ghost rounded-full px-4"
                onClick={() => {
                  setEditorOpen(false);
                  setEditorSourceDate(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="toev-action-button toev-action-button-primary rounded-full px-4" disabled={!isLoaded || isSaving}>
                <Check className="h-4 w-4" />
                {isSaving ? 'Saving...' : editorExistingEntry ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </form>
      </WorkspacePopup>
    </div>
  );
}
