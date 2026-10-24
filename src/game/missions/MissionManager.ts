import * as THREE from 'three';
import { Mission } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';

export const STORY_MISSIONS: Mission[] = [
  {
    id: 'm1_welcome',
    title: 'Welcome to Nono Metropolis',
    client: 'Frank Torres',
    description: 'Arrive in the city, commandeer your first ride, and locate your Penthouse safehouse on Coastal Boulevard.',
    rewardCash: 3500,
    rewardRep: 100,
    stage: 1,
    stagesCount: 2,
    objectiveText: 'Enter a vehicle to begin your journey.',
    targetPos: [-45, 0, 45],
    targetRadius: 10,
    completed: false,
    locked: false,
  },
  {
    id: 'm2_express',
    title: 'Express Courier',
    client: 'Maya Lin',
    description: 'Confidential corporate drives need to reach the Airport Control Tower before security lock down!',
    rewardCash: 7500,
    rewardRep: 250,
    stage: 1,
    stagesCount: 1,
    objectiveText: 'Race to the Airport Control Tower before the clock runs out!',
    targetPos: [0, 0, 160],
    targetRadius: 15,
    timeLimit: 90,
    remainingTime: 90,
    completed: false,
    locked: true,
  },
  {
    id: 'm3_repo',
    title: 'Repo Rumble: Prototype Recovery',
    client: 'Apex Garage',
    description: 'A custom tuned supercar was hijacked by a rival crew at the commercial hub. Recover and deliver it safely.',
    rewardCash: 14000,
    rewardRep: 500,
    stage: 1,
    stagesCount: 2,
    objectiveText: 'Investigate the compound at the eastern commercial hub.',
    targetPos: [45, 0, -45],
    targetRadius: 12,
    completed: false,
    locked: true,
  },
  {
    id: 'm4_race',
    title: 'Metropolis GP: Skyscraper Sprint',
    client: 'Street Syndicate',
    description: 'Hit the gas! Complete the high-speed downtown checkpoint sprint against the city clock.',
    rewardCash: 20000,
    rewardRep: 800,
    stage: 1,
    stagesCount: 4,
    objectiveText: 'Hit Checkpoint 1 at Central Plaza!',
    targetPos: [0, 0, 0],
    targetRadius: 12,
    timeLimit: 75,
    remainingTime: 75,
    completed: false,
    locked: true,
  },
  {
    id: 'm5_heist',
    title: 'The Central Vault Heist',
    client: 'Frank & Maya',
    description: 'Infiltrate Metropolis Central Bank, grab the gold bearer bonds, shake off the wanted heat, and return home.',
    rewardCash: 60000,
    rewardRep: 1500,
    stage: 1,
    stagesCount: 3,
    objectiveText: 'Proceed to the front doors of Metropolis Central Bank.',
    targetPos: [0, 0, -75],
    targetRadius: 10,
    completed: false,
    locked: true,
  },
];

