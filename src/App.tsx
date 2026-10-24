import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine/GameEngine';
import {
  GameState,
  GameMode,
  InputState,
  WeaponType,
  GraphicsSettings,
  PlayerStats,
  SquadMember,
  SafeZoneState,
  KillFeedEntry,
  DamageNumber,
  GroundLoot,
} from './types/game';
import { soundEngine } from './game/audio/SoundEngine';
import { SaveManager } from './game/save/SaveManager';
import { LobbyScreen } from './components/LobbyScreen';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { PauseModal } from './components/PauseModal';
import { AndroidGuideModal } from './components/AndroidGuideModal';
import { WEAPON_DATABASE } from './game/weapons/WeaponDatabase';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-frequency continuous input state in ref to avoid React re-renders
  const inputState = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    crouch: false,
    prone: false,
    aim: false,
    shoot: false,
    reload: false,
    interact: false,
    gloowall: false,
    heal: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  });

  // UI state
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [selectedMode, setSelectedMode] = useState<GameMode>('br_squad');
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Synchronized Match & Player state (updated at 15Hz to save CPU)
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [aliveCount, setAliveCount] = useState<number>(20);
  const [safeZone, setSafeZone] = useState<SafeZoneState>({
    currentCenter: [0, 0],
    currentRadius: 180,
    nextCenter: [0, 0],
    nextRadius: 90,
    phase: 1,
    maxPhases: 4,
    shrinkTimer: 60,
    isShrinking: false,
    dps: 3,
  });
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [nearbyLoot, setNearbyLoot] = useState<GroundLoot[]>([]);
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [currentFps, setCurrentFps] = useState<number>(60);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [isDefeat, setIsDefeat] = useState<boolean>(false);

  // Graphics & Performance settings
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>({
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
  });

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3200);
  }, []);

  // Initialize GameEngine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    // Load saved data if present
    const saved = SaveManager.loadGame();
    if (saved && saved.playerStats) {
      engine.player.stats = {
        ...engine.player.stats,
        ...saved.playerStats,
        ownedWeapons: {
          ...WEAPON_DATABASE,
          ...(saved.playerStats.ownedWeapons || {}),
        },
      };
      // Sanitize slot defaults if missing
      if (!engine.player.stats.primaryWeapon1 || !WEAPON_DATABASE[engine.player.stats.primaryWeapon1]) {
        engine.player.stats.primaryWeapon1 = 'ak47';
      }
      if (!engine.player.stats.primaryWeapon2 || !WEAPON_DATABASE[engine.player.stats.primaryWeapon2]) {
        engine.player.stats.primaryWeapon2 = 'm1887';
      }
      if (!engine.player.stats.secondaryWeapon || !WEAPON_DATABASE[engine.player.stats.secondaryWeapon]) {
        engine.player.stats.secondaryWeapon = 'deagle';
      }
      if (!engine.player.stats.meleeWeapon || !WEAPON_DATABASE[engine.player.stats.meleeWeapon]) {
        engine.player.stats.meleeWeapon = 'katana';
      }
      if (!engine.player.stats.activeSlot) {
        engine.player.stats.activeSlot = 'primary1';
      }
    }
    setPlayerStats({ ...engine.player.stats });

    // Wire engine callbacks
    engine.onNotification = (msg: string) => {
      showNotification(msg);
    };

    engine.onVictory = () => {
      setIsVictory(true);
      setGameState('victory');
    };

    engine.onDefeat = () => {
      setIsDefeat(true);
      setGameState('game_over');
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.playFootstep();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputState.current.sprint = true;
          break;
        case 'Space':
          inputState.current.jump = true;
          break;
        case 'KeyC':
          inputState.current.crouch = !inputState.current.crouch;
          break;
        case 'KeyZ':
          inputState.current.prone = !inputState.current.prone;
          break;
        case 'KeyE':
          inputState.current.interact = true;
          break;
        case 'KeyQ':
          inputState.current.gloowall = true;
          break;
        case 'KeyX':
          inputState.current.heal = true;
          break;
        case 'KeyR':
          inputState.current.reload = true;
          break;
        case 'KeyF':
          inputState.current.shoot = true;
          break;
        case 'Digit1':
          engine.player.switchSlot('primary1');
          setPlayerStats({ ...engine.player.stats });
          break;
        case 'Digit2':
          engine.player.switchSlot('primary2');
          setPlayerStats({ ...engine.player.stats });
          break;
        case 'Digit3':
          engine.player.switchSlot('secondary');
          setPlayerStats({ ...engine.player.stats });
          break;
        case 'Digit4':
          engine.player.switchSlot('melee');
          setPlayerStats({ ...engine.player.stats });
          break;
        case 'Escape':
          setGameState(prev => (prev === 'paused' ? 'playing' : 'paused'));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputState.current.sprint = false;
          break;
        case 'Space':
          inputState.current.jump = false;
          break;
        case 'KeyE':
          inputState.current.interact = false;
          break;
        case 'KeyF':
          inputState.current.shoot = false;
          break;
      }
    };

    // Mouse aiming & shooting
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvasMountRef.current) {
        inputState.current.lookDeltaX += e.movementX;
        inputState.current.lookDeltaY += e.movementY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        inputState.current.shoot = true;
      } else if (e.button === 2) {
        inputState.current.aim = true;
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        inputState.current.shoot = false;
      } else if (e.button === 2) {
        inputState.current.aim = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    // ==========================================
    // SINGLE UNIFIED FRAME LOOP WITH FPS PACING
    // ==========================================
    let isRunning = true;
    let lastTime = performance.now();
    let lastRenderTime = performance.now();

    const loop = (currentTime: number) => {
      if (!isRunning) return;

      const targetFps = engine.settings.fpsCap === 'auto' ? 144 : Number(engine.settings.fpsCap);
      const frameInterval = 1000 / targetFps;
      const elapsedSinceRender = currentTime - lastRenderTime;

      if (elapsedSinceRender >= frameInterval - 1.0) {
        const rawDt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        lastRenderTime = currentTime;
        const dt = Math.min(rawDt, 0.05); // 60fps simulation clamp

        // Run simulation update
        engine.update(dt, inputState.current);

        // Reset per-frame mouse deltas
        inputState.current.lookDeltaX = 0;
        inputState.current.lookDeltaY = 0;

        // Render scene
        engine.render();
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    // Periodic 15Hz Sync with React HUD
    const syncInterval = setInterval(() => {
      if (!engine) return;
      const p = engine.player;
      const br = engine.battleRoyale;

      setPlayerStats({ ...p.stats });
      setSquadMembers([...br.squadMembers]);
      setAliveCount(br.aliveCount);
      setSafeZone({ ...br.safeZone });
      setKillFeed([...br.killFeed]);
      setDamageNumbers([...br.damageNumbers]);
      setPlayerYaw(engine.cameraYaw);
      setCurrentFps(engine.currentFps);

      // Nearby loot detection
      const closeLoot: GroundLoot[] = [];
      for (const item of br.groundLoot) {
        const d = Math.hypot(item.position[0] - p.position.x, item.position[2] - p.position.z);
        if (d < 3.2) {
          closeLoot.push(item);
        }
      }
      setNearbyLoot(closeLoot);
    }, 66); // ~15Hz

    return () => {
      isRunning = false;
      clearInterval(syncInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      engine.dispose();
    };
  }, [showNotification]);

  // Start match handler
  const handleStartMatch = () => {
    if (!engineRef.current) return;
    setIsVictory(false);
    setIsDefeat(false);
    engineRef.current.startBattleRoyale(selectedMode);
    setGameState('playing');

    // Desktop pointer lock
    if (!('ontouchstart' in window) && canvasMountRef.current) {
      canvasMountRef.current.requestPointerLock?.();
    }
  };

  // Return to lobby handler
  const handleReturnToLobby = () => {
    if (!engineRef.current) return;
    engineRef.current.returnToLobby();
    setGameState('lobby');
    setIsVictory(false);
    setIsDefeat(false);
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  };

  // Update graphics settings
  const handleUpdateSettings = (newSettings: Partial<GraphicsSettings>) => {
    setGraphicsSettings(prev => {
      const updated = { ...prev, ...newSettings };
      engineRef.current?.applyGraphicsSettings(updated);
      return updated;
    });
  };

  // Equip outfit
  const handleEquipOutfit = (outfitId: string) => {
    if (!engineRef.current) return;
    engineRef.current.player.stats.outfitId = outfitId;
    engineRef.current.player.updateOutfit();
    setPlayerStats({ ...engineRef.current.player.stats });
    showNotification(`Outfit changed to ${outfitId.toUpperCase()}`);
  };

  // Equip weapon
  const handleEquipWeapon = (slot: 'primary1' | 'primary2' | 'secondary' | 'melee', weaponId: WeaponType) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    if (slot === 'primary1') p.stats.primaryWeapon1 = weaponId;
    else if (slot === 'primary2') p.stats.primaryWeapon2 = weaponId;
    else if (slot === 'secondary') p.stats.secondaryWeapon = weaponId;
    else p.stats.meleeWeapon = weaponId;

    p.updateWeaponVisual();
    setPlayerStats({ ...p.stats });
    showNotification(`Equipped ${weaponId.toUpperCase()} to ${slot.toUpperCase()}`);
  };

  // Play emote
  const handlePlayEmote = (emote: string) => {
    soundEngine.playFootstep();
    showNotification(`Emote triggered: ${emote.toUpperCase()}`);
  };

  // Claim reward
  const handleClaimReward = (gold: number, diamonds: number, xp: number) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    p.stats.gold += gold;
    p.stats.diamonds += diamonds;
    p.stats.xp += xp;

    // Check level up (1.5x formula)
    if (p.stats.xp >= p.stats.xpRequired) {
      p.stats.level++;
      p.stats.xp -= p.stats.xpRequired;
      p.stats.xpRequired = Math.round(1000 * Math.pow(1.5, p.stats.level - 1));
      soundEngine.playBooyah();
      showNotification(`LEVEL UP! Now Level ${p.stats.level}!`);
    }

    setPlayerStats({ ...p.stats });
    showNotification(`Claimed +${gold} Gold and +${diamonds} Diamonds!`);
  };

  // Save game progress
  const handleSaveGame = () => {
    if (!engineRef.current) return;
    SaveManager.saveGame(engineRef.current.player.stats);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    showNotification('Game Progress Saved to Local Storage!');
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        onClick={() => {
          if (gameState === 'playing' && !('ontouchstart' in window)) {
            canvasMountRef.current?.requestPointerLock?.();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* === 1. FREE FIRE STYLE 3D GAME LOBBY === */}
      {gameState === 'lobby' && playerStats && (
        <LobbyScreen
          playerStats={playerStats}
          selectedMode={selectedMode}
          onSelectMode={setSelectedMode}
          onStartMatch={handleStartMatch}
          onEquipOutfit={handleEquipOutfit}
          onEquipWeapon={handleEquipWeapon}
          onPlayEmote={handlePlayEmote}
          onClaimReward={handleClaimReward}
          settings={graphicsSettings}
          onUpdateSettings={handleUpdateSettings}
          onOpenAndroidGuide={() => setShowAndroidGuide(true)}
        />
      )}

      {/* === 2. BATTLE ROYALE HUD === */}
      {(gameState === 'playing' || gameState === 'victory' || gameState === 'game_over') && playerStats && (
        <>
          <HUD
            playerStats={playerStats}
            squadMembers={squadMembers}
            aliveCount={aliveCount}
            safeZone={safeZone}
            killFeed={killFeed}
            damageNumbers={damageNumbers}
            nearbyLoot={nearbyLoot}
            onPickupLoot={lootId => engineRef.current?.pickupLoot(lootId)}
            onDeployGlooWall={() => {
              inputState.current.gloowall = true;
            }}
            onUseMedkit={() => {
              inputState.current.heal = true;
            }}
            onReload={() => {
              inputState.current.reload = true;
            }}
            onSwitchSlot={slot => {
              engineRef.current?.player.switchSlot(slot);
              if (engineRef.current) setPlayerStats({ ...engineRef.current.player.stats });
            }}
            onPause={() => setGameState('paused')}
            onReturnToLobby={handleReturnToLobby}
            playerYaw={playerYaw}
            isVictory={isVictory}
            isDefeat={isDefeat}
            fps={currentFps}
            notification={notification}
          />

          {/* On-Screen Mobile Touch Controls */}
          {('ontouchstart' in window || window.innerWidth < 1024) && (
            <TouchControls
              inputState={inputState}
              inVehicle={!!engineRef.current?.playerVehicle}
              onPause={() => setGameState('paused')}
              gloowallsCount={playerStats.gloowalls}
              medkitsCount={playerStats.medkits}
              opacity={graphicsSettings.hudOpacity}
            />
          )}
        </>
      )}

      {/* === 3. PAUSE MODAL === */}
      {gameState === 'paused' && (
        <PauseModal
          settings={graphicsSettings}
          onUpdateSettings={handleUpdateSettings}
          onResume={() => setGameState('playing')}
          onSaveGame={handleSaveGame}
          onQuitToTitle={handleReturnToLobby}
          saveSuccess={saveSuccess}
        />
      )}

      {/* === 4. ANDROID APK BUILD GUIDE MODAL === */}
      {showAndroidGuide && <AndroidGuideModal onClose={() => setShowAndroidGuide(false)} />}
    </div>
  );
}
