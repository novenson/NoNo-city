import React from 'react';
import { PlayerStats, GroundLoot, KillFeedEntry, DamageNumber, SafeZoneState, SquadMember, WeaponType, WeaponStats } from '../types/game';
import { Shield, Heart, Crosshair, Zap, Target, Plus, AlertTriangle, Trophy, Skull } from 'lucide-react';
import { WEAPON_DATABASE } from '../game/weapons/WeaponDatabase';

interface HUDProps {
  playerStats: PlayerStats;
  squadMembers: SquadMember[];
  aliveCount: number;
  safeZone: SafeZoneState;
  killFeed: KillFeedEntry[];
  damageNumbers: DamageNumber[];
  nearbyLoot: GroundLoot[];
  onPickupLoot: (lootId: string) => void;
  onDeployGlooWall: () => void;
  onUseMedkit: () => void;
  onReload: () => void;
  onSwitchSlot: (slot: 'primary1' | 'primary2' | 'secondary' | 'melee') => void;
  onToggleFullscreenMap?: () => void;
  onPause: () => void;
  onReturnToLobby: () => void;
  playerYaw: number;
  isVictory: boolean;
  isDefeat: boolean;
  fps: number;
  notification: string | null;
}

export const HUD: React.FC<HUDProps> = ({
  playerStats,
  squadMembers,
  aliveCount,
  safeZone,
  killFeed,
  damageNumbers,
  nearbyLoot,
  onPickupLoot,
  onDeployGlooWall,
  onUseMedkit,
  onReload,
  onSwitchSlot,
  onPause,
  onReturnToLobby,
  playerYaw,
  isVictory,
  isDefeat,
  fps,
  notification,
}) => {
  const currentSlot = playerStats?.activeSlot || 'primary1';
  const slotWepId: WeaponType =
    currentSlot === 'primary1'
      ? playerStats?.primaryWeapon1 || 'ak47'
      : currentSlot === 'primary2'
      ? playerStats?.primaryWeapon2 || 'm1887'
      : currentSlot === 'secondary'
      ? playerStats?.secondaryWeapon || 'deagle'
      : playerStats?.meleeWeapon || 'katana';

  const activeWeapon: WeaponStats =
    (playerStats?.ownedWeapons && playerStats.ownedWeapons[slotWepId]) ||
    WEAPON_DATABASE[slotWepId] ||
    (playerStats?.ownedWeapons && playerStats.ownedWeapons.ak47) ||
    WEAPON_DATABASE.ak47;

  // Compass degrees calculation (0 - 360)
  const deg = Math.round(((-playerYaw * 180) / Math.PI + 360) % 360);
  const compassTicks = [
    { label: 'N', deg: 0 },
    { label: '45', deg: 45 },
    { label: 'E', deg: 90 },
    { label: '135', deg: 135 },
    { label: 'S', deg: 180 },
    { label: '225', deg: 225 },
    { label: 'W', deg: 270 },
    { label: '315', deg: 315 },
  ];

  // Minimap scaling
  const mapRadius = 55;
  const mapScale = 0.55;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-between p-2 md:p-4">
      {/* === FLOATING DAMAGE NUMBERS === */}
      {damageNumbers.map(dn => (
        <div
          key={dn.id}
          className={`absolute font-black pointer-events-none transition-transform duration-75 ${
            dn.isHeadshot
              ? 'text-red-500 text-2xl md:text-3xl drop-shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce'
              : 'text-amber-400 text-lg md:text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
          }`}
          style={{
            left: `${dn.screenX}px`,
            top: `${dn.screenY}px`,
            transform: 'translate(-50%, -50%)',
            opacity: dn.alpha,
          }}
        >
          {dn.damage}
          {dn.isHeadshot && <span className="text-xs ml-1 bg-red-600 text-white px-1 py-0.5 rounded">HS</span>}
        </div>
      ))}

      {/* === TOP SECTION === */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Squad Status Panel (Free Fire Style 4-player list) */}
        <div className="flex flex-col gap-1.5 bg-slate-950/75 p-2 rounded-2xl border border-slate-800 backdrop-blur-sm pointer-events-auto max-w-[210px] md:max-w-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">TEAM SQUAD</span>
            <span className="text-[10px] font-mono text-emerald-400">{fps} FPS</span>
          </div>

          {squadMembers.slice(0, 4).map((member, idx) => (
            <div key={member.id} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</span>
              <span className="text-sm">{member.avatar || '👑'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="truncate font-semibold text-slate-200">
                    {idx === 0 ? `${playerStats?.username || 'You'} (You)` : (member?.name || `Teammate ${idx + 1}`)}
                  </span>
                  {idx > 0 && <span className="text-slate-400 text-[9px] font-mono">{member.distance ?? 0}m</span>}
                </div>
                {/* Health Bar */}
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700/50">
                  <div
                    className={`h-full transition-all duration-150 ${
                      member.isDead
                        ? 'bg-slate-600'
                        : member.isKnocked
                        ? 'bg-amber-500 animate-pulse'
                        : idx === 0
                        ? 'bg-emerald-500'
                        : 'bg-sky-400'
                    }`}
                    style={{
                      width: `${
                        idx === 0
                          ? Math.max(0, ((playerStats?.health ?? 200) / (playerStats?.maxHealth ?? 200)) * 100)
                          : Math.max(0, ((member?.health ?? 200) / (member?.maxHealth ?? 200)) * 100)
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top-Center: Compass Tape & Match Status Counter */}
        <div className="flex flex-col items-center gap-1">
          {/* Compass Strip */}
          <div className="relative w-48 md:w-72 h-7 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center shadow-lg">
            <div className="absolute w-1 h-3.5 bg-amber-400 rounded-full z-10" />
            <div className="flex items-center gap-6 text-[10px] font-mono font-bold text-slate-400">
              {compassTicks.map(tick => {
                let diff = (tick.deg - deg + 540) % 360 - 180;
                if (Math.abs(diff) > 75) return null;
                return (
                  <div
                    key={tick.label}
                    className="flex flex-col items-center transition-all"
                    style={{ transform: `translateX(${diff * 1.5}px)` }}
                  >
                    <span className={tick.label === 'N' ? 'text-red-400 font-black text-xs' : 'text-slate-300'}>
                      {tick.label}
                    </span>
                    <span className="w-0.5 h-1.5 bg-slate-600 mt-0.5" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Match Status Ribbon: Alive & Kills */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 px-3 py-1 rounded-xl shadow-lg font-black text-xs md:text-sm">
              <Trophy className="w-3.5 h-3.5" />
              <span>{aliveCount} ALIVE</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950/85 text-red-400 border border-red-500/30 px-2.5 py-1 rounded-xl shadow-md font-mono font-bold text-xs">
              <Skull className="w-3.5 h-3.5" />
              <span>{playerStats.kills} KILLS</span>
            </div>
          </div>

          {/* Safe Zone Timer Banner */}
          <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold">
            <AlertTriangle className="w-3 h-3 text-cyan-400" />
            <span>
              {safeZone.isShrinking
                ? 'SAFE ZONE SHRINKING NOW!'
                : `SAFE ZONE: ${Math.max(0, Math.ceil(safeZone.shrinkTimer))}s`}
            </span>
          </div>
        </div>

        {/* Top-Right: Killfeed & Pause Menu */}
        <div className="flex flex-col items-end gap-2">
          {/* Pause button */}
          <button
            onClick={onPause}
            className="pointer-events-auto p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 active:scale-95 transition shadow-lg"
          >
            <span className="text-xs font-bold font-mono">PAUSE ⚙</span>
          </button>

          {/* Real-time Killfeed */}
          <div className="flex flex-col gap-1 items-end max-w-[200px] md:max-w-xs">
            {killFeed.slice(0, 3).map(entry => (
              <div
                key={entry.id}
                className="flex items-center gap-1.5 bg-slate-950/85 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] shadow animate-fade-in"
              >
                <span className="font-bold text-slate-200 truncate">{entry?.killer || 'Combatant'}</span>
                <span className="text-red-400 font-mono text-[9px]">[{entry?.weapon || 'Gun'}]</span>
                {entry?.isHeadshot && <span className="text-red-500 font-bold text-[9px]">🎯</span>}
                <span className="font-semibold text-slate-400 truncate">{entry?.victim || 'Player'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === CENTER: CROSSHAIR & PROXIMITY LOOT === */}
      <div className="relative flex-1 flex items-center justify-center">
        {/* Dynamic Center Crosshair */}
        <div className="relative w-8 h-8 pointer-events-none flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          <div className="absolute -top-2 w-0.5 h-2 bg-white/80" />
          <div className="absolute -bottom-2 w-0.5 h-2 bg-white/80" />
          <div className="absolute -left-2 w-2 h-0.5 bg-white/80" />
          <div className="absolute -right-2 w-2 h-0.5 bg-white/80" />
        </div>

        {/* Proximity Loot Window (Pops up when near ground loot) */}
        {nearbyLoot.length > 0 && (
          <div className="absolute right-4 md:right-16 top-1/4 flex flex-col gap-1.5 bg-slate-950/90 p-2.5 rounded-2xl border border-amber-500/40 shadow-2xl backdrop-blur-md pointer-events-auto max-w-[240px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] font-black uppercase text-amber-400 tracking-wider">
              <span>NEARBY LOOT</span>
              <span>TAP TO GRAB</span>
            </div>
            {nearbyLoot.slice(0, 3).map(item => (
              <button
                key={item.id}
                onClick={() => onPickupLoot(item.id)}
                className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 active:scale-95 transition text-left"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.rarity === 'legendary'
                        ? 'bg-amber-400'
                        : item.rarity === 'epic'
                        ? 'bg-purple-400'
                        : item.rarity === 'rare'
                        ? 'bg-sky-400'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-xs font-bold text-white truncate">{item?.name || 'Ground Loot'}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300 font-black">+{item?.amount ?? 1}</span>
              </button>
            ))}
          </div>
        )}

        {/* Global Notification Banner */}
        {notification && (
          <div className="absolute top-12 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white font-extrabold text-xs md:text-sm px-5 py-2 rounded-2xl shadow-2xl border border-sky-300/40 animate-pulse">
            {notification}
          </div>
        )}
      </div>

      {/* === BOTTOM SECTION === */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Circular Radar Minimap & Quick Utilities */}
        <div className="flex items-end gap-3 pointer-events-auto">
          {/* Circular Minimap */}
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-slate-950/90 border-2 border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center">
            {/* Safe zone circle */}
            <div className="absolute w-20 h-20 rounded-full border border-cyan-400/80 bg-cyan-500/10" />
            <div className="absolute w-12 h-12 rounded-full border border-dashed border-white/60" />

            {/* Radar Crosshair lines */}
            <div className="absolute w-full h-[1px] bg-slate-800/80" />
            <div className="absolute h-full w-[1px] bg-slate-800/80" />

            {/* Teammates blips */}
            {squadMembers.slice(1).map(m => (
              <div
                key={m.id}
                className="absolute w-2 h-2 rounded-full bg-emerald-400 border border-black"
                style={{
                  transform: `translate(${Math.sin(m.distance) * 20}px, ${Math.cos(m.distance) * 20}px)`,
                }}
              />
            ))}

            {/* Player Center Arrow Pointer */}
            <div
              className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-amber-400 drop-shadow"
              style={{ transform: `rotate(${-playerYaw}rad)` }}
            />
          </div>

          {/* Quick Gloo Wall & Medkit Utilities */}
          <div className="flex flex-col gap-2">
            {/* Gloo Wall Button */}
            <button
              onClick={onDeployGlooWall}
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-sky-900/90 hover:bg-sky-800 border-2 border-sky-400 text-sky-200 flex flex-col items-center justify-center active:scale-90 transition shadow-xl"
              title="Deploy Gloo Wall Barrier"
            >
              <Shield className="w-5 h-5 text-sky-300" />
              <span className="text-[9px] font-black">GLOO</span>
              <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white">
                {playerStats.gloowalls}
              </span>
            </button>

            {/* Medkit Button */}
            <button
              onClick={onUseMedkit}
              className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 border-2 border-emerald-400 text-emerald-200 flex flex-col items-center justify-center active:scale-90 transition shadow-xl"
              title="Use Medkit Healing (+75 HP)"
            >
              <Plus className="w-5 h-5 text-emerald-300" />
              <span className="text-[9px] font-black">HEAL</span>
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white">
                {playerStats.medkits}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom-Center: Dual HP & Armor Bar */}
        <div className="flex flex-col items-center gap-1.5 mb-1">
          {/* Armor Bar */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
            <div className="w-36 md:w-56 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all duration-150"
                style={{ width: `${Math.max(0, (playerStats.armor / playerStats.maxArmor) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-300">{Math.round(playerStats.armor)}</span>
          </div>

          {/* Health Bar (200 HP Free Fire Style) */}
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <div className="w-48 md:w-72 h-3.5 bg-slate-900 rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-lg">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (playerStats.health / playerStats.maxHealth) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-black text-emerald-400 tabular-nums">
              {Math.round(playerStats.health)} / 200
            </span>
          </div>
        </div>

        {/* Bottom-Right: 4 Weapon Quick-Slots & Ammo Counter */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          {/* Weapon Slots Grid */}
          <div className="flex items-center gap-1.5">
            {/* Slot 1: Primary 1 */}
            <button
              onClick={() => onSwitchSlot('primary1')}
              className={`px-3 py-1.5 rounded-xl border flex flex-col items-start transition active:scale-95 ${
                playerStats?.activeSlot === 'primary1'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <span className="text-[9px] font-black">PRI 1</span>
              <span className="text-xs font-black uppercase text-white truncate max-w-[70px]">
                {playerStats?.primaryWeapon1 || 'ak47'}
              </span>
            </button>

            {/* Slot 2: Primary 2 */}
            <button
              onClick={() => onSwitchSlot('primary2')}
              className={`px-3 py-1.5 rounded-xl border flex flex-col items-start transition active:scale-95 ${
                playerStats?.activeSlot === 'primary2'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <span className="text-[9px] font-black">PRI 2</span>
              <span className="text-xs font-black uppercase text-white truncate max-w-[70px]">
                {playerStats?.primaryWeapon2 || 'm1887'}
              </span>
            </button>

            {/* Slot 3: Pistol */}
            <button
              onClick={() => onSwitchSlot('secondary')}
              className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-start transition active:scale-95 ${
                playerStats?.activeSlot === 'secondary'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <span className="text-[9px] font-black">PISTOL</span>
              <span className="text-xs font-black uppercase text-white truncate max-w-[60px]">
                {playerStats?.secondaryWeapon || 'deagle'}
              </span>
            </button>

            {/* Slot 4: Melee */}
            <button
              onClick={() => onSwitchSlot('melee')}
              className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-start transition active:scale-95 ${
                playerStats?.activeSlot === 'melee'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <span className="text-[9px] font-black">MELEE</span>
              <span className="text-xs font-black uppercase text-white truncate max-w-[50px]">
                {playerStats?.meleeWeapon || 'katana'}
              </span>
            </button>
          </div>

          {/* Active Weapon Ammo & Reload */}
          <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-2xl shadow-2xl">
            <button
              onClick={onReload}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 active:scale-90 transition font-mono text-xs font-bold"
              title="Reload Ammo"
            >
              RELOAD ↺
            </button>

            <div className="text-right">
              <div className="text-xs font-extrabold text-slate-200">{activeWeapon?.name || 'Assault Rifle'}</div>
              {activeWeapon?.category !== 'melee' ? (
                <div className="text-xl md:text-2xl font-black font-mono text-amber-400 tabular-nums">
                  {activeWeapon?.currentMag ?? 30}{' '}
                  <span className="text-xs text-slate-500 font-semibold">/ {activeWeapon?.reserveAmmo ?? 90}</span>
                </div>
              ) : (
                <div className="text-sm font-mono font-bold text-slate-400">MELEE COMBAT</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === VICTORY "BOOYAH!" MODAL OVERLAY === */}
      {isVictory && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto p-4 animate-fade-in">
          <div className="text-5xl md:text-7xl font-black text-amber-400 tracking-widest drop-shadow-[0_0_35px_rgba(251,191,36,0.9)] animate-pulse mb-3">
            BOOYAH!
          </div>
          <p className="text-lg md:text-xl font-bold text-slate-200 mb-6">#1 CHAMPION OF NONO METROPOLIS</p>

          <div className="grid grid-cols-3 gap-4 max-w-md w-full bg-slate-900/80 p-5 rounded-2xl border border-amber-500/40 mb-6">
            <div className="text-center">
              <div className="text-xs text-slate-400">KILLS</div>
              <div className="text-2xl font-black text-amber-400">{playerStats.kills}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">GOLD EARNED</div>
              <div className="text-2xl font-black text-yellow-400">+{playerStats.kills * 200 + 500}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">EXP EARNED</div>
              <div className="text-2xl font-black text-sky-400">+{playerStats.kills * 100 + 350}</div>
            </div>
          </div>

          <button
            onClick={onReturnToLobby}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-lg shadow-2xl active:scale-95 transition"
          >
            RETURN TO LOBBY
          </button>
        </div>
      )}

      {/* === DEFEAT / GAME OVER OVERLAY === */}
      {isDefeat && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 pointer-events-auto p-4 animate-fade-in">
          <div className="text-4xl md:text-6xl font-black text-red-500 tracking-wider drop-shadow-[0_0_25px_rgba(239,68,68,0.8)] mb-2">
            ELIMINATED
          </div>
          <p className="text-base font-semibold text-slate-300 mb-6">Rank #{aliveCount + 1}</p>

          <div className="grid grid-cols-2 gap-4 max-w-xs w-full bg-slate-900/80 p-4 rounded-2xl border border-red-500/30 mb-6 text-center">
            <div>
              <div className="text-xs text-slate-400">KILLS</div>
              <div className="text-xl font-black text-red-400">{playerStats.kills}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">DAMAGE</div>
              <div className="text-xl font-black text-slate-200">{Math.round(playerStats.damageDealt)}</div>
            </div>
          </div>

          <button
            onClick={onReturnToLobby}
            className="px-8 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base shadow-xl active:scale-95 transition border border-slate-600"
          >
            RETURN TO LOBBY
          </button>
        </div>
      )}
    </div>
  );
};
