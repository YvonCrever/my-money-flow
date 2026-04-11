import {
  JournalAssetMediaItem,
  JournalHandleMediaItem,
  JournalInlineMediaItem,
  JournalMediaItem,
} from '@/types/journal';

const QUICKTIME_CREATION_MARKER = 'com.apple.quicktime.creationdate';
const QUICKTIME_DATE_REGEX = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{4}))/;
const VIDEO_EXTENSION_REGEX = /\.(mov|mp4|m4v)$/i;
const QUICKTIME_EXTENSION_REGEX = /\.mov$/i;

export interface ResolvedJournalMediaDate {
  dateKey: string | null;
  strategy: 'docx' | 'manual' | 'metadata' | 'filename' | 'modified' | 'none';
  confidence: 'high' | 'medium' | 'low' | 'none';
  metadataDateKey: string | null;
  filenameDateKey: string | null;
  modifiedDateKey: string | null;
  notes: string[];
}

export interface JournalImportMediaCandidate {
  file: File;
  mediaItem: JournalMediaItem;
}

export function isJournalAssetMediaItem(mediaItem: JournalMediaItem): mediaItem is JournalAssetMediaItem {
  return mediaItem.storage === 'asset';
}

export function isJournalUsableInlineMediaItem(
  mediaItem: JournalMediaItem,
): mediaItem is JournalInlineMediaItem {
  return mediaItem.storage === 'inline' && mediaItem.blob instanceof Blob;
}

export function isJournalInlineMediaCorrupted(mediaItem: JournalMediaItem) {
  return mediaItem.storage === 'inline' && !(mediaItem.blob instanceof Blob);
}

export function isJournalCorruptedImportedMediaItem(mediaItem: JournalMediaItem) {
  return mediaItem.source === 'import' && isJournalInlineMediaCorrupted(mediaItem);
}

export function hasJournalCorruptedImportedMedia(mediaItems: JournalMediaItem[]) {
  return mediaItems.some(isJournalCorruptedImportedMediaItem);
}

export function createJournalMediaSignature(mediaItem: JournalMediaItem) {
  if (mediaItem.storage === 'asset') {
    return ['asset', mediaItem.type, mediaItem.assetId, mediaItem.mimeType].join(':');
  }

  if (mediaItem.storage === 'inline') {
    return [
      'inline',
      mediaItem.type,
      mediaItem.name,
      mediaItem.mimeType,
      mediaItem.lastModified ?? 0,
      mediaItem.blob instanceof Blob ? mediaItem.blob.size : 'invalid',
    ].join(':');
  }

  return [
    'handle',
    mediaItem.type,
    mediaItem.name,
    mediaItem.mimeType,
    mediaItem.lastModified ?? 0,
  ].join(':');
}

export function mergeUniqueJournalMediaItems(
  existingMediaItems: JournalMediaItem[],
  incomingMediaItems: JournalMediaItem[],
) {
  const nextMediaItems = [...existingMediaItems];
  const seen = new Set(existingMediaItems.map(createJournalMediaSignature));

  for (const mediaItem of incomingMediaItems) {
    const signature = createJournalMediaSignature(mediaItem);
    if (seen.has(signature)) continue;
    seen.add(signature);
    nextMediaItems.push(mediaItem);
  }

  return nextMediaItems;
}

export function mergeImportedJournalMediaItems(
  existingMediaItems: JournalMediaItem[],
  incomingMediaItems: JournalMediaItem[],
) {
  const hasIncomingImportedImages = incomingMediaItems.some((mediaItem) => (
    mediaItem.source === 'import' && mediaItem.type === 'image'
  ));

  const preservedMediaItems = existingMediaItems.filter((mediaItem) => {
    if (mediaItem.source !== 'import') return true;
    if (mediaItem.type === 'video') return !isJournalCorruptedImportedMediaItem(mediaItem);
    return !hasIncomingImportedImages;
  });

  return mergeUniqueJournalMediaItems(preservedMediaItems, incomingMediaItems);
}

export function collectJournalAssetIds(mediaItems: JournalMediaItem[]) {
  return mediaItems.flatMap((mediaItem) => (mediaItem.storage === 'asset' ? [mediaItem.assetId] : []));
}

function isLikelyVideoName(fileName: string) {
  return VIDEO_EXTENSION_REGEX.test(fileName);
}

export function isLikelyVideoFile(file: Pick<File, 'type' | 'name'>) {
  return file.type.startsWith('video/') || isLikelyVideoName(file.name);
}

export function isQuickTimeLikeFile(file: Pick<File, 'type' | 'name'>) {
  return file.type === 'video/quicktime' || QUICKTIME_EXTENSION_REGEX.test(file.name);
}

function inferMediaType(file: Pick<File, 'type' | 'name'>): JournalMediaItem['type'] {
  if (isLikelyVideoFile(file)) return 'video';
  return 'image';
}

