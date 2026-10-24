import * as THREE from 'three';
import { VehicleConfig, VehicleId } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';

export const VEHICLE_PRESETS: Record<VehicleId, VehicleConfig> = {
  hyperion: {
    id: 'hyperion',
    name: 'Nono Hyperion',
    category: 'super',
    maxSpeed: 42,
    acceleration: 28,
    braking: 35,
    handling: 2.8,
    durability: 100,
    price: 150000,
    color: '#ef4444', // Crimson Supercar
    unlocked: true,
  },
  cruiser: {
    id: 'cruiser',
    name: 'Metropolis Cruiser',
    category: 'sedan',
    maxSpeed: 30,
    acceleration: 18,
    braking: 25,
    handling: 2.2,
    durability: 120,
    price: 35000,
    color: '#0284c7', // Sapphire Blue
    unlocked: true,
  },
  titan: {
    id: 'titan',
    name: 'Titan 4x4',
    category: 'suv',
    maxSpeed: 26,
    acceleration: 15,
    braking: 22,
    handling: 1.8,
    durability: 200,
    price: 60000,
    color: '#15803d', // Military Forest
    unlocked: true,
  },
  police: {
    id: 'police',
    name: 'Interceptor 900',
    category: 'police',
    maxSpeed: 38,
    acceleration: 26,
    braking: 32,
    handling: 2.5,
    durability: 160,
    price: 0,
    color: '#0f172a', // Black & White Police
    unlocked: false,
  },
  phantom: {
    id: 'phantom',
    name: 'Phantom GT Racer',
    category: 'tuner',
    maxSpeed: 46,
    acceleration: 32,
    braking: 38,
    handling: 3.1,
    durability: 90,
    price: 220000,
    color: '#a855f7', // Neon Violet Tuner
    unlocked: false,
  },
  viper: {
    id: 'viper',
    name: 'Viper 250 Bike',
    category: 'bike',
    maxSpeed: 44,
    acceleration: 35,
    braking: 30,
    handling: 3.5,
    durability: 60,
    price: 45000,
    color: '#f59e0b', // Amber Bike
    unlocked: false,
  },
};

export class VehicleEntity {
  public mesh: THREE.Group;
  public config: VehicleConfig;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public speed: number = 0;
  public steeringAngle: number = 0;
  public health: number = 100;
  public isPlayerDriving: boolean = false;
  public isNitroActive: boolean = false;
  public nitroAmount: number = 100;

  // Visual sub-parts for animations
  private frontLeftWheel: THREE.Group | null = null;
  private frontRightWheel: THREE.Group | null = null;
  private rearLeftWheel: THREE.Group | null = null;
  private rearRightWheel: THREE.Group | null = null;
  private headlights: THREE.SpotLight[] = [];
  private taillights: THREE.Mesh[] = [];
  private sirenRedMesh: THREE.Mesh | null = null;
  private sirenBlueMesh: THREE.Mesh | null = null;
  private sirenTimer: number = 0;
  private bodyMaterial: THREE.MeshStandardMaterial | null = null;
  private nitroFlame: THREE.Mesh | null = null;

  // Collision box
  public boundingBox: THREE.Box3 = new THREE.Box3();

  constructor(config: VehicleConfig, initialPos: THREE.Vector3, initialRotY: number = 0) {
    this.config = { ...config };
    this.position = initialPos.clone();
    this.rotation = new THREE.Euler(0, initialRotY, 0, 'YXZ');
    this.health = config.durability;

    this.mesh = this.buildVehicleModel();
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
  }

