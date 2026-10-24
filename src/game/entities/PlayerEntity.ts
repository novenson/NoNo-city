import * as THREE from 'three';
import { PlayerStats, WeaponInfo, WeaponType } from '../../types/game';
import { soundEngine } from '../audio/SoundEngine';

export const INITIAL_WEAPONS: Record<WeaponType, WeaponInfo> = {
  fists: {
    id: 'fists',
    name: 'Fists / Melee',
    category: 'Melee',
    damage: 25,
    fireRate: 2.2,
    range: 2.5,
    magSize: 999,
    currentMag: 999,
    reserveAmmo: 999,
    maxAmmo: 999,
    price: 0,
    unlocked: true,
    color: '#fbbf24',
  },
  pistol: {
    id: 'pistol',
    name: 'P-12 Falcon',
    category: 'Handgun',
    damage: 35,
    fireRate: 3.5,
    range: 45,
    magSize: 15,
    currentMag: 15,
    reserveAmmo: 90,
    maxAmmo: 180,
    price: 750,
    unlocked: true,
    color: '#94a3b8',
  },
  smg: {
    id: 'smg',
    name: 'Vektor 9 SMG',
    category: 'Submachine Gun',
    damage: 24,
    fireRate: 9.0,
    range: 35,
    magSize: 30,
    currentMag: 30,
    reserveAmmo: 180,
    maxAmmo: 360,
    price: 2500,
    unlocked: true,
    color: '#38bdf8',
  },
  rifle: {
    id: 'rifle',
    name: 'ARC-24 Carbine',
    category: 'Assault Rifle',
    damage: 48,
    fireRate: 6.0,
    range: 65,
    magSize: 30,
    currentMag: 30,
    reserveAmmo: 150,
    maxAmmo: 300,
    price: 6000,
    unlocked: false,
    color: '#f97316',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Striker 12 Heavy',
    category: 'Shotgun',
    damage: 90,
    fireRate: 1.2,
    range: 20,
    magSize: 8,
    currentMag: 8,
    reserveAmmo: 40,
    maxAmmo: 80,
    price: 4500,
    unlocked: false,
    color: '#ef4444',
  },
  sniper: {
    id: 'sniper',
    name: 'Vanguard 50 Cal',
    category: 'Sniper Rifle',
    damage: 180,
    fireRate: 0.8,
    range: 120,
    magSize: 5,
    currentMag: 5,
    reserveAmmo: 25,
    maxAmmo: 50,
    price: 12000,
    unlocked: false,
    color: '#a855f7',
  },
};

export const OUTFIT_PRESETS: Record<string, { name: string; jacketColor: number; pantsColor: number; shoesColor: number }> = {
  street: { name: 'Metropolis Streetwear', jacketColor: 0x2563eb, pantsColor: 0x1e293b, shoesColor: 0xffffff },
  cyber: { name: 'Neon Cyberpunk', jacketColor: 0x06b6d4, pantsColor: 0x0f172a, shoesColor: 0xf43f5e },
  suit: { name: 'Executive Noir Suit', jacketColor: 0x111827, pantsColor: 0x111827, shoesColor: 0x030712 },
  tactical: { name: 'Spec-Ops Combat', jacketColor: 0x3f3f46, pantsColor: 0x27272a, shoesColor: 0x18181b },
  beach: { name: 'Ocean Sunset Casual', jacketColor: 0xf59e0b, pantsColor: 0xe2e8f0, shoesColor: 0x38bdf8 },
};

