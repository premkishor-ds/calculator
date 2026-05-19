export interface TagDef {
  id: string;
  label: string;
  color: string;       // Tailwind bg/text classes
  dot: string;         // hex for the colored dot
  custom?: boolean;
}

export const STATIC_TAGS: TagDef[] = [
  { id: 'favourite',         label: '⭐ Favourite',          color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',  dot: '#facc15' },
  { id: 'currentlyinvested', label: '💼 Invested',           color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: '#34d399' },
  { id: 'nextbuy',           label: '🛒 Next Buy',           color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',        dot: '#60a5fa' },
  { id: 'bullish',           label: '🚀 Bullish',            color: 'bg-green-500/15 text-green-400 border-green-500/30',     dot: '#4ade80' },
  { id: 'highconviction',    label: '🔥 High Conviction',    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',  dot: '#fb923c' },
  { id: 'longterm',          label: '🏦 Long Term',          color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',  dot: '#818cf8' },
  { id: 'swingplay',         label: '📈 Swing Play',         color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',        dot: '#22d3ee' },
  { id: 'watchclosely',      label: '👁 Watch Closely',      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',  dot: '#c084fc' },
  { id: 'undervalued',       label: '💎 Undervalued',        color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',        dot: '#2dd4bf' },
  { id: 'researching',       label: '🔬 Researching',        color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',           dot: '#38bdf8' },
  { id: 'takingprofit',      label: '💰 Taking Profit',      color: 'bg-lime-500/15 text-lime-400 border-lime-500/30',        dot: '#a3e635' },
  { id: 'avoid',             label: '🚫 Avoid',              color: 'bg-red-500/15 text-red-400 border-red-500/30',           dot: '#f87171' },
];

export const CUSTOM_TAG_IDS = ['watchlist1', 'watchlist2', 'watchlist3', 'watchlist4', 'watchlist5'] as const;

export interface CustomTagRaw { tagId: string; label: string; color: string; }

/** Build a TagDef from a raw custom tag (hex color → inline style, not Tailwind) */
export function buildCustomTagDef(raw: CustomTagRaw): TagDef {
  return {
    id: raw.tagId,
    label: raw.label,
    color: '',          // unused for custom — we use inline styles with raw.color
    dot: raw.color,
    custom: true,
  };
}

export const DEFAULT_CUSTOM_TAGS: CustomTagRaw[] = [
  { tagId: 'watchlist1', label: 'Watchlist 1', color: '#f97316' },
  { tagId: 'watchlist2', label: 'Watchlist 2', color: '#8b5cf6' },
  { tagId: 'watchlist3', label: 'Watchlist 3', color: '#06b6d4' },
  { tagId: 'watchlist4', label: 'Watchlist 4', color: '#ec4899' },
  { tagId: 'watchlist5', label: 'Watchlist 5', color: '#84cc16' },
];

/** Merge static + custom into one ALL_TAGS array */
export function buildAllTags(customRaw: CustomTagRaw[]): TagDef[] {
  return [...STATIC_TAGS, ...customRaw.map(buildCustomTagDef)];
}

// Fallback static export (used before custom tags load)
export const ALL_TAGS: TagDef[] = buildAllTags(DEFAULT_CUSTOM_TAGS);
export const TAG_MAP = Object.fromEntries(ALL_TAGS.map(t => [t.id, t]));
