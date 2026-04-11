import { describe, expect, it } from 'vitest';

import {
  createJournalMediaSignature,
  fileToJournalMediaItem,
  hasJournalCorruptedImportedMedia,
  isLikelyVideoFile,
  isQuickTimeLikeFile,
  mergeImportedJournalMediaItems,
} from '@/lib/journalMedia';

describe('journal media inference', () => {
  it('treats .mov files with an empty mime type as videos', () => {
    const file = new File(['video'], 'IMG_4707.MOV', { type: '' });
    const mediaItem = fileToJournalMediaItem(file, 'import');

    expect(mediaItem.type).toBe('video');
    expect(mediaItem.mimeType).toBe('video/quicktime');
  });

  it('keeps mp4 files as videos even when the browser omits the mime type', () => {
    const file = new File(['video'], 'media.MP4', { type: '' });
    const mediaItem = fileToJournalMediaItem(file, 'import');

    expect(mediaItem.type).toBe('video');
    expect(mediaItem.mimeType).toBe('video/mp4');
  });

  it('recognizes video files from their extension', () => {
    expect(isLikelyVideoFile({ name: 'clip.mov', type: '' } as File)).toBe(true);
    expect(isQuickTimeLikeFile({ name: 'clip.mov', type: '' } as File)).toBe(true);
    expect(isLikelyVideoFile({ name: 'photo.jpeg', type: '' } as File)).toBe(false);
  });

  it('detects corrupted imported inline media', () => {
    expect(hasJournalCorruptedImportedMedia([
      {
        id: 'broken-inline',
        name: 'broken.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        storage: 'inline',
        blob: {} as Blob,
        source: 'import',
      },
    ])).toBe(true);
  });

  it('dedupes asset media items by asset id', () => {
    expect(createJournalMediaSignature({
      id: 'asset-a',
      assetId: 'asset-a',
      name: 'photo.webp',
      type: 'image',
      mimeType: 'image/webp',
      storage: 'asset',
      source: 'import',
    })).toBe('asset:image:asset-a:image/webp');
  });

  it('replaces old imported images while preserving manual media and valid videos', () => {
    const merged = mergeImportedJournalMediaItems(
      [
        {
          id: 'manual-image',
          name: 'manual.jpg',
          type: 'image',
          mimeType: 'image/jpeg',
          storage: 'inline',
          blob: new Blob(['manual']),
          source: 'manual',
        },
        {
          id: 'broken-import-image',
          name: 'legacy.jpg',
          type: 'image',
          mimeType: 'image/jpeg',
          storage: 'inline',
          blob: {} as Blob,
          source: 'import',
        },
        {
          id: 'video-handle',
          name: 'clip.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          storage: 'inline',
          blob: new Blob(['video']),
          source: 'import',
          lastModified: 12,
        },
      ],
      [
        {
          id: 'asset-image',
          assetId: 'asset-image',
          name: 'docx.webp',
          type: 'image',
          mimeType: 'image/webp',
          storage: 'asset',
          source: 'import',
        },
        {
          id: 'video-duplicate',
          name: 'clip.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          storage: 'inline',
          blob: new Blob(['video']),
          source: 'import',
          lastModified: 12,
        },
      ],
    );

    expect(merged).toHaveLength(3);
    expect(merged.some((mediaItem) => mediaItem.id === 'manual-image')).toBe(true);
    expect(merged.some((mediaItem) => mediaItem.storage === 'asset' && mediaItem.assetId === 'asset-image')).toBe(true);
    expect(merged.filter((mediaItem) => mediaItem.type === 'video')).toHaveLength(1);
  });
});
