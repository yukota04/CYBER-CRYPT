/**
 * Visual identity per floor band — palette shifts every 5 floors.
 * Used by canvasRenderer for walls/floors and the map pulse overlay.
 */

export interface FloorVisualTheme {
  /** Band index: 0 = floors 1–5, 1 = 6–10, … */
  band: number;
  name: string;
  /** Background void behind the map */
  void: string;
  wallDark: string;
  wallLit: string;
  wallTrim: string;
  floorDark: string;
  floorLit: string;
  /** RGB channels for the breathing pulse overlay (0–255) */
  pulseRgb: [number, number, number];
  accent: string;
}

const THEMES: Omit<FloorVisualTheme, 'band'>[] = [
  {
    name: 'Neon Crypt',
    void: '#080614',
    wallDark: '#0e0920',
    wallLit: '#1b1238',
    wallTrim: '#492c85',
    floorDark: '#0a0718',
    floorLit: '#120d26',
    pulseRgb: [0, 240, 255],
    accent: '#00f0ff'
  },
  {
    name: 'Crimson Sector',
    void: '#0c0408',
    wallDark: '#1a080e',
    wallLit: '#3a1220',
    wallTrim: '#8b2040',
    floorDark: '#10060a',
    floorLit: '#1c0c14',
    pulseRgb: [255, 64, 96],
    accent: '#ff4060'
  },
  {
    name: 'Toxic Grid',
    void: '#040c08',
    wallDark: '#081610',
    wallLit: '#0e2a1c',
    wallTrim: '#1f7a48',
    floorDark: '#06140c',
    floorLit: '#0c1e14',
    pulseRgb: [64, 255, 140],
    accent: '#40ff8c'
  },
  {
    name: 'Amber Forge',
    void: '#0c0804',
    wallDark: '#1a1208',
    wallLit: '#3a2810',
    wallTrim: '#b87820',
    floorDark: '#120c06',
    floorLit: '#1e160a',
    pulseRgb: [255, 180, 48],
    accent: '#ffb430'
  },
  {
    name: 'Ice Core',
    void: '#040810',
    wallDark: '#081420',
    wallLit: '#102838',
    wallTrim: '#3a90c0',
    floorDark: '#060e18',
    floorLit: '#0c1824',
    pulseRgb: [120, 200, 255],
    accent: '#78c8ff'
  },
  {
    name: 'Violet Breach',
    void: '#0a0412',
    wallDark: '#14081e',
    wallLit: '#2a1440',
    wallTrim: '#7a30c0',
    floorDark: '#0e0618',
    floorLit: '#1a0e28',
    pulseRgb: [200, 100, 255],
    accent: '#c864ff'
  },
  {
    name: 'Copper Wastes',
    void: '#0c0604',
    wallDark: '#1c1008',
    wallLit: '#3a2414',
    wallTrim: '#c06030',
    floorDark: '#140a06',
    floorLit: '#22140c',
    pulseRgb: [255, 120, 64],
    accent: '#ff7830'
  },
  {
    name: 'Void Abyss',
    void: '#020208',
    wallDark: '#0a0a14',
    wallLit: '#161628',
    wallTrim: '#5050a0',
    floorDark: '#060610',
    floorLit: '#0e0e1c',
    pulseRgb: [160, 160, 255],
    accent: '#a0a0ff'
  }
];

/** Floors 1–5 share band 0, 6–10 band 1, etc. */
export function getFloorBand(floor: number): number {
  return Math.floor(Math.max(0, floor - 1) / 5);
}

export function getFloorVisualTheme(floor: number): FloorVisualTheme {
  const band = getFloorBand(floor);
  const base = THEMES[band % THEMES.length];
  return { ...base, band };
}

/** Breathing pulse 0…1 for map atmosphere (shared across tiles). */
export function mapPulseAmount(nowSec: number, floor: number): number {
  const band = getFloorBand(floor);
  // Slightly faster / deeper pulse in deeper bands
  const speed = 1.85 + (band % 4) * 0.12;
  const depth = 0.22 + Math.min(0.18, band * 0.015);
  return 0.5 + 0.5 * Math.sin(nowSec * speed) * (0.65 + depth);
}
