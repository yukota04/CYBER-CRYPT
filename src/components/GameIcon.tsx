import React, { useEffect, useState } from 'react';
import { getIconAtlas, getIconFrame, isIconAtlasReady, subscribeIconAtlas } from '../game/iconAtlas';

export interface GameIconProps {
  id?: string | null;
  fallback?: React.ReactNode;
  size?: number;
  className?: string;
  title?: string;
  alt?: string;
}

export const GameIcon: React.FC<GameIconProps> = ({
  id,
  fallback = '◆',
  size = 32,
  className = '',
  title,
  alt
}) => {
  const [, setTick] = useState(0);
  useEffect(() => subscribeIconAtlas(() => setTick(t => t + 1)), []);

  const ready = isIconAtlasReady();
  const atlas = getIconAtlas();
  const frame = ready ? getIconFrame(id) : null;

  if (!frame || !atlas) {
    return (
      <span
        className={`cc-icon cc-icon-fallback inline-flex items-center justify-center ${className}`}
        title={title}
        role="img"
        aria-label={alt || title}
        style={{ width: size, height: size, fontSize: Math.max(10, size * 0.62), lineHeight: 1 }}
      >
        {fallback}
      </span>
    );
  }

  const scale = size / frame.w;
  return (
    <span
      className={`cc-icon ${className}`}
      title={title}
      role="img"
      aria-label={alt || title || id || undefined}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        flexShrink: 0,
        backgroundImage: `url(/icons/${frame.sheet})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundSize: `${atlas.sheetWidth * scale}px ${atlas.sheetHeight * scale}px`
      }}
    />
  );
};

export default GameIcon;
