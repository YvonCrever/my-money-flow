import { JournalAssetMediaItem, JournalMediaItem } from '@/types/journal';
import { JournalStorageError, wrapJournalStorageError } from '@/lib/journalStorageErrors';

// Ce nom de dossier OPFS ne doit pas être modifié : les médias existants sont stockés sous ce chemin.
const MEDIA_DIRECTORY_NAME = 'today-everyday-media';
const OPTIMIZED_IMAGE_MIME_TYPE = 'image/webp';
const OPTIMIZED_IMAGE_QUALITY = 0.82;
const MAX_IMAGE_DIMENSION = 2048;

type StorageManagerWithDirectory = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

interface OptimizedImageResult {
  blob: Blob;
  width?: number;
  height?: number;
  optimized: boolean;
}

export interface JournalStoragePreparationResult {
  warning: string | null;
  remainingBytes: number | null;
  persistenceGranted: boolean | null;
}

export interface SaveImageAssetOptions {
  name: string;
  lastModified?: number;
  source?: JournalMediaItem['source'];
}

export interface SaveImageAssetResult {
  mediaItem: JournalAssetMediaItem;
  optimized: boolean;
}

function createAssetId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `asset-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeFileName(name: string) {
  return name.trim() || 'docx-image';
}

function guessExtensionFromMimeType(mimeType: string) {
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'bin';
}

async function getMediaDirectoryHandle() {
  if (typeof navigator === 'undefined') {
    throw new JournalStorageError(
      'unsupported',
      'Le stockage media du Journal est indisponible hors navigateur.',
    );
  }

  const storage = navigator.storage as StorageManagerWithDirectory | undefined;
  if (!storage?.getDirectory) {
    throw new JournalStorageError(
      'unsupported',
      'Ce navigateur ne prend pas en charge le stockage media requis pour les photos du Journal.',
    );
  }

  try {
    const rootDirectory = await storage.getDirectory();
    return rootDirectory.getDirectoryHandle(MEDIA_DIRECTORY_NAME, { create: true });
  } catch (error) {
    throw wrapJournalStorageError(
      error,
      'unavailable',
      "Impossible d'acceder au stockage media du Journal.",
    );
  }
}

function createCanvas(width: number, height: number) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function optimizeImageBlob(blob: Blob): Promise<OptimizedImageResult | null> {
  if (typeof createImageBitmap === 'undefined') return null;

  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(blob);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    const scale = longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = createCanvas(width, height);
    if (!canvas) return null;

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, width, height);

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, OPTIMIZED_IMAGE_MIME_TYPE, OPTIMIZED_IMAGE_QUALITY);
    });

    if (!optimizedBlob) return null;

    return {
      blob: optimizedBlob,
      width,
      height,
      optimized: true,
    };
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

async function writeBlobToAssetFile(assetId: string, blob: Blob) {
  const extension = guessExtensionFromMimeType(blob.type || OPTIMIZED_IMAGE_MIME_TYPE);
  const directory = await getMediaDirectoryHandle();
  const fileName = `${assetId}.${extension}`;

  try {
    const handle = await directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileName;
  } catch (error) {
    throw wrapJournalStorageError(
      error,
      'write',
      "Impossible d'enregistrer une photo importee dans le stockage local du Journal.",
    );
  }
}

async function findAssetFileHandle(assetId: string) {
  const directory = await getMediaDirectoryHandle();
  const values = directory.values?.();

  if (!values) {
    return null;
  }

  for await (const entry of values) {
    if (entry.kind !== 'file') continue;
    if (entry.name === `${assetId}.webp` || entry.name.startsWith(`${assetId}.`)) {
      return entry as FileSystemFileHandle;
    }
  }

  return null;
}

export async function prepareJournalStorage(expectedBytes: number): Promise<JournalStoragePreparationResult> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return {
      warning: null,
      remainingBytes: null,
      persistenceGranted: null,
    };
  }

  let persistenceGranted: boolean | null = null;
  if ('persist' in navigator.storage) {
    try {
      persistenceGranted = await navigator.storage.persist();
    } catch {
      persistenceGranted = null;
    }
  }

  if (!('estimate' in navigator.storage)) {
    return {
      warning: null,
      remainingBytes: null,
      persistenceGranted,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? null;
    const usage = estimate.usage ?? 0;
    const remainingBytes = quota === null ? null : Math.max(quota - usage, 0);
    const warning = remainingBytes !== null && expectedBytes > 0 && remainingBytes < expectedBytes * 1.25
      ? "Le navigateur semble presque plein. L'import a plus de chances de reussir si tu liberes de l'espace avant le prochain gros .docx."
      : null;

    return {
      warning,
      remainingBytes,
      persistenceGranted,
    };
  } catch {
    return {
      warning: null,
      remainingBytes: null,
      persistenceGranted,
    };
  }
}

export async function saveImageAsset(source: Blob, options: SaveImageAssetOptions): Promise<SaveImageAssetResult> {
  const assetId = createAssetId();
  const optimizedImage = await optimizeImageBlob(source);
  const storedBlob = optimizedImage?.blob ?? source;
  const storedMimeType = storedBlob.type || source.type || OPTIMIZED_IMAGE_MIME_TYPE;

  await writeBlobToAssetFile(assetId, storedBlob);

  return {
    mediaItem: {
      id: `asset-${assetId}`,
      assetId,
      name: normalizeFileName(options.name),
      type: 'image',
      mimeType: storedMimeType,
      storage: 'asset',
      source: options.source ?? 'import',
      lastModified: options.lastModified,
      width: optimizedImage?.width,
      height: optimizedImage?.height,
      byteSize: storedBlob.size,
    },
    optimized: Boolean(optimizedImage),
  };
}

export async function readAssetBlob(assetId: string): Promise<Blob> {
  try {
    const handle = await findAssetFileHandle(assetId);
    if (!handle) {
      throw new JournalStorageError(
        'not-found',
        'Le fichier image importe est introuvable. Reimporte le .docx pour le restaurer.',
      );
    }

    return await handle.getFile();
  } catch (error) {
    throw wrapJournalStorageError(
      error,
      'read',
      'Impossible de relire une photo importee depuis le stockage local du Journal.',
    );
  }
}

export async function deleteAsset(assetId: string) {
  try {
    const handle = await findAssetFileHandle(assetId);
    if (!handle) return;

    const directory = await getMediaDirectoryHandle();
    await directory.removeEntry(handle.name);
  } catch (error) {
    throw wrapJournalStorageError(
      error,
      'write',
      'Impossible de nettoyer un ancien fichier photo du Journal.',
    );
  }
}
