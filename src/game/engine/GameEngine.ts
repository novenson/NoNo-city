import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CityBuilder } from '../world/CityBuilder';
import { PlayerEntity } from '../entities/PlayerEntity';
import { VehicleEntity, VEHICLE_PRESETS } from '../entities/VehicleEntity';
import { NPCManager } from '../entities/NPCEntity';
import { PoliceSystem } from '../entities/PoliceSystem';
import { MissionManager } from '../missions/MissionManager';
import { BattleRoyaleSystem } from '../battle/BattleRoyaleSystem';
import { GraphicsSettings, InputState, WeatherType, GameMode } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public city: CityBuilder;
  public player: PlayerEntity;
  public playerVehicle: VehicleEntity | null = null;
  public parkedVehicles: VehicleEntity[] = [];
  public npcManager: NPCManager;
  public police: PoliceSystem;
  public missions: MissionManager;
  public battleRoyale: BattleRoyaleSystem;

  // Environment & Lighting
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public timeOfDay: number = 0.35; // 0.0 midnight, 0.5 noon
  public weather: WeatherType = 'clear';
  public isSoftwareGl: boolean = false;

  // Camera & Aim
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.22;
  public cameraDist: number = 4.2;
  public cameraTarget: THREE.Vector3 = new THREE.Vector3();
  public currentFov: number = 65;

  // Performance & Loop controls
  public isLobby: boolean = true;
  public isPaused: boolean = false;
  private animFrameId: number = 0;
  private lastFrameTime: number = performance.now();
  public currentFps: number = 60;
  private fpsCounter: number = 0;
  private fpsLastSample: number = performance.now();

  // Bullet tracers & particles
  private bulletTracers: { mesh: THREE.Line; velocity: THREE.Vector3; life: number }[] = [];
  private rainParticles: THREE.Points | null = null;

  // Configured Graphics & Performance
  public settings: GraphicsSettings = {
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
  };

  // Raycaster for shooting & looting
  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  // State callbacks for React UI
  public onStateChange?: (state: string) => void;
  public onNotification?: (msg: string) => void;
  public onVictory?: () => void;
  public onDefeat?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect software rendering fallback
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize WebGL Renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // PCF is substantially faster than PCFSoft

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Scene & Perspective Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.2, 350);

    // Studio Environment Reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting rig
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    this.sunLight.position.set(60, 95, 60);
    this.sunLight.castShadow = !this.isSoftwareGl && this.settings.shadows;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 240;
    const shadowD = 65;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Horizon fog
    this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.0055);
    this.scene.background = new THREE.Color(0x94a3b8);

    // Build City & Open World
    this.city = new CityBuilder(this.scene);
    this.city.buildCity();

    // Player Entity
    this.player = new PlayerEntity(new THREE.Vector3(-45, 0, 48));
    this.scene.add(this.player.mesh);

    // Parked personal sports cars
    const initialCar = new VehicleEntity(VEHICLE_PRESETS.hyperion, new THREE.Vector3(-45 + 5, 0, 48 + 8), 0);
    this.scene.add(initialCar.mesh);
    this.parkedVehicles.push(initialCar);

    const dealerCar = new VehicleEntity(VEHICLE_PRESETS.cruiser, new THREE.Vector3(45, 0, -35), Math.PI / 2);
    this.scene.add(dealerCar.mesh);
    this.parkedVehicles.push(dealerCar);

    // NPCs & Traffic AI
    this.npcManager = new NPCManager(this.scene);
    this.npcManager.spawnPedestrians(18); // Optimized count for 60+ FPS
    this.npcManager.spawnTrafficVehicles(5);

    // Police & Missions
    this.police = new PoliceSystem(this.scene);
    this.missions = new MissionManager(this.scene);

    // Battle Royale System (Free Fire battle logic, squad, safe zone, loot)
    this.battleRoyale = new BattleRoyaleSystem(this.scene);
    this.battleRoyale.onVictory = () => {
      this.onVictory?.();
    };

    // Rain particles
    this.initRainParticles();

    // Window resize
    window.addEventListener('resize', this.onResize);
  }

  // Apply graphics settings presets & FPS cap
  public applyGraphicsSettings(newSettings: Partial<GraphicsSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    switch (this.settings.quality) {
      case 'very_low':
        this.renderer.setPixelRatio(0.8);
        this.renderer.shadowMap.enabled = false;
        this.sunLight.castShadow = false;
        this.camera.far = 180;
        break;
      case 'low':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = false;
        this.sunLight.castShadow = false;
        this.camera.far = 220;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1.0);
        this.renderer.shadowMap.enabled = true;
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(512, 512);
        this.camera.far = 260;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(1024, 1024);
        this.camera.far = 320;
        break;
      case 'ultra':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
        this.renderer.shadowMap.enabled = true;
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.camera.far = 380;
        break;
    }
    this.camera.updateProjectionMatrix();
  }

  private initRainParticles() {
    const rainCount = 800;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = Math.random() * 35;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.22,
      transparent: true,
      opacity: 0.5,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  private onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  // Start Battle Royale Match
  public startBattleRoyale(mode: GameMode) {
    this.isLobby = false;
    // Teleport player to initial drop zone
    this.player.position.set(0, 0, 15);
    this.player.stats.health = 200;
    this.player.stats.armor = 100;
    this.player.stats.isKnocked = false;
    this.player.stats.isDead = false;
    this.player.stats.gloowalls = 3;
    this.player.stats.medkits = 2;
    this.battleRoyale.startMatch(mode, this.player.stats.username);
    this.onNotification?.(`Match Started: ${mode.toUpperCase()}! Survive & Win Booyah!`);
  }

  // Return to Lobby
  public returnToLobby() {
    this.isLobby = true;
    this.battleRoyale.cleanup();
    this.player.position.set(-45, 0, 48);
    this.player.mesh.position.copy(this.player.position);
    this.player.mesh.rotation.set(0, 0, 0);
  }

  // Update Weather & Lighting
  public updateEnvironment(dt: number) {
    this.timeOfDay = (this.timeOfDay + dt * 0.002) % 1.0;
    const angle = this.timeOfDay * Math.PI * 2;
    this.sunLight.position.set(Math.cos(angle) * 100, Math.sin(angle) * 100, Math.sin(angle) * 50);

    const isNight = this.timeOfDay > 0.75 || this.timeOfDay < 0.22;
    this.city.setNightMode(isNight);

    if (this.weather === 'rain') {
      this.scene.background = new THREE.Color(0x334155);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x334155);
      this.sunLight.intensity = 0.8;
      if (this.rainParticles) {
        this.rainParticles.visible = true;
        this.rainParticles.position.copy(this.player.position);
      }
    } else if (isNight) {
      this.scene.background = new THREE.Color(0x060814);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x060814);
      this.sunLight.intensity = 0.2;
      this.hemiLight.color.set(0x1e1b4b);
      this.hemiLight.groundColor.set(0x020617);
      if (this.rainParticles) this.rainParticles.visible = false;
    } else {
      this.scene.background = new THREE.Color(0x7dd3fc);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x94a3b8);
      this.sunLight.intensity = 2.4;
      this.hemiLight.color.set(0xbae6fd);
      this.hemiLight.groundColor.set(0x334155);
      if (this.rainParticles) this.rainParticles.visible = false;
    }
  }

  // Main simulation update driven by unified loop in App.tsx
  public update(dt: number, input: InputState) {
    if (this.isPaused) return;

    // Track real FPS
    this.fpsCounter++;
    const now = performance.now();
    if (now - this.fpsLastSample >= 500) {
      this.currentFps = Math.round((this.fpsCounter * 1000) / (now - this.fpsLastSample));
      this.fpsCounter = 0;
      this.fpsLastSample = now;
    }

    this.updateEnvironment(dt);

    if (this.isLobby) {
      // 3D Lobby Character showcase stage camera
      const t = Date.now() * 0.0004;
      const camX = this.player.position.x + Math.sin(t) * 3.8;
      const camZ = this.player.position.z + Math.cos(t) * 3.8;
      this.camera.position.set(camX, 1.4, camZ);
      this.camera.lookAt(this.player.position.x, 1.25, this.player.position.z);
      return;
    }

    // Camera Look rotation
    this.cameraYaw -= input.lookDeltaX * 0.003 * this.settings.cameraSensitivity;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - input.lookDeltaY * 0.003 * this.settings.cameraSensitivity,
      -0.4,
      0.85
    );

    const isNight = this.timeOfDay > 0.75 || this.timeOfDay < 0.22;

    // Gloo Wall quick deploy
    if (input.gloowall && this.player.stats.gloowalls > 0) {
      input.gloowall = false;
      this.player.stats.gloowalls--;
      this.battleRoyale.deployGlooWall(this.player.position, this.cameraYaw);
      this.onNotification?.(`Gloo Wall Deployed! (${this.player.stats.gloowalls} left)`);
    }

    // Medkit quick heal
    if (input.heal) {
      input.heal = false;
      if (this.player.heal()) {
        this.onNotification?.(`Used Medkit! (+75 HP)`);
      }
    }

    // === VEHICLE OR ON-FOOT UPDATE ===
    if (this.playerVehicle) {
      const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);

      this.playerVehicle.update(dt, throttle, steer, false, input.sprint, isNight);

      this.player.position.copy(this.playerVehicle.position);

      if (input.interact) {
        input.interact = false;
        this.exitVehicle();
      }

      // Chase camera
      const carRot = this.playerVehicle.rotation.y;
      this.cameraYaw = THREE.MathUtils.damp(this.cameraYaw, carRot, 4.0, dt);

      const chaseDist = 6.2 + Math.abs(this.playerVehicle.speed) * 0.07;
      const chaseHeight = 2.6;

      const camOffset = new THREE.Vector3(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * chaseDist,
        Math.sin(this.cameraPitch) * chaseDist + chaseHeight,
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * chaseDist
      );

      this.camera.position.copy(this.playerVehicle.position).add(camOffset);
      this.cameraTarget.copy(this.playerVehicle.position).add(new THREE.Vector3(0, 1.3, 0));
      this.camera.lookAt(this.cameraTarget);
    } else {
      // On-foot controls
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);

      this.player.update(
        dt,
        moveX,
        moveZ,
        input.sprint,
        input.jump,
        input.crouch,
        input.prone,
        input.aim,
        this.cameraYaw
      );

      // Reload
      if (input.reload) {
        input.reload = false;
        this.player.reload();
      }

      // Shoot
      if (input.shoot) {
        const fired = this.player.shoot();
        if (fired) {
          this.handlePlayerShot();
        }
      }

      // Interact / Enter car / Loot
      if (input.interact) {
        input.interact = false;
        this.checkInteract();
      }

      // Camera ADS FOV zoom & follow distance
      const activeWep = this.player.getActiveWeapon();
      const targetFov = input.aim ? (activeWep.category === 'sniper' ? 24 : 45) : 65;
      this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 12, dt);
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();

      const targetDist = input.aim ? 2.0 : (this.player.isCrouching ? 3.4 : 4.2);
      this.cameraDist = THREE.MathUtils.damp(this.cameraDist, targetDist, 10, dt);

      const camOffset = new THREE.Vector3(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist,
        Math.sin(this.cameraPitch) * this.cameraDist + (input.aim ? 1.65 : 1.9),
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist
      );

      // Aim shoulder offset to right
      if (input.aim) {
        const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
        camOffset.addScaledVector(rightVec, 0.65);
      }

      this.camera.position.copy(this.player.position).add(camOffset);
      this.cameraTarget.copy(this.player.position).add(new THREE.Vector3(0, 1.45, 0));
      this.camera.lookAt(this.cameraTarget);
    }

    // === BULLET TRACERS ===
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tracer = this.bulletTracers[i];
      tracer.mesh.position.addScaledVector(tracer.velocity, dt);
      tracer.life -= dt;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        this.bulletTracers.splice(i, 1);
      }
    }

    // === BATTLE ROYALE SIMULATION ===
    const { safeZoneDamage, nearbyLoot } = this.battleRoyale.update(dt, this.player.position);

    // Apply safe zone storm damage
    if (safeZoneDamage > 0) {
      this.player.takeDamage(safeZoneDamage);
      if (this.player.stats.health <= 0) {
        this.onDefeat?.();
      }
    }

    // Update screen coordinates for floating damage numbers
    for (const dn of this.battleRoyale.damageNumbers) {
      const vec = new THREE.Vector3(dn.pos[0], dn.pos[1], dn.pos[2]);
      vec.project(this.camera);
      dn.screenX = ((vec.x + 1) / 2) * this.container.clientWidth;
      dn.screenY = ((-vec.y + 1) / 2) * this.container.clientHeight;
    }

    // Distance-culled traffic & pedestrians
    this.npcManager.updatePedestrians(dt, this.player.position, input.shoot);
    this.npcManager.updateTraffic(dt, isNight);
  }

  // Raycast bullet shot against enemy bots
  private handlePlayerShot() {
    const wep = this.player.getActiveWeapon();
    if (!wep) return;

    // Raycast from camera center
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0));

    // Bullet tracer visual
    const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(3.5)];
    const tracerGeo = new THREE.BufferGeometry().setFromPoints(points);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffea00 });
    const tracer = new THREE.Line(tracerGeo, tracerMat);
    tracer.position.copy(origin);
    this.scene.add(tracer);

    this.bulletTracers.push({
      mesh: tracer,
      velocity: dir.clone().multiplyScalar(150),
      life: 0.12,
    });

    // Check hit on enemy bots
    let closestBot: any = null;
    let closestDist = wep.range;
    let isHeadshot = false;

    for (const bot of this.battleRoyale.enemyBots) {
      if (bot.isDead) continue;
      const toBot = bot.pos.clone().sub(origin);
      const proj = toBot.dot(dir);
      if (proj > 0 && proj < closestDist) {
        const perp = toBot.clone().sub(dir.clone().multiplyScalar(proj));
        // Check hit radius
        if (perp.length() < 1.1) {
          closestDist = proj;
          closestBot = bot;
          // Check if shot hit head height
          const hitHeight = origin.y + dir.y * proj;
          isHeadshot = hitHeight > 1.65;
        }
      }
    }

    if (closestBot) {
      const finalDamage = wep.damage * (isHeadshot ? wep.headshotMultiplier : 1.0);
      const killed = this.battleRoyale.damageEnemyBot(closestBot.id, finalDamage, isHeadshot, this.player.position);
      if (killed) {
        this.player.stats.kills++;
        this.player.stats.damageDealt += finalDamage;
        this.player.stats.xp += isHeadshot ? 120 : 80;
        this.player.stats.gold += isHeadshot ? 250 : 150;
      }
    }
  }

  // Check interact for vehicles or ground loot
  private checkInteract() {
    // 1. Check nearby ground loot
    for (const loot of this.battleRoyale.groundLoot) {
      const d = Math.hypot(loot.position[0] - this.player.position.x, loot.position[2] - this.player.position.z);
      if (d < 3.2) {
        this.pickupLoot(loot.id);
        return;
      }
    }

    // 2. Check nearby vehicles
    let closestCar: VehicleEntity | null = null;
    let closestDist = 5.0;

    for (const car of [...this.parkedVehicles, ...this.npcManager.trafficVehicles]) {
      const dist = car.position.distanceTo(this.player.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestCar = car;
      }
    }

    if (closestCar) {
      this.enterVehicle(closestCar);
    }
  }

  // Loot pickup method
  public pickupLoot(lootId: string) {
    const item = this.battleRoyale.pickupLoot(lootId);
    if (!item) return;

    if (item.type === 'weapon' && item.weaponId) {
      // Equip weapon into active slot
      if (this.player.stats.activeSlot === 'primary1') {
        this.player.stats.primaryWeapon1 = item.weaponId;
      } else if (this.player.stats.activeSlot === 'primary2') {
        this.player.stats.primaryWeapon2 = item.weaponId;
      } else {
        this.player.stats.secondaryWeapon = item.weaponId;
      }
      this.player.updateWeaponVisual();
      this.onNotification?.(`Picked up ${item.name}!`);
    } else if (item.type === 'ammo') {
      const wep = this.player.getActiveWeapon();
      wep.reserveAmmo = Math.min(wep.maxAmmo, wep.reserveAmmo + item.amount);
      this.onNotification?.(`+${item.amount} Ammo`);
    } else if (item.type === 'medkit') {
      this.player.stats.medkits += item.amount;
      this.onNotification?.(`+${item.amount} Medkit`);
    } else if (item.type === 'gloowall') {
      this.player.stats.gloowalls += item.amount;
      this.onNotification?.(`+${item.amount} Gloo Wall`);
    } else if (item.type === 'vest') {
      this.player.stats.armor = Math.min(this.player.stats.maxArmor, this.player.stats.armor + item.amount);
      this.onNotification?.(`Equipped ${item.name}! (+${item.amount} Armor)`);
    }
  }

  public enterVehicle(car: VehicleEntity) {
    this.playerVehicle = car;
    car.isPlayerDriving = true;
    this.player.inVehicle = true;
    soundEngine.startVehicleEngine();
    this.onNotification?.(`Driving ${car.config.name}`);
  }

  public exitVehicle() {
    if (!this.playerVehicle) return;
    const exitSide = new THREE.Vector3(1.8, 0, 0).applyEuler(this.playerVehicle.rotation);
    this.player.position.copy(this.playerVehicle.position).add(exitSide);
    this.player.position.y = 0;

    this.playerVehicle.isPlayerDriving = false;
    this.playerVehicle.speed = 0;
    this.player.inVehicle = false;
    this.playerVehicle = null;
    soundEngine.stopVehicleEngine();
  }

  // Direct render call
  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    soundEngine.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
