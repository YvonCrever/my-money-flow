import { isValid, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { fileToJournalMediaItem } from '@/lib/journalMedia';
import { JournalEntry } from '@/types/journal';
import { JournalMediaItem } from '@/types/journal';

export interface ParsedJournalEntry {
  date: string;
  sourceDateLabel: string;
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
  embeddedMediaItems: JournalMediaItem[];
}

const DATE_LINE_REGEX = /^\s*([A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4})\s*$/gm;

const QUESTION_LABELS = {
  somethingNew: 'Something new that I did today',
  somethingLearnt: 'Something that I learnt today',
  couldDoneBetter: "Something I could've done better today",
  didWell: 'Something I did well today',
} as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[']/g, "'");
}

function isStandaloneDateLabel(value: string) {
  return /^\s*[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?, \d{4}\s*$/.test(value);
}

function parseDateLabel(value: string) {
  const withOrdinal = parse(value, 'MMMM do, yyyy', new Date(), { locale: enUS });
  if (isValid(withOrdinal)) return withOrdinal;

  const withoutOrdinal = parse(value, 'MMMM d, yyyy', new Date(), { locale: enUS });
  if (isValid(withoutOrdinal)) return withoutOrdinal;

  return null;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractAnswer(section: string, label: string, nextLabels: string[]) {
  const nextPattern = nextLabels.length > 0
    ? `(?=\\n\\s*(?:${nextLabels.map(escapeRegExp).join('|')})\\s*:|$)`
    : '$';

  const regex = new RegExp(`${escapeRegExp(label)}\\s*:\\s*([\\s\\S]*?)${nextPattern}`, 'i');
  const match = section.match(regex);
  return match?.[1]?.trim() ?? '';
}

export function parseJournalText(rawText: string): ParsedJournalEntry[] {
  const normalizedText = normalizeText(rawText);
  const matches = Array.from(normalizedText.matchAll(DATE_LINE_REGEX));

  if (matches.length === 0) return [];

  return matches.map((match, index) => {
    const sourceDateLabel = match[1].trim();
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalizedText.length) : normalizedText.length;
    const section = normalizedText.slice(start, end);
    const parsedDate = parseDateLabel(sourceDateLabel);
    if (!parsedDate) return null;

    const labels = Object.values(QUESTION_LABELS);

    const parsedEntry: ParsedJournalEntry = {
      date: toDateKey(parsedDate),
      sourceDateLabel,
      somethingNew: extractAnswer(section, QUESTION_LABELS.somethingNew, labels.filter((label) => label !== QUESTION_LABELS.somethingNew)),
      somethingLearnt: extractAnswer(section, QUESTION_LABELS.somethingLearnt, labels.filter((label) => label !== QUESTION_LABELS.somethingLearnt)),
      couldDoneBetter: extractAnswer(section, QUESTION_LABELS.couldDoneBetter, labels.filter((label) => label !== QUESTION_LABELS.couldDoneBetter)),
      didWell: extractAnswer(section, QUESTION_LABELS.didWell, []),
      embeddedMediaItems: [],
    };

    return parsedEntry;
  }).filter((entry): entry is ParsedJournalEntry => Boolean(entry));
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
  const normalizedName = /\.[a-z0-9]+$/i.test(fileName) ? fileName : `${fileName}.${extension}`;
  return new File([blob], normalizedName, {
    type: blob.type || `image/${extension}`,
    // Keep a stable value so reimports dedupe cleanly against previously extracted docx images.
    lastModified: 0,
  });
}

async function attachEmbeddedDocxImages(entries: ParsedJournalEntry[], html: string) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const entryMap = new Map(entries.map((entry) => [
    entry.date,
    {
      ...entry,
      embeddedMediaItems: [...entry.embeddedMediaItems],
    },
  ]));

  let currentDateKey: string | null = null;
  let fallbackImageIndex = 1;

  for (const element of Array.from(document.body.children)) {
    const textContent = normalizeText(element.textContent ?? '').trim();

    if (isStandaloneDateLabel(textContent)) {
      const parsedDate = parseDateLabel(textContent);
      currentDateKey = parsedDate ? toDateKey(parsedDate) : currentDateKey;
      continue;
    }

    const images = Array.from(element.querySelectorAll('img'));
    if (!currentDateKey || images.length === 0) continue;

    for (const image of images) {
      const source = image.getAttribute('src');
      if (!source?.startsWith('data:')) continue;

      const alt = image.getAttribute('alt')?.trim() || `docx-image-${fallbackImageIndex++}`;
      const file = await dataUrlToFile(source, alt);
      entryMap.get(currentDateKey)?.embeddedMediaItems.push(fileToJournalMediaItem(file, 'import'));
    }
  }

  return entries.map((entry) => entryMap.get(entry.date) ?? entry);
}

export async function parseJournalDocx(file: File): Promise<ParsedJournalEntry[]> {
  const mammothModule = await import('mammoth');
  const mammoth = (mammothModule.default ?? mammothModule) as typeof import('mammoth');
  const arrayBuffer = await file.arrayBuffer();

  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  const parsedEntries = parseJournalText(rawTextResult.value);

  if (parsedEntries.length === 0) return [];

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  return attachEmbeddedDocxImages(parsedEntries, htmlResult.value);
}

export function parsedEntriesToJournalEntries(entries: ParsedJournalEntry[]): Omit<JournalEntry, 'updatedAt'>[] {
  return entries.map((entry) => {
    const nextEntry: Omit<JournalEntry, 'updatedAt'> = {
      date: entry.date,
      somethingNew: entry.somethingNew,
      somethingLearnt: entry.somethingLearnt,
      couldDoneBetter: entry.couldDoneBetter,
      didWell: entry.didWell,
      moodId: null,
      mediaItems: entry.embeddedMediaItems,
    };

    return nextEntry;
  });
}
