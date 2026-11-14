import React, { useRef, useEffect, useState, useCallback } from 'react';
import { soundEngine } from '../game/audio';

export type CanvasButtonTheme = 'cyan' | 'pink' | 'amber' | 'purple' | 'emerald';

interface CanvasButtonProps {
  label: string;
  sublabel?: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  theme?: CanvasButtonTheme;
  className?: string;
  width?: number; // base CSS width
  height?: number; // base CSS height
  'data-start'?: string;
  'data-testid'?: string;
  'aria-label'?: string;
}

const THEME_PALETTES: Record<CanvasButtonTheme, {
  border: string[];
  glow: string;
  bgDark: string;
  bgLight: string;
  text: string;
  accent: string;
}> = {
  cyan: {
    border: ['#00f0ff', '#0077aa', '#00f0ff'],
    glow: '#00f0ff',
    bgDark: 'rgba(8, 20, 36, 0.92)',
    bgLight: 'rgba(12, 45, 75, 0.95)',
    text: '#ffffff',
    accent: '#00f0ff',
  },
  pink: {
    border: ['#ff007f', '#ff0055', '#ff5599'],
    glow: '#ff007f',
    bgDark: 'rgba(36, 8, 24, 0.92)',
    bgLight: 'rgba(75, 12, 48, 0.95)',
    text: '#ffffff',
    accent: '#ff007f',
  },
  amber: {
    border: ['#ffe600', '#ff9900', '#ffe600'],
    glow: '#ffe600',
    bgDark: 'rgba(36, 28, 8, 0.92)',
    bgLight: 'rgba(75, 55, 12, 0.95)',
    text: '#ffffff',
    accent: '#ffe600',
  },
  purple: {
    border: ['#bd00ff', '#7700cc', '#e066ff'],
    glow: '#bd00ff',
    bgDark: 'rgba(28, 8, 38, 0.92)',
    bgLight: 'rgba(60, 15, 80, 0.95)',
    text: '#ffffff',
    accent: '#bd00ff',
  },
  emerald: {
    border: ['#00ffaa', '#009966', '#00ffaa'],
    glow: '#00ffaa',
    bgDark: 'rgba(8, 36, 24, 0.92)',
    bgLight: 'rgba(12, 75, 48, 0.95)',
    text: '#ffffff',
    accent: '#00ffaa',
  },
};

export const CanvasButton: React.FC<CanvasButtonProps> = ({
  label,
  sublabel,
  icon,
  onClick,
  disabled = false,
  selected = false,
  theme = 'cyan',
  className = '',
  width = 240,
  height = 54,
  'data-start': dataStart,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const shimmerRef = useRef<number>(-0.4);

  const drawButton = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || width;
    const h = canvas.clientHeight || height;
    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const palette = THEME_PALETTES[theme] || THEME_PALETTES.cyan;
    const cornerCut = 9; // Chamfered cyber corner

    // Cyber Chamfer Path
    const path = new Path2D();
    path.moveTo(cornerCut, 0);
    path.lineTo(w - cornerCut, 0);
    path.lineTo(w, cornerCut);
    path.lineTo(w, h - cornerCut);
    path.lineTo(w - cornerCut, h);
    path.lineTo(cornerCut, h);
    path.lineTo(0, h - cornerCut);
    path.lineTo(0, cornerCut);
    path.closePath();

    // 1. Background Fill with subtle depth gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (disabled) {
      bgGrad.addColorStop(0, 'rgba(18, 16, 26, 0.7)');
      bgGrad.addColorStop(1, 'rgba(10, 8, 16, 0.8)');
    } else if (isPressed) {
      bgGrad.addColorStop(0, palette.bgLight);
      bgGrad.addColorStop(1, palette.bgDark);
    } else if (isHovered || selected) {
      bgGrad.addColorStop(0, palette.bgLight);
      bgGrad.addColorStop(1, 'rgba(12, 10, 24, 0.95)');
    } else {
      bgGrad.addColorStop(0, palette.bgDark);
      bgGrad.addColorStop(1, 'rgba(6, 4, 14, 0.95)');
    }

    ctx.fillStyle = bgGrad;
    ctx.fill(path);

    // 2. Diagonal Gloss / Shimmer sweep on hover
    if ((isHovered || selected) && !disabled) {
      shimmerRef.current += 0.025;
      if (shimmerRef.current > 1.6) shimmerRef.current = -0.5;

      const shimmerX = shimmerRef.current * w;
      const shimmerGrad = ctx.createLinearGradient(shimmerX - 30, 0, shimmerX + 30, h);
      shimmerGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shimmerGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.16)');
      shimmerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.clip(path);
      ctx.fillStyle = shimmerGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 3. Cyber Scanline Micro-Texture
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();

    // 4. Glowing Neon Border
    if (!disabled) {
      ctx.save();
      const glowIntensity = isHovered || selected ? 14 : 6;
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glowIntensity;

      const borderGrad = ctx.createLinearGradient(0, 0, w, h);
      borderGrad.addColorStop(0, palette.border[0]);
      borderGrad.addColorStop(0.5, palette.border[1]);
      borderGrad.addColorStop(1, palette.border[2]);

      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = isHovered || selected ? 2.0 : 1.2;
      ctx.stroke(path);
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke(path);
    }

    // 5. High-Tech Corner Brackets
    if (!disabled) {
      ctx.strokeStyle = isHovered || selected ? '#ffffff' : palette.accent;
      ctx.lineWidth = 2;
      // Top-Left corner bracket
      ctx.beginPath();
      ctx.moveTo(3, 10);
      ctx.lineTo(cornerCut, 0);
      ctx.lineTo(cornerCut + 8, 0);
      ctx.stroke();

      // Bottom-Right corner bracket
      ctx.beginPath();
      ctx.moveTo(w - 3, h - 10);
      ctx.lineTo(w - cornerCut, h);
      ctx.lineTo(w - cornerCut - 8, h);
      ctx.stroke();
    }

    // 6. Typography & Icon Rendering
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerY = sublabel ? h / 2 - 6 : h / 2;
    const fullText = icon ? `${icon}  ${label}` : label;

    if (disabled) {
      ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(fullText, w / 2, centerY);
    } else {
      // Glow under text
      if (isHovered || selected) {
        ctx.shadowColor = palette.glow;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = palette.text;
      ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(fullText, w / 2, centerY);

      // Sublabel
      if (sublabel) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = palette.accent;
        ctx.font = '10px ui-monospace, monospace';
        ctx.fillText(sublabel, w / 2, centerY + 15);
      }
    }
    ctx.restore();
    ctx.restore();
  }, [disabled, height, icon, isHovered, isPressed, label, selected, sublabel, theme, width]);

  // Animation frame loop for shimmer on hover
  useEffect(() => {
    let animId: number;
    const render = () => {
      drawButton();
      if ((isHovered || selected) && !disabled) {
        animId = requestAnimationFrame(render);
      }
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [drawButton, isHovered, selected, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      soundEngine.playUI('click');
      onClick?.();
    }
  };

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      data-start={dataStart}
      data-testid={dataTestId}
      data-no-ui-sfx="true"
      aria-label={ariaLabel || label}
      aria-disabled={disabled}
      onClick={() => {
        if (disabled) {
          soundEngine.playUI('error');
          return;
        }
        soundEngine.playUI('click');
        onClick?.();
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      className={`relative inline-block select-none cursor-pointer transition-transform duration-100 ${
        isPressed ? 'scale-95' : isHovered ? 'scale-[1.02]' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        style={{ width, height, display: 'block' }}
        className="pointer-events-none"
      />
    </div>
  );
};
