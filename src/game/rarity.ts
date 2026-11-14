import { ItemRarity } from './types';

export interface RarityVisualStyle {
  rarity: ItemRarity;
  label: string;
  stars: string;
  tierNumber: number;
  hex: string;
  glowHex: string;
  cardClass: string;
  selectedClass: string;
  iconFrameClass: string;
  badgeClass: string;
  titleClass: string;
  accentBarClass: string;
}

export const RARITY_STYLES: Record<ItemRarity, RarityVisualStyle> = {
  common: {
    rarity: 'common',
    label: 'COMMON',
    stars: '★',
    tierNumber: 1,
    hex: '#94a3b8',
    glowHex: 'rgba(148, 163, 184, 0.2)',
    cardClass: 'border-slate-500/70 bg-gradient-to-br from-slate-900/75 to-slate-950/90 text-slate-200',
    selectedClass: 'ring-2 ring-slate-300 border-slate-300',
    iconFrameClass: 'border-slate-500/70 bg-slate-900/80',
    badgeClass: 'bg-slate-800/90 border-slate-500/60 text-slate-300',
    titleClass: 'text-slate-100',
    accentBarClass: 'bg-slate-400'
  },
  rare: {
    rarity: 'rare',
    label: 'RARE',
    stars: '★★',
    tierNumber: 2,
    hex: '#00f0ff',
    glowHex: 'rgba(0, 240, 255, 0.35)',
    cardClass:
      'border-cyan-400/80 bg-gradient-to-br from-cyan-950/55 via-[#091224] to-[#080518] text-cyan-100 shadow-[0_0_12px_rgba(0,240,255,0.2)]',
    selectedClass: 'ring-2 ring-cyan-300 border-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.45)]',
    iconFrameClass: 'border-cyan-400/80 bg-cyan-950/70 shadow-[0_0_12px_rgba(0,240,255,0.3)]',
    badgeClass: 'bg-cyan-950/90 border-cyan-400/70 text-cyan-300',
    titleClass: 'text-cyan-200',
    accentBarClass: 'bg-cyan-400'
  },
  epic: {
    rarity: 'epic',
    label: 'EPIC',
    stars: '★★★',
    tierNumber: 3,
    hex: '#c084fc',
    glowHex: 'rgba(192, 132, 252, 0.4)',
    cardClass:
      'border-purple-400/85 bg-gradient-to-br from-purple-950/60 via-[#15092b] to-[#090418] text-purple-100 shadow-[0_0_14px_rgba(168,85,247,0.28)]',
    selectedClass: 'ring-2 ring-purple-300 border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.5)]',
    iconFrameClass: 'border-purple-400/85 bg-purple-950/75 shadow-[0_0_14px_rgba(168,85,247,0.38)]',
    badgeClass: 'bg-purple-950/90 border-purple-400/80 text-purple-200',
    titleClass: 'text-purple-200',
    accentBarClass: 'bg-purple-400'
  },
  legendary: {
    rarity: 'legendary',
    label: 'LEGENDARY',
    stars: '★★★★',
    tierNumber: 4,
    hex: '#fbbf24',
    glowHex: 'rgba(251, 191, 36, 0.45)',
    cardClass:
      'border-amber-400/90 bg-gradient-to-br from-amber-950/60 via-[#1d1106] to-[#0a0616] text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.34)]',
    selectedClass: 'ring-2 ring-amber-300 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.55)]',
    iconFrameClass: 'border-amber-400/90 bg-amber-950/75 shadow-[0_0_16px_rgba(251,191,36,0.45)]',
    badgeClass: 'bg-gradient-to-r from-amber-950 to-orange-950 border-amber-400 text-amber-200',
    titleClass: 'text-amber-300',
    accentBarClass: 'bg-amber-400'
  },
  mythic: {
    rarity: 'mythic',
    label: 'MYTHIC',
    stars: '★★★★★',
    tierNumber: 5,
    hex: '#f87171',
    glowHex: 'rgba(248, 113, 113, 0.5)',
    cardClass:
      'border-red-400/95 bg-gradient-to-br from-red-950/65 via-[#240712] to-[#0a0414] text-red-100 shadow-[0_0_18px_rgba(239,68,68,0.4)]',
    selectedClass: 'ring-2 ring-red-300 border-red-300 shadow-[0_0_26px_rgba(248,113,113,0.65)]',
    iconFrameClass: 'border-red-400/95 bg-red-950/80 shadow-[0_0_18px_rgba(248,113,113,0.5)]',
    badgeClass: 'bg-gradient-to-r from-red-950 to-rose-950 border-red-400 text-red-200',
    titleClass: 'text-red-300',
    accentBarClass: 'bg-red-400'
  },
  'cyber-relic': {
    rarity: 'cyber-relic',
    label: 'CYBER-RELIC',
    stars: '★★★★★★',
    tierNumber: 6,
    hex: '#f472b6',
    glowHex: 'rgba(236, 72, 153, 0.55)',
    cardClass:
      'border-pink-400 bg-gradient-to-br from-pink-950/70 via-[#1b0830] to-cyan-950/45 text-pink-100 shadow-[0_0_20px_rgba(236,72,153,0.48)]',
    selectedClass: 'ring-2 ring-pink-300 border-pink-300 shadow-[0_0_28px_rgba(236,72,153,0.72)]',
    iconFrameClass: 'border-pink-400 bg-gradient-to-br from-pink-950/85 to-cyan-950/70 shadow-[0_0_20px_rgba(236,72,153,0.55)] animate-pulse',
    badgeClass: 'bg-gradient-to-r from-pink-950 via-purple-950 to-cyan-950 border-pink-400 text-pink-200',
    titleClass: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 to-cyan-300',
    accentBarClass: 'bg-gradient-to-b from-pink-400 via-purple-400 to-cyan-400'
  }
};

export function getRarityStyle(rarity?: string): RarityVisualStyle {
  if (rarity && rarity in RARITY_STYLES) {
    return RARITY_STYLES[rarity as ItemRarity];
  }
  return RARITY_STYLES.common;
}
