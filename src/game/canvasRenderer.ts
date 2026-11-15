import { AttackEffect, CharacterClass, DungeonState, GameItem, Monster, Player } from './types';
import { getRarityStyle } from './rarity';
import { getFloorVisualTheme, mapPulseAmount } from './floorVisual';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface VisualAttackEffect extends AttackEffect {
  life: number;
  maxLife: number;
  active: boolean;
}

export interface CoopRemoteRenderPlayer {
  playerId: string;
  username: string;
  characterClass: CharacterClass;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
  movedThisTurn: boolean;
  alive: boolean;
}

/** Unit-space Path2D cache keyed by bodyShape (drawn at origin, translate per monster). */
const MONSTER_BODY_PATHS = new Map<string, Path2D>();

function getMonsterBodyPath(shape: string): Path2D {
  const cached = MONSTER_BODY_PATHS.get(shape);
  if (cached) return cached;
  const p = new Path2D();
  if (shape === 'diamond' || shape === 'core') {
    const r = shape === 'core' ? 14 : 11;
    p.moveTo(0, -r);
    p.lineTo(r, 0);
    p.lineTo(0, r);
    p.lineTo(-r, 0);
    p.closePath();
  } else if (shape === 'hex' || shape === 'octo') {
    const sides = shape === 'octo' ? 8 : 6;
    const r = 11.5;
    for (let i = 0; i < sides; i++) {
      const ang = (i * Math.PI * 2) / sides - Math.PI / 2;
      const vx = Math.cos(ang) * r;
      const vy = Math.sin(ang) * r;
      if (i === 0) p.moveTo(vx, vy);
      else p.lineTo(vx, vy);
    }
    p.closePath();
  } else if (shape === 'spiked') {
    for (let i = 0; i < 10; i++) {
      const ang = (i * Math.PI * 2) / 10;
      const r = i % 2 === 0 ? 13.5 : 7.5;
      const vx = Math.cos(ang) * r;
      const vy = Math.sin(ang) * r;
      if (i === 0) p.moveTo(vx, vy);
      else p.lineTo(vx, vy);
    }
    p.closePath();
  } else if (shape === 'serpent') {
    // Relative to body center (cx, cy) with tile origin at (-16, -16)
    p.moveTo(0, -12);
    p.lineTo(11, -2);
    p.lineTo(6, 11);
    p.lineTo(-6, 11);
    p.lineTo(-11, -2);
    p.closePath();
  }
  // 'titan' and unknown shapes use fillRect — no Path2D
  MONSTER_BODY_PATHS.set(shape, p);
  return p;
}

