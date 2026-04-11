export type AppMastheadMotionId =
  | 'domino-fall'
  | 'stair-descent'
  | 'fade-queue'
  | 'drawer-teeth'
  | 'rail-stitch'
  | 'snap-cascade'
  | 'shutter-line'
  | 'type-sequence'
  | 'magnetic-lock'
  | 'editorial-sweep';

export interface AppMastheadMotionDefinition {
  id: AppMastheadMotionId;
  name: string;
  description: string;
  shortLabel: string;
  preview: string;
  recommended?: boolean;
}

const APP_MASTHEAD_MOTION_STORAGE_KEY = 'app-masthead-motion';
const DEFAULT_APP_MASTHEAD_MOTION_ID: AppMastheadMotionId = 'magnetic-lock';

export const APP_MASTHEAD_MOTIONS: AppMastheadMotionDefinition[] = [
  {
    id: 'domino-fall',
    name: 'Domino Fall',
    shortLabel: 'Toppling cascade',
    description: 'Each button tips into place in a directional chain, like a controlled line of dominos.',
    preview: 'linear-gradient(135deg, rgba(251,113,133,0.92), rgba(251,191,36,0.8))',
  },
  {
    id: 'stair-descent',
    name: 'Stair Descent',
    shortLabel: 'Descending steps',
    description: 'Buttons descend in stepped offsets, building the rail like a narrow staircase.',
    preview: 'linear-gradient(135deg, rgba(168,85,247,0.9), rgba(96,165,250,0.78))',
  },
  {
    id: 'fade-queue',
    name: 'Fade Queue',
    shortLabel: 'Soft queue',
    description: 'A restrained queue where items resolve one by one from low contrast into full presence.',
    preview: 'linear-gradient(135deg, rgba(125,211,252,0.9), rgba(244,114,182,0.72))',
  },
  {
    id: 'drawer-teeth',
    name: 'Drawer Teeth',
    shortLabel: 'Mechanical reveal',
    description: 'Each button slides out in short successive bites, as if a drawer were opening tooth by tooth.',
    preview: 'linear-gradient(135deg, rgba(250,204,21,0.92), rgba(249,115,22,0.78))',
  },
  {
    id: 'rail-stitch',
    name: 'Rail Stitch',
    shortLabel: 'Threaded build',
    description: 'The bar is stitched together from left to right with small anchored button reveals.',
    preview: 'linear-gradient(135deg, rgba(74,222,128,0.88), rgba(34,197,94,0.74))',
  },
  {
    id: 'snap-cascade',
    name: 'Snap Cascade',
    shortLabel: 'Sharp settle',
    description: 'Items snap into place with a quick high-contrast cadence and a tighter mechanical feel.',
    preview: 'linear-gradient(135deg, rgba(251,146,60,0.92), rgba(248,113,113,0.8))',
  },
  {
    id: 'shutter-line',
    name: 'Shutter Line',
    shortLabel: 'Slatted open',
    description: 'Buttons reveal behind narrow shutters, producing a rhythmic strip-by-strip opening.',
    preview: 'linear-gradient(135deg, rgba(94,234,212,0.88), rgba(45,212,191,0.78))',
  },
  {
    id: 'type-sequence',
    name: 'Type Sequence',
    shortLabel: 'Typed rail',
    description: 'The rail appears in measured beats, like controls being typed into a command strip.',
    preview: 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(129,140,248,0.76))',
  },
  {
    id: 'magnetic-lock',
    name: 'Magnetic Lock',
    shortLabel: 'Recommended default',
    description: 'Buttons glide inward and lock into a final alignment with a dense, premium finish.',
    preview: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(14,165,233,0.8))',
    recommended: true,
  },
  {
    id: 'editorial-sweep',
    name: 'Editorial Sweep',
    shortLabel: 'Magazine tempo',
    description: 'A longer, more graphic sweep that feels closer to an editorial navigation system.',
    preview: 'linear-gradient(135deg, rgba(244,114,182,0.9), rgba(192,132,252,0.8))',
  },
];

const APP_MASTHEAD_MOTION_IDS = new Set<AppMastheadMotionId>(APP_MASTHEAD_MOTIONS.map((motion) => motion.id));

export function normalizeAppMastheadMotionId(value: string | null | undefined): AppMastheadMotionId {
  if (value && APP_MASTHEAD_MOTION_IDS.has(value as AppMastheadMotionId)) {
    return value as AppMastheadMotionId;
  }

  return DEFAULT_APP_MASTHEAD_MOTION_ID;
}

export function getAppMastheadMotion(motionId: AppMastheadMotionId) {
  return APP_MASTHEAD_MOTIONS.find((motion) => motion.id === motionId) ?? APP_MASTHEAD_MOTIONS[0];
}

export function readStoredAppMastheadMotionId() {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_MASTHEAD_MOTION_ID;
  }

  try {
    return normalizeAppMastheadMotionId(window.localStorage.getItem(APP_MASTHEAD_MOTION_STORAGE_KEY));
  } catch {
    return DEFAULT_APP_MASTHEAD_MOTION_ID;
  }
}

export function persistAppMastheadMotionId(motionId: AppMastheadMotionId) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(APP_MASTHEAD_MOTION_STORAGE_KEY, motionId);
  } catch {
    // Ignore storage write failures so masthead motion persistence never blocks app rendering.
  }
}

export function applyAppMastheadMotionToDocument(motionId: AppMastheadMotionId) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.appMastheadMotion = motionId;
}