export class MissionManager {
  public missions: Mission[] = [...STORY_MISSIONS];
  public activeMission: Mission | null = null;
  public missionMarkerMesh: THREE.Group | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.missionMarkerMesh = this.createMissionMarker();
    this.scene.add(this.missionMarkerMesh);
  }

  // Glowing 3D Checkpoint Marker Column
  private createMissionMarker(): THREE.Group {
    const group = new THREE.Group();

    // Beacon pillar
    const cylinderGeo = new THREE.CylinderGeometry(2.5, 2.5, 12, 16, 1, true);
    const cylinderMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const col = new THREE.Mesh(cylinderGeo, cylinderMat);
    col.position.y = 6;
    group.add(col);

    // Glowing ground ring
    const ringGeo = new THREE.RingGeometry(2.2, 2.8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);

    // Floating rotating diamond icon
    const diamondGeo = new THREE.OctahedronGeometry(1.2, 0);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.y = 3.5;
    group.add(diamond);

    group.visible = false;
    return group;
  }

  public startMission(missionId: string): boolean {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission || mission.locked) return false;

    this.activeMission = { ...mission };
    if (this.activeMission.timeLimit) {
      this.activeMission.remainingTime = this.activeMission.timeLimit;
    }

    this.updateMarkerPosition();
    soundEngine.playMissionFanfare(true);
    return true;
  }

  public cancelActiveMission() {
    this.activeMission = null;
    if (this.missionMarkerMesh) {
      this.missionMarkerMesh.visible = false;
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, inVehicle: boolean): { completed: boolean; failed: boolean; reward?: number } {
    if (!this.activeMission) return { completed: false, failed: false };

    // Animate marker
    if (this.missionMarkerMesh && this.missionMarkerMesh.visible) {
      this.missionMarkerMesh.children[2].rotation.y += dt * 2;
      this.missionMarkerMesh.children[2].position.y = 3.5 + Math.sin(Date.now() * 0.004) * 0.4;
    }

    // Time limit countdown
    if (this.activeMission.remainingTime !== undefined) {
      this.activeMission.remainingTime -= dt;
      if (this.activeMission.remainingTime <= 0) {
        soundEngine.playMissionFanfare(false);
        this.cancelActiveMission();
        return { completed: false, failed: true };
      }
    }

    // Check mission objective conditions
    if (this.activeMission.id === 'm1_welcome') {
      if (this.activeMission.stage === 1) {
        if (inVehicle) {
          this.activeMission.stage = 2;
          this.activeMission.objectiveText = 'Drive to Penthouse 101 on Coastal Boulevard!';
          this.activeMission.targetPos = [-45, 0, 45];
          this.updateMarkerPosition();
        }
      } else if (this.activeMission.stage === 2) {
        const dist = playerPos.distanceTo(new THREE.Vector3(-45, 0, 45));
        if (dist < 12) {
          return this.completeMission();
        }
      }
    } else if (this.activeMission.id === 'm2_express') {
      const dist = playerPos.distanceTo(new THREE.Vector3(0, 0, 160));
      if (dist < 16) {
        return this.completeMission();
      }
    } else if (this.activeMission.id === 'm3_repo') {
      if (this.activeMission.stage === 1) {
        const dist = playerPos.distanceTo(new THREE.Vector3(45, 0, -45));
        if (dist < 15) {
          this.activeMission.stage = 2;
          this.activeMission.objectiveText = 'Stolen vehicle secured! Deliver to Apex Mod Garage!';
          this.activeMission.targetPos = [-45, 0, -45];
          this.updateMarkerPosition();
        }
      } else if (this.activeMission.stage === 2) {
        const dist = playerPos.distanceTo(new THREE.Vector3(-45, 0, -45));
        if (dist < 12) {
          return this.completeMission();
        }
      }
    } else if (this.activeMission.id === 'm4_race') {
      const checkpoints: [number, number, number][] = [
        [0, 0, 0],
        [45, 0, 0],
        [45, 0, -60],
        [-45, 0, -60],
      ];
      const currentTarget = checkpoints[this.activeMission.stage - 1];
      const dist = playerPos.distanceTo(new THREE.Vector3(...currentTarget));

      if (dist < 14) {
        if (this.activeMission.stage < checkpoints.length) {
          this.activeMission.stage++;
          this.activeMission.targetPos = checkpoints[this.activeMission.stage - 1];
          this.activeMission.objectiveText = `Hit Checkpoint ${this.activeMission.stage} of 4!`;
          this.updateMarkerPosition();
          soundEngine.playCashRegister();
        } else {
          return this.completeMission();
        }
      }
    } else if (this.activeMission.id === 'm5_heist') {
      if (this.activeMission.stage === 1) {
        const dist = playerPos.distanceTo(new THREE.Vector3(0, 0, -75));
        if (dist < 12) {
          this.activeMission.stage = 2;
          this.activeMission.objectiveText = 'Vault cracked! Evade police heat and stash loot at Penthouse 101!';
          this.activeMission.targetPos = [-45, 0, 45];
          this.updateMarkerPosition();
        }
      } else if (this.activeMission.stage === 2) {
        const dist = playerPos.distanceTo(new THREE.Vector3(-45, 0, 45));
        if (dist < 14) {
          return this.completeMission();
        }
      }
    }

    return { completed: false, failed: false };
  }

  private updateMarkerPosition() {
    if (!this.missionMarkerMesh || !this.activeMission?.targetPos) {
      if (this.missionMarkerMesh) this.missionMarkerMesh.visible = false;
      return;
    }
    this.missionMarkerMesh.position.set(...this.activeMission.targetPos);
    this.missionMarkerMesh.visible = true;
  }

  private completeMission(): { completed: boolean; failed: boolean; reward: number } {
    if (!this.activeMission) return { completed: false, failed: false, reward: 0 };

    const reward = this.activeMission.rewardCash;
    soundEngine.playMissionFanfare(true);
    soundEngine.playCashRegister();

    // Mark as completed in missions list
    const found = this.missions.find(m => m.id === this.activeMission!.id);
    if (found) {
      found.completed = true;
      // Unlock next mission in chain
      const nextIdx = this.missions.findIndex(m => m.id === found.id) + 1;
      if (nextIdx < this.missions.length) {
        this.missions[nextIdx].locked = false;
      }
    }

    this.cancelActiveMission();
    return { completed: true, failed: false, reward };
  }
}