  // Composite 3-12 Part Procedural Vehicle
  private buildVehicleModel(): THREE.Group {
    const group = new THREE.Group();

    const isBike = this.config.category === 'bike';
    const isPolice = this.config.category === 'police';
    const isSUV = this.config.category === 'suv';
    const isSuper = this.config.category === 'super' || this.config.category === 'tuner';

    const carWidth = isBike ? 1.0 : (isSUV ? 2.5 : 2.2);
    const carLength = isBike ? 2.4 : (isSUV ? 5.2 : 4.6);
    const carHeight = isBike ? 1.4 : (isSUV ? 2.0 : 1.3);

    // 1. Primary Silhouette: Car Body / Chassis
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.color),
      roughness: 0.2,
      metalness: 0.85,
    });

    const bodyGeo = isBike
      ? new THREE.BoxGeometry(0.6, 0.8, 2.2)
      : new THREE.BoxGeometry(carWidth, carHeight * 0.55, carLength);
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.position.y = carHeight * 0.45;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    if (!isBike) {
      // 2. Cabin Greenhouse / Roof & Tinted Glass Windows
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.1,
        metalness: 0.95,
      });
      const cabinW = carWidth * 0.82;
      const cabinH = carHeight * 0.5;
      const cabinL = carLength * 0.48;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), cabinMat);
      cabin.position.set(0, carHeight * 0.82, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Windshield slope
      const windshieldMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        roughness: 0.05,
        metalness: 0.9,
      });
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.95, 0.05, 0.9), windshieldMat);
      windshield.position.set(0, carHeight * 0.72, cabinL * 0.55);
      windshield.rotation.x = -0.55;
      group.add(windshield);

      // 3. Front Grille & Bumper
      const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.95, 0.35, 0.3), bumperMat);
      bumper.position.set(0, 0.3, carLength * 0.5 + 0.1);
      group.add(bumper);

      // 4. Headlights (twin high-power headlights)
      const headlightMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 0.8,
      });
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headlightMat);
      hlLeft.position.set(-carWidth * 0.35, carHeight * 0.45, carLength * 0.5 + 0.05);
      group.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), headlightMat);
      hlRight.position.set(carWidth * 0.35, carHeight * 0.45, carLength * 0.5 + 0.05);
      group.add(hlRight);

      // Spotlights for nighttime beam
      const spotL = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 4, 0.5);
      spotL.position.copy(hlLeft.position);
      spotL.target.position.set(-carWidth * 0.35, 0, carLength * 0.5 + 15);
      group.add(spotL);
      group.add(spotL.target);
      this.headlights.push(spotL);

      const spotR = new THREE.SpotLight(0xffffff, 0, 45, Math.PI / 4, 0.5);
      spotR.position.copy(hlRight.position);
      spotR.target.position.set(carWidth * 0.35, 0, carLength * 0.5 + 15);
      group.add(spotR);
      group.add(spotR.target);
      this.headlights.push(spotR);

      // 5. Taillights (Red LED strips)
      const tlMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.6,
      });
      const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.1), tlMat);
      tlLeft.position.set(-carWidth * 0.35, carHeight * 0.45, -carLength * 0.5 - 0.05);
      group.add(tlLeft);
      this.taillights.push(tlLeft);

      const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.1), tlMat);
      tlRight.position.set(carWidth * 0.35, carHeight * 0.45, -carLength * 0.5 - 0.05);
      group.add(tlRight);
      this.taillights.push(tlRight);

      // 6. Spoiler for Sports / Tuner
      if (isSuper) {
        const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(carWidth * 0.9, 0.08, 0.4), bumperMat);
        spoilerWing.position.set(0, carHeight * 0.8, -carLength * 0.45);
        spoilerWing.castShadow = true;
        group.add(spoilerWing);

        // Spoiler mounts
        const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.1), bumperMat);
        mount1.position.set(-carWidth * 0.3, carHeight * 0.65, -carLength * 0.45);
        group.add(mount1);

        const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.1), bumperMat);
        mount2.position.set(carWidth * 0.3, carHeight * 0.65, -carLength * 0.45);
        group.add(mount2);
      }

      // 7. Police Siren Lightbar (Red/Blue LED Bar)
      if (isPolice) {
        const sirenBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.25), bumperMat);
        sirenBase.position.set(0, carHeight + 0.1, -0.2);
        group.add(sirenBase);

        const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        this.sirenRedMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.22), redMat);
        this.sirenRedMesh.position.set(-0.35, carHeight + 0.18, -0.2);
        group.add(this.sirenRedMesh);

        const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
        this.sirenBlueMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.22), blueMat);
        this.sirenBlueMesh.position.set(0.35, carHeight + 0.18, -0.2);
        group.add(this.sirenBlueMesh);
      }

      // 8. Nitro Flame Exhaust (Cone hidden by default)
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
      this.nitroFlame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 8), flameMat);
      this.nitroFlame.rotation.x = Math.PI / 2;
      this.nitroFlame.position.set(0, 0.35, -carLength * 0.5 - 0.5);
      this.nitroFlame.visible = false;
      group.add(this.nitroFlame);

      // 9. Four Realistic Wheels with Rims & Tires
      const wheelR = isSUV ? 0.5 : 0.4;
      const wheelW = 0.28;
      const wheelOffsetZ = carLength * 0.32;
      const wheelOffsetX = carWidth * 0.5;

      this.frontLeftWheel = this.createWheel(wheelR, wheelW);
      this.frontLeftWheel.position.set(-wheelOffsetX, wheelR, wheelOffsetZ);
      group.add(this.frontLeftWheel);

      this.frontRightWheel = this.createWheel(wheelR, wheelW);
      this.frontRightWheel.position.set(wheelOffsetX, wheelR, wheelOffsetZ);
      group.add(this.frontRightWheel);

      this.rearLeftWheel = this.createWheel(wheelR, wheelW);
      this.rearLeftWheel.position.set(-wheelOffsetX, wheelR, -wheelOffsetZ);
      group.add(this.rearLeftWheel);

      this.rearRightWheel = this.createWheel(wheelR, wheelW);
      this.rearRightWheel.position.set(wheelOffsetX, wheelR, -wheelOffsetZ);
      group.add(this.rearRightWheel);
    } else {
      // Motorcycle Wheels (2 large wheels)
      this.frontLeftWheel = this.createWheel(0.48, 0.2);
      this.frontLeftWheel.position.set(0, 0.48, 1.0);
      group.add(this.frontLeftWheel);

      this.rearLeftWheel = this.createWheel(0.48, 0.24);
      this.rearLeftWheel.position.set(0, 0.48, -1.0);
      group.add(this.rearLeftWheel);
    }

    return group;
  }

  // Realistic wheel: rubber tire + metallic alloy rim + hub
  private createWheel(radius: number, width: number): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Rubber Tire
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
      metalness: 0.1,
    });
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Chrome/Alloy Rim
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.15,
    });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.05, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Center hub cap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width * 1.1, 8), tireMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    return wheelGroup;
  }

  // Update driving physics & animations
  public update(
    dt: number,
    throttle: number, // -1 (reverse/brake), 0 (coast), 1 (accelerate)
    steer: number,    // -1 (left), 1 (right)
    handbrake: boolean,
    nitro: boolean,
    isNight: boolean
  ) {
    // Night lights
    for (const hl of this.headlights) {
      hl.intensity = isNight ? 2.5 : 0;
    }

    // Siren animation if police vehicle
    if (this.config.category === 'police' && this.sirenRedMesh && this.sirenBlueMesh) {
      this.sirenTimer += dt * 8;
      const flash = Math.sin(this.sirenTimer) > 0;
      this.sirenRedMesh.visible = flash;
      this.sirenBlueMesh.visible = !flash;
    }

    // Nitro handling
    this.isNitroActive = nitro && this.nitroAmount > 0 && throttle > 0;
    if (this.isNitroActive) {
      this.nitroAmount = Math.max(0, this.nitroAmount - dt * 25);
    } else {
      this.nitroAmount = Math.min(100, this.nitroAmount + dt * 10);
    }
    if (this.nitroFlame) {
      this.nitroFlame.visible = this.isNitroActive;
    }

    // Acceleration & Braking
    const accelRate = this.config.acceleration * (this.isNitroActive ? 1.8 : 1.0);
    const topSpeed = this.config.maxSpeed * (this.isNitroActive ? 1.4 : 1.0);

    if (throttle > 0) {
      this.speed = Math.min(topSpeed, this.speed + accelRate * dt);
    } else if (throttle < 0) {
      if (this.speed > 1) {
        // Braking
        this.speed = Math.max(0, this.speed - this.config.braking * dt);
      } else {
        // Reverse
        this.speed = Math.max(-12, this.speed - accelRate * 0.6 * dt);
      }
    } else {
      // Natural rolling friction coasting
      const friction = 8;
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed - friction * dt);
      } else if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + friction * dt);
      }
    }

    if (handbrake) {
      this.speed *= Math.max(0, 1 - dt * 5);
      if (Math.abs(this.speed) > 10) {
        soundEngine.setDriftScreech(true);
      }
    } else {
      soundEngine.setDriftScreech(false);
    }

    // Steering
    const targetSteerAngle = steer * 0.55;
    this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, targetSteerAngle, 12, dt);

    // Front wheels steering visual pivot
    if (this.frontLeftWheel && this.frontRightWheel) {
      this.frontLeftWheel.rotation.y = this.steeringAngle;
      this.frontRightWheel.rotation.y = this.steeringAngle;
    }

    // Vehicle turning yaw rotation based on speed and steering
    if (Math.abs(this.speed) > 0.2) {
      const turnFactor = (this.speed / topSpeed) * this.config.handling * (handbrake ? 1.6 : 1.0);
      const dir = this.speed >= 0 ? 1 : -1;
      this.rotation.y -= this.steeringAngle * turnFactor * dt * 2.8 * dir;
    }

    // Move along facing direction (Z forward)
    const forwardVec = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
    this.position.addScaledVector(forwardVec, this.speed * dt);

    // Keep on ground
    this.position.y = 0;

    // Sync Three.js mesh transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);

    // Roll wheels based on distance traveled
    const wheelRoll = (this.speed * dt) / 0.4;
    if (this.frontLeftWheel) this.frontLeftWheel.children[0].rotation.x += wheelRoll;
    if (this.frontRightWheel) this.frontRightWheel.children[0].rotation.x += wheelRoll;
    if (this.rearLeftWheel) this.rearLeftWheel.children[0].rotation.x += wheelRoll;
    if (this.rearRightWheel) this.rearRightWheel.children[0].rotation.x += wheelRoll;

    // Update audio engine
    if (this.isPlayerDriving) {
      const speedRatio = Math.abs(this.speed) / this.config.maxSpeed;
      soundEngine.updateVehicleEngine(speedRatio, throttle > 0, this.isNitroActive);
    }

    // Update bounding box
    this.boundingBox.setFromObject(this.mesh);
  }

  // Paint custom color
  public setColor(hex: string) {
    this.config.color = hex;
    if (this.bodyMaterial) {
      this.bodyMaterial.color.set(hex);
    }
  }

  // Repair
  public repair() {
    this.health = this.config.durability;
  }
}
