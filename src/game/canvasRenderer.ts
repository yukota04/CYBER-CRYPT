import { DungeonState, Monster, Player, Tile } from './types';

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

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tileSize = 32;
  private cameraX = 0;
  private cameraY = 0;
  private trauma = 0;
  private particles: Particle[] = [];
  private maxParticles = 120;
  public enableScanlines = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    // Pre-allocate fixed particle pool (zero GC)
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

  public spawnParticles(worldX: number, worldY: number, color: string, count = 10) {
    let spawned = 0;
    const px = worldX * this.tileSize + this.tileSize / 2;
    const py = worldY * this.tileSize + this.tileSize / 2;

    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.x = px;
        p.y = py;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0;
        p.maxLife = 20 + Math.random() * 15;
        p.color = color;
        p.size = Math.random() * 3 + 1.5;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public render(
    dungeon: DungeonState,
    player: Player,
    floatingTexts: { text: string; x: number; y: number; color: string; life?: number }[],
    dt: number
  ) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // Camera follow player with lerp
    const targetCamX = player.x * this.tileSize + this.tileSize / 2 - width / 2;
    const targetCamY = player.y * this.tileSize + this.tileSize / 2 - height / 2;
    this.cameraX += (targetCamX - this.cameraX) * 0.18;
    this.cameraY += (targetCamY - this.cameraY) * 0.18;

    // Apply trauma shake
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.trauma > 0) {
      const shakeMag = this.trauma * this.trauma * 14;
      shakeOffsetX = (Math.random() * 2 - 1) * shakeMag;
      shakeOffsetY = (Math.random() * 2 - 1) * shakeMag;
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
    }

    ctx.save();
    // Dark synthwave void background
    ctx.fillStyle = '#080614';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(-Math.floor(this.cameraX + shakeOffsetX), -Math.floor(this.cameraY + shakeOffsetY));

    // Visible viewport tile range
    const startTileX = Math.max(0, Math.floor((this.cameraX - 40) / this.tileSize));
    const endTileX = Math.min(dungeon.width, Math.ceil((this.cameraX + width + 40) / this.tileSize));
    const startTileY = Math.max(0, Math.floor((this.cameraY - 40) / this.tileSize));
    const endTileY = Math.min(dungeon.height, Math.ceil((this.cameraY + height + 40) / this.tileSize));

    // 1. RENDER TILES
    for (let y = startTileY; y < endTileY; y++) {
      for (let x = startTileX; x < endTileX; x++) {
        const tile = dungeon.tiles[y][x];
        if (!tile.explored) {
          // Unexplored is pitch black
          continue;
        }

        const screenX = x * this.tileSize;
        const screenY = y * this.tileSize;
        const isLit = tile.visible;

        if (tile.type === 'wall') {
          // Synthwave neon circuit wall
          ctx.fillStyle = isLit ? '#1b1238' : '#0e0920';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

          // Top highlight
          ctx.fillStyle = isLit ? '#492c85' : '#231444';
          ctx.fillRect(screenX, screenY, this.tileSize, 3);

          // Grid border
          ctx.strokeStyle = isLit ? 'rgba(168, 85, 247, 0.4)' : 'rgba(88, 28, 135, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, this.tileSize - 1, this.tileSize - 1);
        } else {
          // Floor or corridor
          ctx.fillStyle = isLit ? '#120d26' : '#0a0718';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

          // Floor cyber grid pattern
          ctx.strokeStyle = isLit ? 'rgba(0, 240, 255, 0.12)' : 'rgba(0, 240, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX + 0.5, screenY + 0.5, this.tileSize - 1, this.tileSize - 1);

          // Center micro pip
          if (isLit) {
            ctx.fillStyle = 'rgba(255, 0, 128, 0.15)';
            ctx.fillRect(screenX + 15, screenY + 15, 2, 2);
          }

          // Stairs down
          if (tile.type === 'stairs_down') {
            ctx.fillStyle = isLit ? '#00f0ff' : '#007788';
            ctx.fillRect(screenX + 4, screenY + 4, this.tileSize - 8, this.tileSize - 8);

            ctx.fillStyle = '#0a0718';
            ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);

            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▼', screenX + this.tileSize / 2, screenY + this.tileSize / 2);
          }

          // Chest
          if (tile.type === 'chest') {
            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.fillRect(screenX + 6, screenY + 8, this.tileSize - 12, this.tileSize - 14);

            ctx.fillStyle = '#ff007f';
            ctx.fillRect(screenX + 10, screenY + 6, this.tileSize - 20, 4);

            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(screenX + 14, screenY + 14, 4, 4);
          }

          // Shrine
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

          // Black Market Shop Terminal
          if (tile.type === 'shop') {
            ctx.fillStyle = isLit ? 'rgba(255, 0, 170, 0.35)' : 'rgba(255, 0, 170, 0.15)';
            ctx.beginPath();
            ctx.arc(screenX + 16, screenY + 16, 13, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = isLit ? '#ff00aa' : '#880055';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = isLit ? '#ffe600' : '#887700';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛒', screenX + 16, screenY + 16);
          }

          // Trap (if revealed or triggered)
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

        // Fog of War shadow overlay for explored-but-not-visible tiles
        if (!isLit) {
          ctx.fillStyle = 'rgba(8, 6, 20, 0.65)';
          ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        }
      }
    }

    // 2. RENDER MONSTERS (only if visible tile)
    for (const monster of dungeon.monsters) {
      if (!dungeon.tiles[monster.y]?.[monster.x]?.visible) continue;

      const mx = monster.x * this.tileSize;
      const my = monster.y * this.tileSize;

      // Telegraph windup indicator
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

      // Monster Body (Retro Pixel Sprite)
      ctx.fillStyle = monster.color;
      ctx.shadowColor = monster.color;
      ctx.shadowBlur = 8;

      if (monster.archetype === 'core_synthesizer') {
        // Boss diamond chassis
        ctx.beginPath();
        ctx.moveTo(mx + 16, my + 2);
        ctx.lineTo(mx + 30, my + 16);
        ctx.lineTo(mx + 16, my + 30);
        ctx.lineTo(mx + 2, my + 16);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + 12, my + 12, 8, 8);
      } else if (monster.archetype === 'cyber_behemoth') {
        // Heavy broad armored sprite
        ctx.fillRect(mx + 3, my + 5, 26, 22);
        ctx.fillStyle = '#11051f';
        ctx.fillRect(mx + 7, my + 10, 18, 5); // visor
      } else if (monster.archetype === 'neon_stalker') {
        // Sharp triangular silhouette
        ctx.beginPath();
        ctx.moveTo(mx + 16, my + 4);
        ctx.lineTo(mx + 28, my + 26);
        ctx.lineTo(mx + 4, my + 26);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0a0718';
        ctx.fillRect(mx + 13, my + 12, 6, 6);
      } else {
        // Swarmer / Disruptor bug sprite
        ctx.fillRect(mx + 6, my + 6, 20, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx + 9, my + 10, 4, 4);
        ctx.fillRect(mx + 19, my + 10, 4, 4);
      }

      ctx.shadowBlur = 0; // reset shadow

      // Monster HP Mini-bar
      const hpPercent = Math.max(0, monster.hp / monster.maxHp);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(mx + 2, my - 6, this.tileSize - 4, 4);
      ctx.fillStyle = hpPercent > 0.4 ? '#00f0ff' : '#ff0055';
      ctx.fillRect(mx + 2, my - 6, (this.tileSize - 4) * hpPercent, 4);
    }

    // 3. RENDER PLAYER CHARACTER
    const px = player.x * this.tileSize;
    const py = player.y * this.tileSize;

    // Class theme colors
    const classColors: Record<string, { body: string; visor: string; glow: string }> = {
      striker: { body: '#00f0ff', visor: '#ff007f', glow: '#00f0ff' },
      technomancer: { body: '#bd00ff', visor: '#00f0ff', glow: '#bd00ff' },
      vanguard: { body: '#ffe600', visor: '#00f0ff', glow: '#ffe600' }
    };
    const c = classColors[player.characterClass] || classColors.striker;

    // Glowing ground aura
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 26, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player Sprite (Cyber operative with visor)
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = c.body;

    // Torso / armor
    ctx.fillRect(px + 7, py + 7, 18, 18);

    // Visor facing indicator
    ctx.fillStyle = c.visor;
    if (player.facing === 'down') {
      ctx.fillRect(px + 9, py + 12, 14, 4);
    } else if (player.facing === 'up') {
      ctx.fillRect(px + 9, py + 8, 14, 3);
    } else if (player.facing === 'left') {
      ctx.fillRect(px + 7, py + 12, 6, 4);
    } else {
      ctx.fillRect(px + 19, py + 12, 6, 4);
    }

    // Kinetic shield aura if active
    if (player.buffs.shieldAmount > 0) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // 4. RENDER PARTICLES
    for (const p of this.particles) {
      if (p.active) {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }

        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      }
    }

    // 5. RENDER FLOATING COMBAT TEXT WITH ENHANCED CRITICAL HIT ANIMATION
    for (const ft of floatingTexts) {
      const life = ft.life || 0;
      const progress = Math.min(1.0, life / 40);
      const alpha = Math.max(0, 1.0 - progress * progress);
      const isCrit = !!(ft as any).isCrit || ft.text.includes('CRIT');

      const tx = ft.x * this.tileSize + 16;
      // Floats upward with slight deceleration
      const ty = ft.y * this.tileSize - (isCrit ? 10 + life * 1.8 : life * 1.2);

      ctx.save();
      ctx.translate(tx, ty);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isCrit) {
        // Dynamic pop / spring scale: bursts to 2.2x scale then settles
        let scale = 1.0;
        if (progress < 0.2) {
          scale = 0.8 + (progress / 0.2) * 1.4; // 0.8 -> 2.2
        } else {
          scale = 2.2 - (progress - 0.2) * 0.8; // 2.2 -> 1.56
        }

        // Slight micro-shake during initial pop
        const critShake = progress < 0.3 ? (Math.random() * 2 - 1) * 2.5 : 0;
        ctx.translate(critShake, 0);
        ctx.scale(scale, scale);

        // Unique high-frequency neon color pulse (Gold -> Magenta -> Cyan-White)
        const pulsePhase = Math.sin(life * 0.5 + Date.now() * 0.01);
        let pulseColor = '#ffe600'; // Electric Gold
        let glowColor = '#ff007f';  // Hot Magenta
        if (pulsePhase > 0.4) {
          pulseColor = '#ff007f';
          glowColor = '#00f0ff';
        } else if (pulsePhase < -0.4) {
          pulseColor = '#00f0ff';
          glowColor = '#ffe600';
        }

        // Emissive neon halo
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 18;

        ctx.font = '900 16px ui-monospace, SFMono-Regular, monospace';

        // Outer dark stroke for maximum readability and punch
        ctx.strokeStyle = '#05030a';
        ctx.lineWidth = 4.5;
        ctx.lineJoin = 'miter';
        ctx.strokeText(ft.text, 0, 0);

        // Vibrant pulsed fill
        ctx.fillStyle = pulseColor;
        ctx.fillText(ft.text, 0, 0);

        // Decorative electric micro-brackets
        ctx.font = 'bold 9px ui-monospace, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('⚡ CRITICAL ⚡', 0, -14);
      } else {
        // Standard damage / heal float
        ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = '#0a0718';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, 0, 0);

        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
      }

      ctx.restore();
    }

    ctx.restore();

    // 6. RETRO CRT SCANLINE OVERLAY
    if (this.enableScanlines) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
      // Radial vignette
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
