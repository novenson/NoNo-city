import React from 'react';
import { GraphicsSettings } from '../types/game';
import { Play, Save, Volume2, Monitor, X, LogOut, Check } from 'lucide-react';

interface PauseModalProps {
  settings: GraphicsSettings;
  onUpdateSettings: (settings: Partial<GraphicsSettings>) => void;
  onResume: () => void;
  onSaveGame: () => void;
  onQuitToTitle: () => void;
  saveSuccess: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  settings,
  onUpdateSettings,
  onResume,
  onSaveGame,
  onQuitToTitle,
  saveSuccess,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-black text-white tracking-wide">GAME PAUSED</h2>
          <button
            onClick={onResume}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onResume}
              className="py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME GAME</span>
            </button>

            <button
              onClick={onSaveGame}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saveSuccess ? 'SAVED!' : 'SAVE PROGRESS'}</span>
            </button>
          </div>

          {/* Graphics Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span>Graphics Quality Preset</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => onUpdateSettings({ quality: q })}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition ${
                    settings.quality === q
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-pink-400" />
              <span>Audio Levels</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Sound Effects (SFX)</span>
                <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={e => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs text-slate-300 mt-2">
                <span>Radio & Music</span>
                <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={e => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="w-full accent-pink-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Camera Sensitivity Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Camera Look Sensitivity</span>
              <span className="font-mono">{settings.cameraSensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={settings.cameraSensitivity}
              onChange={e => onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Quit to Menu */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={onQuitToTitle}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Quit to Title Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
