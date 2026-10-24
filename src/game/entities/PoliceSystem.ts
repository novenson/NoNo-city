import * as THREE from 'three';
import { VehicleEntity, VEHICLE_PRESETS } from './VehicleEntity';
import { soundEngine } from '../audio/SoundEngine';

export class PoliceSystem {
  private scene: THREE.Scene;
  public wantedLevel: number = 0; // 0 - 5 stars
  public evasionTimer: number = 0; // Countdown until wanted level drops
  public isEvading: boolean = false;
  public policeCars: VehicleEntity[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addCrimeHeat(amount: number = 1) {
    const oldLevel = this.wantedLevel;
    this.wantedLevel = Math.min(5, this.wantedLevel + amount);
    this.evasionTimer = 18 + this.wantedLevel * 8; // Reset cooldown
    this.isEvading = false;

    if (this.wantedLevel > 0 && oldLevel === 0) {
      soundEngine.setSiren(true);
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, isPlayerHidden: boolean) {
    if (this.wantedLevel === 0) {
      // Clear remaining police cruisers
      if (this.policeCars.length > 0) {
        for (const car of this.policeCars) {
          this.scene.remove(car.mesh);
        }
        this.policeCars = [];
        soundEngine.setSiren(false);
      }
      return;
    }

    // Maintain wanted cruisers based on star level
    const targetPoliceCount = Math.min(4, this.wantedLevel);
    if (this.policeCars.length < targetPoliceCount) {
      this.spawnPoliceCruiser(playerPos);
    }

    // Update active police cars pursuing player
    let closestDist = Infinity;
    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const car = this.policeCars[i];
      const dist = car.position.distanceTo(playerPos);
      closestDist = Math.min(closestDist, dist);

      // Direction vector to player
      const toPlayer = new THREE.Vector3().subVectors(playerPos, car.position).setY(0);
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);

      // Steer toward player
      const angleDiff = targetAngle - car.rotation.y;
      const normalizedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const steerInput = THREE.MathUtils.clamp(normalizedAngleDiff * 2.0, -1, 1);

      // Throttle: speed up if far, brake if close
      const throttle = dist > 6 ? 1.0 : (dist < 3 ? -0.5 : 0.2);

      car.update(dt, throttle, steerInput, false, false, true);

      // Despawn if way too far
      if (dist > 180) {
        this.scene.remove(car.mesh);
        this.policeCars.splice(i, 1);
      }
    }

    // Evasion mechanics: if player breaks line of sight or distance > 45m
    if (closestDist > 45 || isPlayerHidden) {
      this.isEvading = true;
      this.evasionTimer -= dt;
      if (this.evasionTimer <= 0) {
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
        this.evasionTimer = 12;
        if (this.wantedLevel === 0) {
          this.isEvading = false;
          soundEngine.setSiren(false);
        }
      }
    } else {
      this.isEvading = false;
      this.evasionTimer = 16 + this.wantedLevel * 6;
    }
  }

  private spawnPoliceCruiser(playerPos: THREE.Vector3) {
    // Spawn around corner 60-80m away
    const angle = Math.random() * Math.PI * 2;
    const dist = 65 + Math.random() * 20;
    const spawnPos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * dist,
      0,
      playerPos.z + Math.sin(angle) * dist
    );

    const policeCar = new VehicleEntity(VEHICLE_PRESETS.police, spawnPos, angle + Math.PI);
    policeCar.speed = 18;
    this.scene.add(policeCar.mesh);
    this.policeCars.push(policeCar);
  }

  public clearWanted() {
    this.wantedLevel = 0;
    this.evasionTimer = 0;
    this.isEvading = false;
    soundEngine.setSiren(false);
    for (const car of this.policeCars) {
      this.scene.remove(car.mesh);
    }
    this.policeCars = [];
  }
}
