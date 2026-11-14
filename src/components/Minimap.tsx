import React, { useRef, useEffect, useState } from 'react';
import { DungeonState, Player } from '../game/types';
import { Language } from '../game/i18n';
import { calculateMinimapStats, getMinimapTileColor } from '../game/minimap';

interface MinimapProps {
  dungeon: DungeonState;
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

/** Clean minimap: canvas only — no chrome, title, coords, or legend. */
export const Minimap: React.FC<MinimapProps> = ({
  dungeon,
  player,
  isOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const pulseRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const stats = calculateMinimapStats(dungeon);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const render = () => {
      pulseRef.current += 0.08;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(5,3,15,0.55)';
      ctx.fillRect(0, 0, w, h);

      const cellW = w / dungeon.width;
      const cellH = h / dungeon.height;

      for (let y = 0; y < dungeon.height; y++) {
        for (let x = 0; x < dungeon.width; x++) {
          const tile = dungeon.tiles[y]?.[x];
          if (!tile || (!tile.explored && !tile.visible)) continue;
          const color = getMinimapTileColor(tile);
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.globalAlpha = tile.visible ? 1 : 0.45;
          ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
        }
      }
      ctx.globalAlpha = 1;

      for (const m of dungeon.monsters) {
        const tx = Math.floor(m.x);
        const ty = Math.floor(m.y);
        if (!dungeon.tiles[ty]?.[tx]?.visible) continue;
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(m.x * cellW, m.y * cellH, Math.max(1.5, cellW * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }

      const pulse = 0.65 + Math.sin(pulseRef.current) * 0.35;
      ctx.fillStyle = `rgba(34,211,238,${pulse})`;
      ctx.beginPath();
      ctx.arc(player.x * cellW, player.y * cellH, Math.max(2, cellW * 0.55), 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [dungeon, player, isOpen, isMobile, stats.exploredPercent]);

  if (!isOpen) return null;

  const canvasDim = isMobile ? 96 : 140;

  return (
    <div
      role="region"
      aria-label="Minimap Overlay"
      data-testid="minimap-clean"
      className="fixed z-10 pointer-events-none select-none top-[7.5rem] left-2 sm:top-28 sm:left-[13.5rem]"
    >
      <canvas
        ref={canvasRef}
        width={canvasDim}
        height={Math.round(canvasDim * 0.72)}
        data-testid="minimap-canvas"
        className="block opacity-90"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
