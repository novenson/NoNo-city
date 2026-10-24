import * as THREE from 'three';
import { PlayerStats, WeaponStats, WeaponType } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';
import { WEAPON_DATABASE } from '../weapons/WeaponDatabase';

export const OUTFIT_PRESETS: Record<string, { name: string; jacketColor: number; pantsColor: number; shoesColor: number }> = {
  cobra: { name: 'Cobra Rage Elite', jacketColor: 0xdc2626, pantsColor: 0x111827, shoesColor: 0xfacc15 },
  cyber: { name: 'Neon Cyberpunk', jacketColor: 0x06b6d4, pantsColor: 0x0f172a, shoesColor: 0xf43f5e },
  street: { name: 'Compton Streetwear', jacketColor: 0x2563eb, pantsColor: 0x1e293b, shoesColor: 0xffffff },
  noir: { name: 'Executive Noir Suit', jacketColor: 0x111827, pantsColor: 0x111827, shoesColor: 0x030712 },
  tactical: { name: 'Spec-Ops Shadow', jacketColor: 0x3f3f46, pantsColor: 0x27272a, shoesColor: 0x18181b },
};

export class PlayerEntity {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public stats: PlayerStats;

  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isCrouching: boolean = false;
  public isProne: boolean = false;
  public isAiming: boolean = false;
  public inVehicle: boolean = false;

  // Animation joints
  private torsoMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private hairMesh: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private weaponMeshGroup: THREE.Group;
  private muzzleFlash: THREE.PointLight;

  private walkCycle: number = 0;
  private footstepTimer: number = 0;
  private shootCooldownTimer: number = 0;

