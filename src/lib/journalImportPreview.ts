import { parsedEntriesToJournalEntries, ParsedJournalEntry } from '@/lib/journalImport';
import {
  createJournalMediaSignature,
  ResolvedJournalMediaDate,
  JournalImportMediaCandidate,
  resolveJournalMediaDate,
} from '@/lib/journalMedia';
import { JournalEntry, JournalMediaItem } from '@/types/journal';

export interface JournalMediaPreviewItem extends ResolvedJournalMediaDate {
  id: string;
  fileName: string;
  mediaItem: JournalMediaItem;
  size: number;
  matchedEntryDate: string | null;
}

export interface JournalImportEntryPreview extends ParsedJournalEntry {
  matchedMedia: JournalMediaPreviewItem[];
}

export interface JournalImportPreview {
  entries: JournalImportEntryPreview[];
  ambiguousMedia: JournalMediaPreviewItem[];
  unmatchedMedia: JournalMediaPreviewItem[];
  matchedMediaCount: number;
}

function createPreviewId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export async function buildJournalImportPreview(
  parsedEntries: ParsedJournalEntry[],
  mediaCandidates: JournalImportMediaCandidate[],
): Promise<JournalImportPreview> {
  const entryMap = new Map<string, JournalImportEntryPreview>(
    parsedEntries.map((entry) => [
      entry.date,
      {
        ...entry,
        matchedMedia: entry.embeddedMediaItems.map((mediaItem): JournalMediaPreviewItem => ({
          id: `${entry.date}-${mediaItem.id}`,
          fileName: mediaItem.name,
          mediaItem,
          size: mediaItem.storage === 'inline' ? mediaItem.blob.size : 0,
          matchedEntryDate: entry.date,
          dateKey: entry.date,
          strategy: 'docx',
          confidence: 'high',
          metadataDateKey: null,
          filenameDateKey: null,
          modifiedDateKey: null,
          notes: [],
        })),
      },
    ]),
  );

  const ambiguousMedia: JournalMediaPreviewItem[] = [];
  const unmatchedMedia: JournalMediaPreviewItem[] = [];
  let matchedMediaCount = parsedEntries.reduce((total, entry) => total + entry.embeddedMediaItems.length, 0);

  for (const candidate of mediaCandidates) {
    const { file, mediaItem } = candidate;
    const resolved = await resolveJournalMediaDate(file);
    const matchedEntryDate = resolved.dateKey && entryMap.has(resolved.dateKey) ? resolved.dateKey : null;
    const previewItem: JournalMediaPreviewItem = {
      ...resolved,
      id: createPreviewId(file),
      fileName: file.name,
      mediaItem,
      size: file.size,
      matchedEntryDate,
    };

    if (matchedEntryDate) {
      entryMap.get(matchedEntryDate)?.matchedMedia.push(previewItem);
      matchedMediaCount += 1;

      if (resolved.confidence !== 'high' || resolved.notes.length > 0) {
        ambiguousMedia.push(previewItem);
      }

      continue;
    }

    unmatchedMedia.push(previewItem);
  }

  return {
    entries: Array.from(entryMap.values()),
    ambiguousMedia,
    unmatchedMedia,
    matchedMediaCount,
  };
}

export function mergeParsedEntriesWithMedia(
  parsedEntries: ParsedJournalEntry[],
  preview: JournalImportPreview,
): Omit<JournalEntry, 'updatedAt'>[] {
  const previewMap = new Map(preview.entries.map((entry) => [entry.date, entry]));
  const baseEntries = parsedEntriesToJournalEntries(parsedEntries);

  return baseEntries.map((entry) => {
    const mergedMediaItems = [...entry.mediaItems];
    const seen = new Set(mergedMediaItems.map(createJournalMediaSignature));
    const previewEntry = previewMap.get(entry.date);

    for (const mediaItem of previewEntry?.matchedMedia.map((item) => item.mediaItem) ?? []) {
      const signature = createJournalMediaSignature(mediaItem);
      if (seen.has(signature)) continue;
      seen.add(signature);
      mergedMediaItems.push(mediaItem);
    }

    return {
      ...entry,
      mediaItems: mergedMediaItems,
    };
  });
}
