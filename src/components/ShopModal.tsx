import React from 'react';
import { PlayerStats, WeaponType, VehicleId } from '../types/game';
import { X, Check, ShoppingBag, Shield, Wrench, Palette, Zap } from 'lucide-react';
import { VEHICLE_PRESETS } from '../game/entities/VehicleEntity';
import { OUTFIT_PRESETS } from '../game/entities/PlayerEntity';

interface ShopModalProps {
  type: 'shopping' | 'wardrobe' | 'dealership' | 'modshop';
  playerStats: PlayerStats;
  onBuyWeapon: (weaponId: WeaponType) => void;
  onBuyAmmo: (weaponId: WeaponType) => void;
  onBuyVehicle: (vehicleId: VehicleId) => void;
  onChangeOutfit: (outfitId: string) => void;
  onChangeCarColor: (hex: string) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  type,
  playerStats,
  onBuyWeapon,
  onBuyAmmo,
  onBuyVehicle,
  onChangeOutfit,
  onChangeCarColor,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sky-400">
              {type === 'shopping' && <ShoppingBag className="w-5 h-5 text-red-400" />}
              {type === 'dealership' && <Zap className="w-5 h-5 text-emerald-400" />}
              {type === 'modshop' && <Wrench className="w-5 h-5 text-amber-400" />}
              {type === 'wardrobe' && <Palette className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {type === 'shopping' && 'AMMU-METROPOLIS GUN DEPOT'}
                {type === 'dealership' && 'NONO MOTORS LUXURY SHOWROOM'}
                {type === 'modshop' && 'APEX CUSTOM TUNING & PAINT'}
                {type === 'wardrobe' && 'PENTHOUSE 101 WARDROBE'}
              </h2>
              <div className="text-xs text-slate-400">
                Cash Available: <span className="font-mono font-bold text-emerald-400">${(playerStats.cash ?? playerStats.gold).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* === WEAPONS SHOP === */}
          {type === 'shopping' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(playerStats.ownedWeapons).map(wep => {
                if (wep.id === 'fists') return null;
                const canAfford = (playerStats.cash ?? playerStats.gold) >= wep.price;
                const canAffordAmmo = (playerStats.cash ?? playerStats.gold) >= 200;

                return (
                  <div key={wep.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-white text-sm">{wep.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{wep.category}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 font-mono">
                        Dmg: {wep.damage} • FireRate: {wep.fireRate}/s • Mag: {wep.magSize}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {wep.unlocked ? (
                        <button
                          onClick={() => onBuyAmmo(wep.id)}
                          disabled={!canAffordAmmo || wep.reserveAmmo >= wep.maxAmmo}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1 transition"
                        >
                          <span>Buy Ammo ($200)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onBuyWeapon(wep.id)}
                          disabled={!canAfford}
                          className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs transition"
                        >
                          Buy Weapon (${wep.price.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* === CAR DEALERSHIP === */}
          {type === 'dealership' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(VEHICLE_PRESETS).map(car => {
                if (car.category === 'police') return null;
                const isOwned = playerStats.ownedVehicles ? !!playerStats.ownedVehicles[car.id] : false;
                const canAfford = (playerStats.cash ?? playerStats.gold) >= car.price;

                return (
                  <div key={car.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="font-extrabold text-white text-sm">{car.name}</span>
                        <span className="text-xs text-emerald-400 font-mono uppercase">{car.category}</span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 space-y-0.5 font-mono">
                        <div>Top Speed: {car.maxSpeed * 3.6} km/h</div>
                        <div>Acceleration: {car.acceleration} m/s²</div>
                      </div>
                    </div>

                    {isOwned ? (
                      <div className="py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold text-xs text-center flex items-center justify-center gap-1">
                        <Check className="w-4 h-4" /> OWNED
                      </div>
                    ) : (
                      <button
                        onClick={() => onBuyVehicle(car.id)}
                        disabled={!canAfford}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs transition"
                      >
                        Purchase (${car.price.toLocaleString()})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* === MOD GARAGE (Paint & Upgrades) === */}
          {type === 'modshop' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-white text-sm mb-3">Custom Automotive Paint Finishes ($1,000)</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { name: 'Crimson', hex: '#ef4444' },
                    { name: 'Obsidian', hex: '#0f172a' },
                    { name: 'Cyber Blue', hex: '#38bdf8' },
                    { name: 'Gold Rush', hex: '#f59e0b' },
                    { name: 'Neon Purple', hex: '#a855f7' },
                    { name: 'Toxic Lime', hex: '#22c55e' },
                  ].map(c => (
                    <button
                      key={c.name}
                      onClick={() => onChangeCarColor(c.hex)}
                      className="p-3 rounded-2xl bg-slate-800 border border-slate-700 hover:border-slate-500 flex flex-col items-center gap-2 transition active:scale-95"
                    >
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: c.hex }} />
                      <span className="text-[11px] font-bold text-slate-300">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">Full Mechanical Vehicle Repair & Polish</div>
                  <div className="text-xs text-slate-400">Restore 100% body durability and remove scratches.</div>
                </div>
                <button
                  onClick={() => onChangeCarColor('#38bdf8')}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Repair ($500)
                </button>
              </div>
            </div>
          )}

          {/* === WARDROBE (Outfits) === */}
          {type === 'wardrobe' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(OUTFIT_PRESETS).map(([id, outfit]) => {
                const isSelected = playerStats.outfitId === id;
                return (
                  <button
                    key={id}
                    onClick={() => onChangeOutfit(id)}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                      isSelected ? 'bg-sky-950/60 border-sky-500' : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{outfit.name}</div>
                      <div className="text-xs text-slate-400 mt-1">High-end city attire</div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-sky-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
