import * as THREE from 'three';
import { VehicleEntity, VEHICLE_PRESETS } from './VehicleEntity';
import { soundEngine } from '../audio/SoundEngine';

export interface Pedestrian {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  state: 'walk' | 'idle' | 'flee';
  timer: number;
  health: number;
}

export class NPCManager {
  private scene: THREE.Scene;
  public pedestrians: Pedestrian[] = [];
  public trafficVehicles: VehicleEntity[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Populate initial pedestrians along sidewalks
  public spawnPedestrians(count: number = 30) {
    const sidewalkCoords = [-90, -45, 0, 45, 90];
    const colors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899];

    for (let i = 0; i < count; i++) {
      const roadCoord = sidewalkCoords[Math.floor(Math.random() * sidewalkCoords.length)];
      const isNS = Math.random() > 0.5;
      const offset = (Math.random() > 0.5 ? 1 : -1) * 7.5;
      const posAlong = (Math.random() - 0.5) * 200;

      const x = isNS ? roadCoord + offset : posAlong;
      const z = isNS ? posAlong : roadCoord + offset;

      const group = new THREE.Group();

      // Pedestrian model
      const torsoMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.7,
      });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.25), torsoMat);
      torso.position.y = 1.15;
      torso.castShadow = true;
      group.add(torso);

      const headMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), headMat);
      head.position.y = 1.65;
      group.add(head);

      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.75, 0.22), legMat);
      legs.position.y = 0.45;
      legs.castShadow = true;
      group.add(legs);

      group.position.set(x, 0, z);
      this.scene.add(group);

      const walkDir = isNS
        ? new THREE.Vector3(0, 0, Math.random() > 0.5 ? 1 : -1)
        : new THREE.Vector3(Math.random() > 0.5 ? 1 : -1, 0, 0);

      this.pedestrians.push({
        mesh: group,
        pos: new THREE.Vector3(x, 0, z),
        dir: walkDir,
        speed: 1.5 + Math.random() * 1.2,
        state: 'walk',
        timer: Math.random() * 5,
        health: 50,
      });
    }
  }

  // Spawn traffic vehicles
  public spawnTrafficVehicles(count: number = 8) {
    const roadCoords = [-90, -45, 0, 45, 90];
    const presets = [VEHICLE_PRESETS.cruiser, VEHICLE_PRESETS.titan, VEHICLE_PRESETS.hyperion];

    for (let i = 0; i < count; i++) {
      const roadX = roadCoords[i % roadCoords.length];
      const startZ = -100 + i * 28;
      const config = presets[i % presets.length];

      const v = new VehicleEntity(config, new THREE.Vector3(roadX - 3, 0, startZ), 0);
      v.speed = 12 + Math.random() * 6;
      this.scene.add(v.mesh);
      this.trafficVehicles.push(v);
    }
  }

  // Update pedestrian AI & flee reaction
  public updatePedestrians(dt: number, playerPos: THREE.Vector3, isGunfireNear: boolean) {
    for (const ped of this.pedestrians) {
      const distToPlayer = ped.pos.distanceTo(playerPos);

      // Panic reaction if gunfire or danger nearby
      if (isGunfireNear && distToPlayer < 40) {
        ped.state = 'flee';
        ped.dir.subVectors(ped.pos, playerPos).setY(0).normalize();
        ped.speed = 4.8; // Sprint away!
      }

      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = 4 + Math.random() * 6;
        if (ped.state !== 'flee') {
          ped.state = Math.random() > 0.3 ? 'walk' : 'idle';
        }
      }

      if (ped.state === 'walk' || ped.state === 'flee') {
        ped.pos.addScaledVector(ped.dir, ped.speed * dt);

        // Bound to city limits
        if (Math.abs(ped.pos.x) > 120 || Math.abs(ped.pos.z) > 120) {
          ped.dir.negate();
        }

        ped.mesh.position.copy(ped.pos);
        ped.mesh.rotation.y = Math.atan2(ped.dir.x, ped.dir.z);

        // Simple walk wobble
        ped.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.008)) * 0.1;
      }
    }
  }

  // Update traffic AI
  public updateTraffic(dt: number, isNight: boolean) {
    for (const v of this.trafficVehicles) {
      // Lane following: keep driving along Z road axis
      v.update(dt, 0.6, 0, false, false, isNight);

      // Loop around city perimeter if reached end of road
      if (v.position.z > 130) {
        v.position.z = -130;
      } else if (v.position.z < -130) {
        v.position.z = 130;
      }
    }
  }

  // Hit test for bullets hitting pedestrians or traffic
  public checkBulletHits(origin: THREE.Vector3, direction: THREE.Vector3, range: number, damage: number): boolean {
    const ray = new THREE.Ray(origin, direction);

    // Check pedestrians
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      const sphere = new THREE.Sphere(ped.pos.clone().add(new THREE.Vector3(0, 1, 0)), 0.8);
      if (ray.intersectsSphere(sphere)) {
        ped.health -= damage;
        soundEngine.playHitImpact();

        if (ped.health <= 0) {
          // Downed
          this.scene.remove(ped.mesh);
          this.pedestrians.splice(i, 1);
        } else {
          ped.state = 'flee';
          ped.speed = 5.2;
        }
        return true;
      }
    }

    // Check traffic vehicles
    for (const v of this.trafficVehicles) {
      if (ray.intersectsBox(v.boundingBox)) {
        v.health -= damage;
        soundEngine.playHitImpact();
        return true;
      }
    }

    return false;
  }
}
