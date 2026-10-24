import React, { useState } from 'react';
import { PlayerStats, Mission, WeatherType } from '../types/game';
import {
  MapPin,
  Car,
  Briefcase,
  DollarSign,
  CloudSun,
  PhoneCall,
  X,
  Compass,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { VEHICLE_PRESETS } from '../game/entities/VehicleEntity';

interface SmartphoneModalProps {
  playerStats: PlayerStats;
  missions: Mission[];
  onStartMission: (id: string) => void;
  onValetDeliver: (vehicleId: string) => void;
  onChangeWeather: (weather: WeatherType) => void;
  onClose: () => void;
}

export const SmartphoneModal: React.FC<SmartphoneModalProps> = ({
  playerStats,
  missions,
  onStartMission,
  onValetDeliver,
  onChangeWeather,
  onClose,
}) => {
  const [activeApp, setActiveApp] = useState<'home' | 'map' | 'valet' | 'missions' | 'bank' | 'weather' | 'contacts'>('home');

  const apps = [
    { id: 'map', name: 'Nono Maps', icon: Compass, color: 'bg-emerald-500' },
    { id: 'valet', name: 'Car Valet', icon: Car, color: 'bg-blue-500' },
    { id: 'missions', name: 'Jobs', icon: Briefcase, color: 'bg-amber-500' },
    { id: 'bank', name: 'MetroBank', icon: DollarSign, color: 'bg-indigo-500' },
    { id: 'weather', name: 'Weather', icon: CloudSun, color: 'bg-sky-500' },
    { id: 'contacts', name: 'Contacts', icon: PhoneCall, color: 'bg-rose-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-none pointer-events-auto">
      {/* Smartphone Frame */}
      <div className="relative w-full max-w-sm h-[620px] bg-slate-900 rounded-[44px] border-[10px] border-slate-800 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Dynamic Island / Notch */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-24 h-4 bg-black rounded-full flex items-center justify-end px-2">
            <div className="w-2 h-2 rounded-full bg-blue-500/80" />
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-6 py-1 text-[11px] font-mono text-slate-400">
          <span>NONO 5G</span>
          <span>100%</span>
        </div>

        {/* Main Phone Screen View */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
          {activeApp === 'home' && (
            <div className="flex flex-col items-center flex-1 justify-between">
              {/* Clock Widget */}
              <div className="text-center mt-6">
                <div className="text-5xl font-black font-mono tracking-tight text-white">12:45</div>
                <div className="text-xs font-semibold text-slate-400 mt-1">Nono Metropolis • 72°F</div>
              </div>

              {/* App Icons Grid */}
              <div className="grid grid-cols-3 gap-6 my-auto w-full px-4">
                {apps.map(app => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => setActiveApp(app.id as 'map' | 'valet' | 'missions' | 'bank' | 'weather' | 'contacts')}
                      className="flex flex-col items-center gap-2 group active:scale-90 transition"
                    >
                      <div className={`w-14 h-14 rounded-2xl ${app.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-300">{app.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Notification Pill */}
              <div className="w-full bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center gap-3 mb-4">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-[11px]">
                  <div className="font-bold text-slate-200">Syndicate Dispatch</div>
                  <div className="text-slate-400">Frank has updated available contracts.</div>
                </div>
              </div>
            </div>
          )}

          {/* === MAP APP === */}
          {activeApp === 'map' && (
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base text-emerald-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" /> Nono City Navigator
                </h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sky-400" />
                    <div>
                      <div className="font-bold text-white">Penthouse 101</div>
                      <div className="text-[10px] text-slate-400">Player Residence • Coastal Blvd</div>
                    </div>
                  </div>
                  <span className="font-mono text-sky-400">[-45, 45]</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div>
                      <div className="font-bold text-white">Ammu-Metropolis</div>
                      <div className="text-[10px] text-slate-400">Weapons & Munitions Depot</div>
                    </div>
                  </div>
                  <span className="font-mono text-red-400">[45, 45]</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <div>
                      <div className="font-bold text-white">Nono Motors</div>
                      <div className="text-[10px] text-slate-400">Luxury Supercars & Bikes</div>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400">[45, -45]</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div>
                      <div className="font-bold text-white">Apex Mod Garage</div>
                      <div className="text-[10px] text-slate-400">Custom Paint & Repairs</div>
                    </div>
                  </div>
                  <span className="font-mono text-amber-400">[-45, -45]</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div>
                      <div className="font-bold text-white">Central Vault Bank</div>
                      <div className="text-[10px] text-slate-400">Downtown Financial Tower</div>
                    </div>
                  </div>
                  <span className="font-mono text-yellow-400">[0, -75]</span>
                </div>
              </div>
            </div>
          )}

          {/* === CAR VALET APP === */}
          {activeApp === 'valet' && (
            <div className="flex flex-col flex-1">
              <h3 className="font-bold text-base text-blue-400 mb-2 flex items-center gap-1.5">
                <Car className="w-4 h-4" /> Personal Vehicle Valet
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">
                Order any vehicle delivered immediately to your street coordinates.
              </p>
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {playerStats.ownedVehicles.map(vId => {
                  const car = VEHICLE_PRESETS[vId];
                  if (!car) return null;
                  return (
                    <div key={vId} className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{car.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                          Top: {car.maxSpeed * 3.6} km/h • {car.category}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onValetDeliver(vId);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs active:scale-95 transition"
                      >
                        Deliver
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === MISSIONS / JOBS APP === */}
          {activeApp === 'missions' && (
            <div className="flex flex-col flex-1">
              <h3 className="font-bold text-base text-amber-400 mb-2 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> Syndicate Job Board
              </h3>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {missions.map(m => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border ${
                      m.completed
                        ? 'bg-emerald-950/40 border-emerald-800/60'
                        : m.locked
                        ? 'bg-slate-900/60 border-slate-800 opacity-60'
                        : 'bg-slate-800/90 border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-xs">{m.title}</div>
                        <div className="text-[10px] text-amber-400 font-semibold">Client: {m.client}</div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        +${m.rewardCash.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-snug">{m.description}</p>
                    <div className="mt-2 flex justify-end">
                      {m.completed ? (
                        <span className="text-[11px] font-bold text-emerald-400">✓ COMPLETED</span>
                      ) : m.locked ? (
                        <span className="text-[11px] font-bold text-slate-500">LOCKED</span>
                      ) : (
                        <button
                          onClick={() => {
                            onStartMission(m.id);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs active:scale-95 transition flex items-center gap-1"
                        >
                          <span>ACCEPT</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BANK APP === */}
          {activeApp === 'bank' && (
            <div className="flex flex-col flex-1 text-center justify-between">
              <div>
                <h3 className="font-bold text-base text-indigo-400 mb-4 flex items-center justify-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> Metropolis First Bank
                </h3>
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/60 to-slate-900 border border-indigo-700/50">
                  <div className="text-xs text-indigo-300 font-medium">Liquid Balance</div>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                    ${playerStats.cash.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">ACCOUNT: #774-8890-NONO</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                Complete syndicate missions and bank vault heists to deposit more funds.
              </div>
            </div>
          )}

          {/* === WEATHER APP === */}
          {activeApp === 'weather' && (
            <div className="flex flex-col flex-1">
              <h3 className="font-bold text-base text-sky-400 mb-2 flex items-center gap-1.5">
                <CloudSun className="w-4 h-4" /> Metropolis Weather Control
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">Select simulation atmospheric condition:</p>

              <div className="grid grid-cols-2 gap-3">
                {(['clear', 'sunset', 'night', 'rain'] as WeatherType[]).map(w => (
                  <button
                    key={w}
                    onClick={() => {
                      onChangeWeather(w);
                      onClose();
                    }}
                    className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 capitalize font-bold text-sm text-sky-300 active:scale-95 transition"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* === CONTACTS APP === */}
          {activeApp === 'contacts' && (
            <div className="flex flex-col flex-1">
              <h3 className="font-bold text-base text-rose-400 mb-3 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4" /> Secure Contacts
              </h3>
              <div className="space-y-2.5">
                {[
                  { name: 'Frank Torres', role: 'Underground Fixer', status: 'Online' },
                  { name: 'Maya Lin', role: 'Tech & Surveillance', status: 'Online' },
                  { name: 'Chief Higgins', role: 'Metropolis PD', status: 'Hostile' },
                ].map(c => (
                  <div key={c.name} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{c.name}</div>
                      <div className="text-[10px] text-slate-400">{c.role}</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">{c.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Home Button & App Switcher */}
        <div className="py-3 px-6 flex items-center justify-between bg-slate-950/80 border-t border-slate-800">
          {activeApp !== 'home' ? (
            <button
              onClick={() => setActiveApp('home')}
              className="text-xs font-bold text-sky-400 active:scale-95"
            >
              ← Apps
            </button>
          ) : (
            <span className="text-xs text-slate-500 font-mono">iNono OS 18</span>
          )}

          {/* Close Phone */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
