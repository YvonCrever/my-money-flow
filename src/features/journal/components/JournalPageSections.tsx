import { useEffect, useRef, useState } from 'react';
import {
  GripVertical,
  ImagePlus,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  buildAnsweredSections,
  formatDateLabel,
  formatShortDate,
  formatTime,
  useViewportReveal,
} from '@/features/journal/journalPageUtils';
import { readAssetBlob } from '@/lib/journalAssetStorage';
import {
  ensureHandleReadPermission,
  isQuickTimeLikeFile,
  isJournalCorruptedImportedMediaItem,
} from '@/lib/journalMedia';
import { cn } from '@/lib/utils';
import type { JournalEntry, JournalMediaItem } from '@/types/journal';

function JournalVideoPlayer({
  src,
  autoPlayKey,
  mediaName,
  mimeType,
}: {
  src: string;
  autoPlayKey: string;
  mediaName: string;
  mimeType: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const isQuickTime = isQuickTimeLikeFile({ name: mediaName, type: mimeType });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.6);
      },
      {
        threshold: [0.35, 0.6, 0.85],
      },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVisible) {
      if (video && !video.paused) video.pause();
      setIsPlaying(false);
      return;
    }

    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    setCurrentTime(0);
    setDuration(video.duration || 0);
    setIsMuted(false);
    setAutoplayBlocked(false);
    setPlaybackError(false);

    const attemptPlayback = async () => {
      try {
        await video.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setAutoplayBlocked(true);
      }
    };

    void attemptPlayback();
  }, [autoPlayKey, isQuickTime, isVisible, src]);

  const handleTogglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
        setAutoplayBlocked(false);
        setPlaybackError(false);
        setIsPlaying(true);
      } catch {
        setAutoplayBlocked(true);
      }
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const handleRestart = async () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    setCurrentTime(0);

    try {
      await video.play();
      setIsPlaying(true);
      setAutoplayBlocked(false);
    } catch {
      setIsPlaying(false);
      setAutoplayBlocked(true);
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div className="toev-video-shell">
      {playbackError ? (
        <div className="toev-video-error-bubble" role="status">
          Bug de la vidéo
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="metadata"
            className="toev-video-element"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setPlaybackError(true);
              setIsPlaying(false);
            }}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              setDuration(video.duration || 0);
            }}
            onLoadedData={() => {
              setPlaybackError(false);
            }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setCurrentTime(video.currentTime);
            }}
          />

          <div className="toev-video-controls">
            <div className="flex items-center gap-2">
              <button type="button" className="toev-video-button" onClick={() => void handleTogglePlayback()}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button type="button" className="toev-video-button" onClick={() => void handleRestart()}>
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" className="toev-video-button" onClick={handleToggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="toev-video-timeline">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => {
                  const video = videoRef.current;
                  if (!video) return;
                  const nextTime = Number(event.target.value);
                  video.currentTime = nextTime;
                  setCurrentTime(nextTime);
                }}
                className="toev-video-range"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </>
      )}

      {autoplayBlocked && !playbackError ? (
        <p className="toev-video-note">Autoplay was blocked by the browser. Start the video manually if needed.</p>
      ) : null}

      {isQuickTime && !playbackError ? (
        <p className="toev-video-note">This file is `.mov / QuickTime`. Browser support varies; convert it to `.mp4` if playback is unstable.</p>
      ) : null}
    </div>
  );
}

