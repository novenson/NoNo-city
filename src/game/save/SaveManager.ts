import { GraphicsSettings, PlayerStats } from '../../types/game';

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
  public static saveGame(stats: PlayerStats, position: [number, number, number], completedMissions: string[], settings: GraphicsSettings): boolean {
    try {
      const data: SaveData = {
        version: 1,
        timestamp: Date.now(),
        playerStats: stats,
        playerPosition: position,
        missionsCompleted: completedMissions,
        settings,
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
      return JSON.parse(raw) as SaveData;
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
