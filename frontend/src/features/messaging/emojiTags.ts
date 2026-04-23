// Curated emoji tags used across the messaging UI (thread composer + share-grid
// modal). Ordered with status signals first, then tools, then hazards/debris
// so teammates can scan chat for callouts without reading every description.
export type EmojiTag = { emoji: string; label: string };

export const EMOJI_TAGS: EmojiTag[] = [
  { emoji: "✅", label: "Cleaned" },
  { emoji: "⚠️", label: "Warning" },
  { emoji: "🚨", label: "Hazard" },
  { emoji: "🗑️", label: "Trash" },
  { emoji: "🚮", label: "Litter" },
  { emoji: "♻️", label: "Recycle" },
  { emoji: "🧹", label: "Cleanup" },
  { emoji: "🧤", label: "Gloves" },
  { emoji: "🛞", label: "Tire" },
  { emoji: "💉", label: "Sharps" },
  { emoji: "🌳", label: "Nature" },
  { emoji: "📸", label: "Photo" },
];
