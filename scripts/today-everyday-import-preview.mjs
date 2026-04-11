import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const DATE_LINE_REGEX = /^\s*([A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?\, \d{4})\s*$/gm;

const QUESTION_LABELS = {
  somethingNew: 'Something new that I did today',
  somethingLearnt: 'Something that I learnt today',
  couldDoneBetter: "Something I could've done better today",
  didWell: 'Something I did well today',
};

function normalizeText(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[’]/g, "'");
}

function parseEnglishDateLabel(value) {
  const normalized = value.replace(/(\d+)(st|nd|rd|th)/, '$1');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAnswer(section, label, nextLabels) {
  const nextPattern = nextLabels.length > 0
    ? `(?=\\n\\s*(?:${nextLabels.map(escapeRegExp).join('|')})\\s*:|$)`
    : '$';

  const regex = new RegExp(`${escapeRegExp(label)}\\s*:\\s*([\\s\\S]*?)${nextPattern}`, 'i');
  const match = section.match(regex);
  return match?.[1]?.trim() ?? '';
}

function parseTodayEverydayText(rawText) {
  const normalizedText = normalizeText(rawText);
  const matches = Array.from(normalizedText.matchAll(DATE_LINE_REGEX));

  return matches.map((match, index) => {
    const sourceDateLabel = match[1].trim();
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalizedText.length) : normalizedText.length;
    const section = normalizedText.slice(start, end);
    const parsedDate = parseEnglishDateLabel(sourceDateLabel);
    if (!parsedDate) return null;

    const labels = Object.values(QUESTION_LABELS);

    return {
      date: toDateKey(parsedDate),
      sourceDateLabel,
      somethingNew: extractAnswer(section, QUESTION_LABELS.somethingNew, labels.filter((label) => label !== QUESTION_LABELS.somethingNew)),
      somethingLearnt: extractAnswer(section, QUESTION_LABELS.somethingLearnt, labels.filter((label) => label !== QUESTION_LABELS.somethingLearnt)),
      couldDoneBetter: extractAnswer(section, QUESTION_LABELS.couldDoneBetter, labels.filter((label) => label !== QUESTION_LABELS.couldDoneBetter)),
      didWell: extractAnswer(section, QUESTION_LABELS.didWell, []),
    };
  }).filter(Boolean);
}

function parseDateFromFilename(fileName) {
  const screenRecordingMatch = fileName.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (screenRecordingMatch) {
    const [, month, day, year] = screenRecordingMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoMatch = fileName.match(/(20\d{2})[-_](\d{2})[-_](\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseDateString(value) {
  const normalized = value.replace(/([+-]\d{4})$/, (_, offset) => `${offset.slice(0, 3)}:${offset.slice(3)}`);
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function extractQuickTimeCreationDate(filePath) {
  const buffer = await fs.readFile(filePath);
  const text = buffer.toString('latin1');
  const markerIndex = text.indexOf('com.apple.quicktime.creationdate');
  const windowText = markerIndex >= 0 ? text.slice(markerIndex, markerIndex + 5000) : text;
  const match = windowText.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{4}))/);
  return match?.[1] ? parseDateString(match[1]) : null;
}

async function readOverrides(docxPath) {
  const overridesPath = path.join(path.dirname(docxPath), 'media-overrides.json');
  try {
    const raw = await fs.readFile(overridesPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function resolveMedia(filePath, entryDates, overrides) {
  const stat = await fs.stat(filePath);
  const name = path.basename(filePath);
  const manualDateKey = overrides[name] ?? null;
  const metadataDate = await extractQuickTimeCreationDate(filePath);
  const filenameDate = parseDateFromFilename(name);
  const modifiedDate = stat.mtime;

  const metadataDateKey = metadataDate ? toDateKey(metadataDate) : null;
  const filenameDateKey = filenameDate ? toDateKey(filenameDate) : null;
  const modifiedDateKey = modifiedDate ? toDateKey(modifiedDate) : null;
  const notes = [];

  if (metadataDateKey && filenameDateKey && metadataDateKey !== filenameDateKey) {
    notes.push(`La métadonnée vidéo (${metadataDateKey}) diffère du nom du fichier (${filenameDateKey}).`);
  }

  let strategy = 'none';
  let confidence = 'none';
  let dateKey = null;

  if (manualDateKey) {
    strategy = 'manual';
    confidence = 'high';
    dateKey = manualDateKey;
    notes.push('Date imposée manuellement via media-overrides.json.');
  } else if (metadataDateKey) {
    strategy = 'metadata';
    confidence = notes.length > 0 ? 'medium' : 'high';
    dateKey = metadataDateKey;
  } else if (filenameDateKey) {
    strategy = 'filename';
    confidence = 'medium';
    dateKey = filenameDateKey;
    notes.push('Date issue du nom du fichier, faute de métadonnée vidéo exploitable.');
  } else if (modifiedDateKey) {
    strategy = 'modified';
    confidence = 'low';
    dateKey = modifiedDateKey;
    notes.push('Date issue de la date de modification du fichier, faute de meilleure source.');
  }

  return {
    name,
    size: stat.size,
    strategy,
    confidence,
    dateKey,
    matchedEntryDate: dateKey && entryDates.has(dateKey) ? dateKey : null,
    metadataDateKey,
    filenameDateKey,
    modifiedDateKey,
    notes,
  };
}

async function main() {
  const [docxPath, videosDir] = process.argv.slice(2);

  if (!docxPath || !videosDir) {
    console.error('Usage: node scripts/today-everyday-import-preview.mjs <journal.docx> <videosDir>');
    process.exit(1);
  }

  const result = await mammoth.extractRawText({ path: docxPath });
  const parsedEntries = parseTodayEverydayText(result.value);
  const entryDates = new Set(parsedEntries.map((entry) => entry.date));
  const overrides = await readOverrides(docxPath);

  const videoNames = await fs.readdir(videosDir);
  const videoFiles = videoNames
    .filter((name) => !name.startsWith('.'))
    .map((name) => path.join(videosDir, name));

  const entryMap = new Map(parsedEntries.map((entry) => [entry.date, { ...entry, matchedMedia: [] }]));
  const ambiguousMedia = [];
  const unmatchedMedia = [];

  for (const filePath of videoFiles) {
    const media = await resolveMedia(filePath, entryDates, overrides);
    if (media.matchedEntryDate) {
      entryMap.get(media.matchedEntryDate)?.matchedMedia.push(media);
      if (media.confidence !== 'high' || media.notes.length > 0) {
        ambiguousMedia.push(media);
      }
    } else {
      unmatchedMedia.push(media);
    }
  }

  const preview = {
    sourceDocx: docxPath,
    sourceVideos: videosDir,
    entryCount: parsedEntries.length,
    matchedMediaCount: Array.from(entryMap.values()).reduce((total, entry) => total + entry.matchedMedia.length, 0),
    ambiguousMedia,
    unmatchedMedia,
    entries: Array.from(entryMap.values()),
  };

  const outputPath = path.join(path.dirname(docxPath), 'today-everyday-preview.json');
  await fs.writeFile(outputPath, JSON.stringify(preview, null, 2));

  console.log(`Preview written: ${outputPath}`);
  console.log(`Entries: ${preview.entryCount}`);
  console.log(`Matched media: ${preview.matchedMediaCount}`);
  console.log(`Ambiguities: ${preview.ambiguousMedia.length}`);
  console.log(`Unmatched: ${preview.unmatchedMedia.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
