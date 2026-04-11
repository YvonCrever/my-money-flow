import type { CalendarLinkedMeta } from '@/types/calendar';

interface JournalMediaItemBase {
  id: string;
  name: string;
  type: 'image' | 'video';
  mimeType: string;
  lastModified?: number;
  source?: 'manual' | 'import';
}

export interface JournalInlineMediaItem extends JournalMediaItemBase {
  storage: 'inline';
  blob: Blob;
}

export interface JournalHandleMediaItem extends JournalMediaItemBase {
  storage: 'handle';
  handle: FileSystemFileHandle;
}

export interface JournalAssetMediaItem extends JournalMediaItemBase {
  storage: 'asset';
  assetId: string;
  width?: number;
  height?: number;
  byteSize?: number;
}

export type JournalMediaItem =
  | JournalInlineMediaItem
  | JournalHandleMediaItem
  | JournalAssetMediaItem;

export type JournalMoodId =
  | 'sunbeam'
  | 'spark'
  | 'groove'
  | 'dream'
  | 'tender'
  | 'storm';

export interface JournalEntry {
  date: string;
  somethingNew: string;
  somethingLearnt: string;
  couldDoneBetter: string;
  didWell: string;
  moodId: JournalMoodId | null;
  mediaItems: JournalMediaItem[];
  updatedAt: string;
  calendarMeta?: CalendarLinkedMeta;
}
