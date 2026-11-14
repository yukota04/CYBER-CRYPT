import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  /** Normalized stick vector (-1..1). Called continuously while active. */
  onMove: (dx: number, dy: number) => void;
  /** Fired when the stick is released (vector becomes 0,0). */
  onRelease?: () => void;
  disabled?: boolean;
}

const BASE_SIZE = 148; // outer ring — large enough for thumbs
const KNOB_SIZE = 72;
const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2; // ~38px
const DEADZONE = 0.12;

/**
 * Roblox-style dynamic virtual joystick for mobile.
 * Appears where the thumb touches on the left half of the screen.
 */
export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onRelease,
  disabled = false
}) => {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const onMoveRef = useRef(onMove);
  const onReleaseRef = useRef(onRelease);
  onMoveRef.current = onMove;
  onReleaseRef.current = onRelease;

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onMoveRef.current(0, 0);
    onReleaseRef.current?.();
  }, []);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const ox = originRef.current.x;
    const oy = originRef.current.y;
    let dx = clientX - ox;
    let dy = clientY - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_TRAVEL && dist > 0) {
      dx = (dx / dist) * MAX_TRAVEL;
      dy = (dy / dist) * MAX_TRAVEL;
    }
    setKnob({ x: dx, y: dy });
    let nx = dx / MAX_TRAVEL;
    let ny = dy / MAX_TRAVEL;
    const mag = Math.hypot(nx, ny);
    if (mag < DEADZONE) {
      onMoveRef.current(0, 0);
      return;
    }
    // Remap deadzone → full range
    const scaled = (mag - DEADZONE) / (1 - DEADZONE);
    nx = (nx / mag) * scaled;
    ny = (ny / mag) * scaled;
    onMoveRef.current(nx, ny);
  }, []);

  useEffect(() => {
    if (disabled) reset();
  }, [disabled, reset]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return;
      e.preventDefault();
      updateFromPoint(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pointerIdRef.current === null || e.pointerId !== pointerIdRef.current) return;
      reset();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [reset, updateFromPoint]);

  const handleZoneDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (pointerIdRef.current !== null) return;
    // Only left ~48% of the screen (thumb zone), ignore UI chrome
    if (e.clientX > window.innerWidth * 0.48) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [data-no-joystick]')) return;

    e.preventDefault();
    e.stopPropagation();
    pointerIdRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
    setOrigin({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
    setActive(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      data-testid="virtual-joystick-zone"
      className="sm:hidden fixed inset-0 z-[25] pointer-events-none"
      style={{ touchAction: 'none' }}
    >
      {/* Active capture zone — left half, above bottom skill bar */}
      <div
        className="absolute left-0 top-0 bottom-36 w-[48%] pointer-events-auto"
        style={{ touchAction: 'none' }}
        onPointerDown={handleZoneDown}
        aria-hidden
      />

      {/* Idle hint pad (always visible so players find it) */}
      {!active && !disabled && (
        <div
          data-testid="virtual-joystick-hint"
          className="absolute left-4 bottom-36 w-[148px] h-[148px] rounded-full border-2 border-cyan-400/35 bg-cyan-950/25 pointer-events-none flex items-center justify-center"
        >
          <div className="w-[72px] h-[72px] rounded-full bg-cyan-400/20 border border-cyan-300/40 shadow-[0_0_18px_rgba(0,240,255,0.25)]" />
        </div>
      )}

      {active && (
        <div
          data-testid="virtual-joystick"
          className="pointer-events-none absolute"
          style={{
            left: origin.x - BASE_SIZE / 2,
            top: origin.y - BASE_SIZE / 2,
            width: BASE_SIZE,
            height: BASE_SIZE
          }}
        >
          <div className="absolute inset-0 rounded-full border-[3px] border-cyan-300/55 bg-[#0a0820]/55 shadow-[0_0_28px_rgba(0,240,255,0.35)] backdrop-blur-[2px]" />
          <div
            className="absolute rounded-full bg-gradient-to-br from-cyan-300 to-cyan-500 border-2 border-white/70 shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              left: BASE_SIZE / 2 - KNOB_SIZE / 2 + knob.x,
              top: BASE_SIZE / 2 - KNOB_SIZE / 2 + knob.y
            }}
          />
        </div>
      )}
    </div>
  );
};
