import * as THREE from 'three';
import { GameMode, GroundLoot, KillFeedEntry, DamageNumber, SafeZoneState, SquadMember, WeaponType } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';
import { WEAPON_DATABASE } from '../weapons/WeaponDatabase';

export class BattleRoyaleSystem {
  private scene: THREE.Scene;
  public mode: GameMode = 'br_squad';
  public matchActive: boolean = false;
  public matchTime: number = 0;
  public aliveCount: number = 20;

  // Safe Zone
  public safeZone: SafeZoneState;
  public safeZoneMesh: THREE.Mesh | null = null;

  // Ground Loot
  public groundLoot: GroundLoot[] = [];
  public lootMeshes: Map<string, THREE.Group> = new Map();

  // Squad system (up to 4 members)
  public squadMembers: SquadMember[] = [];
  public squadBotMeshes: Map<string, THREE.Group> = new Map();

  // Enemy bots
  public enemyBots: {
    id: string;
    name: string;
    mesh: THREE.Group;
    pos: THREE.Vector3;
    health: number;
    maxHealth: number;
    weapon: WeaponType;
    isDead: boolean;
    shootTimer: number;
  }[] = [];

  // Gloo walls placed in world
  public glooWalls: { mesh: THREE.Group; box: THREE.Box3; health: number }[] = [];

  // Killfeed & Damage feedback
  public killFeed: KillFeedEntry[] = [];
  public damageNumbers: DamageNumber[] = [];

  // Callbacks
  public onKillFeed?: (entry: KillFeedEntry) => void;
  public onVictory?: () => void;
  public onDefeat?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.safeZone = {
      currentCenter: [0, 0],
      currentRadius: 180,
      nextCenter: [15, -10],
      nextRadius: 90,
      phase: 1,
      maxPhases: 4,
      shrinkTimer: 75,
      isShrinking: false,
      dps: 3,
    };

