import React, { useRef, useState } from 'react';
import { InputState } from '../types/game';
import {
  Car,
  Target,
  Crosshair,
  ArrowUp,
  Shield,
  Plus,
  RotateCcw,
  Menu,
} from 'lucide-react';

interface TouchControlsProps {
  inputState: React.MutableRefObject<InputState>;
  inVehicle: boolean;
  onPause: () => void;
  gloowallsCount: number;
  medkitsCount: number;
  opacity: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  inputState,
  inVehicle,
  onPause,
  gloowallsCount,
  medkitsCount,
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

    const normX = clampedX / maxRadius;
    const normY = clampedY / maxRadius;

    inputState.current.forward = normY < -0.25;
    inputState.current.backward = normY > 0.25;
    inputState.current.left = normX < -0.25;
    inputState.current.right = normX > 0.25;
    inputState.current.sprint = normY < -0.7; // Sprint lock when pushing up fully
  };

  const handleStickEnd = () => {
    setIsStickActive(false);
    setStickPos({ x: 0, y: 0 });
    inputState.current.forward = false;
    inputState.current.backward = false;
    inputState.current.left = false;
    inputState.current.right = false;
    inputState.current.sprint = false;
  };

  // Right-side Camera Touch Swipe look
  const handleLookStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX > window.innerWidth / 2.2) {
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
    <div className="absolute inset-0 pointer-events-none select-none z-30" style={{ opacity }}>
      {/* Right-half Camera swipe look surface */}
      <div
        className="absolute top-0 right-0 w-1/2 h-3/4 pointer-events-auto"
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
      />

      {/* Top right quick pause button */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <button
          onClick={onPause}
          className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-slate-300 active:scale-95 transition shadow-lg"
          title="Pause"
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
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-300 shadow-md transform transition-transform"
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            }}
          />
        </div>
      </div>

      {/* Bottom-Right: Modern Battle Royale Action Cluster */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Upper Action Row: Enter Car & Gloo Wall & Medkit */}
        <div className="flex items-center gap-2">
          {/* Enter / Exit Car Button */}
          <button
            onTouchStart={() => (inputState.current.interact = true)}
            onTouchEnd={() => (inputState.current.interact = false)}
            onMouseDown={() => (inputState.current.interact = true)}
            onMouseUp={() => (inputState.current.interact = false)}
            className="w-12 h-12 rounded-2xl bg-amber-500/90 border border-amber-300 text-slate-950 font-bold flex flex-col items-center justify-center active:scale-90 transition shadow-xl"
          >
            <Car className="w-5 h-5" />
            <span className="text-[8px] font-black">{inVehicle ? 'EXIT' : 'DRIVE'}</span>
          </button>

          {/* Gloo Wall Deploy */}
          <button
            onTouchStart={() => (inputState.current.gloowall = true)}
            onTouchEnd={() => (inputState.current.gloowall = false)}
            onMouseDown={() => (inputState.current.gloowall = true)}
            onMouseUp={() => (inputState.current.gloowall = false)}
            className="w-12 h-12 rounded-2xl bg-sky-600/90 border border-sky-400 text-white flex flex-col items-center justify-center active:scale-90 transition shadow-lg"
          >
            <Shield className="w-5 h-5 text-sky-200" />
            <span className="text-[8px] font-black">GLOO ({gloowallsCount})</span>
          </button>

          {/* Medkit Heal */}
          <button
            onTouchStart={() => (inputState.current.heal = true)}
            onTouchEnd={() => (inputState.current.heal = false)}
            onMouseDown={() => (inputState.current.heal = true)}
            onMouseUp={() => (inputState.current.heal = false)}
            className="w-12 h-12 rounded-2xl bg-emerald-600/90 border border-emerald-400 text-white flex flex-col items-center justify-center active:scale-90 transition shadow-lg"
          >
            <Plus className="w-5 h-5 text-emerald-200" />
            <span className="text-[8px] font-black">HEAL ({medkitsCount})</span>
          </button>

          {/* Reload Button */}
          <button
            onTouchStart={() => (inputState.current.reload = true)}
            onTouchEnd={() => (inputState.current.reload = false)}
            onMouseDown={() => (inputState.current.reload = true)}
            onMouseUp={() => (inputState.current.reload = false)}
            className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-600 text-amber-400 flex flex-col items-center justify-center active:scale-90 transition shadow-lg"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="text-[8px] font-black">RELOAD</span>
          </button>
        </div>

        {/* Middle Action Row: ADS Aim & Fire Button */}
        <div className="flex items-center gap-3">
          {/* ADS Aim Down Sights (Toggle or Hold) */}
          <button
            onTouchStart={() => (inputState.current.aim = !inputState.current.aim)}
            onMouseDown={() => (inputState.current.aim = !inputState.current.aim)}
            className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center active:scale-90 transition shadow-xl ${
              inputState.current.aim
                ? 'bg-amber-500 border-amber-300 text-slate-950 font-black'
                : 'bg-slate-900/90 border-slate-700 text-sky-400'
            }`}
          >
            <Crosshair className="w-6 h-6" />
            <span className="text-[9px] font-black">SCOPE</span>
          </button>

          {/* Giant Fire Button */}
          <button
            onTouchStart={() => (inputState.current.shoot = true)}
            onTouchEnd={() => (inputState.current.shoot = false)}
            onMouseDown={() => (inputState.current.shoot = true)}
            onMouseUp={() => (inputState.current.shoot = false)}
            className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 border-2 border-rose-300 text-white flex flex-col items-center justify-center active:scale-90 transition shadow-[0_0_25px_rgba(239,68,68,0.6)]"
          >
            <Target className="w-8 h-8" />
            <span className="text-[10px] font-black tracking-wider">FIRE</span>
          </button>
        </div>

        {/* Lower Action Row: Stances (Prone, Crouch, Jump) */}
        <div className="flex items-center gap-2">
          {/* Prone crawl */}
          <button
            onTouchStart={() => (inputState.current.prone = !inputState.current.prone)}
            onMouseDown={() => (inputState.current.prone = !inputState.current.prone)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xs font-black transition active:scale-90 ${
              inputState.current.prone
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-900/90 text-slate-300 border-slate-700'
            }`}
          >
            PRONE
          </button>

          {/* Crouch */}
          <button
            onTouchStart={() => (inputState.current.crouch = !inputState.current.crouch)}
            onMouseDown={() => (inputState.current.crouch = !inputState.current.crouch)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xs font-black transition active:scale-90 ${
              inputState.current.crouch
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-900/90 text-slate-300 border-slate-700'
            }`}
          >
            CROUCH
          </button>

          {/* Jump */}
          <button
            onTouchStart={() => (inputState.current.jump = true)}
            onTouchEnd={() => (inputState.current.jump = false)}
            onMouseDown={() => (inputState.current.jump = true)}
            onMouseUp={() => (inputState.current.jump = false)}
            className="w-13 h-13 rounded-2xl bg-indigo-600/90 border border-indigo-400 text-white flex flex-col items-center justify-center active:scale-90 transition shadow-lg"
          >
            <ArrowUp className="w-6 h-6" />
            <span className="text-[8px] font-black">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
