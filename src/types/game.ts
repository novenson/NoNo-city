export type GameState = 'title' | 'playing' | 'paused' | 'wasted' | 'busted' | 'mission_complete' | 'shopping' | 'wardrobe' | 'dealership' | 'modshop' | 'phone';

export type WeatherType = 'clear' | 'sunset' | 'night' | 'rain' | 'fog';

export type WeaponType = 'fists' | 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';

export interface WeaponInfo {
  id: WeaponType;
  name: string;
  category: string;
  damage: number;
  fireRate: number; // shots per sec
  range: number;
  magSize: number;
  currentMag: number;
  reserveAmmo: number;
  maxAmmo: number;
  price: number;
  unlocked: boolean;
  color: string;
}

export type VehicleId = 'hyperion' | 'cruiser' | 'titan' | 'police' | 'phantom' | 'viper';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  category: 'super' | 'sedan' | 'suv' | 'police' | 'tuner' | 'bike';
  maxSpeed: number; // units/sec
  acceleration: number;
  braking: number;
  handling: number;
  durability: number;
  price: number;
  color: string;
  unlocked: boolean;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  cash: number;
  wantedLevel: number; // 0 to 5
  wantedProgress: number; // cooldown timer
  currentWeapon: WeaponType;
  ownedWeapons: Record<WeaponType, WeaponInfo>;
  ownedVehicles: VehicleId[];
  activeVehicleId: VehicleId | null;
  outfitId: string;
  hairId: string;
  insideHome: boolean;
  repLevel: number;
}

export interface Mission {
  id: string;
  title: string;
  client: string;
  description: string;
  rewardCash: number;
  rewardRep: number;
  stage: number;
  stagesCount: number;
  objectiveText: string;
  targetPos?: [number, number, number];
  targetRadius?: number;
  timeLimit?: number;
  remainingTime?: number;
  completed: boolean;
  locked: boolean;
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  shadows: boolean;
  bloom: boolean;
  drawDistance: number;
  trafficDensity: 'low' | 'normal' | 'high';
  touchOpacity: number;
  cameraSensitivity: number;
  sfxVolume: number;
  musicVolume: number;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  aim: boolean;
  shoot: boolean;
  reload: boolean;
  interact: boolean; // enter/exit car or enter building
  horn: boolean;
  handbrake: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export interface CityLocation {
  id: string;
  name: string;
  type: 'home' | 'gunshop' | 'dealership' | 'modshop' | 'hospital' | 'police' | 'bank' | 'mission' | 'beach' | 'docks';
  position: [number, number, number];
  icon: string;
  description: string;
}
