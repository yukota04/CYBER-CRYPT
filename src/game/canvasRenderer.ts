import { AttackEffect, CharacterClass, DungeonState, Monster, Player } from './types';
import { getRarityStyle } from './rarity';

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

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize = 32;
  private cameraX = 0;
  private cameraY = 0;
  private trauma = 0;
  private hitstopTimer = 0;
  private particles: Particle[] = [];
  private maxParticles = 160;
  private attackEffects: VisualAttackEffect[] = [];
  public enableScanlines = true;
  public enableGlow = true;
  public enableParticles = true;

  public applyPerformanceOptions(opts: {
    enableScanlines?: boolean;
    enableGlow?: boolean;
    enableParticles?: boolean;
  }) {
    if (typeof opts.enableScanlines === 'boolean') this.enableScanlines = opts.enableScanlines;
    if (typeof opts.enableGlow === 'boolean') this.enableGlow = opts.enableGlow;
    if (typeof opts.enableParticles === 'boolean') {
      this.enableParticles = opts.enableParticles;
      if (!opts.enableParticles) {
        for (const p of this.particles) p.active = false;
      }
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
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
  }

  public addTrauma(amount: number) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public triggerHitstop(seconds: number) {
    if (seconds <= 0) return;
    const clamped = Math.max(0.03, Math.min(0.25, seconds));
    this.hitstopTimer = Math.max(this.hitstopTimer, clamped);
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
    this.attackEffects.push({
      ...effect,
      life: 0,
      maxLife: effect.type === 'crit_slash' || effect.type === 'meteor' ? 0.36 : 0.28
    });
  }

  public spawnParticles(worldX: number, worldY: number, color: string, count = 10) {
    if (!this.enableParticles) return;
    let spawned = 0;
    const px = worldX * this.tileSize + this.tileSize / 2;
    const py = worldY * this.tileSize + this.tileSize / 2;

    for (const p of this.particles) {
      if (!p.active) {
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
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private drawProceduralMonster(ctx: CanvasRenderingContext2D, monster: Monster, mx: number, my: number, nowSec: number) {
    const cx = mx + 16;
    const cy = my + 16;
    const v = monster.visualVariant;
    const bodyColor = monster.color;
    const secColor = v?.secondaryColor || '#ffffff';
    const auraColor = v?.auraColor || monster.color;
    const tier = v?.tier || 1;
    const shape = v?.bodyShape || (monster.archetype === 'core_synthesizer' ? 'core' : 'hex');

    // Evolving Outer Aura Halo on Tier >= 2
    if (tier >= 2) {
      const pulse = 12 + Math.sin(nowSec * 4 + (v?.seed || 1)) * 2 + tier * 0.5;
      ctx.strokeStyle = auraColor;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.5;
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

    if (shape === 'diamond' || shape === 'core') {
      const r = shape === 'core' ? 14 : 11;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'hex' || shape === 'octo') {
      const sides = shape === 'octo' ? 8 : 6;
      const r = 11.5;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const ang = (i * Math.PI * 2) / sides - Math.PI / 2;
        const vx = cx + Math.cos(ang) * r;
        const vy = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'spiked') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI * 2) / 10;
        const r = i % 2 === 0 ? 13.5 : 7.5;
        const vx = cx + Math.cos(ang) * r;
        const vy = cy + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (shape === 'serpent') {
      ctx.beginPath();
      ctx.moveTo(cx, my + 4);
      ctx.lineTo(mx + 27, my + 14);
      ctx.lineTo(mx + 22, my + 27);
      ctx.lineTo(mx + 10, my + 27);
      ctx.lineTo(mx + 5, my + 14);
      ctx.closePath();
      ctx.fill();
    } else {
      // Titan chassis
      ctx.fillRect(mx + 4, my + 5, 24, 22);
      ctx.fillStyle = secColor;
      ctx.fillRect(mx + 2, my + 8, 4, 14);
      ctx.fillRect(mx + 26, my + 8, 4, 14);
      ctx.fillStyle = bodyColor;
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
  }

  private drawPlayerCharacter(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    characterClass: CharacterClass,
    facing: 'up' | 'down' | 'left' | 'right',
    shieldAmount: number,
    equipment?: Player['equipment'],
    label?: string,
    movedLockPip?: boolean
  ) {
    const classColors: Record<string, { body: string; visor: string; glow: string }> = {
      striker: { body: '#00f0ff', visor: '#ff007f', glow: '#00f0ff' },
      technomancer: { body: '#bd00ff', visor: '#00f0ff', glow: '#bd00ff' },
      vanguard: { body: '#ffe600', visor: '#00f0ff', glow: '#ffe600' }
    };
    const c = classColors[characterClass] || classColors.striker;

    const weaponRarity = equipment?.weapon ? getRarityStyle(equipment.weapon.rarity) : null;
    const armorRarity = equipment?.chest ? getRarityStyle(equipment.chest.rarity) : null;

    // Ground aura (tinted by weapon rarity if Rare+!)
    ctx.fillStyle = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.glowHex : 'rgba(0, 240, 255, 0.16)';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 26, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (weaponRarity && weaponRarity.tierNumber >= 3) {
      ctx.strokeStyle = weaponRarity.hex;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (this.enableGlow) {
      ctx.shadowColor = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.hex : c.glow;
      ctx.shadowBlur = weaponRarity && weaponRarity.tierNumber >= 4 ? 14 : 10;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = c.body;

    // Helmet crest if helmet equipped
    if (equipment?.helmet) {
      const helmRarity = getRarityStyle(equipment.helmet.rarity);
      ctx.fillStyle = helmRarity.tierNumber >= 2 ? helmRarity.hex : '#e2e8f0';
      ctx.fillRect(px + 9, py + 4, 14, 4);
      ctx.fillStyle = c.body;
    }

    // Torso / armor
    ctx.fillRect(px + 7, py + 7, 18, 18);

    // Chest armor trim by rarity
    if (equipment?.chest) {
      ctx.strokeStyle = armorRarity && armorRarity.tierNumber >= 2 ? armorRarity.hex : '#ffffff';
      ctx.lineWidth = armorRarity && armorRarity.tierNumber >= 4 ? 1.8 : 1.2;
      ctx.strokeRect(px + 8, py + 14, 16, 9);
    }

    // Weapon / Offhand silhouette accents tinted by weapon rarity
    if (equipment?.weapon) {
      const wepHex = weaponRarity && weaponRarity.tierNumber >= 2 ? weaponRarity.hex : '#00f0ff';
      ctx.fillStyle = wepHex;
      if (equipment.weapon.weaponCategory === 'greatsword') {
        ctx.fillRect(px + 25, py + 2, 4, 22);
      } else if (equipment.weapon.weaponCategory === 'staff') {
        ctx.fillStyle = wepHex;
        ctx.fillRect(px + 25, py + 4, 3, 22);
        ctx.fillStyle = '#ffe600';
        ctx.fillRect(px + 24, py + 2, 5, 4);
      } else {
        ctx.fillRect(px + 25, py + 8, 3, 14);
      }
    }

    if (equipment?.offhand) {
      const offRarity = getRarityStyle(equipment.offhand.rarity);
      ctx.fillStyle = offRarity.tierNumber >= 2 ? offRarity.hex : '#38bdf8';
      ctx.fillRect(px + 2, py + 10, 4, 13);
    }

    // Visor
    ctx.fillStyle = c.visor;
    if (facing === 'down') ctx.fillRect(px + 9, py + 12, 14, 4);
    else if (facing === 'up') ctx.fillRect(px + 9, py + 8, 14, 3);
    else if (facing === 'left') ctx.fillRect(px + 7, py + 12, 6, 4);
    else ctx.fillRect(px + 19, py + 12, 6, 4);

    if (shieldAmount > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    if (label) {
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#060410';
      ctx.fillText(label, px + 17, py - 5);
      ctx.fillStyle = movedLockPip ? '#10b981' : '#f59e0b';
      ctx.fillText(label, px + 16, py - 6);
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

    // Hitstop Freeze-Frame Handling (0.03s - 0.25s)
    const isFrozen = this.hitstopTimer > 0;
    if (isFrozen) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - rawDt);
    }
    const simDt = isFrozen ? 0 : rawDt;

    if (!isFrozen) {
      const targetCamX = player.x * this.tileSize + this.tileSize / 2 - width / 2;
      const targetCamY = player.y * this.tileSize + this.tileSize / 2 - height / 2;
      this.cameraX += (targetCamX - this.cameraX) * 0.18;
      this.cameraY += (targetCamY - this.cameraY) * 0.18;
    }

    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (isFrozen) {
      // Crisp micro-vibration during freeze frames for tactile impact punch
      shakeOffsetX = (Math.random() * 2 - 1) * 3.5;
      shakeOffsetY = (Math.random() * 2 - 1) * 3.5;
    } else if (this.trauma > 0) {
      const shakeMag = this.trauma * this.trauma * 14;
      shakeOffsetX = (Math.random() * 2 - 1) * shakeMag;
      shakeOffsetY = (Math.random() * 2 - 1) * shakeMag;
      this.trauma = Math.max(0, this.trauma - simDt * 1.5);
    }

    ctx.save();
    ctx.fillStyle = '#080614';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(-Math.floor(this.cameraX + shakeOffsetX), -Math.floor(this.cameraY + shakeOffsetY));

    const startTileX = Math.max(0, Math.floor((this.cameraX - 40) / this.tileSize));
    const endTileX = Math.min(dungeon.width, Math.ceil((this.cameraX + width + 40) / this.tileSize));
    const startTileY = Math.max(0, Math.floor((this.cameraY - 40) / this.tileSize));
    const endTileY = Math.min(dungeon.height, Math.ceil((this.cameraY + height + 40) / this.tileSize));

    // 1. RENDER TILES
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = dungeon.tiles[y]?.[x];
        if (!tile || !tile.explored) continue;

        const screenX = x * this.tileSize;
        const screenY = y * this.tileSize;
        const isLit = tile.visible;

        if (tile.type === 'wall') {
          ctx.fillStyle = isLit ? '#1b1238' : '#0e0920';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          ctx.fillStyle = isLit ? '#492c85' : '#231444';
          ctx.fillRect(screenX, screenY, this.tileSize, 3);
          ctx.strokeStyle = isLit ? 'rgba(168, 85, 247, 0.4)' : 'rgba(88, 28, 135, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, this.tileSize - 1, this.tileSize - 1);
        } else {
          ctx.fillStyle = isLit ? '#120d26' : '#0a0718';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
          ctx.strokeStyle = isLit ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 240, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, this.tileSize - 1, this.tileSize - 1);

          if (isLit) {
            ctx.fillStyle = 'rgba(255, 0, 128, 0.15)';
            ctx.fillRect(screenX + 15, screenY + 15, 2, 2);
          }

          if (tile.type === 'stairs_down') {
            ctx.fillStyle = isLit ? '#00f0ff' : '#007788';
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);
            ctx.fillStyle = '#0a0718';
            ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);
            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▼', screenX + 16, screenY + 16);
          }

          if (tile.type === 'checkpoint') {
            const cpActive = !!tile.checkpointActivated;
            const cpColor = cpActive ? '#10b981' : '#f59e0b';
            ctx.fillStyle = isLit ? (cpActive ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.22)') : 'rgba(16,185,129,0.1)';
            ctx.beginPath();
            ctx.arc(screenX + 16, screenY + 16, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isLit ? cpColor : '#065f46';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = isLit ? cpColor : '#047857';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('◈', screenX + 16, screenY + 16);
          }

          if (tile.type === 'chest') {
            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.fillRect(screenX + 6, screenY + 8, this.tileSize - 12, this.tileSize - 14);
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(screenX + 10, screenY + 6, this.tileSize - 20, 4);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(screenX + 14, screenY + 14, 4, 4);
          }

          if (tile.type === 'shrine') {
            ctx.fillStyle = isLit ? 'rgba(0, 240, 255, 0.3)' : 'rgba(0, 240, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(screenX + 16, screenY + 16, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = isLit ? '#00f0ff' : '#008899';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', screenX + 16, screenY + 16);
          }

          if (tile.type === 'shop') {
            const pulse = 0.65 + Math.sin(nowSec * 4) * 0.25;
            ctx.fillStyle = isLit ? `rgba(255, 0, 170, ${0.28 * pulse})` : 'rgba(255, 0, 170, 0.12)';
            ctx.beginPath();
            ctx.arc(screenX + 16, screenY + 17, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isLit ? '#ffe600' : '#887700';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Cyber NPC Merchant Silhouette
            ctx.fillStyle = isLit ? '#c026d3' : '#6b21a8';
            ctx.fillRect(screenX + 9, screenY + 14, 14, 13); // cloak
            ctx.fillStyle = isLit ? '#fde047' : '#854d0e';
            ctx.fillRect(screenX + 11, screenY + 7, 10, 8); // hood/head
            ctx.fillStyle = isLit ? '#00f0ff' : '#0891b2';
            ctx.fillRect(screenX + 13, screenY + 10, 6, 2); // visor

            if (isLit) {
              ctx.font = 'bold 7px ui-monospace, monospace';
              ctx.textAlign = 'center';
              ctx.fillStyle = '#060410';
              ctx.fillText('NPC SHOP', screenX + 17, screenY + 4);
              ctx.fillStyle = '#ffe600';
              ctx.fillText('NPC SHOP', screenX + 16, screenY + 3);
            }
          }

          if (tile.hazard && isLit) {
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(screenX + 6, screenY + 6);
            ctx.lineTo(screenX + 26, screenY + 26);
            ctx.moveTo(screenX + 26, screenY + 6);
            ctx.lineTo(screenX + 6, screenY + 26);
            ctx.stroke();
          }
        }

        if (!isLit) {
          ctx.fillStyle = 'rgba(8, 6, 20, 0.65)';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
      }
    }

    // 1b. RENDER GROUND COINS (Only on explored/visible tiles)
    if (dungeon.groundCoins) {
      for (const coin of dungeon.groundCoins) {
        const tile = dungeon.tiles[coin.y]?.[coin.x];
        if (!tile || !tile.visible) continue;
        const cx = coin.x * this.tileSize + 16;
        const cy = coin.y * this.tileSize + 16 + Math.sin(nowSec * 5 + coin.x) * 2;
        const coinColor =
          coin.tier === 'quantum'
            ? '#00f0ff'
            : coin.tier === 'gold'
            ? '#facc15'
            : coin.tier === 'silver'
            ? '#e2e8f0'
            : '#d97706';

        ctx.save();
        if (this.enableGlow) {
          ctx.shadowColor = coinColor;
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = coinColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0a0718';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#0a0718';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy + 0.5);
        ctx.restore();
      }
    }

    // 1c. RENDER FLOATING SKULL & LOOT BAGS (Death Drops)
    if (dungeon.deathDrops && dungeon.deathDrops.length > 0) {
      for (const drop of dungeon.deathDrops) {
        const tile = dungeon.tiles[drop.y]?.[drop.x];
        if (!tile || !tile.explored) continue;

        const baseX = drop.x * this.tileSize + 16;
        const baseY = drop.y * this.tileSize + 16;
        const bobY = baseY - 3 + Math.sin(nowSec * 3.6 + drop.x) * 3.2;
        const pulse = 0.65 + Math.sin(nowSec * 5) * 0.25;
        const isLit = tile.visible;

        ctx.save();
        // Ground spectral aura ring
        ctx.fillStyle = isLit ? `rgba(255, 0, 102, ${0.22 * pulse})` : 'rgba(255, 0, 102, 0.1)';
        ctx.beginPath();
        ctx.ellipse(baseX, baseY + 8, 12, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isLit ? '#ffe600' : '#854d0e';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Loot pouch below floating skull
        ctx.fillStyle = isLit ? '#d97706' : '#78350f';
        ctx.beginPath();
        ctx.arc(baseX, baseY + 5, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Floating Skull emblem
        if (this.enableGlow) {
          ctx.shadowColor = isLit ? '#ff007f' : '#881337';
          ctx.shadowBlur = isLit ? 12 : 4;
        }
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', baseX, bobY);

        if (isLit) {
          ctx.shadowBlur = 0;
          ctx.font = 'bold 7px ui-monospace, monospace';
          const tag = drop.ownerName ? `${drop.ownerName.slice(0, 8)} ☠` : 'LOOT ☠';
          ctx.fillStyle = '#060410';
          ctx.fillText(tag, baseX + 1, bobY - 12);
          ctx.fillStyle = '#fef08a';
          ctx.fillText(tag, baseX, bobY - 13);
        }
        ctx.restore();
      }
    }

    // 2. RENDER MONSTERS (Procedurally Evolving)
    for (const monster of dungeon.monsters) {
      const mTileX = Math.floor(monster.x + 0.41);
      const mTileY = Math.floor(monster.y + 0.41);
      if (!dungeon.tiles[mTileY]?.[mTileX]?.visible) continue;

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

      // Monster HP Mini-bar & Level tag
      const hpPercent = Math.max(0, monster.hp / monster.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(mx + 2, my - 6, this.tileSize - 4, 4);
      ctx.fillStyle = hpPercent > 0.4 ? '#00f0ff' : '#ff0055';
      ctx.fillRect(mx + 2, my - 6, (this.tileSize - 4) * hpPercent, 4);

      ctx.font = 'bold 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#060410';
      ctx.fillText(`Lv.${monster.level || 1}`, mx + 17, my - 9);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Lv.${monster.level || 1}`, mx + 16, my - 10);

      if (monster.burnTurns && monster.burnTurns > 0) {
        ctx.font = '10px monospace';
        ctx.fillText('🔥', mx + this.tileSize - 4, my + 4);
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

    // 3. RENDER REMOTE CO-OP PLAYERS (if in 3P Group Session)
    if (remotePlayers && remotePlayers.length > 0) {
      for (const rp of remotePlayers) {
        if (!rp.alive) continue;
        const rpx = rp.x * this.tileSize;
        const rpy = rp.y * this.tileSize;
        this.drawPlayerCharacter(ctx, rpx, rpy, rp.characterClass, rp.facing, 0, undefined, rp.username, rp.movedThisTurn);
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
      player.equipment
    );

    // 4. RENDER ATTACK & SKILL VISUAL EFFECTS
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      const fx = this.attackEffects[i];
      if (!isFrozen) {
        fx.life += simDt;
      }
      if (fx.life >= fx.maxLife) {
        this.attackEffects.splice(i, 1);
        continue;
      }
      const p = fx.life / fx.maxLife;
      const alpha = 1 - p;
      const sx = fx.x * this.tileSize + 16;
      const sy = fx.y * this.tileSize + 16;
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

        // Cross slash flash for crits
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
        // emp_ring, nova, heal, shield, smash
        const maxRad = (fx.radius || 1.5) * this.tileSize;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3.5 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(4, maxRad * p), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 5. RENDER PARTICLES
    if (this.enableParticles) {
      for (const p of this.particles) {
        if (p.active) {
          if (!isFrozen) {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            if (p.life >= p.maxLife) {
              p.active = false;
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

    // 7. RETRO CRT SCANLINE OVERLAY
    if (this.enableScanlines) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
