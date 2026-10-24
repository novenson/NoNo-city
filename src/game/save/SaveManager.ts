import { GraphicsSettings, PlayerStats } from '../../types/game';
import { WEAPON_DATABASE } from '../weapons/WeaponDatabase';

export interface SaveData {
  version: number;
  timestamp: number;
  playerStats: PlayerStats;
  playerPosition: [number, number, number];
  missionsCompleted: string[];
  settings: GraphicsSettings;
}

const SAVE_KEY = 'nono_city_life_save_v1';

export class SaveManager {
  public static saveGame(
    stats: PlayerStats,
    position: [number, number, number] = [0, 0, 0],
    completedMissions: string[] = [],
    settings?: GraphicsSettings
  ): boolean {
    try {
      const data: SaveData = {
        version: 2,
        timestamp: Date.now(),
        playerStats: stats,
        playerPosition: position,
        missionsCompleted: completedMissions,
        settings: settings || {
          quality: 'high',
          fpsCap: 60,
          showFps: true,
          shadows: true,
          bloom: true,
          renderScale: 1.0,
          drawDistance: 260,
          cameraSensitivity: 1.0,
          hudScale: 1.0,
          hudOpacity: 0.95,
          sfxVolume: 0.8,
          musicVolume: 0.5,
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  public static loadGame(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data && data.playerStats) {
        data.playerStats.ownedWeapons = {
          ...WEAPON_DATABASE,
          ...(data.playerStats.ownedWeapons || {}),
        };
        if (!data.playerStats.primaryWeapon1 || !WEAPON_DATABASE[data.playerStats.primaryWeapon1]) {
          data.playerStats.primaryWeapon1 = 'ak47';
        }
        if (!data.playerStats.primaryWeapon2 || !WEAPON_DATABASE[data.playerStats.primaryWeapon2]) {
          data.playerStats.primaryWeapon2 = 'm1887';
        }
        if (!data.playerStats.secondaryWeapon || !WEAPON_DATABASE[data.playerStats.secondaryWeapon]) {
          data.playerStats.secondaryWeapon = 'deagle';
        }
        if (!data.playerStats.meleeWeapon || !WEAPON_DATABASE[data.playerStats.meleeWeapon]) {
          data.playerStats.meleeWeapon = 'katana';
        }
        if (!data.playerStats.activeSlot) {
          data.playerStats.activeSlot = 'primary1';
        }
      }
      return data;
    } catch {
      return null;
    }
  }

  public static hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  public static clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }
}
