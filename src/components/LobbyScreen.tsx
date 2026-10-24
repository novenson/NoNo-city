import React, { useState } from 'react';
import { PlayerStats, GameMode, GraphicsSettings, WeaponType } from '../types/game';
import { WEAPON_DATABASE } from '../game/weapons/WeaponDatabase';
import { OUTFIT_PRESETS } from '../game/entities/PlayerEntity';
import {
  Play,
  Shield,
  Trophy,
  Coins,
  Gem,
  Settings,
  Users,
  Compass,
  Sparkles,
  Shirt,
  Crosshair,
  Smile,
  ListTodo,
  Smartphone,
  Check,
  ChevronRight,
  Flame,
  X,
} from 'lucide-react';

interface LobbyScreenProps {
  playerStats: PlayerStats;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onStartMatch: () => void;
  onEquipOutfit: (outfitId: string) => void;
  onEquipWeapon: (slot: 'primary1' | 'primary2' | 'secondary' | 'melee', weaponId: WeaponType) => void;
  onPlayEmote: (emote: string) => void;
  onClaimReward: (gold: number, diamonds: number, xp: number) => void;
  settings: GraphicsSettings;
  onUpdateSettings: (newSettings: Partial<GraphicsSettings>) => void;
  onOpenAndroidGuide: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  playerStats,
  selectedMode,
  onSelectMode,
  onStartMatch,
  onEquipOutfit,
  onEquipWeapon,
  onPlayEmote,
  onClaimReward,
  settings,
  onUpdateSettings,
  onOpenAndroidGuide,
}) => {
  // Active sub-modals
  const [activeModal, setActiveModal] = useState<
    'none' | 'mode_select' | 'armory' | 'vault' | 'emotes' | 'missions' | 'settings'
  >('none');

  // Armory selected weapon for comparison inspection
  const initialArmoryWeapon: WeaponType =
    playerStats?.primaryWeapon1 && WEAPON_DATABASE[playerStats.primaryWeapon1]
      ? playerStats.primaryWeapon1
      : 'ak47';
  const [selectedArmoryWeapon, setSelectedArmoryWeapon] = useState<WeaponType>(initialArmoryWeapon);
  const armoryWep = WEAPON_DATABASE[selectedArmoryWeapon] || WEAPON_DATABASE.ak47;

  // Daily claimed state
  const [dailyClaimed, setDailyClaimed] = useState(false);

  const modeDescriptions: Record<GameMode, { title: string; desc: string; icon: string; badge: string }> = {
    br_squad: {
      title: 'BATTLE ROYALE — SQUAD',
      desc: '4-Player squad match with AI bot allies. Shrinking safe zone, tactical gloo walls.',
      icon: '🏆',
      badge: 'RANKED',
    },
    br_duo: {
      title: 'BATTLE ROYALE — DUO',
      desc: 'Pair up with a partner to outlast 10 teams in fast-paced suburban warfare.',
      icon: '👥',
      badge: 'POPULAR',
    },
    br_solo: {
      title: 'BATTLE ROYALE — SOLO',
      desc: '24 Players, 1 Survivor. Pure gunskill, gloo wall reflexes, and positioning.',
      icon: '👑',
      badge: 'INTENSE',
    },
    clash_squad: {
      title: 'CLASH SQUAD 4v4',
      desc: 'Round-based competitive shootout. Buy weapons each round, first to 4 wins.',
      icon: '⚡',
      badge: 'TACTICAL',
    },
    training: {
      title: 'TRAINING GROUNDS',
      desc: 'Infinite ammo target range, gloo wall drill practice, and obstacle sprint course.',
      icon: '🎯',
      badge: 'PRACTICE',
    },
    open_world: {
      title: 'OPEN WORLD METROPOLIS',
      desc: 'Drive supercars, explore luxury villas, visit stores, and roam freely.',
      icon: '🏙️',
      badge: 'FREEDOM',
    },
  };

  return (
    <div className="absolute inset-0 select-none overflow-hidden z-20 flex flex-col justify-between p-3 md:p-6 pointer-events-none">
      {/* === TOP BANNER BAR === */}
      <div className="flex items-start justify-between w-full pointer-events-auto">
        {/* Top-Left: Player Profile Card */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 shadow-2xl">
          {/* Avatar & Rank Frame */}
          <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 flex items-center justify-center shadow-lg">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
              {playerStats.avatar}
            </div>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white">
              LV.{playerStats.level}
            </span>
          </div>

          {/* User Details */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-black text-white">{playerStats.username}</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-600/90 text-white font-mono">
                {playerStats.rank}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{playerStats.id}</span>

            {/* XP Progression Bar (1.5x formula) */}
            <div className="w-32 md:w-44 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (playerStats.xp / playerStats.xpRequired) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right: Currencies & Settings Cluster */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Gold Coin */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-xl border border-yellow-500/30 shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs md:text-sm font-black font-mono text-yellow-400 tabular-nums">
              {playerStats.gold.toLocaleString()}
            </span>
          </div>

          {/* Diamonds */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-lg">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span className="text-xs md:text-sm font-black font-mono text-cyan-400 tabular-nums">
              {playerStats.diamonds.toLocaleString()}
            </span>
          </div>

          {/* Android APK Download Guide */}
          <button
            onClick={onOpenAndroidGuide}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl shadow-lg font-bold text-xs active:scale-95 transition"
            title="Download Android APK"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">BUILD APK</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setActiveModal('settings')}
            className="w-10 h-10 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center shadow-lg active:scale-95 transition"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* === LEFT SIDE NAVIGATION BAR === */}
      <div className="flex flex-col gap-2.5 pointer-events-auto my-auto max-w-fit">
        {/* Armory (Weapon Upgrade & Specs) */}
        <button
          onClick={() => setActiveModal('armory')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 shadow-xl text-left active:scale-95 transition group"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 group-hover:scale-105 transition">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-black text-white">ARMORY</div>
            <div className="text-[10px] text-slate-400">14 Weapons</div>
          </div>
        </button>

        {/* Vault / Locker (Outfits) */}
        <button
          onClick={() => setActiveModal('vault')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 shadow-xl text-left active:scale-95 transition group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 group-hover:scale-105 transition">
            <Shirt className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-black text-white">VAULT</div>
            <div className="text-[10px] text-slate-400">Outfits & Skins</div>
          </div>
        </button>

        {/* Emote Wheel */}
        <button
          onClick={() => setActiveModal('emotes')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 shadow-xl text-left active:scale-95 transition group"
        >
          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center border border-yellow-500/30 group-hover:scale-105 transition">
            <Smile className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-black text-white">EMOTES</div>
            <div className="text-[10px] text-slate-400">Victory Dances</div>
          </div>
        </button>

        {/* Missions & Rewards */}
        <button
          onClick={() => setActiveModal('missions')}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 shadow-xl text-left active:scale-95 transition group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition">
            <ListTodo className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-black text-white">MISSIONS</div>
            <div className="text-[10px] text-emerald-400 font-bold">Daily Free Gifts</div>
          </div>
        </button>
      </div>

      {/* === BOTTOM ACTION BAR === */}
      <div className="flex items-end justify-between w-full pointer-events-auto">
        {/* Bottom-Left: 4-Player Team Squad Slots */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-md shadow-2xl">
          {/* Slot 1: You */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 w-16 md:w-20">
            <span className="text-xl">👑</span>
            <span className="text-[10px] font-bold text-white truncate max-w-full">YOU</span>
            <span className="text-[8px] font-black text-emerald-400 uppercase">LEADER</span>
          </div>

          {/* Slot 2: Bot 1 */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 w-16 md:w-20">
            <span className="text-xl">🎯</span>
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-full">ACE</span>
            <span className="text-[8px] font-black text-sky-400 uppercase">READY</span>
          </div>

          {/* Slot 3: Bot 2 */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 w-16 md:w-20">
            <span className="text-xl">⚡</span>
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-full">VIPER</span>
            <span className="text-[8px] font-black text-sky-400 uppercase">READY</span>
          </div>

          {/* Slot 4: Bot 3 */}
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/60 border border-slate-800 w-16 md:w-20">
            <span className="text-xl">🔥</span>
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-full">FRANK</span>
            <span className="text-[8px] font-black text-sky-400 uppercase">READY</span>
          </div>
        </div>

        {/* Bottom-Right: Mode Selector & Huge Start Match Button */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          {/* Mode Selector Card */}
          <button
            onClick={() => setActiveModal('mode_select')}
            className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl active:scale-95 transition text-left"
          >
            <div className="text-2xl">{modeDescriptions[selectedMode].icon}</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                  {modeDescriptions[selectedMode].badge}
                </span>
              </div>
              <div className="text-sm font-black text-white">{modeDescriptions[selectedMode].title}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Glowing Animated START MATCH Button */}
          <button
            onClick={onStartMatch}
            className="relative px-8 md:px-12 py-4 md:py-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-lg md:text-xl tracking-wider shadow-[0_0_35px_rgba(245,158,11,0.5)] active:scale-95 transition flex items-center gap-2 group"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>START MATCH</span>
          </button>
        </div>
      </div>

      {/* ================= MODALS OVERLAYS ================= */}

      {/* 1. MODE SELECTOR MODAL */}
      {activeModal === 'mode_select' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Compass className="w-6 h-6 text-amber-400" />
                SELECT GAME MODE
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {(Object.keys(modeDescriptions) as GameMode[]).map(mode => {
                const info = modeDescriptions[mode];
                const isSelected = selectedMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      onSelectMode(mode);
                      setActiveModal('none');
                    }}
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 text-left transition active:scale-95 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-3xl">{info.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white">{info.title}</span>
                        <span className="text-[9px] font-black uppercase text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {info.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{info.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. ARMORY MODAL (14 Weapon Database with Comparison Stat Bars) */}
      {activeModal === 'armory' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-5 md:p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Crosshair className="w-6 h-6 text-red-500" />
                NONO METROPOLIS ARMORY (14 WEAPONS)
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 flex-1 overflow-y-auto pr-1">
              {/* Weapons Catalog Grid */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(Object.keys(WEAPON_DATABASE) as WeaponType[]).map(wId => {
                  const wep = WEAPON_DATABASE[wId];
                  const isSelected = selectedArmoryWeapon === wId;
                  return (
                    <button
                      key={wId}
                      onClick={() => setSelectedArmoryWeapon(wId)}
                      className={`p-3 rounded-2xl border flex flex-col items-start gap-1 transition active:scale-95 text-left ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500 shadow-lg'
                          : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase text-amber-400">{wep.category}</span>
                      <span className="text-xs font-black text-white truncate w-full">{wep.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">DMG {wep.damage}</span>
                    </button>
                  );
                })}
              </div>

              {/* Weapon Detailed Inspection Card */}
              <div className="bg-slate-950/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-red-400">{armoryWep?.category || 'RIFLE'}</div>
                  <div className="text-lg font-black text-white mt-0.5">{armoryWep?.name || 'Assault Weapon'}</div>
                  <p className="text-xs text-slate-400 mt-1">{armoryWep?.description || ''}</p>

                  {/* Stat Bars */}
                  <div className="flex flex-col gap-2 mt-4">
                    {/* Damage */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>DAMAGE</span>
                        <span className="font-mono text-red-400">{armoryWep?.damage ?? 35}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${Math.min(100, ((armoryWep?.damage ?? 35) / 160) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Rate of Fire */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>RATE OF FIRE</span>
                        <span className="font-mono text-yellow-400">{armoryWep?.fireRate ?? 10}/s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${Math.min(100, ((armoryWep?.fireRate ?? 10) / 14) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Range */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>RANGE</span>
                        <span className="font-mono text-sky-400">{armoryWep?.range ?? 40}m</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-sky-400"
                          style={{ width: `${Math.min(100, ((armoryWep?.range ?? 40) / 180) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>ACCURACY</span>
                        <span className="font-mono text-emerald-400">{armoryWep?.accuracy ?? 70}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-emerald-400" style={{ width: `${armoryWep?.accuracy ?? 70}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Equip Buttons */}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onEquipWeapon('primary1', selectedArmoryWeapon)}
                      className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 font-bold text-xs active:scale-95 transition"
                    >
                      EQUIP PRI 1
                    </button>
                    <button
                      onClick={() => onEquipWeapon('primary2', selectedArmoryWeapon)}
                      className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 font-bold text-xs active:scale-95 transition"
                    >
                      EQUIP PRI 2
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VAULT / OUTFITS MODAL */}
      {activeModal === 'vault' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Shirt className="w-6 h-6 text-cyan-400" />
                CHARACTER VAULT
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {Object.entries(OUTFIT_PRESETS).map(([id, outfit]) => {
                const isEquipped = playerStats.outfitId === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onEquipOutfit(id);
                      setActiveModal('none');
                    }}
                    className={`p-4 rounded-2xl border flex items-center gap-3 text-left transition active:scale-95 ${
                      isEquipped
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-lg'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl border border-white/20 shadow"
                      style={{ backgroundColor: `#${outfit.jacketColor.toString(16).padStart(6, '0')}` }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-black text-white">{outfit.name}</div>
                      <div className="text-[10px] text-cyan-400 font-bold uppercase">
                        {isEquipped ? 'EQUIPPED' : 'TAP TO WEAR'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. EMOTES MODAL */}
      {activeModal === 'emotes' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Smile className="w-6 h-6 text-yellow-400" />
                EMOTE WHEEL
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { id: 'dance', name: 'Free Fire Hip-Hop Dance', icon: '💃' },
                { id: 'victory', name: 'Booyah Champion Salute', icon: '🏆' },
                { id: 'kungfu', name: 'Bruce Lee Kung Fu Kick', icon: '🥋' },
                { id: 'clap', name: 'Applause & Respect', icon: '👏' },
              ].map(emote => (
                <button
                  key={emote.id}
                  onClick={() => {
                    onPlayEmote(emote.id);
                    setActiveModal('none');
                  }}
                  className="p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 flex flex-col items-center gap-2 text-center transition active:scale-95"
                >
                  <span className="text-3xl">{emote.icon}</span>
                  <span className="text-xs font-bold text-slate-200">{emote.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. MISSIONS & DAILY REWARDS MODAL */}
      {activeModal === 'missions' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ListTodo className="w-6 h-6 text-emerald-400" />
                MISSIONS & DAILY REWARDS
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily Gift Claim */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 flex items-center justify-between mt-4">
              <div>
                <div className="text-xs font-black uppercase text-emerald-400">DAILY LOGIN REWARD</div>
                <div className="text-sm font-bold text-white mt-0.5">Free 2,500 Gold + 50 Diamonds</div>
              </div>
              <button
                disabled={dailyClaimed}
                onClick={() => {
                  setDailyClaimed(true);
                  onClaimReward(2500, 50, 500);
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs transition active:scale-95 ${
                  dailyClaimed
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                }`}
              >
                {dailyClaimed ? 'CLAIMED ✓' : 'CLAIM'}
              </button>
            </div>

            {/* Battle Missions List */}
            <div className="flex flex-col gap-2.5 mt-4">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Survive for 5 minutes in Battle Royale</div>
                  <div className="text-[10px] text-amber-400 font-mono">+1,000 Gold • +250 XP</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">IN PROGRESS</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Score 3 Headshots with Shotgun or Sniper</div>
                  <div className="text-[10px] text-amber-400 font-mono">+1,500 Gold • +30 Diamonds</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">IN PROGRESS</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">Deploy 5 Gloo Wall Barriers</div>
                  <div className="text-[10px] text-amber-400 font-mono">+800 Gold • +150 XP</div>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">IN PROGRESS</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SETTINGS MODAL (Presets, FPS Cap, Volume) */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 pointer-events-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-slate-400" />
                GRAPHICS & PERFORMANCE
              </h2>
              <button
                onClick={() => setActiveModal('none')}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              {/* Quality Presets */}
              <div>
                <label className="text-xs font-bold text-slate-300">GRAPHICS QUALITY</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => onUpdateSettings({ quality: q })}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition active:scale-95 ${
                        settings.quality === q
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target FPS Cap */}
              <div>
                <label className="text-xs font-bold text-slate-300">MAX FPS CAP</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {(['auto', 30, 60, 120] as const).map(fps => (
                    <button
                      key={fps}
                      onClick={() => onUpdateSettings({ fpsCap: fps })}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition active:scale-95 ${
                        settings.fpsCap === fps
                          ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {fps}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Sensitivity Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>CAMERA SENSITIVITY</span>
                  <span className="font-mono text-amber-400">{settings.cameraSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.cameraSensitivity}
                  onChange={e => onUpdateSettings({ cameraSensitivity: parseFloat(e.target.value) })}
                  className="w-full mt-1.5 accent-amber-400"
                />
              </div>

              {/* Sound Volume Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>SFX VOLUME</span>
                  <span className="font-mono text-emerald-400">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={e => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                  className="w-full mt-1.5 accent-emerald-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
