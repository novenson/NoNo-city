import React, { useRef, useState, useEffect } from 'react';
import { InputState } from '../types/game';
import { Car, Zap, ArrowUp, Crosshair, Target, Smartphone, Menu, Disc } from 'lucide-react';

interface TouchControlsProps {
  inputState: React.MutableRefObject<InputState>;
  inVehicle: boolean;
  onOpenPhone: () => void;
  onPause: () => void;
  opacity: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  inputState,
  inVehicle,
  onOpenPhone,
  onPause,
  opacity,
}) => {
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState(false);
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleStickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    setIsStickActive(true);
    handleStickMove(e);
  };

  const handleStickMove = (e: React.TouchEvent) => {
    if (!isStickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickCenterRef.current.x;
    const dy = touch.clientY - joystickCenterRef.current.y;
    const maxRadius = 45;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setStickPos({ x: clampedX, y: clampedY });

    // Normalize to -1 to 1 input
    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;

    inputState.current.forward = normY < -0.3;
    inputState.current.backward = normY > 0.3;
    inputState.current.left = normX < -0.3;
    inputState.current.right = normX > 0.3;
  };

  const handleStickEnd = () => {
    setIsStickActive(false);
    setStickPos({ x: 0, y: 0 });
    inputState.current.forward = false;
    inputState.current.backward = false;
    inputState.current.left = false;
    inputState.current.right = false;
  };

  // Right-side Camera Touch Swipe look
  const handleLookStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX > window.innerWidth / 2) {
        lookTouchIdRef.current = t.identifier;
        lastLookPosRef.current = { x: t.clientX, y: t.clientY };
        break;
      }
    }
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchIdRef.current) {
        const dx = t.clientX - lastLookPosRef.current.x;
        const dy = t.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: t.clientX, y: t.clientY };

        inputState.current.lookDeltaX += dx * 1.5;
        inputState.current.lookDeltaY += dy * 1.5;
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-30"
      style={{ opacity }}
    >
      {/* Right-half Camera swipe look surface */}
      <div
        className="absolute top-0 right-0 w-1/2 h-3/4 pointer-events-auto"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
      />

      {/* Top right quick actions: Phone & Pause */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onOpenPhone}
          className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-sky-400 active:scale-95 transition shadow-lg"
          title="Open Smartphone"
        >
          <Smartphone className="w-5 h-5" />
        </button>
        <button
          onClick={onPause}
          className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 transition shadow-lg"
          title="Pause Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom-Left: Virtual Movement Joystick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          className="relative w-32 h-32 rounded-full bg-slate-950/70 border-2 border-slate-700/80 flex items-center justify-center touch-none shadow-2xl"
          onTouchStart={handleStickStart}
          onTouchMove={handleStickMove}
          onTouchEnd={handleStickEnd}
        >
          {/* Inner thumb nub */}
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-600 to-sky-400 border border-sky-300 shadow-md transform transition-transform"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Bottom-Right: Dedicated Action Buttons Cluster */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-3">
        {/* Upper Action Row: Aim & Shoot / Nitro */}
        <div className="flex items-center gap-3">
          {/* Enter / Exit Car Button */}
          <button
            onTouchStart={() => (inputState.current.interact = true)}
            onTouchEnd={() => (inputState.current.interact = false)}
            onMouseDown={() => (inputState.current.interact = true)}
            onMouseUp={() => (inputState.current.interact = false)}
            className="w-14 h-14 rounded-2xl bg-amber-500/90 border border-amber-300 text-slate-950 font-bold flex flex-col items-center justify-center active:scale-95 transition shadow-xl"
          >
            <Car className="w-6 h-6" />
            <span className="text-[9px] font-black">{inVehicle ? 'EXIT' : 'DRIVE'}</span>
          </button>

          {/* Aim or Horn */}
          <button
            onTouchStart={() => {
              if (inVehicle) inputState.current.horn = true;
              else inputState.current.aim = true;
            }}
            onTouchEnd={() => {
              if (inVehicle) inputState.current.horn = false;
              else inputState.current.aim = false;
            }}
            onMouseDown={() => {
              if (inVehicle) inputState.current.horn = true;
              else inputState.current.aim = true;
            }}
            onMouseUp={() => {
              if (inVehicle) inputState.current.horn = false;
              else inputState.current.aim = false;
            }}
            className="w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700 text-sky-400 flex flex-col items-center justify-center active:scale-95 transition shadow-lg"
          >
            {inVehicle ? <Disc className="w-6 h-6" /> : <Crosshair className="w-6 h-6" />}
            <span className="text-[9px] font-bold">{inVehicle ? 'HORN' : 'AIM'}</span>
          </button>

          {/* Fire / Punch Button */}
          <button
            onTouchStart={() => (inputState.current.shoot = true)}
            onTouchEnd={() => (inputState.current.shoot = false)}
            onMouseDown={() => (inputState.current.shoot = true)}
            onMouseUp={() => (inputState.current.shoot = false)}
            className="w-16 h-16 rounded-3xl bg-rose-600/90 border border-rose-400 text-white flex flex-col items-center justify-center active:scale-95 transition shadow-xl"
          >
            <Target className="w-7 h-7" />
            <span className="text-[9px] font-black">{inVehicle ? 'FIRE' : 'FIRE'}</span>
          </button>
        </div>

        {/* Lower Action Row: Sprint/Nitro & Jump/Handbrake */}
        <div className="flex items-center gap-3">
          {/* Sprint / Nitro */}
          <button
            onTouchStart={() => (inputState.current.sprint = true)}
            onTouchEnd={() => (inputState.current.sprint = false)}
            onMouseDown={() => (inputState.current.sprint = true)}
            onMouseUp={() => (inputState.current.sprint = false)}
            className="w-13 h-13 rounded-2xl bg-indigo-600/90 border border-indigo-400 text-white flex flex-col items-center justify-center active:scale-95 transition shadow-lg"
          >
            <Zap className="w-5 h-5 text-amber-300" />
            <span className="text-[9px] font-bold">{inVehicle ? 'NITRO' : 'RUN'}</span>
          </button>

          {/* Jump / Handbrake */}
          <button
            onTouchStart={() => {
              if (inVehicle) inputState.current.handbrake = true;
              else inputState.current.jump = true;
            }}
            onTouchEnd={() => {
              if (inVehicle) inputState.current.handbrake = false;
              else inputState.current.jump = false;
            }}
            onMouseDown={() => {
              if (inVehicle) inputState.current.handbrake = true;
              else inputState.current.jump = true;
            }}
            onMouseUp={() => {
              if (inVehicle) inputState.current.handbrake = false;
              else inputState.current.jump = false;
            }}
            className="w-14 h-14 rounded-2xl bg-sky-600/90 border border-sky-400 text-white flex flex-col items-center justify-center active:scale-95 transition shadow-lg"
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[9px] font-black">{inVehicle ? 'DRIFT' : 'JUMP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
