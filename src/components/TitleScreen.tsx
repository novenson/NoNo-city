import React from 'react';
import { Play, RotateCcw, Smartphone, Settings, Award } from 'lucide-react';

interface TitleScreenProps {
  onStartGame: () => void;
  onContinueGame: () => void;
  hasSaveData: boolean;
  onOpenAndroidGuide: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onContinueGame,
  hasSaveData,
  onOpenAndroidGuide,
  onOpenSettings,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none overflow-hidden">
      {/* Top Header & Tagline */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-semibold text-sky-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>NONO METROPOLIS v1.0 • OPEN WORLD 3D</span>
        </div>

        <button
          onClick={onOpenAndroidGuide}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 border border-indigo-400/50 text-xs font-bold text-white transition active:scale-95 shadow-lg"
        >
          <Smartphone className="w-4 h-4" />
          <span>Android APK & PWA Guide</span>
        </button>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup */}
      <div className="max-w-2xl my-auto pointer-events-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="w-full max-w-lg mb-2">
          <svg viewBox="0 0 600 120" className="w-full drop-shadow-2xl">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="60"
              fill="url(#titleGrad)"
              fontSize="68"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              letterSpacing="3"
            >
              NONO CITY
            </text>
            <text
              x="4"
              y="105"
              fill="#ffffff"
              fontSize="34"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="800"
              letterSpacing="12"
            >
              LIFE
            </text>
          </svg>
        </div>

        <p className="text-sm md:text-base text-slate-300 font-medium max-w-md mb-8 leading-relaxed drop-shadow">
          Drive supercars, complete undercover syndicate missions, explore luxury safehouses, and rule the streets of Nono Metropolis.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onStartGame}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-base md:text-lg shadow-xl shadow-sky-900/40 transition active:scale-95 border border-sky-300/30"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START GAME</span>
          </button>

          {hasSaveData && (
            <button
              onClick={onContinueGame}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm md:text-base border border-slate-700 transition active:scale-95 shadow-lg"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>CONTINUE SAVED</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700 transition active:scale-95"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Flat Single Control-Hint Line */}
      <div className="pointer-events-auto flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 backdrop-blur-none">
        <div className="font-mono tracking-wide text-slate-200">
          WASD Move · Space Jump/Brake · E Drive/Enter · F Shoot/Punch · Tab Phone · Esc Pause
        </div>
        <div className="flex items-center gap-2 mt-2 md:mt-0 text-slate-400">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span>Full Mobile Touchscreen Dual-Stick & Android Supported</span>
        </div>
      </div>
    </div>
  );
};