export function JournalMediaAsset({
  mediaItem,
  autoPlayKey,
}: {
  mediaItem: JournalMediaItem;
  autoPlayKey: string;
}) {
  const [objectUrl, setObjectUrl] = useState('');
  const [mediaState, setMediaState] = useState<'loading' | 'ready' | 'permission' | 'error'>('loading');

  useEffect(() => {
    let isMounted = true;
    let nextObjectUrl = '';

    const load = async () => {
      try {
        let blob: Blob | null = null;

        if (mediaItem.storage === 'inline') {
          if (isJournalCorruptedImportedMediaItem(mediaItem)) {
            if (!isMounted) return;
            setMediaState('error');
            return;
          }
          blob = mediaItem.blob;
        } else if (mediaItem.storage === 'asset') {
          blob = await readAssetBlob(mediaItem.assetId);
        } else {
          const permissionState = await mediaItem.handle.queryPermission({ mode: 'read' });
          if (permissionState !== 'granted') {
            if (!isMounted) return;
            setMediaState('permission');
            return;
          }

          blob = await mediaItem.handle.getFile();
        }

        nextObjectUrl = URL.createObjectURL(blob);
        if (!isMounted) return;
        setObjectUrl(nextObjectUrl);
        setMediaState('ready');
      } catch {
        if (!isMounted) return;
        setMediaState('error');
      }
    };

    setMediaState('loading');
    void load();

    return () => {
      isMounted = false;
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [mediaItem]);

  const handleActivateReference = async () => {
    if (mediaItem.storage !== 'handle') return;

    const granted = await ensureHandleReadPermission(mediaItem.handle);
    if (!granted) {
      setMediaState('permission');
      return;
    }

    try {
      const file = await mediaItem.handle.getFile();
      const nextObjectUrl = URL.createObjectURL(file);
      setObjectUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return nextObjectUrl;
      });
      setMediaState('ready');
    } catch {
      setMediaState('error');
    }
  };

  return (
    <div className="toev-media-frame">
      {mediaState === 'permission' ? (
        <div className="toev-media-permission">
          <p>Access to {mediaItem.name} is required.</p>
          <Button type="button" variant="ghost" className="toev-action-button" onClick={() => void handleActivateReference()}>
            Reconnect file
          </Button>
        </div>
      ) : null}

      {mediaState === 'loading' ? (
        <div className="toev-media-permission">
          <p>Loading media…</p>
        </div>
      ) : null}

      {mediaState === 'error' ? (
        <div className="toev-media-permission">
          <p>{mediaItem.source === 'import' ? 'Ce media importe doit etre regenere via un nouveau .docx.' : 'Impossible de charger ce media pour le moment.'}</p>
          {mediaItem.storage === 'handle' ? (
            <Button type="button" variant="ghost" className="toev-action-button" onClick={() => void handleActivateReference()}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {mediaState === 'ready' && mediaItem.type === 'image' ? (
        <img src={objectUrl} alt={mediaItem.name} className="toev-media-image" />
      ) : null}

      {mediaState === 'ready' && mediaItem.type === 'video' ? (
        <JournalVideoPlayer
          src={objectUrl}
          autoPlayKey={`${autoPlayKey}-${mediaItem.id}`}
          mediaName={mediaItem.name}
          mimeType={mediaItem.mimeType}
        />
      ) : null}
    </div>
  );
}

export function JournalFeedMediaGrid({
  mediaItems,
  autoPlayKey,
}: {
  mediaItems: JournalMediaItem[];
  autoPlayKey: string;
}) {
  if (mediaItems.length === 0) return null;

  return (
    <div className={cn('grid gap-3', mediaItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {mediaItems.map((mediaItem, index) => (
        <div
          key={mediaItem.id}
          className={cn(
            'toev-media-tile overflow-hidden rounded-[1.45rem] border border-border/70 bg-background/45',
            mediaItems.length >= 3 && index === 0 && 'col-span-2',
          )}
        >
          <JournalMediaAsset mediaItem={mediaItem} autoPlayKey={autoPlayKey} />
        </div>
      ))}
    </div>
  );
}

function JournalScrollMediaRail({
  autoPlayKey,
  mediaItems,
  side,
}: {
  autoPlayKey: string;
  mediaItems: JournalMediaItem[];
  side: 'left' | 'right';
}) {
  return (
    <aside className={cn('toev-scroll-media-rail', side === 'left' ? 'is-left' : 'is-right')}>
      <div className="toev-scroll-media-stack">
        {mediaItems.map((mediaItem, index) => (
          <JournalScrollMediaCard
            key={mediaItem.id}
            autoPlayKey={autoPlayKey}
            index={index}
            mediaItem={mediaItem}
            side={side}
          />
        ))}
      </div>
    </aside>
  );
}

function JournalScrollMediaCard({
  autoPlayKey,
  index,
  mediaItem,
  side,
}: {
  autoPlayKey: string;
  index: number;
  mediaItem: JournalMediaItem;
  side: 'left' | 'right';
}) {
  const { isVisible, setNode } = useViewportReveal({
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.12,
  });

  return (
    <div
      ref={setNode}
      className="toev-scroll-media-card"
      data-reveal={isVisible ? 'visible' : 'hidden'}
      style={{ animationDelay: `${index * 34}ms` }}
    >
      <JournalMediaAsset mediaItem={mediaItem} autoPlayKey={`${autoPlayKey}-${side}-${mediaItem.id}`} />
    </div>
  );
}

export function JournalScrollEntry({
  autoPlayKey,
  entry,
  isFocused,
  leftMediaItems,
  monthLabel,
  onDelete,
  onEdit,
  onSelect,
  rightMediaItems,
}: {
  autoPlayKey: string;
  entry: JournalEntry;
  isFocused: boolean;
  leftMediaItems: JournalMediaItem[];
  monthLabel: string | null;
  onDelete: () => void;
  onEdit: () => void;
  onSelect: () => void;
  rightMediaItems: JournalMediaItem[];
}) {
  const answeredSections = buildAnsweredSections(entry);
  const { isVisible, setNode } = useViewportReveal({
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.16,
  });

  return (
    <article
      ref={setNode}
      onClick={onSelect}
      className={cn('toev-scroll-entry-shell scroll-mt-[calc(var(--app-masthead-offset)+1rem)]', isFocused && 'is-focused')}
      data-reveal={isVisible ? 'visible' : 'hidden'}
    >
      {monthLabel ? (
        <div className="toev-scroll-month-divider">
          <div className="h-px flex-1 bg-border/55" />
          <span className="text-kubrick text-[10px] toev-meta-copy">{monthLabel}</span>
          <div className="h-px flex-1 bg-border/55" />
        </div>
      ) : null}

      <div className="toev-scroll-day-layout">
        <JournalScrollMediaRail autoPlayKey={autoPlayKey} mediaItems={leftMediaItems} side="left" />

        <div className="toev-scroll-page-shell">
          <div className="toev-scroll-page">
            <div className="toev-scroll-page-top">
              <div>
                <p className="toev-scroll-page-kicker">Journal</p>
                <h2 className="toev-scroll-date">{formatDateLabel(entry.date)}</h2>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="toev-scroll-date-code">{formatShortDate(entry.date)}</span>
                <span className="toev-status-pill">
                  {answeredSections.length > 0 ? `${answeredSections.length} note${answeredSections.length > 1 ? 's' : ''}` : 'Visual'}
                </span>
                <button
                  type="button"
                  className="toev-icon-action toev-icon-action-subtle"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="toev-icon-action toev-icon-action-subtle text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <JournalAnswerCopy
              answeredSections={answeredSections}
              emptyMessage="A visual note from the day."
            />
          </div>
        </div>

        <JournalScrollMediaRail autoPlayKey={autoPlayKey} mediaItems={rightMediaItems} side="right" />
      </div>
    </article>
  );
}

export function JournalAnswerCopy({
  answeredSections,
  emptyMessage,
}: {
  answeredSections: ReturnType<typeof buildAnsweredSections>;
  emptyMessage: string;
}) {
  if (answeredSections.length === 0) {
    return (
      <div className="toev-scroll-copy">
        <p className="toev-scroll-answer-text text-slate-500">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="toev-scroll-copy">
      {answeredSections.map((section) => (
        <p key={section.key} className="toev-scroll-answer-text">
          <span className={cn('mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em]', section.toneClassName)}>
            {section.shortLabel}
          </span>
          {section.value}
        </p>
      ))}
    </div>
  );
}

export function JournalEditorMediaGrid({
  mediaItems,
  autoPlayKey,
  onRemove,
  onReorder,
}: {
  mediaItems: JournalMediaItem[];
  autoPlayKey: string;
  onRemove: (mediaId: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
}) {
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [dropTargetMediaId, setDropTargetMediaId] = useState<string | null>(null);

  if (mediaItems.length === 0) {
    return (
      <div className="toev-editor-empty-state">
        Add images or videos, then drag them to change how they appear in the journal entry.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {mediaItems.map((mediaItem, index) => (
        <div
          key={mediaItem.id}
          draggable
          onDragStart={() => {
            setDraggedMediaId(mediaItem.id);
            setDropTargetMediaId(mediaItem.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (dropTargetMediaId !== mediaItem.id) {
              setDropTargetMediaId(mediaItem.id);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedMediaId) {
              onReorder(draggedMediaId, mediaItem.id);
            }
            setDraggedMediaId(null);
            setDropTargetMediaId(null);
          }}
          onDragEnd={() => {
            setDraggedMediaId(null);
            setDropTargetMediaId(null);
          }}
          className={cn(
            'toev-card toev-editor-media-card transition',
            dropTargetMediaId === mediaItem.id && 'border-accent/40 shadow-[0_0_0_1px_hsl(var(--accent)/0.18)]',
            draggedMediaId === mediaItem.id && 'opacity-80',
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="toev-editor-media-index">
              <GripVertical className="h-3.5 w-3.5" />
              {String(index + 1).padStart(2, '0')}
            </div>

            <div className="flex items-center gap-2">
              <span className="toev-status-pill toev-editor-media-kind">
                {mediaItem.type === 'video' ? <Video className="h-3 w-3" /> : <ImagePlus className="h-3 w-3" />}
                {mediaItem.type === 'video' ? 'Video' : 'Photo'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="toev-icon-action toev-icon-action-subtle h-8 w-8"
                onClick={() => onRemove(mediaItem.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="toev-editor-media-frame">
            <JournalMediaAsset mediaItem={mediaItem} autoPlayKey={`${autoPlayKey}-${mediaItem.id}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
