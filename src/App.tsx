import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine/GameEngine';
import { GameState, InputState, WeaponType, VehicleId, WeatherType, GraphicsSettings } from './types/game';
import { soundEngine } from './game/audio/SoundEngine';
import { SaveManager } from './game/save/SaveManager';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { SmartphoneModal } from './components/SmartphoneModal';
import { ShopModal } from './components/ShopModal';
import { PauseModal } from './components/PauseModal';
import { AndroidGuideModal } from './components/AndroidGuideModal';

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
    aim: false,
    shoot: false,
    reload: false,
    interact: false,
    horn: false,
    handbrake: false,
    lookDeltaX: 0,
    lookDeltaY: 0,
  });

  // UI state
  const [gameState, setGameState] = useState<GameState>('title');
  const [hasSaveData, setHasSaveData] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Synchronized HUD snapshot state (updated at 10Hz to save CPU)
  const [hudStats, setHudStats] = useState({
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    cash: 5000,
    wantedLevel: 0,
    currentWeapon: 'pistol' as WeaponType,
    speed: 0,
    nitro: 100,
    isDriving: false,
    vehicleName: null as string | null,
    vehicleConfig: null as any,
    pos: [-45, 0, 48] as [number, number, number],
    yaw: 0,
    radioStation: 0,
  });

  const [activeMission, setActiveMission] = useState<any>(null);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    setHasSaveData(SaveManager.hasSave());

    // Wire engine callbacks
    engine.onStateChange = (newState: string) => {
      setGameState(newState as GameState);
    };

    engine.onNotification = (msg: string) => {
      showNotification(msg);
    };

    // Keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      // AudioContext unlock on first user gesture
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
          if (engine.playerVehicle) {
            inputState.current.handbrake = true;
          } else {
            inputState.current.jump = true;
          }
          break;
        case 'KeyC':
          inputState.current.crouch = !inputState.current.crouch;
          break;
        case 'KeyE':
        case 'Enter':
          inputState.current.interact = true;
          break;
        case 'KeyF':
          inputState.current.shoot = true;
          break;
        case 'KeyR':
          inputState.current.reload = true;
          break;
        case 'KeyH':
          inputState.current.horn = true;
          break;
        case 'Tab':
          e.preventDefault();
          setGameState(prev => (prev === 'phone' ? 'playing' : 'phone'));
          break;
        case 'Escape':
          setGameState(prev => (prev === 'paused' ? 'playing' : 'paused'));
          break;
        case 'Digit1':
          engine.player.stats.currentWeapon = 'fists';
          engine.player.updateWeaponVisual();
          break;
        case 'Digit2':
          if (engine.player.stats.ownedWeapons.pistol?.unlocked) {
            engine.player.stats.currentWeapon = 'pistol';
            engine.player.updateWeaponVisual();
          }
          break;
        case 'Digit3':
          if (engine.player.stats.ownedWeapons.smg?.unlocked) {
            engine.player.stats.currentWeapon = 'smg';
            engine.player.updateWeaponVisual();
          }
          break;
        case 'Digit4':
          if (engine.player.stats.ownedWeapons.rifle?.unlocked) {
            engine.player.stats.currentWeapon = 'rifle';
            engine.player.updateWeaponVisual();
          }
          break;
        case 'Digit5':
          if (engine.player.stats.ownedWeapons.shotgun?.unlocked) {
            engine.player.stats.currentWeapon = 'shotgun';
            engine.player.updateWeaponVisual();
          }
          break;
        case 'Digit6':
          if (engine.player.stats.ownedWeapons.sniper?.unlocked) {
            engine.player.stats.currentWeapon = 'sniper';
            engine.player.updateWeaponVisual();
          }
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
          inputState.current.handbrake = false;
          break;
        case 'KeyE':
        case 'Enter':
          inputState.current.interact = false;
          break;
        case 'KeyF':
          inputState.current.shoot = false;
          break;
        case 'KeyR':
          inputState.current.reload = false;
          break;
        case 'KeyH':
          inputState.current.horn = false;
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
        // Left click
        inputState.current.shoot = true;
      } else if (e.button === 2) {
        // Right click aim
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

    const handleBlur = () => {
      // Clear held keys on window blur
      inputState.current.forward = false;
      inputState.current.backward = false;
      inputState.current.left = false;
      inputState.current.right = false;
      inputState.current.sprint = false;
      inputState.current.jump = false;
      inputState.current.shoot = false;
      inputState.current.aim = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleBlur);

    // Frame update loop driving the physics simulation
    let isRunning = true;
    let prevTime = performance.now();

    const gameLoop = () => {
      if (!isRunning) return;
      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      engine.update(dt, inputState.current);

      // Reset edge deltas
      inputState.current.lookDeltaX = 0;
      inputState.current.lookDeltaY = 0;

      requestAnimationFrame(gameLoop);
    };

    requestAnimationFrame(gameLoop);

    // Periodic 10Hz sync with React HUD
    const hudInterval = setInterval(() => {
      if (!engine) return;
      const p = engine.player;
      const v = engine.playerVehicle;

      setHudStats({
        health: p.stats.health,
        maxHealth: p.stats.maxHealth,
        armor: p.stats.armor,
        maxArmor: p.stats.maxArmor,
        cash: p.stats.cash,
        wantedLevel: engine.police.wantedLevel,
        currentWeapon: p.stats.currentWeapon,
        speed: v ? v.speed : Math.hypot(p.velocity.x, p.velocity.z),
        nitro: v ? v.nitroAmount : 100,
        isDriving: !!v,
        vehicleName: v ? v.config.name : null,
        vehicleConfig: v ? v.config : null,
        pos: [p.position.x, p.position.y, p.position.z],
        yaw: engine.cameraYaw,
        radioStation: soundEngine.getRadioStation(),
      });

      setActiveMission(engine.missions.activeMission);
    }, 100);

    return () => {
      isRunning = false;
      clearInterval(hudInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleBlur);
      engine.dispose();
    };
  }, [showNotification]);

  // Start new game
  const handleStartGame = () => {
    if (engineRef.current) {
      engineRef.current.isTitleScreen = false;
      // Request pointer lock on desktop if desired
      if (!('ontouchstart' in window) && canvasMountRef.current) {
        try {
          canvasMountRef.current.requestPointerLock?.();
        } catch {}
      }
      soundEngine.startVehicleEngine();
      setTimeout(() => soundEngine.stopVehicleEngine(), 400); // warm audio
    }
    setGameState('playing');
    showNotification('Welcome to Nono Metropolis! Explore freely or open your phone for jobs.');
  };

  // Continue from persistent local save
  const handleContinueGame = () => {
    const saved = SaveManager.loadGame();
    if (saved && engineRef.current) {
      engineRef.current.player.stats = saved.playerStats;
      engineRef.current.player.position.set(...saved.playerPosition);
      engineRef.current.player.mesh.position.copy(engineRef.current.player.position);
      engineRef.current.player.updateOutfit();
      engineRef.current.player.updateWeaponVisual();
      engineRef.current.settings = { ...engineRef.current.settings, ...saved.settings };

      // Restore missions completed
      for (const mId of saved.missionsCompleted) {
        const found = engineRef.current.missions.missions.find(m => m.id === mId);
        if (found) found.completed = true;
      }
      showNotification('Save game successfully loaded!');
    }
    handleStartGame();
  };

  // Save current game state
  const handleSaveGame = () => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const completed = engineRef.current.missions.missions.filter(m => m.completed).map(m => m.id);

    const ok = SaveManager.saveGame(
      p.stats,
      [p.position.x, p.position.y, p.position.z],
      completed,
      engineRef.current.settings
    );

    if (ok) {
      setSaveSuccess(true);
      setHasSaveData(true);
      soundEngine.playCashRegister();
      setTimeout(() => setSaveSuccess(false), 2000);
      showNotification('Progress saved to local storage!');
    }
  };

  // Weapon shop buy actions
  const handleBuyWeapon = (wId: WeaponType) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const wep = p.stats.ownedWeapons[wId];
    if (wep && p.stats.cash >= wep.price && !wep.unlocked) {
      p.stats.cash -= wep.price;
      wep.unlocked = true;
      p.stats.currentWeapon = wId;
      p.updateWeaponVisual();
      soundEngine.playCashRegister();
      showNotification(`Purchased ${wep.name}!`);
    }
  };

  const handleBuyAmmo = (wId: WeaponType) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const wep = p.stats.ownedWeapons[wId];
    if (wep && p.stats.cash >= 200) {
      p.stats.cash -= 200;
      wep.reserveAmmo = Math.min(wep.maxAmmo, wep.reserveAmmo + wep.magSize * 2);
      soundEngine.playReload();
      soundEngine.playCashRegister();
    }
  };

  // Vehicle dealership buy action
  const handleBuyVehicle = (vId: VehicleId) => {
    if (!engineRef.current) return;
    const p = engineRef.current.player;
    const carConfig = engineRef.current.parkedVehicles[0]?.config; // template
    if (!p.stats.ownedVehicles.includes(vId)) {
      p.stats.ownedVehicles.push(vId);
      soundEngine.playCashRegister();
      showNotification('New vehicle registered in your garage!');
    }
  };

  // Outfit change action
  const handleChangeOutfit = (outfitId: string) => {
    if (!engineRef.current) return;
    engineRef.current.player.stats.outfitId = outfitId;
    engineRef.current.player.updateOutfit();
    showNotification('Outfit updated!');
  };

  // Car paint color action
  const handleChangeCarColor = (hex: string) => {
    if (!engineRef.current) return;
    if (engineRef.current.playerVehicle) {
      engineRef.current.playerVehicle.setColor(hex);
      engineRef.current.playerVehicle.repair();
      soundEngine.playCashRegister();
      showNotification('Vehicle painted and fully repaired!');
    } else {
      showNotification('Enter a vehicle first to apply custom tuning.');
    }
  };

  // Cycle radio station
  const handleToggleRadio = () => {
    const cur = soundEngine.getRadioStation();
    const next = (cur + 1) % 4;
    soundEngine.setRadioStation(next);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* Isolated Three.js WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={() => {
          if (gameState === 'playing' && !('ontouchstart' in window)) {
            try {
              canvasMountRef.current?.requestPointerLock?.();
            } catch {}
          }
        }}
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onContinueGame={handleContinueGame}
          hasSaveData={hasSaveData}
          onOpenAndroidGuide={() => setShowAndroidGuide(true)}
          onOpenSettings={() => setGameState('paused')}
        />
      )}

      {/* Active In-Game Heads-Up Display */}
      {gameState !== 'title' && engineRef.current && (
        <HUD
          playerStats={engineRef.current.player.stats}
          currentVehicle={hudStats.vehicleConfig}
          vehicleSpeed={hudStats.speed}
          vehicleNitro={hudStats.nitro}
          activeMission={activeMission}
          radioStation={hudStats.radioStation}
          onToggleRadio={handleToggleRadio}
          onCycleWeapon={() => engineRef.current?.player.cycleWeapon()}
          notification={notification}
          playerPos={hudStats.pos}
          playerYaw={hudStats.yaw}
        />
      )}

      {/* Virtual Dual-Stick Touch Controls */}
      {gameState === 'playing' && (
        <TouchControls
          inputState={inputState}
          inVehicle={hudStats.isDriving}
          onOpenPhone={() => setGameState('phone')}
          onPause={() => setGameState('paused')}
          opacity={engineRef.current?.settings.touchOpacity ?? 0.85}
        />
      )}

      {/* Smartphone ("iNono OS") Modal */}
      {gameState === 'phone' && engineRef.current && (
        <SmartphoneModal
          playerStats={engineRef.current.player.stats}
          missions={engineRef.current.missions.missions}
          onStartMission={mId => {
            engineRef.current?.missions.startMission(mId);
            setGameState('playing');
          }}
          onValetDeliver={vId => {
            engineRef.current?.valetDeliverCar(vId);
            setGameState('playing');
          }}
          onChangeWeather={w => {
            if (engineRef.current) engineRef.current.weather = w;
            setGameState('playing');
          }}
          onClose={() => setGameState('playing')}
        />
      )}

      {/* Shops & Customization Modals */}
      {(gameState === 'shopping' || gameState === 'wardrobe' || gameState === 'dealership' || gameState === 'modshop') &&
        engineRef.current && (
          <ShopModal
            type={gameState}
            playerStats={engineRef.current.player.stats}
            onBuyWeapon={handleBuyWeapon}
            onBuyAmmo={handleBuyAmmo}
            onBuyVehicle={handleBuyVehicle}
            onChangeOutfit={handleChangeOutfit}
            onChangeCarColor={handleChangeCarColor}
            onClose={() => setGameState('playing')}
          />
        )}

      {/* Pause Menu Modal */}
      {gameState === 'paused' && engineRef.current && (
        <PauseModal
          settings={engineRef.current.settings}
          onUpdateSettings={s => {
            if (engineRef.current) {
              engineRef.current.settings = { ...engineRef.current.settings, ...s };
              if (s.sfxVolume !== undefined || s.musicVolume !== undefined) {
                soundEngine.setVolumes(engineRef.current.settings.sfxVolume, engineRef.current.settings.musicVolume);
              }
            }
          }}
          onResume={() => setGameState('playing')}
          onSaveGame={handleSaveGame}
          onQuitToTitle={() => {
            if (engineRef.current) engineRef.current.isTitleScreen = true;
            setGameState('title');
          }}
          saveSuccess={saveSuccess}
        />
      )}

      {/* Android & APK Instructions Modal */}
      {showAndroidGuide && (
        <AndroidGuideModal onClose={() => setShowAndroidGuide(false)} />
      )}
    </div>
  );
}