  constructor(initialPos: THREE.Vector3) {
    this.position = initialPos.clone();
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');

    this.stats = {
      id: `UID-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      username: 'Novenson_King',
      avatar: '👑',
      level: 12,
      xp: 4200,
      xpRequired: Math.round(1000 * Math.pow(1.5, 12 - 1)), // 1.5x progression curve
      rank: 'Heroic',
      gold: 14500,
      diamonds: 320,
      health: 200,
      maxHealth: 200,
      armor: 100,
      maxArmor: 100,
      gloowalls: 3,
      medkits: 2,
      isKnocked: false,
      knockedTimer: 0,
      isDead: false,
      kills: 0,
      damageDealt: 0,
      primaryWeapon1: 'ak47',
      primaryWeapon2: 'm1887',
      secondaryWeapon: 'deagle',
      meleeWeapon: 'katana',
      activeSlot: 'primary1',
      ownedWeapons: { ...WEAPON_DATABASE },
      ownedOutfits: ['cobra', 'cyber', 'street', 'noir', 'tactical'],
      outfitId: 'cobra',
      ownedEmotes: ['dance', 'victory', 'clap', 'kungfu'],
      activeEmote: null,
      careerMatches: 48,
      careerWins: 18,
      careerKills: 142,
      careerDeaths: 30,
      careerHeadshots: 54,
    };

    const { mesh, torso, head, hair, leftArm, rightArm, leftLeg, rightLeg, weaponGroup, muzzle } =
      this.buildCharacterModel();
    this.mesh = mesh;
    this.torsoMesh = torso;
    this.headMesh = head;
    this.hairMesh = hair;
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;
    this.weaponMeshGroup = weaponGroup;
    this.muzzleFlash = muzzle;

    this.mesh.position.copy(this.position);
    this.updateOutfit();
    this.updateWeaponVisual();
  }

  public getActiveWeapon(): WeaponStats {
    let wepId: WeaponType;
    switch (this.stats?.activeSlot) {
      case 'primary1':
        wepId = this.stats.primaryWeapon1;
        break;
      case 'primary2':
        wepId = this.stats.primaryWeapon2;
        break;
      case 'secondary':
        wepId = this.stats.secondaryWeapon;
        break;
      case 'melee':
        wepId = this.stats.meleeWeapon;
        break;
      default:
        wepId = 'ak47';
    }
    const wep =
      (this.stats?.ownedWeapons && this.stats.ownedWeapons[wepId]) ||
      WEAPON_DATABASE[wepId] ||
      (this.stats?.ownedWeapons && this.stats.ownedWeapons.ak47) ||
      WEAPON_DATABASE.ak47;
    return wep;
  }

  // Rigged procedural Free Fire style character
  private buildCharacterModel() {
    const mesh = new THREE.Group();

    // Torso / Jacket
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    mesh.add(torso);

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.82, 0);
    head.castShadow = true;
    mesh.add(head);

    // Hair / Cap
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
    const hairGeo = new THREE.BoxGeometry(0.34, 0.16, 0.34);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.95, -0.02);
    mesh.add(hair);

    // Sunglasses / Mask
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), glassesMat);
    glasses.position.set(0, 1.82, 0.17);
    mesh.add(glasses);

    // Left Arm
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.35, 1.55, 0);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
    const armMeshL = new THREE.Mesh(armGeo, armMat);
    armMeshL.position.y = -0.32;
    armMeshL.castShadow = true;
    leftArm.add(armMeshL);
    mesh.add(leftArm);

    // Right Arm (Weapon holding arm)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.35, 1.55, 0);
    const armMeshR = new THREE.Mesh(armGeo, armMat);
    armMeshR.position.y = -0.32;
    armMeshR.castShadow = true;
    rightArm.add(armMeshR);
    mesh.add(rightArm);

    // Weapon socket attached to right hand
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0, -0.65, 0.15);
    rightArm.add(weaponGroup);

    // Muzzle flash light
    const muzzle = new THREE.PointLight(0xffea00, 0, 10);
    muzzle.position.set(0, -0.65, 0.8);
    rightArm.add(muzzle);

    // Left Leg
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.16, 0.9, 0);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const legGeo = new THREE.BoxGeometry(0.18, 0.75, 0.2);
    const legMeshL = new THREE.Mesh(legGeo, legMat);
    legMeshL.position.y = -0.38;
    legMeshL.castShadow = true;
    leftLeg.add(legMeshL);

    // Sneaker L
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
    shoeL.position.set(0, -0.82, 0.05);
    leftLeg.add(shoeL);
    mesh.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.16, 0.9, 0);
    const legMeshR = new THREE.Mesh(legGeo, legMat);
    legMeshR.position.y = -0.38;
    legMeshR.castShadow = true;
    rightLeg.add(legMeshR);

    // Sneaker R
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
    shoeR.position.set(0, -0.82, 0.05);
    rightLeg.add(shoeR);
    mesh.add(rightLeg);

    return {
      mesh,
      torso,
      head,
      hair,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      weaponGroup,
      muzzle,
    };
  }

  // Update visual 3D weapon in hand
  public updateWeaponVisual() {
    while (this.weaponMeshGroup.children.length > 0) {
      this.weaponMeshGroup.remove(this.weaponMeshGroup.children[0]);
    }

    const currentWep = this.getActiveWeapon() || WEAPON_DATABASE.ak47;
    if (!currentWep || currentWep.id === 'fists') return;

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.25 });
    const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(currentWep.color || '#f97316'), roughness: 0.4 });

    if (currentWep.category === 'shotgun') {
      // Dual-barrel / pump shotgun body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.85), metalMat);
      body.position.set(0, 0, 0.3);
      this.weaponMeshGroup.add(body);

      // Stock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), accentMat);
      stock.position.set(0, -0.05, -0.2);
      this.weaponMeshGroup.add(stock);
    } else if (currentWep.category === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.5), metalMat);
      body.position.set(0, 0, 0.2);
      this.weaponMeshGroup.add(body);

      // Extended Mag
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.08), accentMat);
      mag.position.set(0, -0.16, 0.15);
      this.weaponMeshGroup.add(mag);
    } else if (currentWep.category === 'pistol') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.32), metalMat);
      body.position.set(0, 0, 0.1);
      this.weaponMeshGroup.add(body);
    } else if (currentWep.category === 'sniper') {
      // AWM Long Barrel
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 1.25), metalMat);
      body.position.set(0, 0, 0.5);
      this.weaponMeshGroup.add(body);

      // 8x Scope
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), accentMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.14, 0.35);
      this.weaponMeshGroup.add(scope);
    } else if (currentWep.id === 'katana') {
      // Katana Blade
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 1.1), metalMat);
      blade.position.set(0, 0, 0.45);
      this.weaponMeshGroup.add(blade);

      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), accentMat);
      hilt.rotation.x = Math.PI / 2;
      hilt.position.set(0, 0, -0.1);
      this.weaponMeshGroup.add(hilt);
    } else {
      // Assault Rifle
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.8), metalMat);
      body.position.set(0, 0, 0.3);
      this.weaponMeshGroup.add(body);

      // Curved banana magazine
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.12), accentMat);
      mag.position.set(0, -0.18, 0.22);
      this.weaponMeshGroup.add(mag);
    }
  }

  public updateOutfit() {
    const outfit = OUTFIT_PRESETS[this.stats.outfitId] || OUTFIT_PRESETS.cobra;
    (this.torsoMesh.material as THREE.MeshStandardMaterial).color.set(outfit.jacketColor);
  }

  // Locomotion update
  public update(
    dt: number,
    moveX: number,
    moveZ: number,
    sprint: boolean,
    jump: boolean,
    crouch: boolean,
    prone: boolean,
    aim: boolean,
    cameraYaw: number
  ) {
    if (this.inVehicle) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.isCrouching = crouch && !prone;
    this.isProne = prone;
    this.isAiming = aim;

    // Aiming arm position
    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.z = -0.15;
    }

    if (this.shootCooldownTimer > 0) {
      this.shootCooldownTimer -= dt;
    }
    if (this.muzzleFlash.intensity > 0) {
      this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 35);
    }

    let baseSpeed = 5.2; // Walk
    if (sprint && !crouch && !prone) baseSpeed = 9.8; // Sprint
    if (this.isCrouching) baseSpeed = 3.2; // Crouch
    if (this.isProne) baseSpeed = 1.6; // Prone crawl
    if (this.isAiming) baseSpeed = 3.5; // Aim walk

    const hasMovement = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

    if (hasMovement) {
      const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      this.velocity.x = moveVec.x * baseSpeed;
      this.velocity.z = moveVec.z * baseSpeed;

      const targetAngle = this.isAiming ? cameraYaw : Math.atan2(moveVec.x, moveVec.z);
      this.rotation.y = THREE.MathUtils.damp(this.rotation.y, targetAngle, 16, dt);

      this.walkCycle += dt * (baseSpeed * 1.5);
      const legSwing = Math.sin(this.walkCycle) * 0.7;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;

      if (!this.isAiming) {
        this.leftArm.rotation.x = -legSwing * 0.75;
        this.rightArm.rotation.x = legSwing * 0.75;
      }

      this.footstepTimer += dt * baseSpeed;
      if (this.footstepTimer > 3.0) {
        this.footstepTimer = 0;
        soundEngine.playFootstep();
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 15, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 15, dt);

      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 10, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 10, dt);
      if (!this.isAiming) {
        this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 10, dt);
        this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0, 10, dt);
      }
    }

    // Jump
    const gravity = -25.0;
    if (this.isGrounded) {
      if (jump && !crouch && !prone) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
      } else {
        this.velocity.y = 0;
      }
    } else {
      this.velocity.y += gravity * dt;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    const floorY = this.isProne ? -0.5 : (this.isCrouching ? -0.25 : 0);
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.isGrounded = true;
      this.velocity.y = 0;
    }

    const targetScaleY = this.isProne ? 0.45 : (this.isCrouching ? 0.75 : 1.0);
    this.mesh.scale.y = THREE.MathUtils.damp(this.mesh.scale.y, targetScaleY, 14, dt);

    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
  }

  // Shoot weapon action
  public shoot(): boolean {
    const wep = this.getActiveWeapon();
    if (!wep || this.shootCooldownTimer > 0) return false;

    if (wep.category !== 'melee' && wep.currentMag <= 0) {
      this.reload();
      return false;
    }

    if (wep.category !== 'melee') {
      wep.currentMag--;
    }

    this.shootCooldownTimer = 1.0 / wep.fireRate;
    soundEngine.playShoot(wep.id);

    this.muzzleFlash.intensity = 4.0;
    this.rightArm.rotation.x += 0.25;

    return true;
  }

  public reload() {
    const wep = this.getActiveWeapon();
    if (!wep || wep.category === 'melee') return;

    const needed = wep.magSize - wep.currentMag;
    if (needed <= 0 || wep.reserveAmmo <= 0) return;

    const fill = Math.min(needed, wep.reserveAmmo);
    wep.currentMag += fill;
    wep.reserveAmmo -= fill;

    soundEngine.playReload();
  }

  public switchSlot(slot: 'primary1' | 'primary2' | 'secondary' | 'melee') {
    this.stats.activeSlot = slot;
    this.updateWeaponVisual();
    soundEngine.playReload();
  }

  // Take damage
  public takeDamage(amount: number): boolean {
    if (this.stats.armor > 0) {
      const armorDmg = Math.min(this.stats.armor, amount * 0.7);
      this.stats.armor -= armorDmg;
      amount -= armorDmg;
    }

    this.stats.health = Math.max(0, this.stats.health - amount);
    if (this.stats.health <= 0) {
      if (!this.stats.isKnocked) {
        this.stats.isKnocked = true;
        this.stats.knockedTimer = 60; // 60s bleedout
      } else {
        this.stats.isDead = true;
      }
      return true;
    }
    return false;
  }

  // Heal via medkit
  public heal(amount: number = 75) {
    if (this.stats.medkits <= 0 || this.stats.health >= this.stats.maxHealth) return false;
    this.stats.medkits--;
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    soundEngine.playMedkit();
    return true;
  }

  // Revive from knocked state
  public revive() {
    this.stats.isKnocked = false;
    this.stats.health = 50;
    soundEngine.playMedkit();
  }
}