export class PlayerEntity {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public stats: PlayerStats;

  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isCrouching: boolean = false;
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
      health: 100,
      maxHealth: 100,
      armor: 100,
      maxArmor: 100,
      cash: 5000,
      wantedLevel: 0,
      wantedProgress: 0,
      currentWeapon: 'pistol',
      ownedWeapons: { ...INITIAL_WEAPONS },
      ownedVehicles: ['cruiser', 'hyperion'],
      activeVehicleId: 'cruiser',
      outfitId: 'street',
      hairId: 'short',
      insideHome: false,
      repLevel: 1,
    };

    // Build Rigged Procedural Character Mesh
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

  // Composite 3-12 Part Rigged Character
  private buildCharacterModel() {
    const mesh = new THREE.Group();

    // 1. Torso / Jacket (Height 0.7, Width 0.5, Depth 0.3)
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    mesh.add(torso);

    // 2. Neck & Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 1.82, 0);
    head.castShadow = true;
    mesh.add(head);

    // 3. Hair / Cap
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
    const hairGeo = new THREE.BoxGeometry(0.34, 0.16, 0.34);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.95, -0.02);
    mesh.add(hair);

    // Sunglasses / Visor
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), glassesMat);
    glasses.position.set(0, 1.82, 0.17);
    mesh.add(glasses);

    // 4. Left Arm (Pivot at shoulder y = 1.55)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.35, 1.55, 0);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
    const armMeshL = new THREE.Mesh(armGeo, armMat);
    armMeshL.position.y = -0.32;
    armMeshL.castShadow = true;
    leftArm.add(armMeshL);
    mesh.add(leftArm);

    // 5. Right Arm (Weapon holding arm)
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

    // Muzzle flash point light
    const muzzle = new THREE.PointLight(0xffea00, 0, 8);
    muzzle.position.set(0, -0.65, 0.7);
    rightArm.add(muzzle);

    // 6. Left Leg (Pivot at hip y = 0.9)
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
    shoeL.castShadow = true;
    leftLeg.add(shoeL);
    mesh.add(leftLeg);

    // 7. Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.16, 0.9, 0);
    const legMeshR = new THREE.Mesh(legGeo, legMat);
    legMeshR.position.y = -0.38;
    legMeshR.castShadow = true;
    rightLeg.add(legMeshR);

    // Sneaker R
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), shoeMat);
    shoeR.position.set(0, -0.82, 0.05);
    shoeR.castShadow = true;
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

  // Update visual model of current equipped weapon
  public updateWeaponVisual() {
    // Clear previous weapon
    while (this.weaponMeshGroup.children.length > 0) {
      this.weaponMeshGroup.remove(this.weaponMeshGroup.children[0]);
    }

    const currentWep = this.stats.currentWeapon;
    if (currentWep === 'fists') return;

    const wepMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.2 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });

    if (currentWep === 'pistol') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), wepMat);
      body.position.set(0, 0, 0.1);
      this.weaponMeshGroup.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), barrelMat);
      grip.position.set(0, -0.1, 0);
      this.weaponMeshGroup.add(grip);
    } else if (currentWep === 'smg') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.45), wepMat);
      body.position.set(0, 0, 0.15);
      this.weaponMeshGroup.add(body);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.08), barrelMat);
      mag.position.set(0, -0.14, 0.1);
      this.weaponMeshGroup.add(mag);
    } else if (currentWep === 'rifle') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.75), wepMat);
      body.position.set(0, 0, 0.25);
      this.weaponMeshGroup.add(body);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.1), barrelMat);
      mag.position.set(0, -0.15, 0.2);
      this.weaponMeshGroup.add(mag);
    } else if (currentWep === 'shotgun') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.8), wepMat);
      body.position.set(0, 0, 0.28);
      this.weaponMeshGroup.add(body);
    } else if (currentWep === 'sniper') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 1.1), wepMat);
      body.position.set(0, 0, 0.4);
      this.weaponMeshGroup.add(body);
      // Scope
      const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), barrelMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.12, 0.3);
      this.weaponMeshGroup.add(scope);
    }
  }

  public updateOutfit() {
    const outfit = OUTFIT_PRESETS[this.stats.outfitId] || OUTFIT_PRESETS.street;
    (this.torsoMesh.material as THREE.MeshStandardMaterial).color.set(outfit.jacketColor);
  }

  // Locomotion update
  public update(
    dt: number,
    moveX: number, // -1 (left) to 1 (right)
    moveZ: number, // -1 (backward) to 1 (forward)
    sprint: boolean,
    jump: boolean,
    crouch: boolean,
    aim: boolean,
    cameraYaw: number
  ) {
    if (this.inVehicle) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.isCrouching = crouch;
    this.isAiming = aim;

    // Aiming pose: raise right arm pointing forward
    if (this.isAiming) {
      this.rightArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.z = -0.15;
    }

    // Cooldown timers
    if (this.shootCooldownTimer > 0) {
      this.shootCooldownTimer -= dt;
    }
    if (this.muzzleFlash.intensity > 0) {
      this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - dt * 25);
    }

    // Desired move speed
    let baseSpeed = 5.0; // Walk
    if (sprint && !crouch) baseSpeed = 9.5; // Sprint
    if (crouch) baseSpeed = 2.8; // Crouch walk
    if (this.isAiming) baseSpeed = 3.2; // Aim walk

    const hasMovement = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;

    if (hasMovement) {
      // Calculate world movement direction based on camera yaw
      const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      this.velocity.x = moveVec.x * baseSpeed;
      this.velocity.z = moveVec.z * baseSpeed;

      // Face direction of movement (or face camera direction if aiming)
      const targetAngle = this.isAiming ? cameraYaw : Math.atan2(moveVec.x, moveVec.z);
      this.rotation.y = THREE.MathUtils.damp(this.rotation.y, targetAngle, 16, dt);

      // Limb swing walk animation
      this.walkCycle += dt * (baseSpeed * 1.5);
      const legSwing = Math.sin(this.walkCycle) * 0.7;
      this.leftLeg.rotation.x = legSwing;
      this.rightLeg.rotation.x = -legSwing;

      if (!this.isAiming) {
        this.leftArm.rotation.x = -legSwing * 0.75;
        this.rightArm.rotation.x = legSwing * 0.75;
      }

      // Footstep sound
      this.footstepTimer += dt * baseSpeed;
      if (this.footstepTimer > 3.0) {
        this.footstepTimer = 0;
        soundEngine.playFootstep();
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 15, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 15, dt);

      // Return limbs to neutral
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 10, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 10, dt);
      if (!this.isAiming) {
        this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 10, dt);
        this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0, 10, dt);
      }
    }

    // Jump & Gravity Physics
    const gravity = -25.0;
    if (this.isGrounded) {
      if (jump && !crouch) {
        this.velocity.y = 8.5;
        this.isGrounded = false;
      } else {
        this.velocity.y = 0;
      }
    } else {
      this.velocity.y += gravity * dt;
    }

    // Apply movement
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // Floor ground clamp
    const floorY = crouch ? -0.25 : 0;
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.isGrounded = true;
      this.velocity.y = 0;
    }

    // Crouch body scale
    const targetScaleY = crouch ? 0.75 : 1.0;
    this.mesh.scale.y = THREE.MathUtils.damp(this.mesh.scale.y, targetScaleY, 12, dt);

    // Sync mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
  }

  // Shoot weapon action
  public shoot(): boolean {
    const wep = this.stats.ownedWeapons[this.stats.currentWeapon];
    if (!wep || this.shootCooldownTimer > 0) return false;

    if (wep.id !== 'fists' && wep.currentMag <= 0) {
      this.reload();
      return false;
    }

    if (wep.id !== 'fists') {
      wep.currentMag--;
    }

    this.shootCooldownTimer = 1.0 / wep.fireRate;
    soundEngine.playShoot(wep.id);

    // Muzzle flash light trigger
    this.muzzleFlash.intensity = 3.5;

    // Recoil kick on arm
    this.rightArm.rotation.x += 0.2;

    return true;
  }

  // Reload current weapon
  public reload() {
    const wep = this.stats.ownedWeapons[this.stats.currentWeapon];
    if (!wep || wep.id === 'fists') return;

    const needed = wep.magSize - wep.currentMag;
    if (needed <= 0 || wep.reserveAmmo <= 0) return;

    const fill = Math.min(needed, wep.reserveAmmo);
    wep.currentMag += fill;
    wep.reserveAmmo -= fill;

    soundEngine.playReload();
  }

  // Switch to next weapon
  public cycleWeapon() {
    const order: WeaponType[] = ['fists', 'pistol', 'smg', 'rifle', 'shotgun', 'sniper'];
    const currentIdx = order.indexOf(this.stats.currentWeapon);

    for (let i = 1; i <= order.length; i++) {
      const nextId = order[(currentIdx + i) % order.length];
      if (this.stats.ownedWeapons[nextId]?.unlocked) {
        this.stats.currentWeapon = nextId;
        this.updateWeaponVisual();
        soundEngine.playReload();
        break;
      }
    }
  }

  // Take damage
  public takeDamage(amount: number): boolean {
    soundEngine.playHitImpact();

    if (this.stats.armor > 0) {
      const armorDmg = Math.min(this.stats.armor, amount * 0.75);
      this.stats.armor -= armorDmg;
      amount -= armorDmg;
    }

    this.stats.health = Math.max(0, this.stats.health - amount);
    return this.stats.health <= 0; // True if wasted
  }

  // Heal & restore
  public restoreHealthAndArmor() {
    this.stats.health = this.stats.maxHealth;
    this.stats.armor = this.stats.maxArmor;
  }
}
