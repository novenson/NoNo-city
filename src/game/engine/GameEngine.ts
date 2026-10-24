import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CityBuilder } from '../world/CityBuilder';
import { PlayerEntity } from '../entities/PlayerEntity';
import { VehicleEntity, VEHICLE_PRESETS } from '../entities/VehicleEntity';
import { NPCManager } from '../entities/NPCEntity';
import { PoliceSystem } from '../entities/PoliceSystem';
import { MissionManager } from '../missions/MissionManager';
import { GraphicsSettings, InputState, WeatherType } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';

// Pre-allocated math objects to enforce Zero GC in render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

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

  // Environment & Lighting
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public timeOfDay: number = 0.35; // 0.0 (midnight), 0.25 (dawn), 0.5 (noon), 0.75 (dusk)
  public weather: WeatherType = 'clear';
  public isSoftwareGl: boolean = false;

  // Camera parameters
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.25;
  public cameraDist: number = 4.5;
  public cameraTarget: THREE.Vector3 = new THREE.Vector3();

  // Bullet tracers & particles
  private bulletTracers: { mesh: THREE.Line; velocity: THREE.Vector3; life: number }[] = [];
  private rainParticles: THREE.Points | null = null;

  // Game state
  public isTitleScreen: boolean = true;
  public isPaused: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = performance.now();

  // Settings
  public settings: GraphicsSettings = {
    quality: 'high',
    shadows: true,
    bloom: true,
    drawDistance: 300,
    trafficDensity: 'normal',
    touchOpacity: 0.85,
    cameraSensitivity: 1.0,
    sfxVolume: 0.8,
    musicVolume: 0.5,
  };

  // State callbacks for React UI
  public onStateChange?: (state: string) => void;
  public onMissionUpdate?: (info: { title: string; objective: string; time?: number }) => void;
  public onNotification?: (msg: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. Software WebGL Guard (r160+)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Modern WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.2, 500);

    // 4. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting rig
    this.hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.7);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    this.sunLight.position.set(60, 100, 60);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 300;
    const shadowD = 80;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Horizon fog
    this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.005);
    this.scene.background = new THREE.Color(0x94a3b8);

    // 6. Build City World
    this.city = new CityBuilder(this.scene);
    this.city.buildCity();

    // 7. Player Character Entity
    this.player = new PlayerEntity(new THREE.Vector3(-45, 0, 48));
    this.scene.add(this.player.mesh);

    // 8. Parked initial personal vehicle outside Player Residence
    const initialCar = new VehicleEntity(VEHICLE_PRESETS.cruiser, new THREE.Vector3(-45 + 6, 0, 48 + 10), 0);
    this.scene.add(initialCar.mesh);
    this.parkedVehicles.push(initialCar);

    // Extra sports car parked at dealership
    const dealerCar = new VehicleEntity(VEHICLE_PRESETS.hyperion, new THREE.Vector3(45, 0, -35), Math.PI / 2);
    this.scene.add(dealerCar.mesh);
    this.parkedVehicles.push(dealerCar);

    // 9. NPCs and Traffic AI
    this.npcManager = new NPCManager(this.scene);
    this.npcManager.spawnPedestrians(28);
    this.npcManager.spawnTrafficVehicles(7);

    // 10. Police & Wanted System
    this.police = new PoliceSystem(this.scene);

    // 11. Mission Progression
    this.missions = new MissionManager(this.scene);

    // 12. Rain Particle System
    this.initRainParticles();

    // Window resize listener
    window.addEventListener('resize', this.onResize);

    // Start Main Simulation Loop
    this.lastTime = performance.now();
    this.tick();
  }

  private initRainParticles() {
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 120;
      positions[i + 1] = Math.random() * 40;
      positions[i + 2] = (Math.random() - 0.5) * 120;
    }

    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
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

  // Day/Night & Weather Updates
  public updateEnvironment(dt: number) {
    // Advance day cycle slowly
    this.timeOfDay = (this.timeOfDay + dt * 0.003) % 1.0;

    const angle = this.timeOfDay * Math.PI * 2;
    this.sunLight.position.set(Math.cos(angle) * 120, Math.sin(angle) * 120, Math.sin(angle) * 60);

    const isNight = this.timeOfDay > 0.75 || this.timeOfDay < 0.22;
    this.city.setNightMode(isNight);

    if (this.weather === 'rain') {
      this.scene.background = new THREE.Color(0x334155);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x334155);
      this.sunLight.intensity = 0.8;
      if (this.rainParticles) {
        this.rainParticles.visible = true;
        this.rainParticles.position.copy(this.player.position);
        const posAttr = this.rainParticles.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 1; i < posAttr.array.length; i += 3) {
          posAttr.array[i] -= dt * 45;
          if (posAttr.array[i] < 0) posAttr.array[i] = 40;
        }
        posAttr.needsUpdate = true;
      }
    } else if (isNight) {
      this.scene.background = new THREE.Color(0x050814);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x050814);
      this.sunLight.intensity = 0.2;
      this.hemiLight.color.set(0x1e1b4b);
      this.hemiLight.groundColor.set(0x020617);
      if (this.rainParticles) this.rainParticles.visible = false;
    } else {
      // Daylight / Golden hour
      this.scene.background = new THREE.Color(0x7dd3fc);
      if (this.scene.fog) (this.scene.fog as THREE.FogExp2).color.set(0x94a3b8);
      this.sunLight.intensity = 2.4;
      this.hemiLight.color.set(0xbae6fd);
      this.hemiLight.groundColor.set(0x334155);
      if (this.rainParticles) this.rainParticles.visible = false;
    }
  }

  // === MAIN SIMULATION LOOP (60fps clamped) ===
  public update(dt: number, input: InputState) {
    if (this.isPaused) return;

    this.updateEnvironment(dt);

    if (this.isTitleScreen) {
      // Cinematic Live Pan flyover
      const t = Date.now() * 0.0003;
      this.camera.position.set(Math.cos(t) * 90, 45, Math.sin(t) * 90);
      this.camera.lookAt(0, 15, 0);
      this.npcManager.updatePedestrians(dt, this.player.position, false);
      this.npcManager.updateTraffic(dt, this.timeOfDay > 0.75 || this.timeOfDay < 0.22);
      return;
    }

    // Camera Look input (mouse or right stick)
    this.cameraYaw -= input.lookDeltaX * 0.003 * this.settings.cameraSensitivity;
    this.cameraPitch = THREE.MathUtils.clamp(
      this.cameraPitch - input.lookDeltaY * 0.003 * this.settings.cameraSensitivity,
      -0.3,
      0.9
    );

    const isNight = this.timeOfDay > 0.75 || this.timeOfDay < 0.22;

    // === VEHICLE OR ON-FOOT UPDATE ===
    if (this.playerVehicle) {
      // Driving Controls
      const throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);

      this.playerVehicle.update(dt, throttle, steer, input.handbrake, input.sprint, isNight);

      // Horn
      if (input.horn) {
        soundEngine.playHorn();
      }

      // Sync player position to vehicle
      this.player.position.copy(this.playerVehicle.position);

      // Check exit vehicle interact
      if (input.interact) {
        this.exitVehicle();
      }

      // Chase Camera behind vehicle
      const carRot = this.playerVehicle.rotation.y;
      this.cameraYaw = THREE.MathUtils.damp(this.cameraYaw, carRot, 4.5, dt);

      const chaseDist = 6.5 + Math.abs(this.playerVehicle.speed) * 0.08;
      const chaseHeight = 2.8;

      const camOffset = new THREE.Vector3(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * chaseDist,
        Math.sin(this.cameraPitch) * chaseDist + chaseHeight,
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * chaseDist
      );

      this.camera.position.copy(this.playerVehicle.position).add(camOffset);
      this.cameraTarget.copy(this.playerVehicle.position).add(new THREE.Vector3(0, 1.4, 0));
      this.camera.lookAt(this.cameraTarget);
    } else {
      // On-Foot Movement Controls
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);

      this.player.update(
        dt,
        moveX,
        moveZ,
        input.sprint,
        input.jump,
        input.crouch,
        input.aim,
        this.cameraYaw
      );

      // Reload
      if (input.reload) {
        this.player.reload();
      }

      // Shoot action
      if (input.shoot) {
        const shotFired = this.player.shoot();
        if (shotFired) {
          this.handlePlayerShot();
        }
      }

      // Enter vehicle interact check
      if (input.interact) {
        this.checkEnterVehicleOrBuilding();
      }

      // Third-person Follow Camera
      const targetDist = this.player.isAiming ? 2.2 : (this.player.isCrouching ? 3.5 : 4.5);
      this.cameraDist = THREE.MathUtils.damp(this.cameraDist, targetDist, 10, dt);

      const camOffset = new THREE.Vector3(
        -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist,
        Math.sin(this.cameraPitch) * this.cameraDist + (this.player.isAiming ? 1.7 : 2.0),
        -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDist
      );

      // Aim shoulder offset to right
      if (this.player.isAiming) {
        const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
        camOffset.addScaledVector(rightVec, 0.6);
      }

      this.camera.position.copy(this.player.position).add(camOffset);
      this.cameraTarget.copy(this.player.position).add(new THREE.Vector3(0, 1.5, 0));
      this.camera.lookAt(this.cameraTarget);
    }

    // === BULLET TRACERS UPDATE ===
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tracer = this.bulletTracers[i];
      tracer.mesh.position.addScaledVector(tracer.velocity, dt);
      tracer.life -= dt;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        this.bulletTracers.splice(i, 1);
      }
    }

    // === NPCS & TRAFFIC UPDATE ===
    this.npcManager.updatePedestrians(dt, this.player.position, input.shoot);
    this.npcManager.updateTraffic(dt, isNight);

    // === POLICE AI UPDATE ===
    this.police.update(dt, this.player.position, this.player.stats.insideHome);
    this.player.stats.wantedLevel = this.police.wantedLevel;

    // === MISSION SYSTEM UPDATE ===
    const missionRes = this.missions.update(dt, this.player.position, !!this.playerVehicle);
    if (missionRes.completed && missionRes.reward) {
      this.player.stats.cash += missionRes.reward;
      this.player.stats.repLevel++;
      this.onNotification?.(`Mission Completed! Earned $${missionRes.reward.toLocaleString()}`);
    } else if (missionRes.failed) {
      this.onNotification?.('Mission Failed!');
    }
  }

  // Handle player firing bullet
  private handlePlayerShot() {
    const wep = this.player.stats.ownedWeapons[this.player.stats.currentWeapon];
    if (!wep) return;

    // Direction player/camera is looking
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0));

    // Create glowing bullet tracer line
    const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(3.0)];
    const tracerGeo = new THREE.BufferGeometry().setFromPoints(points);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffea00 });
    const tracer = new THREE.Line(tracerGeo, tracerMat);
    tracer.position.copy(origin);
    this.scene.add(tracer);

    this.bulletTracers.push({
      mesh: tracer,
      velocity: dir.clone().multiplyScalar(140),
      life: 0.15,
    });

    // Check hit on pedestrians or traffic
    const hit = this.npcManager.checkBulletHits(origin, dir, wep.range, wep.damage);
    if (hit) {
      // Adding crime heat for shooting
      this.police.addCrimeHeat(1);
    }
  }

  // Check entering nearby car or service building
  public checkEnterVehicleOrBuilding() {
    // 1. Check nearby vehicles
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
      return;
    }

    // 2. Check service pads
    const pPos = this.player.position;

    // Home / Penthouse pad
    if (pPos.distanceTo(this.city.keyLocations.home) < 6.0) {
      this.onStateChange?.('wardrobe');
      return;
    }

    // Gun Shop pad
    if (pPos.distanceTo(this.city.keyLocations.gunshop) < 6.0) {
      this.onStateChange?.('shopping');
      return;
    }

    // Car Dealership pad
    if (pPos.distanceTo(this.city.keyLocations.dealership) < 6.0) {
      this.onStateChange?.('dealership');
      return;
    }

    // Mod Garage pad
    if (pPos.distanceTo(this.city.keyLocations.modshop) < 6.0) {
      this.onStateChange?.('modshop');
      return;
    }
  }

  public enterVehicle(car: VehicleEntity) {
    this.playerVehicle = car;
    car.isPlayerDriving = true;
    this.player.inVehicle = true;
    soundEngine.startVehicleEngine();
    this.onNotification?.(`Entered ${car.config.name}`);
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

  // Delivery valet car to player position
  public valetDeliverCar(vehicleId: string) {
    const config = VEHICLE_PRESETS[vehicleId as keyof typeof VEHICLE_PRESETS];
    if (!config) return;

    const spawnPos = this.player.position.clone().add(new THREE.Vector3(5, 0, 5));
    const newCar = new VehicleEntity(config, spawnPos, this.cameraYaw);
    this.scene.add(newCar.mesh);
    this.parkedVehicles.push(newCar);
    soundEngine.playHorn();
    this.onNotification?.(`Valet delivered ${config.name}!`);
  }

  private tick = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // 60fps simulation clamp

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

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