function acquire2dContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  // desynchronized helps Chrome; willReadFrequently:false is the safe cross-browser hint
  const preferred =
    canvas.getContext('2d', { alpha: false, desynchronized: true, willReadFrequently: false }) ||
    canvas.getContext('2d', { alpha: false, willReadFrequently: false }) ||
    canvas.getContext('2d');
  if (!preferred) throw new Error('2D canvas context unavailable');
  return preferred;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize = 32;
  private cameraX = 0;
  private cameraY = 0;
  private trauma = 0;
  private hitstopTimer = 0;
  /** Only active particles are iterated each frame. */
  private activeParticles: Particle[] = [];
  private freeParticles: Particle[] = [];
  private maxParticles = 160;
  private activeAttackEffects: VisualAttackEffect[] = [];
  private freeAttackEffects: VisualAttackEffect[] = [];
  private maxAttackEffects = 32;
  private damageVignette = 0;
  private attackAnim = 0;
  private moveBlend = 0;
  private prevPlayerX = Number.NaN;
  private prevPlayerY = Number.NaN;
  private remoteMove = new Map<string, { x: number; y: number; blend: number }>();
  public enableScanlines = true;
  public enableGlow = true;
  public enableParticles = true;
  public enablePostFx = true;
  public simpleEntities = false;
  public detailTiles = true;
  private scanlinePattern: CanvasPattern | null = null;
  private scanlineCacheKey = '';
  /** Auto-downgrade when FPS stays low (set by App loop). */
  public autoQualityActive = false;

  public applyPerformanceOptions(opts: {
    enableScanlines?: boolean;
    enableGlow?: boolean;
    enableParticles?: boolean;
    enablePostFx?: boolean;
    simpleEntities?: boolean;
    detailTiles?: boolean;
  }) {
    if (typeof opts.enableScanlines === 'boolean') this.enableScanlines = opts.enableScanlines;
    if (typeof opts.enableGlow === 'boolean') this.enableGlow = opts.enableGlow;
    if (typeof opts.enablePostFx === 'boolean') this.enablePostFx = opts.enablePostFx;
    if (typeof opts.simpleEntities === 'boolean') this.simpleEntities = opts.simpleEntities;
    if (typeof opts.detailTiles === 'boolean') this.detailTiles = opts.detailTiles;
    if (typeof opts.enableParticles === 'boolean') {
      this.enableParticles = opts.enableParticles;
      if (!opts.enableParticles) this.clearActiveParticles();
    }
  }

  /** Force simple entities + drop glow/particles after sustained low FPS. */
  public applyAutoQualityDowngrade() {
    if (this.autoQualityActive) return;
    this.autoQualityActive = true;
    this.applyPerformanceOptions({
      simpleEntities: true,
      enableGlow: false,
      enableParticles: false,
      enablePostFx: false,
      enableScanlines: false,
      detailTiles: false
    });
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = acquire2dContext(canvas);

    for (let i = 0; i < this.maxParticles; i++) {
      this.freeParticles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        color: '#00f0ff',
        size: 2
      });
    }
    for (let i = 0; i < this.maxAttackEffects; i++) {
      this.freeAttackEffects.push({
        type: 'slash',
        x: 0,
        y: 0,
        color: '#fff',
        life: 0,
        maxLife: 0.28,
        active: false
      });
    }
  }

  private clearActiveParticles() {
    while (this.activeParticles.length > 0) {
      const p = this.activeParticles.pop()!;
      p.active = false;
      this.freeParticles.push(p);
    }
  }

  private clearActiveAttackEffects() {
    while (this.activeAttackEffects.length > 0) {
      const fx = this.activeAttackEffects.pop()!;
      fx.active = false;
      this.freeAttackEffects.push(fx);
    }
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  /** Drop VFX pools so title/hub can reclaim memory after a run. */
  public releaseSession() {
    this.trauma = 0;
    this.hitstopTimer = 0;
    this.damageVignette = 0;
    this.attackAnim = 0;
    this.moveBlend = 0;
    this.clearActiveAttackEffects();
    this.clearActiveParticles();
    this.remoteMove.clear();
    this.prevPlayerX = Number.NaN;
    this.prevPlayerY = Number.NaN;
  }

  public triggerHitstop(seconds: number) {
    if (seconds <= 0) return;
    const clamped = Math.max(0.03, Math.min(0.25, seconds));
    this.hitstopTimer = Math.max(this.hitstopTimer, clamped);
  }

  /** Full-screen fear/impact feedback when the player is hurt. */
  public triggerDamageFeedback(intensity = 0.9) {
    const i = Math.max(0.35, Math.min(1, intensity));
    this.damageVignette = Math.max(this.damageVignette, i);
    this.addTrauma(0.28 * i);
  }

  /** Kick a marked melee swing pose on the local humanoid (~0.45s). */
  public notifyMeleeSwing() {
    this.attackAnim = 1;
  }

  public getHitstopRemaining(): number {
    return this.hitstopTimer;
  }

  public screenToTile(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = screenX + Math.floor(this.cameraX);
    const worldY = screenY + Math.floor(this.cameraY);
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize)
    };
  }

  /** Continuous tile-space position under a screen pixel (for mouse aim). */
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldX = screenX + Math.floor(this.cameraX);
    const worldY = screenY + Math.floor(this.cameraY);
    return {
      x: worldX / this.tileSize,
      y: worldY / this.tileSize
    };
  }

  public spawnAttackEffect(effect: AttackEffect) {
    let fx = this.freeAttackEffects.pop();
    if (!fx) {
      // Pool exhausted — recycle oldest active
      if (this.activeAttackEffects.length === 0) return;
      fx = this.activeAttackEffects.shift()!;
    }
    fx.type = effect.type;
    fx.x = effect.x;
    fx.y = effect.y;
    fx.targetX = effect.targetX;
    fx.targetY = effect.targetY;
    fx.color = effect.color;
    fx.radius = effect.radius;
    fx.life = 0;
    fx.maxLife = effect.type === 'crit_slash' || effect.type === 'meteor' ? 0.36 : 0.28;
    fx.active = true;
    this.activeAttackEffects.push(fx);
  }

  public spawnParticles(worldX: number, worldY: number, color: string, count = 10) {
    if (!this.enableParticles) return;
    const px = worldX * this.tileSize + this.tileSize / 2;
    const py = worldY * this.tileSize + this.tileSize / 2;

    for (let spawned = 0; spawned < count; spawned++) {
      const p = this.freeParticles.pop();
      if (!p) break;
      p.active = true;
      p.x = px;
      p.y = py;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 18 + Math.random() * 14;
      p.color = color;
      p.size = Math.random() * 3 + 1.5;
      this.activeParticles.push(p);
    }
  }

  private drawProceduralMonster(ctx: CanvasRenderingContext2D, monster: Monster, mx: number, my: number, nowSec: number) {
    const scale = Math.max(1, monster.renderScale || (monster.isFloorBoss ? 1.7 : 1));
    const cx = mx + 16;
    const cy = my + 16;
    const bodyColor = monster.color;

    // Fast path for performance preset — skip aura/spikes/polygons
    if (this.simpleEntities) {
      const s = 10 * scale;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
      ctx.fillStyle = '#0a0718';
      ctx.fillRect(cx - s * 0.45, cy - s * 0.45, s * 0.9, s * 0.9);
      ctx.fillStyle = bodyColor;
      ctx.font = `${Math.round(12 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(monster.symbol || '?', cx, cy + 1);
      return;
    }

    const v = monster.visualVariant;
    const secColor = v?.secondaryColor || '#ffffff';
    const auraColor = v?.auraColor || monster.color;
    const tier = v?.tier || 1;
    const shape = v?.bodyShape || (monster.archetype === 'core_synthesizer' ? 'core' : 'hex');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // Evolving Outer Aura Halo on Tier >= 2
    if (tier >= 2 || monster.isFloorBoss) {
      const pulse = 12 + Math.sin(nowSec * 4 + (v?.seed || 1)) * 2 + tier * 0.5;
      ctx.strokeStyle = auraColor;
      ctx.globalAlpha = monster.isFloorBoss ? 0.4 : 0.28;
      ctx.lineWidth = monster.isFloorBoss ? 2.2 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Orbiting Spikes / Nodes based on tier & spikes count
    const spikeCount = v ? Math.min(8, Math.floor(v.spikes / 2) + (tier > 2 ? 2 : 0)) : 0;
    if (spikeCount > 0) {
      const rot = nowSec * (1.2 + tier * 0.3) + (v?.seed || 0);
      ctx.fillStyle = secColor;
      for (let i = 0; i < spikeCount; i++) {
        const ang = rot + (i * Math.PI * 2) / spikeCount;
        const sx = cx + Math.cos(ang) * 13;
        const sy = cy + Math.sin(ang) * 13;
        ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
      }
    }

    ctx.fillStyle = bodyColor;
    if (this.enableGlow) {
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = 6 + tier * 2;
    } else {
      ctx.shadowBlur = 0;
    }

    if (shape === 'titan') {
      ctx.fillRect(mx + 4, my + 5, 24, 22);
      ctx.fillStyle = secColor;
      ctx.fillRect(mx + 2, my + 8, 4, 14);
      ctx.fillRect(mx + 26, my + 8, 4, 14);
      ctx.fillStyle = bodyColor;
    } else {
      const bodyPath = getMonsterBodyPath(shape);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fill(bodyPath);
      ctx.restore();
    }

    // Procedural Armor Plates
    const plates = v?.plates || 1;
    if (plates >= 2) {
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(cx - 8, cy - 8, 16, 16);
    }

    // Crown / Horns on Tier >= 3 or Boss
    if (v?.crown) {
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.moveTo(cx - 7, my + 6);
      ctx.lineTo(cx - 4, my + 1);
      ctx.lineTo(cx, my + 5);
      ctx.lineTo(cx + 4, my + 1);
      ctx.lineTo(cx + 7, my + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Procedural Eyes / Visor
    ctx.shadowBlur = 0;
    const eyeStyle = v?.eyeStyle || 'twin';
    if (eyeStyle === 'visor') {
      ctx.fillStyle = '#0a0718';
      ctx.fillRect(cx - 8, cy - 3, 16, 5);
      ctx.fillStyle = secColor;
      ctx.fillRect(cx - 6, cy - 2, 12, 2);
    } else if (eyeStyle === 'tri') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 6, cy - 2, 3, 3);
      ctx.fillRect(cx + 3, cy - 2, 3, 3);
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(cx - 1.5, cy - 6, 3, 3);
    } else if (eyeStyle === 'halo') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    } else if (eyeStyle === 'single') {
      ctx.fillStyle = '#0a0718';
      ctx.beginPath();
      ctx.arc(cx, cy - 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(cx - 2, cy - 3, 4, 4);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 6, cy - 3, 4, 4);
      ctx.fillRect(cx + 2, cy - 3, 4, 4);
    }

    ctx.restore(); // end boss scale
  }

  private gearColor(item: GameItem | null | undefined, fallback: string): string {
    if (!item) return fallback;
    const style = getRarityStyle(item.rarity);
    return style.tierNumber >= 2 ? style.hex : fallback;
  }

  /**
   * Humanoid operative silhouette — distinct from procedural creature shapes.
   * Layer order: boots → legs → torso → arms/gloves → head/helmet → weapon/offhand.
   * Anim modes: idle breath, walk cycle, attack swing.
   */
  private drawPlayerCharacter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    characterClass: CharacterClass,
    facing: 'up' | 'down' | 'left' | 'right',
    shieldAmount: number,
    equipment?: Player['equipment'],
    label?: string,
    movedLockPip?: boolean,
    anim?: { nowSec: number; moveBlend: number; attackAnim: number }
  ) {
    const classColors: Record<string, { suit: string; skin: string; visor: string; glow: string }> = {
      striker: { suit: '#0e7490', skin: '#fcd9b0', visor: '#ff007f', glow: '#00f0ff' },
      technomancer: { suit: '#6b21a8', skin: '#f5d0c5', visor: '#00f0ff', glow: '#bd00ff' },
      vanguard: { suit: '#a16207', skin: '#e8c4a0', visor: '#00f0ff', glow: '#ffe600' }
    };
    const c = classColors[characterClass] || classColors.striker;
    const eq = equipment;
    const facingLeft = facing === 'left';
    const facingRight = facing === 'right';
    const facingUp = facing === 'up';
    const nowSec = anim?.nowSec ?? 0;
    const moveBlend = Math.max(0, Math.min(1, anim?.moveBlend ?? 0));
    const attackT = Math.max(0, Math.min(1, anim?.attackAnim ?? 0));
    // Peak mid-swing so the whole body reads the strike
    const attackP = 1 - attackT;
    const attackPulse = Math.sin(attackP * Math.PI);
    const idleBob = Math.sin(nowSec * 2.6) * 1.25 * (1 - moveBlend) * (1 - attackPulse * 0.4);
    const walkPhase = nowSec * 13;
    const stride = Math.sin(walkPhase) * 5.8 * moveBlend;
    const strideOpp = Math.sin(walkPhase + Math.PI) * 5.8 * moveBlend;
    const bodyBob = Math.abs(Math.sin(walkPhase)) * 2.6 * moveBlend + idleBob;
    const attackSwing = attackPulse * 14;
    const attackLunge = attackPulse * 8;
    const torsoLean = attackPulse * 0.24 + Math.sin(walkPhase) * 0.05 * moveBlend;
    const shoulderTwist = attackPulse * 3.8;

    // Mirror helper: x relative to tile when facing left
    const mx = (x: number, w = 0) => (facingLeft ? px + 32 - x - w : px + x);
    const faceSign = facingLeft ? -1 : 1;
    const horizSign = facingLeft ? -1 : 1;

    const weaponRarity = eq?.weapon ? getRarityStyle(eq.weapon.rarity) : null;
    const chestHex = this.gearColor(eq?.chest, c.suit);
    const helmHex = this.gearColor(eq?.helmet, '#cbd5e1');
    const gloveHex = this.gearColor(eq?.gloves, '#94a3b8');
    const legHex = this.gearColor(eq?.legs, c.suit);
    const bootHex = this.gearColor(eq?.boots, '#64748b');
    const wepHex = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.hex : '#e2e8f0';
    const offHex = this.gearColor(eq?.offhand, '#38bdf8');

    const by = py - bodyBob;
    const lungeX =
      facingLeft || facingRight ? faceSign * attackLunge : Math.sin(walkPhase) * 1.1 * moveBlend;
    const lungeY = facingUp ? -attackLunge : facing === 'down' ? attackLunge * 0.55 : attackPulse * 1.4;

    // Ground aura (stretches while walking / attacking)
    ctx.fillStyle = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.glowHex : 'rgba(0, 240, 255, 0.16)';
    ctx.beginPath();
    ctx.ellipse(
      px + 16 + lungeX * 0.35,
      py + 30,
      13 + moveBlend * 3 + attackPulse * 4,
      5 + attackPulse,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    if (weaponRarity && weaponRarity.tierNumber >= 3) {
      ctx.strokeStyle = weaponRarity.hex;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (this.enableGlow) {
      ctx.shadowColor = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.hex : c.glow;
      ctx.shadowBlur = weaponRarity && weaponRarity.tierNumber >= 4 ? 12 : 8;
    } else {
      ctx.shadowBlur = 0;
    }

    // Whole-body lean around the feet during attack
    ctx.save();
    ctx.translate(px + 16 + lungeX * 0.35, py + 28);
    ctx.rotate(horizSign * torsoLean * (facingLeft || facingRight ? 1 : 0.4));
    ctx.translate(-(px + 16 + lungeX * 0.35), -(py + 28));

    // --- BOOTS ---
    ctx.fillStyle = eq?.boots ? bootHex : '#475569';
    ctx.fillRect(mx(8, 7) + lungeX * 0.15, by + 26 + stride * 0.55 + lungeY * 0.15, 7, 5);
    ctx.fillRect(mx(17, 7) + lungeX * 0.15, by + 26 + strideOpp * 0.55 + lungeY * 0.15, 7, 5);
    if (eq?.boots) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(mx(8, 7) + lungeX * 0.15, by + 29 + stride * 0.55 + lungeY * 0.15, 7, 2);
      ctx.fillRect(mx(17, 7) + lungeX * 0.15, by + 29 + strideOpp * 0.55 + lungeY * 0.15, 7, 2);
    }

    // --- LEGS ---
    ctx.fillStyle = eq?.legs ? legHex : c.suit;
    ctx.fillRect(mx(9, 6) + lungeX * 0.2 + stride * 0.15, by + 17 + stride * 0.35 + lungeY * 0.2, 6, 10);
    ctx.fillRect(mx(17, 6) + lungeX * 0.2 + strideOpp * 0.15, by + 17 + strideOpp * 0.35 + lungeY * 0.2, 6, 10);
    if (eq?.legs) {
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx(9, 6) + 0.5 + lungeX * 0.2, by + 17.5 + stride * 0.35, 5, 9);
      ctx.strokeRect(mx(17, 6) + 0.5 + lungeX * 0.2, by + 17.5 + strideOpp * 0.35, 5, 9);
    }

    // --- TORSO (undersuit) ---
    ctx.fillStyle = c.suit;
    ctx.fillRect(mx(10, 12) + lungeX + shoulderTwist * 0.15 * horizSign, by + 9 + lungeY, 12, 10);

    // Chest armor plate — large & readable
    const torsoShiftX = lungeX + shoulderTwist * 0.2 * horizSign;
    if (eq?.chest) {
      ctx.fillStyle = chestHex;
      ctx.fillRect(mx(9, 14) + torsoShiftX, by + 9 + lungeY, 14, 11);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(mx(11, 10) + torsoShiftX, by + 11 + lungeY, 10, 3);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = eq.chest && getRarityStyle(eq.chest.rarity).tierNumber >= 4 ? 1.6 : 1.1;
      ctx.strokeRect(mx(9, 14) + 0.5 + torsoShiftX, by + 9.5 + lungeY, 13, 10);
      ctx.fillStyle = chestHex;
      ctx.fillRect(mx(7, 4) + torsoShiftX, by + 9 + lungeY, 4, 4);
      ctx.fillRect(mx(21, 4) + torsoShiftX, by + 9 + lungeY, 4, 4);
    }

    // --- ARMS (full swing on attack / opposite arm counters walk) ---
    const armWalk = Math.sin(walkPhase) * 4.2 * moveBlend;
    const weaponArmY = by + 10 + lungeY - attackSwing * 0.95 - armWalk * 0.45;
    const offArmY = by + 10 + lungeY + armWalk * 0.55 + attackSwing * 0.2;
    const weaponArmX = lungeX - faceSign * (attackSwing * 0.55 + shoulderTwist);
    const offArmX = lungeX + faceSign * attackSwing * 0.12;
    ctx.fillStyle = c.suit;
    ctx.fillRect(mx(5, 5) + weaponArmX, weaponArmY, 5, 9);
    ctx.fillRect(mx(22, 5) + offArmX, offArmY, 5, 9);

    // Gloves / hands — grip anchors for weapon + offhand (must stay in sync)
    const weaponHandX = mx(4, 6) + weaponArmX - faceSign * attackSwing * 0.2;
    const weaponHandY = weaponArmY + 7;
    const offHandX = mx(22, 6) + offArmX;
    const offHandY = offArmY + 7;
    const weaponGripX = weaponHandX + 3;
    const weaponGripY = weaponHandY + 2.5;
    const offGripX = offHandX + 3;
    const offGripY = offHandY + 2.5;

    ctx.fillStyle = eq?.gloves ? gloveHex : c.skin;
    ctx.fillRect(weaponHandX, weaponHandY, 6, 5);
    ctx.fillRect(offHandX, offHandY, 6, 5);
    if (eq?.gloves) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(weaponHandX + 0.5, weaponHandY + 0.5, 5, 4);
      ctx.strokeRect(offHandX + 0.5, offHandY + 0.5, 5, 4);
    }

    // --- HEAD ---
    const headY = by + 5 + lungeY * 0.75 - attackPulse * 1.2;
    const headX = px + 16 + lungeX + shoulderTwist * 0.35 * horizSign;
    ctx.fillStyle = c.skin;
    ctx.beginPath();
    ctx.arc(headX, headY, 5.4, 0, Math.PI * 2);
    ctx.fill();

    if (eq?.helmet) {
      ctx.fillStyle = helmHex;
      ctx.beginPath();
      ctx.ellipse(headX, headY - 0.5, 6.4, 5.6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(headX - 6, headY - 1, 12, 4);
      const ht = getRarityStyle(eq.helmet.rarity).tierNumber;
      ctx.fillStyle = ht >= 3 ? helmHex : '#e2e8f0';
      ctx.fillRect(headX - 1, headY - 6.5, 2, 4);
      if (ht >= 4) {
        ctx.fillRect(headX - 4, headY - 5.5, 2, 3);
        ctx.fillRect(headX + 2, headY - 5.5, 2, 3);
      }
    }

    ctx.fillStyle = c.visor;
    if (facingUp) {
      ctx.fillRect(headX - 4, headY - 2, 8, 2);
    } else if (facingLeft) {
      ctx.fillRect(headX - 6, headY - 1, 5, 2.5);
    } else if (facingRight) {
      ctx.fillRect(headX + 1, headY - 1, 5, 2.5);
    } else {
      ctx.fillRect(headX - 5, headY - 1, 4, 2.5);
      ctx.fillRect(headX + 1, headY - 1, 4, 2.5);
    }

    // --- WEAPON (anchored to weapon-hand grip; swings with the arm) ---
    if (eq?.weapon) {
      const cat = eq.weapon.weaponCategory || 'sword';
      // Walk bob + attack arc both rotate around the grip so the blade never drifts off the hand
      const walkTwist = Math.sin(walkPhase) * 0.12 * moveBlend;
      const attackTwist = faceSign * attackSwing * 0.14;
      ctx.save();
      ctx.translate(weaponGripX, weaponGripY);
      ctx.rotate(walkTwist + attackTwist);
      // Draw relative to grip (0,0). Blade extends "up" from the hand by default.
      const hx = -1.5;
      const hy = -14;
      ctx.fillStyle = wepHex;
      if (cat === 'greatsword') {
        ctx.fillRect(hx - 0.5, hy - 6, 4, 26);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(hx - 1.5, hy + 10, 6, 3);
      } else if (cat === 'staff' || cat === 'focus') {
        ctx.fillRect(hx, hy - 4, 3, 26);
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.arc(hx + 1.5, hy - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (cat === 'pistol') {
        // Sideways grip — barrel points forward along face
        ctx.rotate(faceSign * (Math.PI / 2) * 0.85);
        ctx.fillRect(hx - 1, hy + 6, 10, 4);
        ctx.fillRect(hx + (facingLeft ? -1 : 6), hy + 4, 3, 6);
      } else if (cat === 'daggers') {
        ctx.fillRect(hx + 0.5, hy + 2, 2.5, 14);
        ctx.fillRect(hx + (facingLeft ? 4 : -3), hy + 4, 2.5, 12);
      } else if (cat === 'katana') {
        ctx.fillRect(hx + 0.25, hy - 2, 2.5, 22);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(hx - 0.75, hy + 12, 4.5, 2);
      } else {
        ctx.fillRect(hx, hy, 3, 20);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(hx - 1, hy + 12, 5, 2);
      }
      if (weaponRarity && weaponRarity.tierNumber >= 3) {
        ctx.fillStyle = weaponRarity.hex;
        ctx.fillRect(hx, hy - 2, 3, 3);
      }
      ctx.restore();
    }

    // --- OFFHAND (anchored to opposite hand) ---
    if (eq?.offhand) {
      const offCat = eq.offhand.weaponCategory;
      const ox = offGripX - 3;
      const oy = offGripY - 4;
      ctx.fillStyle = offHex;
      if (offCat === 'shield') {
        ctx.beginPath();
        ctx.moveTo(ox + 3, oy - 2);
        ctx.lineTo(ox + 8, oy);
        ctx.lineTo(ox + 8, oy + 9);
        ctx.lineTo(ox + 3, oy + 11);
        ctx.lineTo(ox, oy + 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (offCat === 'focus') {
        ctx.beginPath();
        ctx.arc(offGripX, offGripY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(ox + 1, oy, 3, 12);
      }
    }

    if (shieldAmount > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + 16 + lungeX, by + 16 + lungeY, 17, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore(); // end whole-body lean
    ctx.shadowBlur = 0;

    if (label) {
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#060410';
      ctx.fillText(label, px + 17 + lungeX, by - 5);
      ctx.fillStyle = movedLockPip ? '#10b981' : '#f59e0b';
      ctx.fillText(label, px + 16 + lungeX, by - 6);
    }
  }

  public render(
    dungeon: DungeonState,
    player: Player,
    floatingTexts: { text: string; x: number; y: number; color: string; life?: number; isCrit?: boolean }[],
    rawDt: number,
    remotePlayers?: CoopRemoteRenderPlayer[],
    hoveredTile?: { x: number; y: number } | null
  ) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const nowSec = performance.now() / 1000;

    // Hitstop: brief FX freeze only — camera MUST keep following free-move player
    // (freezing cam while the body keeps moving felt like broken controls).
    const isFrozen = this.hitstopTimer > 0;
    if (isFrozen) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - rawDt);
    }
    const simDt = isFrozen ? 0 : rawDt;

    const targetCamX = player.x * this.tileSize + this.tileSize / 2 - width / 2;
    const targetCamY = player.y * this.tileSize + this.tileSize / 2 - height / 2;
    // Snappier follow so movement doesn't feel laggy behind the camera
    const camLerp = isFrozen ? 0.42 : 0.28;
    this.cameraX += (targetCamX - this.cameraX) * camLerp;
    this.cameraY += (targetCamY - this.cameraY) * camLerp;

    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (isFrozen) {
      // Light micro-vibration (not a full freeze-frame of the world)
      shakeOffsetX = (Math.random() * 2 - 1) * 2.2;
      shakeOffsetY = (Math.random() * 2 - 1) * 2.2;
    } else if (this.trauma > 0) {
      const shakeMag = this.trauma * this.trauma * 14;
      shakeOffsetX = (Math.random() * 2 - 1) * shakeMag;
      shakeOffsetY = (Math.random() * 2 - 1) * shakeMag;
      this.trauma = Math.max(0, this.trauma - simDt * 1.5);
    }

    const theme = getFloorVisualTheme(dungeon.floor || 1);
    const pulse = mapPulseAmount(nowSec, dungeon.floor || 1);
    const [pr, pg, pb] = theme.pulseRgb;

    ctx.save();
    ctx.fillStyle = theme.void;
    ctx.fillRect(0, 0, width, height);

    ctx.translate(-Math.floor(this.cameraX + shakeOffsetX), -Math.floor(this.cameraY + shakeOffsetY));

    const startTileX = Math.max(0, Math.floor((this.cameraX - 40) / this.tileSize));
    const endTileX = Math.min(dungeon.width, Math.ceil((this.cameraX + width + 40) / this.tileSize));
    const startTileY = Math.max(0, Math.floor((this.cameraY - 40) / this.tileSize));
    const endTileY = Math.min(dungeon.height, Math.ceil((this.cameraY + height + 40) / this.tileSize));

    // 1. RENDER TILES — fills only (no per-tile strokeRect; that was the #1 FPS killer)
    const detail = this.detailTiles && !this.simpleEntities;
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = dungeon.tiles[y]?.[x];
        if (!tile || !tile.explored) continue;

        const screenX = x * this.tileSize;
        const screenY = y * this.tileSize;
        const isLit = tile.visible;

        if (tile.type === 'wall') {
          ctx.fillStyle = isLit ? theme.wallLit : theme.wallDark;
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          if (detail) {
            ctx.fillStyle = isLit ? theme.wallTrim : theme.wallLit;
            ctx.fillRect(screenX, screenY, this.tileSize, 3);
          }
        } else {
          ctx.fillStyle = isLit ? theme.floorLit : theme.floorDark;
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

          // Soft map pulse — breathing glow on walkable / special cells
          if (isLit && tile.walkable) {
            const cellPulse = pulse * (0.85 + 0.15 * Math.sin(nowSec * 2.4 + x * 0.35 + y * 0.28));
            ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.045 + cellPulse * 0.07})`;
            ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          }

          if (tile.type === 'stairs_down') {
            const locked = !!dungeon.stairsLocked;
            ctx.fillStyle = isLit
              ? locked
                ? '#4a1528'
                : theme.accent
              : locked
                ? '#2a0c16'
                : '#007788';
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = theme.floorDark;
            ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);
            if (detail) {
              ctx.fillStyle = locked
                ? isLit
                  ? '#ff6688'
                  : '#884455'
                : isLit
                  ? '#ffe600'
                  : '#887700';
              ctx.font = '14px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(locked ? '✕' : '▼', screenX + 16, screenY + 16);
            }
          } else if (tile.type === 'checkpoint') {
            const cpActive = !!tile.checkpointActivated;
            const cpColor = cpActive ? '#10b981' : '#f59e0b';
            ctx.fillStyle = isLit
              ? cpActive
                ? 'rgba(16,185,129,0.25)'
                : 'rgba(245,158,11,0.22)'
              : 'rgba(16,185,129,0.1)';
            ctx.fillRect(screenX + 6, screenY + 6, 20, 20);
            ctx.fillStyle = isLit ? cpColor : '#047857';
            if (detail) {
              ctx.font = 'bold 13px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('◈', screenX + 16, screenY + 16);
            } else {
              ctx.fillRect(screenX + 12, screenY + 12, 8, 8);
            }
          } else if (tile.type === 'chest') {
            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.fillRect(screenX + 6, screenY + 8, this.tileSize - 12, this.tileSize - 14);
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(screenX + 10, screenY + 6, this.tileSize - 20, 4);
          } else if (tile.type === 'shrine') {
            ctx.fillStyle = isLit ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 240, 255, 0.1)';
            ctx.fillRect(screenX + 6, screenY + 6, 20, 20);
            if (detail) {
              ctx.fillStyle = isLit ? '#00f0ff' : '#008899';
              ctx.font = '16px monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⚡', screenX + 16, screenY + 16);
            }
          } else if (tile.type === 'shop') {
            ctx.fillStyle = isLit ? 'rgba(255, 0, 170, 0.28)' : 'rgba(255, 0, 170, 0.12)';
            ctx.fillRect(screenX + 4, screenY + 4, 24, 24);
            ctx.fillStyle = isLit ? '#c026d3' : '#6b21a8';
            ctx.fillRect(screenX + 9, screenY + 14, 14, 13);
            ctx.fillStyle = isLit ? '#fde047' : '#854d0e';
            ctx.fillRect(screenX + 11, screenY + 7, 10, 8);
            ctx.fillStyle = isLit ? '#00f0ff' : '#0891b2';
            ctx.fillRect(screenX + 13, screenY + 10, 6, 2);
          } else if (tile.type === 'pit') {
            ctx.fillStyle = '#020208';
            ctx.fillRect(screenX + 3, screenY + 3, this.tileSize - 6, this.tileSize - 6);
            ctx.strokeStyle = isLit ? `rgba(${pr},${pg},${pb},${0.35 + pulse * 0.35})` : 'rgba(80,80,120,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX + 5, screenY + 5, this.tileSize - 10, this.tileSize - 10);
          } else if (tile.type === 'pit_filled') {
            ctx.fillStyle = isLit ? '#5b4630' : '#3a2e20';
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = isLit ? '#8b6914' : '#5a4510';
            ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);
          } else if (tile.type === 'pressure_plate') {
            const glow = 0.25 + pulse * 0.35;
            ctx.fillStyle = isLit ? `rgba(${pr},${pg},${pb},${glow})` : 'rgba(80,80,100,0.2)';
            ctx.fillRect(screenX + 5, screenY + 5, this.tileSize - 10, this.tileSize - 10);
            ctx.strokeStyle = theme.accent;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(screenX + 7, screenY + 7, this.tileSize - 14, this.tileSize - 14);
          } else if (tile.type === 'gate_closed') {
            ctx.fillStyle = isLit ? theme.wallTrim : theme.wallLit;
            ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.fillStyle = isLit ? `rgba(${pr},${pg},${pb},0.45)` : 'rgba(100,100,140,0.25)';
            ctx.fillRect(screenX + 10, screenY + 4, 4, this.tileSize - 8);
            ctx.fillRect(screenX + 18, screenY + 4, 4, this.tileSize - 8);
          } else if (tile.type === 'gate_open') {
            ctx.fillStyle = isLit ? `rgba(${pr},${pg},${pb},0.12)` : 'rgba(60,60,90,0.1)';
            ctx.fillRect(screenX + 2, screenY + 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = isLit ? theme.accent : '#445';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
          } else if (tile.hazard && isLit) {
            ctx.fillStyle = 'rgba(255, 0, 85, 0.35)';
            ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
          }
        }

        if (!isLit) {
          ctx.fillStyle = 'rgba(8, 6, 20, 0.55)';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
      }
    }

    // 1a. Pushable crates — muted debris look (no neon glow); skip broken
    if (dungeon.crates && dungeon.crates.length) {
      for (const crate of dungeon.crates) {
        if (crate.broken) continue;
        const tx = Math.floor(crate.x);
        const ty = Math.floor(crate.y);
        const tile = dungeon.tiles[ty]?.[tx];
        if (!tile || !tile.explored) continue;
        const screenX = tx * this.tileSize;
        const screenY = ty * this.tileSize;
        // Blend into floor palette so crates read as scenery until inspected
        ctx.fillStyle = tile.visible ? '#3a3228' : '#1e1a14';
        ctx.fillRect(screenX + 6, screenY + 7, this.tileSize - 12, this.tileSize - 13);
        ctx.fillStyle = tile.visible ? '#524636' : '#2a241c';
        ctx.fillRect(screenX + 8, screenY + 9, this.tileSize - 16, 3);
        ctx.fillRect(screenX + 8, screenY + 16, this.tileSize - 16, 3);
        if (tile.visible && crate.hp < crate.maxHp) {
          const pct = Math.max(0, crate.hp / crate.maxHp);
          ctx.fillStyle = '#1a1510';
          ctx.fillRect(screenX + 8, screenY + 4, this.tileSize - 16, 2);
          ctx.fillStyle = '#a67c52';
          ctx.fillRect(screenX + 8, screenY + 4, (this.tileSize - 16) * pct, 2);
        }
      }
    }

    // 1b. RENDER GROUND COINS — viewport-culled, no glow/text in simple mode
    if (dungeon.groundCoins) {
      const camL = this.cameraX - 16;
      const camT = this.cameraY - 16;
      const camR = this.cameraX + width + 16;
      const camB = this.cameraY + height + 16;
      for (const coin of dungeon.groundCoins) {
        const wx = coin.x * this.tileSize;
        const wy = coin.y * this.tileSize;
        if (wx < camL || wy < camT || wx > camR || wy > camB) continue;
        const tile = dungeon.tiles[coin.y]?.[coin.x];
        if (!tile || !tile.visible) continue;
        const cx = wx + 16;
        const cy = wy + 16 + (this.simpleEntities ? 0 : Math.sin(nowSec * 5 + coin.x) * 2);
        const coinColor =
          coin.tier === 'quantum'
            ? '#00f0ff'
            : coin.tier === 'gold'
            ? '#facc15'
            : coin.tier === 'silver'
            ? '#e2e8f0'
            : '#d97706';

        ctx.fillStyle = coinColor;
        if (this.simpleEntities) {
          ctx.fillRect(cx - 5, cy - 5, 10, 10);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 1c. RENDER FLOATING SKULL & LOOT BAGS (Death Drops)
    // Always draw on integer tile — continuous free-move coords must be floored or tiles[y] is undefined
    if (dungeon.deathDrops && dungeon.deathDrops.length > 0) {
      for (const drop of dungeon.deathDrops) {
        const tx = Math.floor(drop.x);
        const ty = Math.floor(drop.y);
        const tile = dungeon.tiles[ty]?.[tx];
        if (!tile) continue;

        const baseX = tx * this.tileSize + 16;
        const baseY = ty * this.tileSize + 16;
        const bobY = baseY - 4 + Math.sin(nowSec * 3.6 + tx) * 3.5;
        const pulse = 0.65 + Math.sin(nowSec * 5) * 0.25;
        const isLit = !!(tile.visible || tile.explored);

        ctx.save();
        // Ground spectral aura ring — large so it reads on fogged tiles too
        ctx.fillStyle = isLit ? `rgba(255, 0, 102, ${0.28 * pulse})` : 'rgba(255, 0, 102, 0.16)';
        ctx.beginPath();
        ctx.ellipse(baseX, baseY + 9, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Loot pouch below floating skull
        ctx.fillStyle = isLit ? '#f59e0b' : '#b45309';
        ctx.beginPath();
        ctx.arc(baseX, baseY + 6, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(baseX - 3, baseY + 3, 6, 3);

        // Floating Skull emblem
        if (this.enableGlow) {
          ctx.shadowColor = '#ff007f';
          ctx.shadowBlur = isLit ? 14 : 8;
        }
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', baseX, bobY);

        ctx.shadowBlur = 0;
        ctx.font = 'bold 8px ui-monospace, monospace';
        const tag = drop.ownerName ? `${drop.ownerName.slice(0, 8)} ☠` : 'LOOT ☠';
        ctx.fillStyle = '#060410';
        ctx.fillText(tag, baseX + 1, bobY - 14);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(tag, baseX, bobY - 15);
        ctx.restore();
      }
    }

    // 2. RENDER MONSTERS — collect visible, sort by fill color to cut style thrashing
    const visibleMonsters: Monster[] = [];
    for (const monster of dungeon.monsters) {
      const mTileX = Math.floor(monster.x + 0.41);
      const mTileY = Math.floor(monster.y + 0.41);
      if (!dungeon.tiles[mTileY]?.[mTileX]?.visible) continue;
      visibleMonsters.push(monster);
    }
    visibleMonsters.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0));

    for (const monster of visibleMonsters) {
      const mx = monster.x * this.tileSize;
      const my = monster.y * this.tileSize;

      if (monster.windupTurn && monster.telegraphDirection) {
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx + 16, my + 16);
        ctx.lineTo(
          mx + 16 + monster.telegraphDirection.dx * this.tileSize * 2,
          my + 16 + monster.telegraphDirection.dy * this.tileSize * 2
        );
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
        ctx.fillRect(mx - 2, my - 2, this.tileSize + 4, this.tileSize + 4);
      }

      this.drawProceduralMonster(ctx, monster, mx, my, nowSec);

      // Monster HP Mini-bar (skip expensive text labels in simple mode)
      const hpPercent = Math.max(0, monster.hp / monster.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(mx + 2, my - 6, this.tileSize - 4, 4);
      ctx.fillStyle = hpPercent > 0.4 ? '#00f0ff' : '#ff0055';
      ctx.fillRect(mx + 2, my - 6, (this.tileSize - 4) * hpPercent, 4);

      if (!this.simpleEntities) {
        ctx.font = 'bold 8px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`Lv.${monster.level || 1}`, mx + 16, my - 10);
        if (monster.burnTurns && monster.burnTurns > 0) {
          ctx.font = '10px monospace';
          ctx.fillText('🔥', mx + this.tileSize - 4, my + 4);
        }
      }
    }

    // 2b. RANGED TARGETING RETICLE & RANGE INDICATOR
    if (hoveredTile) {
      const weaponRange = Math.max(1, Math.min(5, player.equipment.weapon?.attackRange || 1));
      const pTileX = Math.floor(player.x + 0.41);
      const pTileY = Math.floor(player.y + 0.41);
      const dist = Math.max(Math.abs(hoveredTile.x - pTileX), Math.abs(hoveredTile.y - pTileY));
      const hoveredMonster = dungeon.monsters.find(m => {
        const mx = Math.floor(m.x + 0.41);
        const my = Math.floor(m.y + 0.41);
        return mx === hoveredTile.x && my === hoveredTile.y && dungeon.tiles[my]?.[mx]?.visible;
      });
      if (hoveredMonster && dist >= 1 && dist <= weaponRange) {
        const pxCenter = player.x * this.tileSize + 16;
        const pyCenter = player.y * this.tileSize + 16;
        const txCenter = hoveredTile.x * this.tileSize + 16;
        const tyCenter = hoveredTile.y * this.tileSize + 16;

        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pxCenter, pyCenter);
        ctx.lineTo(txCenter, tyCenter);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.strokeRect(hoveredTile.x * this.tileSize + 1, hoveredTile.y * this.tileSize + 1, this.tileSize - 2, this.tileSize - 2);
        ctx.restore();
      }
    }

    // Local movement / attack animation clocks
    if (!isFrozen) {
      if (Number.isFinite(this.prevPlayerX)) {
        const movedDist = Math.hypot(player.x - this.prevPlayerX, player.y - this.prevPlayerY);
        if (movedDist > 0.0015) {
          this.moveBlend = Math.min(1, this.moveBlend + simDt * 9);
        } else {
          this.moveBlend = Math.max(0, this.moveBlend - simDt * 7);
        }
      }
      this.prevPlayerX = player.x;
      this.prevPlayerY = player.y;
      if (this.attackAnim > 0) this.attackAnim = Math.max(0, this.attackAnim - simDt / 0.45);
      if (this.damageVignette > 0) this.damageVignette = Math.max(0, this.damageVignette - simDt * 1.65);
    }

    // 3. RENDER REMOTE CO-OP PLAYERS (if in 3P Group Session)
    if (remotePlayers && remotePlayers.length > 0) {
      for (const rp of remotePlayers) {
        if (!rp.alive) continue;
        const prev = this.remoteMove.get(rp.playerId) || { x: rp.x, y: rp.y, blend: 0 };
        let blend = prev.blend;
        if (!isFrozen) {
          const md = Math.hypot(rp.x - prev.x, rp.y - prev.y);
          blend = md > 0.0015 ? Math.min(1, blend + simDt * 9) : Math.max(0, blend - simDt * 7);
          this.remoteMove.set(rp.playerId, { x: rp.x, y: rp.y, blend });
        }
        const rpx = rp.x * this.tileSize;
        const rpy = rp.y * this.tileSize;
        this.drawPlayerCharacter(
          ctx,
          rpx,
          rpy,
          rp.characterClass,
          rp.facing,
          0,
          undefined,
          rp.username,
          rp.movedThisTurn,
          { nowSec, moveBlend: blend, attackAnim: 0 }
        );
      }
    }

    // 3b. RENDER LOCAL PLAYER CHARACTER
    const px = player.x * this.tileSize;
    const py = player.y * this.tileSize;
    this.drawPlayerCharacter(
      ctx,
      px,
      py,
      player.characterClass,
      player.facing,
      player.buffs.shieldAmount,
      player.equipment,
      undefined,
      undefined,
      { nowSec, moveBlend: this.moveBlend, attackAnim: this.attackAnim }
    );

    // 4. RENDER ATTACK & SKILL VISUAL EFFECTS (fixed pool, max 32)
    for (let i = this.activeAttackEffects.length - 1; i >= 0; i--) {
      const fx = this.activeAttackEffects[i];
      if (!isFrozen) {
        fx.life += simDt;
      }
      if (fx.life >= fx.maxLife) {
        fx.active = false;
        this.activeAttackEffects.splice(i, 1);
        this.freeAttackEffects.push(fx);
        continue;
      }
      // Camera culling — skip off-screen FX
      const worldPx = fx.x * this.tileSize;
      const worldPy = fx.y * this.tileSize;
      if (
        worldPx < this.cameraX - 64 ||
        worldPx > this.cameraX + width + 64 ||
        worldPy < this.cameraY - 64 ||
        worldPy > this.cameraY + height + 64
      ) {
        continue;
      }
      const p = fx.life / fx.maxLife;
      const alpha = 1 - p;
      const sx = worldPx + 16;
      const sy = worldPy + 16;
      const tx = (fx.targetX ?? fx.x) * this.tileSize + 16;
      const ty = (fx.targetY ?? fx.y) * this.tileSize + 16;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (this.enableGlow) {
        ctx.shadowColor = fx.color;
        ctx.shadowBlur = 16;
      }

      if (fx.type === 'slash' || fx.type === 'crit_slash') {
        const radius = (fx.radius || 1) * 18;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = fx.type === 'crit_slash' ? 5 : 3;
        const angle = Math.atan2(ty - sy, tx - sx);
        ctx.beginPath();
        ctx.arc(tx, ty, radius * (0.6 + p * 0.5), angle - 1.1, angle + 1.1);
        ctx.stroke();

        if (fx.type === 'crit_slash') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tx - 16, ty - 16);
          ctx.lineTo(tx + 16, ty + 16);
          ctx.moveTo(tx + 16, ty - 16);
          ctx.lineTo(tx - 16, ty + 16);
          ctx.stroke();
        }
      } else if (fx.type === 'beam' || fx.type === 'lightning') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = fx.type === 'beam' ? 5 * (1 - p * 0.5) : 3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        if (fx.type === 'lightning') {
          const mx1 = (sx + tx) / 2 + (Math.random() - 0.5) * 16;
          const my1 = (sy + ty) / 2 + (Math.random() - 0.5) * 16;
          ctx.lineTo(mx1, my1);
        }
        ctx.lineTo(tx, ty);
        ctx.stroke();
      } else if (fx.type === 'meteor') {
        const rad = (fx.radius || 1.6) * this.tileSize * (0.4 + p * 0.8);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.beginPath();
        ctx.arc(tx, ty, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        const maxRad = (fx.radius || 1.5) * this.tileSize;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3.5 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(4, maxRad * p), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 5. RENDER PARTICLES — only active list
    if (this.enableParticles) {
      for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const p = this.activeParticles[i];
        if (!isFrozen) {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          if (p.life >= p.maxLife) {
            p.active = false;
            this.activeParticles.splice(i, 1);
            this.freeParticles.push(p);
            continue;
          }
        }
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      }
    }

    // 6. RENDER FLOATING COMBAT TEXT
    for (const ft of floatingTexts) {
      const life = ft.life || 0;
      const progress = Math.min(1.0, life / 40);
      const alpha = Math.max(0, 1.0 - progress * progress);
      const isCrit = !!ft.isCrit || ft.text.includes('CRIT');

      const tx = ft.x * this.tileSize + 16;
      const ty = ft.y * this.tileSize - (isCrit ? 10 + life * 1.8 : life * 1.2);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isCrit) {
        let scale = 1.0;
        if (progress < 0.2) scale = 0.8 + (progress / 0.2) * 1.4;
        else scale = 2.2 - (progress - 0.2) * 0.8;

        const critShake = progress < 0.3 ? (Math.random() * 2 - 1) * 2.5 : 0;
        ctx.translate(critShake, 0);
        ctx.scale(scale, scale);

        const pulsePhase = Math.sin(life * 0.5 + Date.now() * 0.01);
        let pulseColor = '#ffe600';
        let glowColor = '#ff007f';
        if (pulsePhase > 0.4) {
          pulseColor = '#ff007f';
          glowColor = '#00f0ff';
        } else if (pulsePhase < -0.4) {
          pulseColor = '#00f0ff';
          glowColor = '#ffe600';
        }

        if (this.enableGlow) {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 18;
        }
        ctx.font = '900 16px ui-monospace, SFMono-Regular, monospace';
        ctx.strokeStyle = '#05030a';
        ctx.lineWidth = 4.5;
        ctx.lineJoin = 'miter';
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = pulseColor;
        ctx.fillText(ft.text, 0, 0);

        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⚡ CRITICAL ⚡', 0, -14);
      } else {
        ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
        if (this.enableGlow) {
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
        }
        ctx.strokeStyle = '#0a0718';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
      }

      ctx.restore();
    }

    ctx.restore();

    // Brief subtle hit-flash frame on freeze impact
    if (isFrozen) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(0, 0, width, height);
    }

    // Player-hurt fear vignette — border-only when postFX off; full radial when on
    if (this.damageVignette > 0.01) {
      const v = this.damageVignette;
      const pulse = 0.75 + Math.sin(nowSec * 28) * 0.25;
      const border = Math.max(8, Math.min(width, height) * 0.04) * (0.65 + v * 0.55);
      ctx.fillStyle = `rgba(255, 20, 40, ${0.4 * v * pulse})`;
      ctx.fillRect(0, 0, width, border);
      ctx.fillRect(0, height - border, width, border);
      ctx.fillRect(0, 0, border, height);
      ctx.fillRect(width - border, 0, border, height);
      if (this.enablePostFx) {
        const edge = Math.min(width, height) * (0.45 - v * 0.06);
        const fear = ctx.createRadialGradient(
          width / 2,
          height / 2,
          edge,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.7
        );
        fear.addColorStop(0, 'rgba(120, 0, 0, 0)');
        fear.addColorStop(1, `rgba(200, 0, 30, ${0.5 * v})`);
        ctx.fillStyle = fear;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 7. CRT overlay — pattern cached by canvas size key
    if (this.enableScanlines) {
      const cacheKey = `${width}x${height}`;
      if (!this.scanlinePattern || this.scanlineCacheKey !== cacheKey) {
        const off = document.createElement('canvas');
        off.width = 4;
        off.height = 4;
        const octx = off.getContext('2d');
        if (octx) {
          octx.fillStyle = 'rgba(0,0,0,0.22)';
          octx.fillRect(0, 0, 4, 1);
          this.scanlinePattern = ctx.createPattern(off, 'repeat');
          this.scanlineCacheKey = cacheKey;
        }
      }
      if (this.scanlinePattern) {
        ctx.fillStyle = this.scanlinePattern;
        ctx.fillRect(0, 0, width, height);
      }
      if (this.enablePostFx) {
        const grad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          width * 0.35,
          width / 2,
          height / 2,
          width * 0.7
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }
}