function inferMimeType(file: Pick<File, 'type' | 'name'>) {
  if (file.type) return file.type;
  if (isQuickTimeLikeFile(file)) return 'video/quicktime';
  if (isLikelyVideoName(file.name)) return 'video/mp4';
  return 'image/jpeg';
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeOffset(value: string) {
  if (/^[+-]\d{4}$/.test(value)) {
    return `${value.slice(0, 3)}:${value.slice(3)}`;
  }

  return value;
}

function parseDateString(value: string) {
  const normalized = value.replace(/([+-]\d{4})$/, (_, offset) => normalizeOffset(offset));
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateFromFilename(fileName: string) {
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

async function scanBlobForCreationDate(blob: Blob) {
  const chunkSize = 768 * 1024;
  const decoder = new TextDecoder('latin1');
  let carry = '';

  for (let offset = 0; offset < blob.size; offset += chunkSize) {
    const chunk = await blob.slice(offset, offset + chunkSize).arrayBuffer();
    const text = carry + decoder.decode(new Uint8Array(chunk), { stream: true });

    const markerIndex = text.indexOf(QUICKTIME_CREATION_MARKER);
    if (markerIndex >= 0) {
      const windowText = text.slice(markerIndex, markerIndex + 5000);
      const match = windowText.match(QUICKTIME_DATE_REGEX);
      if (match?.[1]) {
        return parseDateString(match[1]);
      }
    }

    const fallbackMatch = text.match(QUICKTIME_DATE_REGEX);
    if (fallbackMatch?.[1]) {
      return parseDateString(fallbackMatch[1]);
    }

    carry = text.slice(-5000);
  }

  return null;
}

export async function resolveJournalMediaDate(file: File): Promise<ResolvedJournalMediaDate> {
  const metadataDate = isLikelyVideoFile(file)
    ? await scanBlobForCreationDate(file)
    : null;
  const filenameDate = parseDateFromFilename(file.name);
  const modifiedDate = Number.isFinite(file.lastModified) ? new Date(file.lastModified) : null;

  const metadataDateKey = metadataDate ? toDateKey(metadataDate) : null;
  const filenameDateKey = filenameDate ? toDateKey(filenameDate) : null;
  const modifiedDateKey = modifiedDate ? toDateKey(modifiedDate) : null;
  const notes: string[] = [];

  if (metadataDateKey && filenameDateKey && metadataDateKey !== filenameDateKey) {
    notes.push(`La métadonnée vidéo (${metadataDateKey}) diffère du nom du fichier (${filenameDateKey}).`);
  }

  if (metadataDateKey) {
    return {
      dateKey: metadataDateKey,
      strategy: 'metadata',
      confidence: notes.length > 0 ? 'medium' : 'high',
      metadataDateKey,
      filenameDateKey,
      modifiedDateKey,
      notes,
    };
  }

  if (filenameDateKey) {
    notes.push('Date issue du nom du fichier, faute de métadonnée vidéo exploitable.');
    return {
      dateKey: filenameDateKey,
      strategy: 'filename',
      confidence: 'medium',
      metadataDateKey,
      filenameDateKey,
      modifiedDateKey,
      notes,
    };
  }

  if (modifiedDateKey) {
    notes.push('Date issue de la date de modification du fichier, faute de meilleure source.');
    return {
      dateKey: modifiedDateKey,
      strategy: 'modified',
      confidence: 'low',
      metadataDateKey,
      filenameDateKey,
      modifiedDateKey,
      notes,
    };
  }

  return {
    dateKey: null,
    strategy: 'none',
    confidence: 'none',
    metadataDateKey,
    filenameDateKey,
    modifiedDateKey,
    notes: ["Aucune date exploitable n'a pu être trouvée."],
  };
}

function createMediaId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function fileToJournalMediaItem(file: File, source: JournalMediaItem['source'] = 'manual'): JournalMediaItem {
  return {
    id: createMediaId(file.name),
    name: file.name,
    type: inferMediaType(file),
    mimeType: inferMimeType(file),
    storage: 'inline',
    blob: file,
    lastModified: file.lastModified,
    source,
  };
}

export function fileToJournalInlineCandidate(file: File, source: JournalMediaItem['source'] = 'manual'): JournalImportMediaCandidate {
  return {
    file,
    mediaItem: fileToJournalMediaItem(file, source) as JournalInlineMediaItem,
  };
}

export function fileHandleToJournalMediaItem(handle: FileSystemFileHandle, file: File, source: JournalMediaItem['source'] = 'import'): JournalHandleMediaItem {
  return {
    id: createMediaId(file.name),
    name: file.name,
    type: inferMediaType(file),
    mimeType: inferMimeType(file),
    storage: 'handle',
    handle,
    lastModified: file.lastModified,
    source,
  };
}

export async function fileHandleToJournalCandidate(handle: FileSystemFileHandle, source: JournalMediaItem['source'] = 'import'): Promise<JournalImportMediaCandidate> {
  const file = await handle.getFile();
  return {
    file,
    mediaItem: fileHandleToJournalMediaItem(handle, file, source),
  };
}

export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function ensureHandleReadPermission(handle: FileSystemHandle) {
  if (!('queryPermission' in handle) || !('requestPermission' in handle)) return true;

  const currentPermission = await handle.queryPermission({ mode: 'read' });
  if (currentPermission === 'granted') return true;

  const requestedPermission = await handle.requestPermission({ mode: 'read' });
  return requestedPermission === 'granted';
}

export async function listVideoCandidatesFromDirectory(directoryHandle: FileSystemDirectoryHandle) {
  const candidates: JournalImportMediaCandidate[] = [];
  const values = directoryHandle.values?.();

  if (!values) {
    return candidates;
  }

  // File System Access directory iteration is async by design.
  for await (const entry of values) {
    if (entry.kind !== 'file') continue;
    const fileHandle = entry as FileSystemFileHandle;
    const file = await fileHandle.getFile();
    if (!isLikelyVideoFile(file)) continue;
    candidates.push({
      file,
      mediaItem: fileHandleToJournalMediaItem(fileHandle, file, 'import'),
    });
  }

  return candidates;
}
