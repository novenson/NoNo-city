import React from 'react';
import { PlayerStats, Mission, VehicleConfig } from '../types/game';
import { Shield, Heart, DollarSign, Crosshair, Radio, Gauge, Zap } from 'lucide-react';

interface HUDProps {
  playerStats: PlayerStats;
  currentVehicle: VehicleConfig | null;
  vehicleSpeed: number;
  vehicleNitro: number;
  activeMission: Mission | null;
  radioStation: number;
  onToggleRadio: () => void;
  onCycleWeapon: () => void;
  notification: string | null;
  playerPos: [number, number, number];
  playerYaw: number;
}

export const HUD: React.FC<HUDProps> = ({
  playerStats,
  currentVehicle,
  vehicleSpeed,
  vehicleNitro,
  activeMission,
  radioStation,
  onToggleRadio,
  onCycleWeapon,
  notification,
  playerPos,
  playerYaw,
}) => {
  const currentWeapon = playerStats.ownedWeapons[playerStats.currentWeapon];

  const radioStationNames = ['RADIO OFF', 'NONO BEATS 98.5', 'ELECTRO CITY FM', 'SUNSET BOULEVARD'];

  // Calculate minimap blip coordinates (-150 to 150 range mapped to 120px minimap circle)
  const mapSize = 120;
  const mapScale = mapSize / 300; // 300m world to 120px

  const keyBlips = [
    { name: 'Home', pos: [-45, 45], color: '#38bdf8' },
    { name: 'Guns', pos: [45, 45], color: '#ef4444' },
    { name: 'Cars', pos: [45, -45], color: '#10b981' },
    { name: 'Mods', pos: [-45, -45], color: '#f59e0b' },
    { name: 'Bank', pos: [0, -75], color: '#eab308' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-between p-3 md:p-5">
      {/* === TOP BAR === */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Health, Armor, Cash Cluster */}
        <div className="flex flex-col gap-2">
          {/* Health & Armor Bars */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800 shadow-md">
            {/* Health */}
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-emerald-400 fill-emerald-500" />
              <div className="w-20 md:w-28 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${Math.max(0, (playerStats.health / playerStats.maxHealth) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">
                {Math.round(playerStats.health)}
              </span>
            </div>

            {/* Armor */}
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2">
              <Shield className="w-4 h-4 text-sky-400 fill-sky-500" />
              <div className="w-16 md:w-24 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{ width: `${Math.max(0, (playerStats.armor / playerStats.maxArmor) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-sky-400 tabular-nums">
                {Math.round(playerStats.armor)}
              </span>
            </div>
          </div>

          {/* Cash Display */}
          <div className="flex items-center gap-1 px-3 py-1 bg-slate-950/85 rounded-lg border border-slate-800 w-fit">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-base md:text-lg font-black text-emerald-400 font-mono tracking-wider tabular-nums">
              {playerStats.cash.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Top-Center Notification Banner */}
        {notification && (
          <div className="animate-bounce bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold text-xs md:text-sm px-4 py-2 rounded-xl shadow-xl border border-sky-300/40">
            {notification}
          </div>
        )}

        {/* Top-Right: Wanted Stars & Radio Station */}
        <div className="flex flex-col items-end gap-2">
          {/* Wanted Level 5 Stars */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
            {[1, 2, 3, 4, 5].map(star => {
              const isWanted = playerStats.wantedLevel >= star;
              return (
                <span
                  key={star}
                  className={`text-base md:text-lg transition-transform ${
                    isWanted ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'text-slate-700'
                  }`}
                >
                  ★
                </span>
              );
            })}
          </div>

          {/* Radio Station Widget (Interactive click) */}
          {currentVehicle && (
            <button
              onClick={onToggleRadio}
              className="pointer-events-auto flex items-center gap-2 px-3 py-1 bg-slate-950/85 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs font-mono transition active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-pink-300 font-semibold">{radioStationNames[radioStation]}</span>
            </button>
          )}
        </div>
      </div>

      {/* === CROSSHAIR RETICLE (When On Foot) === */}
      {!currentVehicle && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-4 h-4 rounded-full border border-sky-400/80 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-sky-300" />
          </div>
        </div>
      )}

      {/* === BOTTOM BAR === */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: Circular Radar Minimap */}
        <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-slate-950/90 border-2 border-slate-700 shadow-2xl overflow-hidden flex items-center justify-center">
          {/* Radar grid rings */}
          <div className="absolute inset-2 rounded-full border border-slate-800 pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-slate-800 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-slate-800/80" />
          <div className="absolute h-full w-[1px] bg-slate-800/80" />

          {/* Compass labels */}
          <span className="absolute top-1 text-[9px] font-bold text-slate-400">N</span>

          {/* Key location blips relative to center */}
          {keyBlips.map(b => {
            const relX = (b.pos[0] - playerPos[0]) * mapScale;
            const relZ = (b.pos[1] - playerPos[2]) * mapScale;
            if (Math.hypot(relX, relZ) > mapSize / 2 - 8) return null; // Outside radar boundary
            return (
              <div
                key={b.name}
                className="absolute w-2.5 h-2.5 rounded-full border border-black shadow"
                style={{
                  backgroundColor: b.color,
                  transform: `translate(${relX}px, ${relZ}px)`,
                }}
                title={b.name}
              />
            );
          })}

          {/* Active Mission Target Blip */}
          {activeMission?.targetPos && (
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-amber-400 border border-white animate-ping"
              style={{
                transform: `translate(${
                  (activeMission.targetPos[0] - playerPos[0]) * mapScale
                }px, ${(activeMission.targetPos[2] - playerPos[2]) * mapScale}px)`,
              }}
            />
          )}

          {/* Player Center Arrow Pointer */}
          <div
            className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-sky-400 drop-shadow"
            style={{ transform: `rotate(${-playerYaw}rad)` }}
          />
        </div>

        {/* Bottom-Center: Active Mission Banner */}
        {activeMission && (
          <div className="bg-slate-950/90 border border-amber-500/60 px-4 py-2 rounded-xl text-center shadow-xl max-w-sm mb-2">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">
              MISSION: {activeMission.title}
            </div>
            <div className="text-xs font-semibold text-white mt-0.5">{activeMission.objectiveText}</div>
            {activeMission.remainingTime !== undefined && (
              <div className="text-xs font-mono font-bold text-amber-300 mt-1 tabular-nums">
                ⏱ {Math.max(0, Math.ceil(activeMission.remainingTime))}s REMAINING
              </div>
            )}
          </div>
        )}

        {/* Bottom-Right: Weapon HUD / Vehicle Speedometer */}
        <div className="flex flex-col items-end gap-2">
          {currentVehicle ? (
            /* Vehicle Speedometer & Nitro */
            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex flex-col items-end shadow-2xl">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-black font-mono text-sky-400 tabular-nums">
                  {Math.round(Math.abs(vehicleSpeed) * 3.6)}
                </span>
                <span className="text-[11px] font-bold text-slate-400">KM/H</span>
              </div>
              <div className="text-xs text-slate-300 font-bold mt-0.5">{currentVehicle.name}</div>

              {/* Nitro Boost Bar */}
              <div className="flex items-center gap-1.5 mt-2 w-28">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-100"
                    style={{ width: `${vehicleNitro}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* On-Foot Weapon Card */
            <button
              onClick={onCycleWeapon}
              className="pointer-events-auto bg-slate-950/90 hover:bg-slate-900 border border-slate-800 p-2.5 rounded-2xl flex items-center gap-3 shadow-xl transition active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center border border-slate-700">
                <Crosshair className="w-5 h-5 text-sky-400" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white">{currentWeapon.name}</div>
                {currentWeapon.id !== 'fists' ? (
                  <div className="text-sm font-mono font-bold text-sky-400 tabular-nums">
                    {currentWeapon.currentMag} / {currentWeapon.reserveAmmo}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-slate-400">MELEE</div>
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
