import React, { useRef, useEffect, useState } from 'react';
import { DungeonState, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { calculateMinimapStats, getMinimapTileColor } from '../game/minimap';
import { X, Maximize2, Minimize2, MapPin, Eye, Compass, ShieldAlert } from 'lucide-react';

interface MinimapProps {
  dungeon: DungeonState;
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const Minimap: React.FC<MinimapProps> = ({
  dungeon,
  player,
  isOpen,
  onClose,
  language
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const pulseRef = useRef<number>(0);

  const stats = calculateMinimapStats(dungeon);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Cyber grid background
      ctx.fillStyle = '#060412';
      ctx.fillRect(0, 0, width, height);

      // Fine grid texture
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 1;
      const step = 16;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Calculate cell scale to fit dungeon dimensions within canvas with padding
      const padding = 8;
      const availableW = width - padding * 2;
      const availableH = height - padding * 2;
      const cellW = availableW / dungeon.width;
      const cellH = availableH / dungeon.height;

      // 1. Draw Explored & Visible Tiles
      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          const tile = dungeon.tiles[y][x];
          const color = getMinimapTileColor(tile);
          if (!color) continue;

          const px = padding + x * cellW;
          const py = padding + y * cellH;

          ctx.fillStyle = color;
          ctx.fillRect(px, py, Math.max(1, cellW), Math.max(1, cellH));

          // Draw distinct glyph for special tiles if explored
          if (tile.type === 'stairs_down' && tile.explored) {
            ctx.fillStyle = '#ffe600';
            ctx.beginPath();
            ctx.arc(px + cellW / 2, py + cellH / 2, Math.max(2, cellW * 0.9), 0, Math.PI * 2);
            ctx.fill();

            // Pulsating ring
            const pulseSize = Math.sin(pulseRef.current) * 2 + 3;
            ctx.strokeStyle = 'rgba(255, 230, 0, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px + cellW / 2, py + cellH / 2, cellW + pulseSize, 0, Math.PI * 2);
            ctx.stroke();
          } else if (tile.type === 'shop' && tile.explored) {
            ctx.fillStyle = '#ff00aa';
            ctx.beginPath();
            ctx.arc(px + cellW / 2, py + cellH / 2, Math.max(2, cellW * 0.8), 0, Math.PI * 2);
            ctx.fill();
          } else if (tile.type === 'chest' && tile.explored) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(px, py, Math.max(2, cellW), Math.max(2, cellH));
          } else if (tile.type === 'shrine' && tile.explored) {
            ctx.fillStyle = '#00f0ff';
            ctx.fillRect(px, py, Math.max(2, cellW), Math.max(2, cellH));
          }
        }
      }

      // 2. Draw Visible Monsters (Hostile Blips)
      for (const m of dungeon.monsters) {
        if (!dungeon.tiles[m.y]?.[m.x]?.visible) continue;

        const mx = padding + m.x * cellW + cellW / 2;
        const my = padding + m.y * cellH + cellH / 2;

        ctx.fillStyle = m.archetype === 'core_synthesizer' ? '#ff0055' : '#ff3366';
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(2.5, cellW * 0.7), 0, Math.PI * 2);
        ctx.fill();

        // Hostile ping
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mx, my, Math.max(4, cellW * 1.2), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Draw Player Marker (Pulsing Cyan Beacon with Visor Direction)
      const plx = padding + player.x * cellW + cellW / 2;
      const ply = padding + player.y * cellH + cellH / 2;

      // Outer sonar wave
      const wave = (Math.sin(pulseRef.current) + 1) * 3;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(plx, ply, Math.max(4, cellW * 1.4) + wave, 0, Math.PI * 2);
      ctx.stroke();

      // Core player blip
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(plx, ply, Math.max(3, cellW * 0.9), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Facing indicator notch
      let fdx = 0;
      let fdy = 0;
      if (player.facing === 'left') fdx = -1;
      else if (player.facing === 'right') fdx = 1;
      else if (player.facing === 'up') fdy = -1;
      else if (player.facing === 'down') fdy = 1;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(plx, ply);
      ctx.lineTo(plx + fdx * (cellW * 1.5), ply + fdy * (cellH * 1.5));
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [dungeon, player, isOpen, isExpanded]);

  if (!isOpen) return null;

  const canvasDim = isExpanded ? 340 : 200;

  return (
    <div
      role="region"
      aria-label="Minimap Overlay"
      className={`fixed z-30 transition-all duration-200 select-none font-mono ${
        isExpanded
          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px]'
          : 'top-16 right-4 w-[232px]'
      } bg-[#080516]/95 backdrop-blur-md border border-cyan-500/50 rounded-xl shadow-[0_0_25px_rgba(0,240,255,0.3)] overflow-hidden`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-950/80 via-[#0d0924]/80 to-purple-950/80 border-b border-cyan-500/30 text-xs text-cyan-300">
        <div className="flex items-center gap-1.5 font-bold tracking-wider">
          <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span>{t('minimap', language)}</span>
          <span className="text-[10px] px-1 py-0.2 bg-cyan-950 border border-cyan-500/40 rounded text-cyan-400">
            F{dungeon.floor}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(prev => !prev)}
            aria-label={isExpanded ? 'Minimize Minimap' : 'Expand Minimap'}
            className="p-1 hover:text-white hover:bg-cyan-500/20 rounded transition-colors text-cyan-400"
            title={isExpanded ? 'Compact [M]' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close Minimap"
            className="p-1 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors text-slate-400"
            title="Close [M]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Environmental Event Badge if present */}
      {dungeon.activeEvent && (
        <div 
          className="flex items-center justify-between px-3 py-1 text-[10px] font-bold tracking-wider uppercase border-b border-slate-700/50"
          style={{ backgroundColor: `${dungeon.activeEvent.bannerColor}20`, color: dungeon.activeEvent.bannerColor }}
        >
          <span className="flex items-center gap-1">
            <span>{dungeon.activeEvent.icon}</span>
            <span className="truncate max-w-[170px]">{dungeon.activeEvent.name}</span>
          </span>
          <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 border border-current">
            {t('environmentalEvent', language)}
          </span>
        </div>
      )}

      {/* Canvas Mount */}
      <div className="p-2.5 flex justify-center items-center bg-[#05030f]">
        <canvas
          ref={canvasRef}
          width={canvasDim}
          height={Math.round(canvasDim * 0.72)}
          data-testid="minimap-canvas"
          className="rounded border border-cyan-500/25 block shadow-inner"
        />
      </div>

      {/* Coordinates & Exploration Bar */}
      <div className="px-3 py-2 bg-[#0a0718]/90 border-t border-cyan-500/20 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1 text-cyan-300">
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>X:{player.x} Y:{player.y}</span>
          </span>
          <span className="text-slate-300 font-semibold">
            {t('exploredPercent', language)}: <span className="text-cyan-400">{stats.exploredPercent}%</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-cyan-900/40">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
            style={{ width: `${stats.exploredPercent}%` }}
          />
        </div>

        {/* Legend Pips */}
        <div className="flex flex-wrap items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Operative</span>
            </span>
            {stats.hasStairsFound && (
              <span className="flex items-center gap-1 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Exit</span>
              </span>
            )}
            {stats.hasShopFound && (
              <span className="flex items-center gap-1 text-pink-400">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                <span>Shop</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-red-400 font-semibold">
            <Eye className="w-2.5 h-2.5" />
            <span>{stats.visibleMonstersCount} {t('hostilesDetected', language)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