    this.createSafeZoneVisual();
  }

  // Create glowing translucent 3D safe zone cylinder barrier
  private createSafeZoneVisual() {
    const geo = new THREE.CylinderGeometry(180, 180, 80, 32, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Vibrant energetic cyan
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.safeZoneMesh = new THREE.Mesh(geo, mat);
    this.safeZoneMesh.position.set(0, 40, 0);
    this.safeZoneMesh.visible = false;
    this.scene.add(this.safeZoneMesh);
  }

  // Start a new Battle Royale match
  public startMatch(mode: GameMode, playerName: string) {
    this.mode = mode;
    this.matchActive = true;
    this.matchTime = 0;
    this.damageNumbers = [];
    this.killFeed = [];

    // Clear previous entities
    this.cleanup();

    if (this.safeZoneMesh) {
      this.safeZoneMesh.visible = mode.startsWith('br_');
    }

    this.safeZone = {
      currentCenter: [0, 0],
      currentRadius: 160,
      nextCenter: [(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40],
      nextRadius: 85,
      phase: 1,
      maxPhases: 4,
      shrinkTimer: 60,
      isShrinking: false,
      dps: 3,
    };

    // Initialize Squad
    this.squadMembers = [
      {
        id: 'player_1',
        name: playerName,
        isLeader: true,
        isBot: false,
        health: 200,
        maxHealth: 200,
        armor: 100,
        maxArmor: 100,
        isKnocked: false,
        isDead: false,
        kills: 0,
        avatar: '👑',
        position: [0, 0, 0],
        distance: 0,
      },
    ];

    if (mode === 'br_duo' || mode === 'br_squad') {
      const botNames = ['Shadow_Ace', 'Maya_Viper', 'Frank_Guns'];
      const count = mode === 'br_duo' ? 1 : 3;
      for (let i = 0; i < count; i++) {
        const id = `squad_bot_${i + 1}`;
        this.squadMembers.push({
          id,
          name: botNames[i],
          isLeader: false,
          isBot: true,
          health: 200,
          maxHealth: 200,
          armor: 100,
          maxArmor: 100,
          isKnocked: false,
          isDead: false,
          kills: 0,
          avatar: ['🎯', '⚡', '🔥'][i],
          position: [(i + 1) * 3, 0, 5],
          distance: 5,
        });

        // Create 3D model for squad bot
        this.createSquadBotMesh(id, new THREE.Vector3((i + 1) * 3, 0, 5));
      }
    }

    // Set match alive count
    this.aliveCount = mode === 'br_solo' ? 24 : (mode === 'br_duo' ? 20 : 16);

    // Spawn Enemy Bots
    this.spawnEnemyBots(this.aliveCount - this.squadMembers.length);

    // Spawn Ground Loot
    this.spawnLootItems();
  }

  // Create friendly squad bot 3D representation
  private createSquadBotMesh(id: string, pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);

    // Uniform body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMat);
    body.position.y = 1.25;
    group.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), headMat);
    head.position.y = 1.8;
    group.add(head);

    // Team green marker diamond floating above head
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    marker.position.y = 2.4;
    group.add(marker);

    this.scene.add(group);
    this.squadBotMeshes.set(id, group);
  }

  // Spawn enemy bots across the city
  private spawnEnemyBots(count: number) {
    const weapons: WeaponType[] = ['ak47', 'scarl', 'm1887', 'ump45', 'deagle', 'spas12'];
    const botNames = [
      'Viper_99', 'Ghost_Rider', 'Apex_King', 'Red_Sniper',
      'Bullet_Storm', 'Cyber_Ninja', 'Dark_Hero', 'Skull_Crusher',
      'Eagle_Eye', 'Rogue_One', 'Blaze_Zero', 'Shadow_Hawk',
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 35 + Math.random() * 85;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      // Enemy red uniform
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMat);
      body.position.y = 1.25;
      group.add(body);

      const headMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), headMat);
      head.position.y = 1.8;
      group.add(head);

      this.scene.add(group);

      this.enemyBots.push({
        id: `enemy_bot_${i}`,
        name: botNames[i % botNames.length] || `Bot_${i + 1}`,
        mesh: group,
        pos: new THREE.Vector3(x, 0, z),
        health: 200,
        maxHealth: 200,
        weapon: weapons[i % weapons.length],
        isDead: false,
        shootTimer: 1.5 + Math.random() * 2,
      });
    }
  }

  // Spawn ground loot with glowing color beacons
  public spawnLootItems() {
    const lootList: { type: GroundLoot['type']; weaponId?: WeaponType; rarity: GroundLoot['rarity']; name: string; amt: number }[] = [
      { type: 'weapon', weaponId: 'ak47', rarity: 'rare', name: 'AK-47 Dragon', amt: 30 },
      { type: 'weapon', weaponId: 'scarl', rarity: 'rare', name: 'SCAR-L Titan', amt: 30 },
      { type: 'weapon', weaponId: 'm1887', rarity: 'epic', name: 'M1887 Dual-Bore', amt: 2 },
      { type: 'weapon', weaponId: 'ump45', rarity: 'common', name: 'UMP-45 Striker', amt: 30 },
      { type: 'weapon', weaponId: 'awm', rarity: 'legendary', name: 'AWM Arctic Warfare', amt: 5 },
      { type: 'weapon', weaponId: 'deagle', rarity: 'rare', name: 'Desert Eagle .50', amt: 7 },
      { type: 'ammo', rarity: 'common', name: 'Assault Rifle Ammo', amt: 60 },
      { type: 'ammo', rarity: 'common', name: 'Shotgun Shells', amt: 15 },
      { type: 'medkit', rarity: 'rare', name: 'Super Medkit', amt: 1 },
      { type: 'medkit', rarity: 'rare', name: 'Super Medkit', amt: 1 },
      { type: 'gloowall', rarity: 'epic', name: 'Gloo Wall Granule', amt: 2 },
      { type: 'gloowall', rarity: 'epic', name: 'Gloo Wall Granule', amt: 2 },
      { type: 'vest', rarity: 'rare', name: 'Level 2 Armor Vest', amt: 100 },
      { type: 'vest', rarity: 'epic', name: 'Level 3 Military Vest', amt: 150 },
    ];

    // Spawn 24 loot drops around map
    for (let i = 0; i < 24; i++) {
      const template = lootList[i % lootList.length];
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 110;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const lootId = `loot_${i}_${Date.now()}`;
      const loot: GroundLoot = {
        id: lootId,
        type: template.type,
        weaponId: template.weaponId,
        name: template.name,
        amount: template.amt,
        rarity: template.rarity,
        position: [x, 0.2, z],
      };
      this.groundLoot.push(loot);

      // Create 3D Visual Loot Drop with vertical light beam
      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const rarityColors = {
        common: 0xe2e8f0,
        rare: 0x38bdf8,
        epic: 0xa855f7,
        legendary: 0xf59e0b,
      };
      const col = rarityColors[template.rarity];

      // Vertical energy light beam
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.15, 6, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 3;
      group.add(beam);

      // Rotating crate / item
      const itemGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
      const itemMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.5 });
      const item = new THREE.Mesh(itemGeo, itemMat);
      item.position.y = 0.4;
      group.add(item);

      this.scene.add(group);
      this.lootMeshes.set(lootId, group);
    }
  }

  // Deploy Gloo Wall barrier
  public deployGlooWall(playerPos: THREE.Vector3, cameraYaw: number) {
    const wallGroup = new THREE.Group();

    // Spawn 2.5m in front of player
    const offset = new THREE.Vector3(0, 0, 2.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
    const spawnPos = playerPos.clone().add(offset);
    spawnPos.y = 0;
    wallGroup.position.copy(spawnPos);
    wallGroup.rotation.y = cameraYaw;

    // Curved ice/energy barrier (Width 4.5, Height 2.8, Depth 0.4)
    const wallGeo = new THREE.BoxGeometry(4.2, 2.6, 0.4);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.y = 1.3;
    wallGroup.add(wall);

    this.scene.add(wallGroup);
    soundEngine.playGlooWall();

    const box = new THREE.Box3().setFromObject(wallGroup);
    this.glooWalls.push({ mesh: wallGroup, box, health: 350 });
  }

  // Update Safe Zone, Bots, Squad, and Loot
  public update(dt: number, playerPos: THREE.Vector3): { safeZoneDamage: number; nearbyLoot: GroundLoot[] } {
    if (!this.matchActive) return { safeZoneDamage: 0, nearbyLoot: [] };
    this.matchTime += dt;

    // 1. Safe Zone Shrink Logic
    this.safeZone.shrinkTimer -= dt;
    if (this.safeZone.shrinkTimer <= 0) {
      if (!this.safeZone.isShrinking) {
        // Start shrinking
        this.safeZone.isShrinking = true;
        this.safeZone.shrinkTimer = 35; // Shrink duration
      } else {
        // Shrink complete, start next phase
        this.safeZone.isShrinking = false;
        this.safeZone.phase = Math.min(this.safeZone.maxPhases, this.safeZone.phase + 1);
        this.safeZone.currentRadius = this.safeZone.nextRadius;
        this.safeZone.currentCenter = [...this.safeZone.nextCenter];
        this.safeZone.nextRadius = Math.max(25, this.safeZone.currentRadius * 0.55);
        this.safeZone.nextCenter = [
          this.safeZone.currentCenter[0] + (Math.random() - 0.5) * 20,
          this.safeZone.currentCenter[1] + (Math.random() - 0.5) * 20,
        ];
        this.safeZone.shrinkTimer = 50; // Wait time before next shrink
        this.safeZone.dps += 2; // Increased storm damage each phase
      }
    }

    if (this.safeZone.isShrinking) {
      // Interpolate radius towards next radius
      this.safeZone.currentRadius = THREE.MathUtils.damp(
        this.safeZone.currentRadius,
        this.safeZone.nextRadius,
        0.05,
        dt
      );
    }

    // Update 3D Safe Zone mesh scale & position
    if (this.safeZoneMesh) {
      const scale = this.safeZone.currentRadius / 180;
      this.safeZoneMesh.scale.set(scale, 1, scale);
      this.safeZoneMesh.position.set(this.safeZone.currentCenter[0], 40, this.safeZone.currentCenter[1]);
    }

    // Check if player is outside safe zone
    const distToZoneCenter = Math.hypot(
      playerPos.x - this.safeZone.currentCenter[0],
      playerPos.z - this.safeZone.currentCenter[1]
    );
    let safeZoneDamage = 0;
    if (distToZoneCenter > this.safeZone.currentRadius) {
      safeZoneDamage = this.safeZone.dps * dt;
    }

    // 2. Animate Ground Loot (Gentle rotation & floating)
    for (const [id, mesh] of this.lootMeshes.entries()) {
      mesh.children[1].rotation.y += dt * 1.5;
      mesh.children[1].position.y = 0.4 + Math.sin(Date.now() * 0.004) * 0.1;
    }

    // Detect nearby ground loot (< 3m from player)
    const nearbyLoot: GroundLoot[] = [];
    for (const loot of this.groundLoot) {
      const d = Math.hypot(loot.position[0] - playerPos.x, loot.position[2] - playerPos.z);
      if (d < 3.2) {
        nearbyLoot.push(loot);
      }
    }

    // 3. Update Squad Bot AI
    if (this.squadMembers[0]) {
      this.squadMembers[0].position = [playerPos.x, playerPos.y, playerPos.z];
    }

    for (let i = 1; i < this.squadMembers.length; i++) {
      const member = this.squadMembers[i];
      const botMesh = this.squadBotMeshes.get(member.id);
      if (!botMesh || member.isDead) continue;

      // Follow player offset
      const targetX = playerPos.x + Math.sin(i * 1.8) * 4.5;
      const targetZ = playerPos.z + Math.cos(i * 1.8) * 4.5;

      botMesh.position.x = THREE.MathUtils.damp(botMesh.position.x, targetX, 2.5, dt);
      botMesh.position.z = THREE.MathUtils.damp(botMesh.position.z, targetZ, 2.5, dt);

      member.position = [botMesh.position.x, botMesh.position.y, botMesh.position.z];
      member.distance = Math.round(playerPos.distanceTo(botMesh.position));

      // Face direction
      botMesh.lookAt(playerPos.x, botMesh.position.y, playerPos.z);
    }

    // 4. Update Enemy Bot AI
    for (let i = this.enemyBots.length - 1; i >= 0; i--) {
      const bot = this.enemyBots[i];
      if (bot.isDead) continue;

      const dist = bot.pos.distanceTo(playerPos);

      // Bot movements: move toward safe zone or engage player
      if (dist < 40) {
        // Look at player
        bot.mesh.lookAt(playerPos.x, bot.mesh.position.y, playerPos.z);

        // Shoot at player
        bot.shootTimer -= dt;
        if (bot.shootTimer <= 0) {
          bot.shootTimer = 1.2 + Math.random() * 1.5;
          soundEngine.playShoot(bot.weapon);
          // 40% hit chance on player
          if (Math.random() < 0.4) {
            soundEngine.playHitMarker(false);
          }
        }
      } else {
        // Move slowly towards safe zone center
        const toCenter = new THREE.Vector3(
          this.safeZone.currentCenter[0] - bot.pos.x,
          0,
          this.safeZone.currentCenter[1] - bot.pos.z
        ).normalize();
        bot.pos.addScaledVector(toCenter, 2.5 * dt);
        bot.mesh.position.copy(bot.pos);
      }
    }

    // 5. Update Floating Damage Numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.alpha -= dt * 1.2;
      dn.pos[1] += dt * 1.5;
      if (dn.alpha <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    return { safeZoneDamage, nearbyLoot };
  }

  // Apply hit damage to enemy bot
  public damageEnemyBot(botId: string, damage: number, isHeadshot: boolean, playerPos: THREE.Vector3): boolean {
    const bot = this.enemyBots.find(b => b.id === botId);
    if (!bot || bot.isDead) return false;

    bot.health -= damage;
    soundEngine.playHitMarker(isHeadshot);

    // Spawn floating damage number
    this.damageNumbers.push({
      id: `dn_${Date.now()}_${Math.random()}`,
      damage: Math.round(damage),
      isHeadshot,
      pos: [bot.pos.x, bot.pos.y + 1.8, bot.pos.z],
      screenX: 0,
      screenY: 0,
      alpha: 1.0,
    });

    if (bot.health <= 0) {
      bot.isDead = true;
      this.scene.remove(bot.mesh);
      this.aliveCount = Math.max(1, this.aliveCount - 1);

      // Killfeed event
      const entry: KillFeedEntry = {
        id: `kf_${Date.now()}`,
        killer: this.squadMembers[0]?.name || 'Novenson',
        victim: bot.name,
        weapon: 'M1887',
        isHeadshot,
        timestamp: Date.now(),
      };
      this.killFeed.unshift(entry);
      if (this.killFeed.length > 5) this.killFeed.pop();
      this.onKillFeed?.(entry);

      if (this.squadMembers[0]) {
        this.squadMembers[0].kills++;
      }

      // Check Victory condition!
      if (this.aliveCount <= this.squadMembers.filter(s => !s.isDead).length) {
        soundEngine.playBooyah();
        this.onVictory?.();
      }
      return true;
    }
    return false;
  }

  // Pickup ground loot
  public pickupLoot(lootId: string): GroundLoot | null {
    const idx = this.groundLoot.findIndex(l => l.id === lootId);
    if (idx === -1) return null;

    const loot = this.groundLoot[idx];
    this.groundLoot.splice(idx, 1);

    const mesh = this.lootMeshes.get(lootId);
    if (mesh) {
      this.scene.remove(mesh);
      this.lootMeshes.delete(lootId);
    }

    soundEngine.playReload();
    return loot;
  }

  // Cleanup
  public cleanup() {
    for (const [, mesh] of this.lootMeshes.entries()) {
      this.scene.remove(mesh);
    }
    this.lootMeshes.clear();
    this.groundLoot = [];

    for (const [, mesh] of this.squadBotMeshes.entries()) {
      this.scene.remove(mesh);
    }
    this.squadBotMeshes.clear();

    for (const bot of this.enemyBots) {
      this.scene.remove(bot.mesh);
    }
    this.enemyBots = [];

    for (const gw of this.glooWalls) {
      this.scene.remove(gw.mesh);
    }
    this.glooWalls = [];
  }
}
