import React from 'react';
import { X, Smartphone, Download, Terminal, CheckCircle2, ShieldCheck, Gamepad2 } from 'lucide-react';

interface AndroidGuideModalProps {
  onClose: () => void;
}

export const AndroidGuideModal: React.FC<AndroidGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">ANDROID PLAY & APK EXPORT GUIDE</h2>
              <div className="text-xs text-slate-400">Nono City Life • Mobile & PC Cross-Platform Architecture</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed">
          {/* Method 1: Instant PWA Install on Android */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-400 mb-2">
              <Download className="w-4 h-4" />
              <span>METHOD 1: Instant Android Home Screen App (PWA)</span>
            </div>
            <p className="mb-2">
              You can install and run <strong>Nono City Life</strong> directly as a standalone full-screen Android app without installing Android Studio:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 font-medium">
              <li>Open this game URL on your Android Chrome browser.</li>
              <li>Tap the three dots menu (⋮) in the top-right corner of Chrome.</li>
              <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
              <li>Launch the game from your Android app drawer with full hardware acceleration, custom orientation, and zero browser URL bars!</li>
            </ol>
          </div>

          {/* Method 2: Native Android APK Export via Capacitor */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400 mb-2">
              <Terminal className="w-4 h-4" />
              <span>METHOD 2: Build a Native .APK or .AAB with Capacitor</span>
            </div>
            <p className="mb-2">
              This project uses standard modern Vite + TypeScript + Three.js, making it 100% turnkey to package into a native Google Play Store APK / AAB using Capacitor:
            </p>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-emerald-300 space-y-1">
              <div># 1. Build the production web bundle</div>
              <div className="text-white">npm run build</div>
              <div># 2. Add Capacitor Android runtime</div>
              <div className="text-white">npm i @capacitor/core @capacitor/android</div>
              <div className="text-white">npx cap init &quot;Nono City Life&quot; &quot;com.nonocitylife.game&quot;</div>
              <div className="text-white">npx cap add android</div>
              <div className="text-white">npx cap copy android</div>
              <div># 3. Open in Android Studio & Generate Signed APK</div>
              <div className="text-white">npx cap open android</div>
            </div>
          </div>

          {/* Implemented Features Checklist */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Implemented Features in this Release</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>3D Third-Person Character Locomotion & Animations</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>6 Vehicle Classes with Real Acceleration & Drifting</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Seamless Enter / Exit Car & Garage Mechanics</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Weapons Combat (Pistol, SMG, Carbine, Shotgun, Sniper)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>5-Star Wanted Police Pursuit System with Sirens</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pedestrian Crowd & Moving Traffic AI</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Interactive In-Game Smartphone (iNono OS)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Day/Night Lighting Transitions & Weather (Rain/Clear)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Procedural Web Audio Engine (Engines, Sirens, Radio)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Story Missions, Checkpoint Racing & Vault Heist</span>
              </div>
            </div>
          </div>

          {/* PC Controls Reference */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400 mb-2">
              <Gamepad2 className="w-4 h-4" />
              <span>PC Keyboard & Mouse Mapping</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
              <div><strong className="text-white">WASD:</strong> Move / Steer</div>
              <div><strong className="text-white">Shift:</strong> Sprint / Nitro</div>
              <div><strong className="text-white">Space:</strong> Jump / Drift</div>
              <div><strong className="text-white">E / Enter:</strong> Drive / Exit</div>
              <div><strong className="text-white">Left Click / F:</strong> Shoot</div>
              <div><strong className="text-white">Right Click:</strong> Aim Zoom</div>
              <div><strong className="text-white">R:</strong> Reload</div>
              <div><strong className="text-white">Tab:</strong> Smartphone</div>
              <div><strong className="text-white">Esc:</strong> Pause Menu</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
          >
            Got it, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
