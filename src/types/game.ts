export type GameState = 
  | 'lobby' 
  | 'playing' 
  | 'paused' 
  | 'victory' 
  | 'game_over' 
  | 'map_fullscreen' 
  | 'hud_editor' 
  | 'vault' 
  | 'armory' 
  | 'emotes' 
  | 'missions' 
  | 'profile' 
  | 'settings';

export type GameMode = 'br_solo' | 'br_duo' | 'br_squad' | 'clash_squad' | 'training' | 'open_world';

export type WeatherType = 'clear' | 'sunset' | 'night' | 'rain' | 'fog';

export type WeaponCategory = 'shotgun' | 'smg' | 'pistol' | 'rifle' | 'sniper' | 'melee';

export type WeaponType = 
  // Shotguns
  | 'm1887' | 'spas12' | 'mag7'
  // SMGs
  | 'ump45' | 'mp5x' | 'vector'
  // Pistols
  | 'deagle' | 'g18' | 'usp'
  // Rifles & Snipers
  | 'ak47' | 'scarl' | 'm4a1' | 'awm'
  // Melee
  | 'fists' | 'katana';

export interface WeaponStats {
  id: WeaponType;
  name: string;
  category: WeaponCategory;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots/sec
  range: number;
  accuracy: number; // 0-100
  recoil: number;   // 0-100
  reloadTime: number; // seconds
  magSize: number;
  currentMag: number;
  reserveAmmo: number;
  maxAmmo: number;
  price: number;
  unlocked: boolean;
  color: string;
  skinName?: string;
  description: string;
}

export type LootType = 'weapon' | 'ammo' | 'medkit' | 'vest' | 'helmet' | 'gloowall';

export interface GroundLoot {
  id: string;
  type: LootType;
  weaponId?: WeaponType;
  amount: number;
  position: [number, number, number];
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SquadMember {
  id: string;
  name: string;
  isLeader: boolean;
  isBot: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  isKnocked: boolean;
  isDead: boolean;
  kills: number;
  avatar: string;
  position: [number, number, number];
  distance: number;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  isHeadshot: boolean;
  timestamp: number;
}

export interface DamageNumber {
  id: string;
  damage: number;
  isHeadshot: boolean;
  pos: [number, number, number];
  screenX: number;
  screenY: number;
  alpha: number;
}

export interface SafeZoneState {
  currentCenter: [number, number];
  currentRadius: number;
  nextCenter: [number, number];
  nextRadius: number;
  phase: number;
  maxPhases: number;
  shrinkTimer: number;
  isShrinking: boolean;
  dps: number;
}

export interface PlayerStats {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  xpRequired: number; // with 1.5x formula
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Heroic' | 'Grandmaster';
  gold: number;
  diamonds: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  gloowalls: number;
  medkits: number;
  isKnocked: boolean;
  knockedTimer: number;
  isDead: boolean;
  kills: number;
  damageDealt: number;
  primaryWeapon1: WeaponType;
  primaryWeapon2: WeaponType;
  secondaryWeapon: WeaponType;
  meleeWeapon: WeaponType;
  activeSlot: 'primary1' | 'primary2' | 'secondary' | 'melee';
  ownedWeapons: Record<WeaponType, WeaponStats>;
  ownedOutfits: string[];
  outfitId: string;
  ownedEmotes: string[];
  activeEmote: string | null;
  // Career lifetime statistics
  careerMatches: number;
  careerWins: number;
  careerKills: number;
  careerDeaths: number;
  careerHeadshots: number;
  // Compatibility fields for open world & vehicles
  cash?: number;
  wantedLevel?: number;
  insideHome?: boolean;
  ownedVehicles?: Record<string, boolean>;
}

export interface Mission {
  id: string;
  title: string;
  category?: 'daily' | 'weekly' | 'mastery';
  description?: string;
  progress?: number;
  target?: number;
  rewardGold?: number;
  rewardDiamonds?: number;
  rewardXp?: number;
  rewardRep?: number;
  claimed?: boolean;
  // Story mode mission fields
  client?: string;
  rewardCash?: number;
  completed?: boolean;
  locked?: boolean;
  stage?: number;
  stagesCount?: number;
  objectiveText?: string;
  targetPos?: [number, number, number];
  targetRadius?: number;
  timeLimit?: number;
  remainingTime?: number;
}

export interface GraphicsSettings {
  quality: 'very_low' | 'low' | 'medium' | 'high' | 'ultra' | 'custom';
  fpsCap: 'auto' | 30 | 60 | 90 | 120 | 144;
  showFps: boolean;
  shadows: boolean;
  bloom: boolean;
  renderScale: number;
  drawDistance: number;
  cameraSensitivity: number;
  hudScale: number;
  hudOpacity: number;
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
  prone: boolean;
  aim: boolean;
  shoot: boolean;
  reload: boolean;
  interact: boolean;
  gloowall: boolean;
  heal: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
}

export type VehicleId = 'hyperion' | 'cruiser' | 'titan' | 'police' | 'phantom' | 'viper';

export interface VehicleConfig {
  id: VehicleId;
  name: string;
  category: 'super' | 'sedan' | 'suv' | 'police' | 'tuner' | 'bike';
  maxSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  durability: number;
  price: number;
  color: string;
  unlocked: boolean;
}
