import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Disc } from 'lucide-react';
import { CanvasButton } from './CanvasButton';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onWaitTurn: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onWaitTurn,
  onOpenInventory,
  onOpenSkillTree
}) => {
  return (
    <div className="sm:hidden fixed bottom-28 left-4 right-4 z-20 flex items-end justify-between pointer-events-none select-none">
      {/* Virtual D-Pad */}
      <div className="grid grid-cols-3 gap-1.5 w-36 h-36 p-1.5 rounded-full bg-[#0d0920]/80 border border-cyan-500/40 backdrop-blur-sm pointer-events-auto">
        <div />
        <button
          onClick={() => onMove(0, -1)}
          className="flex items-center justify-center rounded-t-lg bg-cyan-950/60 active:bg-cyan-600 text-cyan-300 border border-cyan-500/30 active:scale-95 transition"
          aria-label="Move Up"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
        <div />

        <button
          onClick={() => onMove(-1, 0)}
          className="flex items-center justify-center rounded-l-lg bg-cyan-950/60 active:bg-cyan-600 text-cyan-300 border border-cyan-500/30 active:scale-95 transition"
          aria-label="Move Left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Center / Wait Turn */}
        <button
          onClick={onWaitTurn}
          className="flex items-center justify-center rounded-md bg-purple-950/70 active:bg-purple-600 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold active:scale-95 transition"
          title="Wait Turn"
          aria-label="Wait Turn"
        >
          <Disc className="w-4 h-4 animate-spin" />
        </button>

        <button
          onClick={() => onMove(1, 0)}
          className="flex items-center justify-center rounded-r-lg bg-cyan-950/60 active:bg-cyan-600 text-cyan-300 border border-cyan-500/30 active:scale-95 transition"
          aria-label="Move Right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div />
        <button
          onClick={() => onMove(0, 1)}
          className="flex items-center justify-center rounded-b-lg bg-cyan-950/60 active:bg-cyan-600 text-cyan-300 border border-cyan-500/30 active:scale-95 transition"
          aria-label="Move Down"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div />
      </div>

      {/* Quick Action Side Buttons with Vibrant Canvas Rendering */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <CanvasButton
          label="BAG"
          icon="🎒"
          theme="cyan"
          width={70}
          height={48}
          aria-label="Mobile Inventory BAG"
          onClick={onOpenInventory}
        />
        <CanvasButton
          label="TECH"
          icon="⚡"
          theme="purple"
          width={70}
          height={48}
          aria-label="Mobile Tech Tree TECH"
          onClick={onOpenSkillTree}
        />
      </div>
    </div>
  );
};
