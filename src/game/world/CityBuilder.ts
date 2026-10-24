import * as THREE from 'three';

export interface RoadSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  isHighway?: boolean;
}

export interface CityObstacle {
  box: THREE.Box3;
  type: 'building' | 'prop' | 'tree' | 'barrier';
}

export class CityBuilder {
  public scene: THREE.Scene;
  public colliders: THREE.Box3[] = [];
  public obstacles: CityObstacle[] = [];
  public streetLights: { mesh: THREE.Mesh; light: THREE.PointLight }[] = [];
  public windowMaterials: THREE.MeshStandardMaterial[] = [];
  public waterMesh: THREE.Mesh | null = null;
  public roadLanes: { start: THREE.Vector3; end: THREE.Vector3; dir: THREE.Vector3 }[] = [];

  // Locations of key buildings for minimap & missions
  public keyLocations = {
    home: new THREE.Vector3(-45, 0, 45),
    gunshop: new THREE.Vector3(45, 0, 45),
    dealership: new THREE.Vector3(45, 0, -45),
    modshop: new THREE.Vector3(-45, 0, -45),
    bank: new THREE.Vector3(0, 0, -75),
    police: new THREE.Vector3(75, 0, 0),
    hospital: new THREE.Vector3(-75, 0, 0),
    airport: new THREE.Vector3(0, 0, 160),
    beach: new THREE.Vector3(-140, 0, 0),
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // === PROCEDURAL CANVAS TEXTURES ===
  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark asphalt base with subtle noise
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 8000; i++) {
      const shade = Math.floor(25 + Math.random() * 30);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Yellow center double line
    ctx.fillStyle = '#eab308';
    ctx.fillRect(250, 0, 4, 512);
    ctx.fillRect(258, 0, 4, 512);

    // White dashed lane markers
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < 512; y += 48) {
      ctx.fillRect(125, y, 6, 26);
      ctx.fillRect(381, y, 6, 26);
    }

    // White outer road shoulder lines
    ctx.fillRect(16, 0, 8, 512);
    ctx.fillRect(488, 0, 8, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSidewalkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 0, 256, 256);

    // Paver grid
    ctx.strokeStyle = '#44403c';
    ctx.lineWidth = 3;
    for (let x = 0; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 0; y < 256; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createBuildingFacadeTexture(style: 'office' | 'residential' | 'neon'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const bgColors = {
      office: '#1e293b',
      residential: '#334155',
      neon: '#0f172a',
    };
    ctx.fillStyle = bgColors[style];
    ctx.fillRect(0, 0, 256, 512);

    // Window grid
    const cols = 8;
    const rows = 24;
    const wWidth = 18;
    const wHeight = 14;
    const gapX = 14;
    const gapY = 8;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 12 + c * (wWidth + gapX);
        const y = 14 + r * (wHeight + gapY);

        const isLit = Math.random() > (style === 'office' ? 0.45 : 0.6);
        if (isLit) {
          if (style === 'neon' && Math.random() > 0.6) {
            ctx.fillStyle = Math.random() > 0.5 ? '#38bdf8' : '#f43f5e';
          } else {
            ctx.fillStyle = Math.random() > 0.3 ? '#fef08a' : '#93c5fd';
          }
        } else {
          ctx.fillStyle = '#090d16';
        }
        ctx.fillRect(x, y, wWidth, wHeight);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSignTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);

    // Border
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  // === BUILD CITY ===
  public buildCity() {
    const asphaltTex = this.createAsphaltTexture();
    const sidewalkTex = this.createSidewalkTexture();

    // 1. Terrain & Grass Base
    const groundGeo = new THREE.PlaneGeometry(600, 600, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a1e, // Deep lush park grass
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Coastal Ocean & Beach (West side x < -100)
    this.buildOceanAndBeach();

    // 3. Road Grid Network
    this.buildRoadNetwork(asphaltTex, sidewalkTex);

    // 4. Downtown Skyscrapers (Central & East)
    this.buildDowntownSkyscrapers();

    // 5. Special Accessible Hubs & Districts
    this.buildSpecialBuildings();

    // 6. Urban Props, Trees & Street Furniture
    this.buildUrbanProps();

    // 7. Airport / Runway (South side)
    this.buildAirport();

    // 8. Player Accessible Home Exterior & Interior
    this.buildPlayerHome();

    // 9. Compton / SoCal Residential Bungalows & Backyards
    this.buildComptonNeighborhood();

    // 10. Corner Gas Station ("SoCal 76 Fuel")
    this.buildGasStation();

    // 11. Battle Royale Training Grounds & Target Range
    this.buildTrainingGrounds();

    // 12. Industrial Warehouses
    this.buildIndustrialWarehouses();
  }

  private buildOceanAndBeach() {
    // Sand beach
    const beachGeo = new THREE.PlaneGeometry(70, 500);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xe0cda9, // Warm golden beach sand
      roughness: 0.95,
      metalness: 0.0,
    });
    const beach = new THREE.Mesh(beachGeo, beachMat);
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(-135, -0.02, 0);
    beach.receiveShadow = true;
    this.scene.add(beach);

    // Ocean Water
    const waterGeo = new THREE.PlaneGeometry(250, 550, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant azure ocean
      roughness: 0.1,
      metalness: 0.35,
      transparent: true,
      opacity: 0.88,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(-270, -0.3, 0);
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Beachside Palm Trees
    for (let z = -200; z <= 200; z += 25) {
      this.createPalmTree(-108, z);
    }
  }

  private createPalmTree(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Curved Trunk (3-part segmented cylinder)
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
    });

    const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 7), trunkMat);
    trunk1.position.set(0, 1.5, 0);
    trunk1.rotation.z = 0.08;
    trunk1.castShadow = true;
    group.add(trunk1);

    const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 3, 7), trunkMat);
    trunk2.position.set(0.2, 4.3, 0);
    trunk2.rotation.z = 0.14;
    trunk2.castShadow = true;
    group.add(trunk2);

    // Coconut cluster
    const cocoMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), cocoMat);
      coco.position.set(0.35 + Math.cos(i) * 0.3, 5.7, Math.sin(i) * 0.3);
      group.add(coco);
    }

    // Palm Fronds / Leaves (6 radiating curved fan leaves)
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const leafGeo = new THREE.ConeGeometry(0.7, 3.8, 4);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(0.35 + Math.cos(angle) * 1.5, 5.6 - 0.4, Math.sin(angle) * 1.5);
      leaf.rotation.x = Math.PI / 2 + 0.3;
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      group.add(leaf);
    }

    this.scene.add(group);

    // Obstacle collider
    const box = new THREE.Box3(
      new THREE.Vector3(x - 0.6, 0, z - 0.6),
      new THREE.Vector3(x + 0.6, 6, z + 0.6)
    );
    this.colliders.push(box);
    this.obstacles.push({ box, type: 'tree' });
  }

  private buildRoadNetwork(asphaltTex: THREE.CanvasTexture, sidewalkTex: THREE.CanvasTexture) {
    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.65,
      metalness: 0.1,
    });
    asphaltTex.repeat.set(1, 16);

    const sidewalkMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.85,
      metalness: 0.05,
    });
    sidewalkTex.repeat.set(4, 24);

    // Grid coordinates: roads at x = -90, -45, 0, 45, 90 and z = -90, -45, 0, 45, 90
    const roadCoords = [-90, -45, 0, 45, 90];
    const roadWidth = 12;
    const roadLength = 260;

    // North-South Roads
    for (const x of roadCoords) {
      const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.01, 0);
      road.receiveShadow = true;
      this.scene.add(road);

      // Sidewalks on left & right of road
      const walkL = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, roadLength), sidewalkMat);
      walkL.position.set(x - (roadWidth / 2 + 1.25), 0.11, 0);
      walkL.receiveShadow = true;
      this.scene.add(walkL);

      const walkR = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, roadLength), sidewalkMat);
      walkR.position.set(x + (roadWidth / 2 + 1.25), 0.11, 0);
      walkR.receiveShadow = true;
      this.scene.add(walkR);

      // Traffic navigation lane vectors
      this.roadLanes.push({
        start: new THREE.Vector3(x - 3, 0.2, -roadLength / 2),
        end: new THREE.Vector3(x - 3, 0.2, roadLength / 2),
        dir: new THREE.Vector3(0, 0, 1),
      });
      this.roadLanes.push({
        start: new THREE.Vector3(x + 3, 0.2, roadLength / 2),
        end: new THREE.Vector3(x + 3, 0.2, -roadLength / 2),
        dir: new THREE.Vector3(0, 0, -1),
      });
    }

    // East-West Roads
    for (const z of roadCoords) {
      const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = Math.PI / 2;
      road.position.set(0, 0.015, z);
      road.receiveShadow = true;
      this.scene.add(road);

      // Sidewalks
      const walkTop = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.22, 2.5), sidewalkMat);
      walkTop.position.set(0, 0.11, z - (roadWidth / 2 + 1.25));
      walkTop.receiveShadow = true;
      this.scene.add(walkTop);

      const walkBot = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.22, 2.5), sidewalkMat);
      walkBot.position.set(0, 0.11, z + (roadWidth / 2 + 1.25));
      walkBot.receiveShadow = true;
      this.scene.add(walkBot);

      // East-West traffic lanes
      this.roadLanes.push({
        start: new THREE.Vector3(-roadLength / 2, 0.2, z - 3),
        end: new THREE.Vector3(roadLength / 2, 0.2, z - 3),
        dir: new THREE.Vector3(1, 0, 0),
      });
      this.roadLanes.push({
        start: new THREE.Vector3(roadLength / 2, 0.2, z + 3),
        end: new THREE.Vector3(-roadLength / 2, 0.2, z + 3),
        dir: new THREE.Vector3(-1, 0, 0),
      });
    }

    // Coastal Ocean Boulevard connecting west edge
    const coastRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadLength + 60), roadMat);
    coastRoad.rotation.x = -Math.PI / 2;
    coastRoad.position.set(-100, 0.018, 0);
    this.scene.add(coastRoad);
  }

  private buildDowntownSkyscrapers() {
    const facadeOffice = this.createBuildingFacadeTexture('office');
    const facadeNeon = this.createBuildingFacadeTexture('neon');
    const facadeRes = this.createBuildingFacadeTexture('residential');

    facadeOffice.repeat.set(1, 4);
    facadeNeon.repeat.set(1, 5);
    facadeRes.repeat.set(1, 3);

    // City blocks between the roads
    const blockCenters = [
      { x: -67.5, z: -67.5, type: 'towers', h: 65 },
      { x: -22.5, z: -67.5, type: 'commercial', h: 45 },
      { x: 22.5, z: -67.5, type: 'towers', h: 80 },
      { x: 67.5, z: -67.5, type: 'highrise', h: 70 },

      { x: -67.5, z: -22.5, type: 'residential', h: 35 },
      { x: -22.5, z: -22.5, type: 'plaza', h: 55 },
      { x: 22.5, z: -22.5, type: 'megatower', h: 105 }, // The Metropolis Pinnacle!
      { x: 67.5, z: -22.5, type: 'towers', h: 75 },

      { x: -67.5, z: 22.5, type: 'residential', h: 30 },
      { x: -22.5, z: 22.5, type: 'commercial', h: 48 },
      { x: 22.5, z: 22.5, type: 'towers', h: 85 },
      { x: 67.5, z: 22.5, type: 'highrise', h: 60 },

      { x: -67.5, z: 67.5, type: 'residential', h: 28 },
      { x: -22.5, z: 67.5, type: 'condos', h: 38 },
      { x: 22.5, z: 67.5, type: 'commercial', h: 50 },
      { x: 67.5, z: 67.5, type: 'towers', h: 62 },
    ];

    for (const b of blockCenters) {
      this.createCompositeSkyscraper(b.x, b.z, b.h, b.type as 'towers' | 'commercial' | 'megatower' | 'residential' | 'condos' | 'highrise' | 'plaza', facadeOffice, facadeNeon, facadeRes);
    }
  }

  // Composite 3-12 Part Procedural Skyscraper
  private createCompositeSkyscraper(
    x: number,
    z: number,
    height: number,
    style: string,
    facadeOffice: THREE.CanvasTexture,
    facadeNeon: THREE.CanvasTexture,
    facadeRes: THREE.CanvasTexture
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const baseWidth = style === 'megatower' ? 24 : 18;
    const baseDepth = style === 'megatower' ? 24 : 18;

    // 1. Foundation / Street level plaza with doors and colonnade
    const podiumH = 6;
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.3,
    });
    const podium = new THREE.Mesh(new THREE.BoxGeometry(baseWidth + 2, podiumH, baseDepth + 2), podiumMat);
    podium.position.y = podiumH / 2;
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    // 2. Main Tower Shaft (Primary silhouette)
    const shaftH = height - podiumH - 8;
    const chosenFacade = style === 'megatower' ? facadeNeon : (style === 'residential' || style === 'condos' ? facadeRes : facadeOffice);
    const towerMat = new THREE.MeshStandardMaterial({
      map: chosenFacade,
      roughness: 0.25,
      metalness: 0.8,
    });
    this.windowMaterials.push(towerMat);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, shaftH, baseDepth), towerMat);
    shaft.position.y = podiumH + shaftH / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // 3. Stepped Mid-Crown / Setback (Secondary read)
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.6,
    });
    const setback = new THREE.Mesh(new THREE.BoxGeometry(baseWidth * 0.75, 5, baseDepth * 0.75), crownMat);
    setback.position.y = podiumH + shaftH + 2.5;
    setback.castShadow = true;
    group.add(setback);

    // 4. Rooftop Structure & Helipad / Antennas (Accent detail)
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(baseWidth * 0.5, 3, baseDepth * 0.5), crownMat);
    roofCap.position.y = podiumH + shaftH + 5 + 1.5;
    roofCap.castShadow = true;
    group.add(roofCap);

    // Spire / Antenna on top of prominent towers
    if (height > 60) {
      const spireGeo = new THREE.CylinderGeometry(0.15, 0.4, 12, 8);
      const spireMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.2,
      });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.y = podiumH + shaftH + 8 + 6;
      group.add(spire);

      // Warning beacon light on top
      const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = podiumH + shaftH + 8 + 12;
      group.add(beacon);
    }

    // Helipad marker on top of megatower
    if (style === 'megatower') {
      const heliGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.2, 16);
      const heliMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 });
      const helipad = new THREE.Mesh(heliGeo, heliMat);
      helipad.position.y = podiumH + shaftH + 5 + 3.1;
      group.add(helipad);
    }

    this.scene.add(group);

    // Add bounding box collider
    const colliderBox = new THREE.Box3(
      new THREE.Vector3(x - (baseWidth + 2) / 2, 0, z - (baseDepth + 2) / 2),
      new THREE.Vector3(x + (baseWidth + 2) / 2, height, z + (baseDepth + 2) / 2)
    );
    this.colliders.push(colliderBox);
    this.obstacles.push({ box: colliderBox, type: 'building' });
  }

  // === SPECIAL SERVICE HUBS (Gun Shop, Dealership, Mod Garage, Bank, Police, Hospital) ===
  private buildSpecialBuildings() {
    // 1. AMMU-METROPOLIS Gun Shop (x: 45, z: 45)
    this.createServiceHub(
      45, 45,
      'AMMU-METROPOLIS',
      0x7f1d1d, // Dark Red
      'WEAPONS & TACTICAL',
      0xdc2626
    );

    // 2. NONO MOTORS Car Dealership (x: 45, z: -45)
    this.createServiceHub(
      45, -45,
      'NONO MOTORS',
      0x0f172a, // Obsidian Black
      'SUPERCAR SHOWROOM',
      0x38bdf8
    );

    // 3. APEX MODS Performance Repair & Tuning Garage (x: -45, z: -45)
    this.createServiceHub(
      -45, -45,
      'APEX MOD GARAGE',
      0x1c1917, // Dark Charcoal
      'TUNING & REPAIRS',
      0xf97316
    );

    // 4. METROPOLIS CENTRAL BANK (x: 0, z: -75)
    this.createServiceHub(
      0, -75,
      'METROPOLIS BANK',
      0x14532d, // Gold / Deep Emerald
      'VAULT & COMMERCE',
      0xfacc15
    );

    // 5. METROPOLIS POLICE DEPT HQ (x: 75, z: 0)
    this.createServiceHub(
      75, 0,
      'METROPOLIS POLICE HQ',
      0x1e3a8a, // Navy Blue
      'PRECINCT 1',
      0x60a5fa
    );

    // 6. METROPOLIS GENERAL HOSPITAL (x: -75, z: 0)
    this.createServiceHub(
      -75, 0,
      'METROPOLIS MEDICAL',
      0x065f46, // Teal Medical
      'EMERGENCY CARE',
      0x34d399
    );
  }

  private createServiceHub(x: number, z: number, title: string, color: number, subtitle: string, accentColor: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Main showroom building (Width 22, Depth 20, Height 10)
    const hubMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.5,
    });
    const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 20), hubMat);
    mainBuilding.position.y = 5;
    mainBuilding.castShadow = true;
    mainBuilding.receiveShadow = true;
    group.add(mainBuilding);

    // 2. Glass Panoramic Frontage (Width 18, Height 6, Depth 0.4)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 0.4), glassMat);
    glass.position.set(0, 4, 10.2);
    group.add(glass);

    // 3. Huge Illuminated Brand Sign on Facade
    const signTex = this.createSignTexture(title, '#090d16', '#' + accentColor.toString(16).padStart(6, '0'));
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      roughness: 0.3,
      metalness: 0.2,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 3.2, 0.5), signMat);
    sign.position.set(0, 8.5, 10.3);
    group.add(sign);

    // 4. Entrance Canopy with Columns
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 4), canopyMat);
    canopy.position.set(0, 4.2, 12);
    canopy.castShadow = true;
    group.add(canopy);

    // Two support columns
    const colGeo = new THREE.CylinderGeometry(0.25, 0.25, 4.2, 8);
    const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const col1 = new THREE.Mesh(colGeo, colMat);
    col1.position.set(-3.6, 2.1, 13.6);
    col1.castShadow = true;
    group.add(col1);

    const col2 = new THREE.Mesh(colGeo, colMat);
    col2.position.set(3.6, 2.1, 13.6);
    col2.castShadow = true;
    group.add(col2);

    // Entrance interaction glow pad on ground
    const ringGeo = new THREE.RingGeometry(1.2, 1.8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: accentColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const pad = new THREE.Mesh(ringGeo, ringMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.05, 12);
    group.add(pad);

    this.scene.add(group);

    // Collider
    const colliderBox = new THREE.Box3(
      new THREE.Vector3(x - 11, 0, z - 10),
      new THREE.Vector3(x + 11, 10, z + 10)
    );
    this.colliders.push(colliderBox);
    this.obstacles.push({ box: colliderBox, type: 'building' });
  }

  // === PLAYER ACCESSIBLE HOME (Luxury Penthouse Villa 101) ===
  private buildPlayerHome() {
    const x = this.keyLocations.home.x;
    const z = this.keyLocations.home.z;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Villa Main Building (Width 20, Depth 18, Height 8)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Contemporary architectural white
      roughness: 0.7,
      metalness: 0.1,
    });
    const villa = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 18), wallMat);
    villa.position.y = 4;
    villa.castShadow = true;
    villa.receiveShadow = true;
    group.add(villa);

    // Modern Balcony & Rooftop Terrace
    const terraceMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 10), terraceMat);
    terrace.position.set(0, 8.2, 0);
    group.add(terrace);

    // Glass Balcony Railing
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      metalness: 0.9,
    });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 0.2), railMat);
    rail.position.set(0, 9, 5);
    group.add(rail);

    // Garage door on right side
    const garageDoorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const garageDoor = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.3), garageDoorMat);
    garageDoor.position.set(6, 2.25, 9.1);
    group.add(garageDoor);

    // Front Door & Plaque
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 0.2), doorMat);
    door.position.set(-3, 2.1, 9.1);
    group.add(door);

    // Plaque "PENTHOUSE 101 - PLAYER RESIDENCE"
    const signTex = this.createSignTexture('PENTHOUSE 101', '#0f172a', '#38bdf8');
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 0.1), signMat);
    sign.position.set(-3, 4.8, 9.2);
    group.add(sign);

    // Home entry marker (cyan glowing ring)
    const ringGeo = new THREE.RingGeometry(1.2, 1.8, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const pad = new THREE.Mesh(ringGeo, ringMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(-3, 0.05, 11);
    group.add(pad);

    // Garage parking pad (yellow markings)
    const garagePadGeo = new THREE.PlaneGeometry(6, 8);
    const garagePadMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
    });
    const garagePad = new THREE.Mesh(garagePadGeo, garagePadMat);
    garagePad.rotation.x = -Math.PI / 2;
    garagePad.position.set(6, 0.03, 13);
    group.add(garagePad);

    this.scene.add(group);

    // Collider
    const colliderBox = new THREE.Box3(
      new THREE.Vector3(x - 10, 0, z - 9),
      new THREE.Vector3(x + 10, 9, z + 9)
    );
    this.colliders.push(colliderBox);
    this.obstacles.push({ box: colliderBox, type: 'building' });
  }

  // === AIRPORT / RUNWAY ===
  private buildAirport() {
    const x = this.keyLocations.airport.x;
    const z = this.keyLocations.airport.z;

    // Runway Tarmac (Length 220, Width 28)
    const tarmacGeo = new THREE.PlaneGeometry(28, 220);
    const tarmacMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.6,
      metalness: 0.2,
    });
    const runway = new THREE.Mesh(tarmacGeo, tarmacMat);
    runway.rotation.x = -Math.PI / 2;
    runway.rotation.z = Math.PI / 2;
    runway.position.set(x, 0.02, z);
    runway.receiveShadow = true;
    this.scene.add(runway);

    // Airport Control Tower (Cylinder shaft + glass octagonal cab)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(x - 50, 0, z - 25);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 4.5, 32, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    shaft.position.y = 16;
    shaft.castShadow = true;
    towerGroup.add(shaft);

    const cab = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 5, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.75,
      })
    );
    cab.position.y = 35;
    towerGroup.add(cab);

    // Radar dish on top
    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
    );
    dish.position.y = 40;
    towerGroup.add(dish);

    this.scene.add(towerGroup);

    // Aircraft Hangar
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(35, 15, 45), hangarMat);
    hangar.position.set(x + 40, 7.5, z - 30);
    hangar.castShadow = true;
    this.scene.add(hangar);

    const hangarBox = new THREE.Box3(
      new THREE.Vector3(x + 40 - 17.5, 0, z - 30 - 22.5),
      new THREE.Vector3(x + 40 + 17.5, 15, z - 30 + 22.5)
    );
    this.colliders.push(hangarBox);
    this.obstacles.push({ box: hangarBox, type: 'building' });

    // Stacked Cargo Freight Containers (Blue, Orange, Red, Green)
    const colors = [0x0284c7, 0xea580c, 0xdc2626, 0x16a34a];
    for (let i = 0; i < 12; i++) {
      const cCol = colors[i % colors.length];
      const contMat = new THREE.MeshStandardMaterial({ color: cCol, metalness: 0.7, roughness: 0.5 });
      const container = new THREE.Mesh(new THREE.BoxGeometry(4, 3.2, 10), contMat);
      const cx = x - 70 + (i % 4) * 5;
      const cz = z + Math.floor(i / 4) * 12;
      const cy = (i % 2 === 1 && i > 4) ? 4.8 : 1.6;
      container.position.set(cx, cy, cz);
      container.castShadow = true;
      this.scene.add(container);

      const cBox = new THREE.Box3(
        new THREE.Vector3(cx - 2, 0, cz - 5),
        new THREE.Vector3(cx + 2, 6, cz + 5)
      );
      this.colliders.push(cBox);
      this.obstacles.push({ box: cBox, type: 'prop' });
    }
  }

  // === URBAN PROPS (Streetlights, Traffic Lights, Hydrants, Benches) ===
  private buildUrbanProps() {
    // Intersections for traffic lights & streetlights
    const intersections = [-90, -45, 0, 45, 90];

    for (const ix of intersections) {
      for (const iz of intersections) {
        // 4 corner streetlights around each intersection
        const corners = [
          { x: ix - 8, z: iz - 8 },
          { x: ix + 8, z: iz + 8 },
        ];

        for (const c of corners) {
          this.createStreetLight(c.x, c.z);
        }

        // Fire hydrant on one corner
        if (Math.abs(ix) <= 45 && Math.abs(iz) <= 45) {
          this.createFireHydrant(ix - 7.5, iz + 7.5);
          this.createBusStop(ix + 12, iz - 7.5);
        }
      }
    }
  }

  private createStreetLight(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pole
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.25,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8), poleMat);
    pole.position.y = 3.75;
    pole.castShadow = true;
    group.add(pole);

    // Overhanging arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), poleMat);
    arm.position.set(1.0, 7.4, 0);
    group.add(arm);

    // Lamp fixture head
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), lampMat);
    lamp.position.set(1.9, 7.3, 0);
    group.add(lamp);

    // Night PointLight
    const light = new THREE.PointLight(0xfff7ed, 0, 22);
    light.position.set(1.9, 7.0, 0);
    group.add(light);

    this.streetLights.push({ mesh: lamp, light });
    this.scene.add(group);

    // Obstacle
    const box = new THREE.Box3(
      new THREE.Vector3(x - 0.3, 0, z - 0.3),
      new THREE.Vector3(x + 0.3, 8, z + 0.3)
    );
    this.colliders.push(box);
    this.obstacles.push({ box, type: 'prop' });
  }

  private createFireHydrant(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8, 8), redMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), redMat);
    top.position.y = 0.8;
    group.add(top);

    this.scene.add(group);
  }

  private createBusStop(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
      metalness: 0.9,
    });

    // Glass shelter back & roof
    const back = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 0.1), glassMat);
    back.position.set(0, 1.3, 0);
    group.add(back);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.1, 2), frameMat);
    roof.position.set(0, 2.65, 0.9);
    roof.castShadow = true;
    group.add(roof);

    // Bench
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 0.6), benchMat);
    bench.position.set(0, 0.5, 0.5);
    group.add(bench);

    this.scene.add(group);

    const box = new THREE.Box3(
      new THREE.Vector3(x - 2.5, 0, z - 0.5),
      new THREE.Vector3(x + 2.5, 3, z + 1.8)
    );
    this.colliders.push(box);
    this.obstacles.push({ box, type: 'prop' });
  }

  // === COMPTON / SOCAL RESIDENTIAL NEIGHBORHOOD ===
  private buildComptonNeighborhood() {
    const houseColors = [0xd6d3d1, 0xfef3c7, 0xfce7f3, 0xe2e8f0, 0xfae8ff];
    const roofColors = [0x78350f, 0x1e293b, 0x991b1b, 0x475569];

    // Build row of Compton bungalows along Northwest quadrant (x: -60 to -110, z: -100 to -150)
    for (let i = 0; i < 6; i++) {
      const hx = -65 - (i % 3) * 22;
      const hz = -110 - Math.floor(i / 3) * 28;

      const group = new THREE.Group();
      group.position.set(hx, 0, hz);

      const wallCol = houseColors[i % houseColors.length];
      const roofCol = roofColors[i % roofColors.length];

      // Stucco House Body (Width 12, Height 4.2, Depth 10)
      const wallMat = new THREE.MeshStandardMaterial({ color: wallCol, roughness: 0.85 });
      const houseBody = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 10), wallMat);
      houseBody.position.y = 2.1;
      group.add(houseBody);

      // Pitched Roof
      const roofMat = new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.7 });
      const roofGeo = new THREE.ConeGeometry(9.5, 2.5, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 4.2 + 1.25;
      group.add(roof);

      // Front Porch & Overhang
      const porchMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.8 });
      const porch = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 2.5), porchMat);
      porch.position.set(0, 0.125, 6);
      group.add(porch);

      // Front Door
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.1), doorMat);
      door.position.set(0, 1.4, 5.05);
      group.add(door);

      // Wooden Backyard Fence
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
      const fenceL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 12), fenceMat);
      fenceL.position.set(-7, 0.9, -1);
      group.add(fenceL);

      const fenceR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 12), fenceMat);
      fenceR.position.set(7, 0.9, -1);
      group.add(fenceR);

      // Street Basketball Hoop in driveway
      if (i % 2 === 0) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        const hoopPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 8), poleMat);
        hoopPole.position.set(7.5, 2.1, 7);
        group.add(hoopPole);

        const boardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.08), boardMat);
        backboard.position.set(7.5, 3.8, 7.2);
        group.add(backboard);

        const rimMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 12), rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.set(7.5, 3.5, 7.6);
        group.add(rim);
      }

      this.scene.add(group);

      const box = new THREE.Box3(
        new THREE.Vector3(hx - 6.5, 0, hz - 5.5),
        new THREE.Vector3(hx + 6.5, 6, hz + 6.5)
      );
      this.colliders.push(box);
      this.obstacles.push({ box, type: 'building' });
    }
  }

  // === SOCAL CORNER GAS STATION ===
  private buildGasStation() {
    const gx = 80;
    const gz = -80;
    const group = new THREE.Group();
    group.position.set(gx, 0, gz);

    // Large Overhead Lighted Canopy (Width 22, Depth 14, Height 0.6 at y: 6.5)
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant blue
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 14), canopyMat);
    canopy.position.y = 6.2;
    group.add(canopy);

    // Canopy Brand Sign
    const signTex = this.createSignTexture('SOCAL 76 FUEL', '#0369a1', '#facc15');
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 0.2), signMat);
    sign.position.set(0, 6.2, 7.1);
    group.add(sign);

    // 4 Support Steel Pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });
    const pillarCoords = [
      [-8, -4], [8, -4],
      [-8, 4], [8, 4],
    ];
    for (const [px, pz] of pillarCoords) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 6, 8), pillarMat);
      col.position.set(px, 3, pz);
      group.add(col);
    }

    // Two Fuel Pump Islands
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.7, roughness: 0.3 });

    for (const pz of [-3.5, 3.5]) {
      const island = new THREE.Mesh(new THREE.BoxGeometry(12, 0.35, 2.2), islandMat);
      island.position.set(0, 0.175, pz);
      group.add(island);

      // Pumps on island
      for (const px of [-3.5, 3.5]) {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.8), pumpMat);
        pump.position.set(px, 1.4, pz);
        group.add(pump);
      }
    }

    // Mini-Mart Convenience Store Building behind pumps
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const store = new THREE.Mesh(new THREE.BoxGeometry(18, 5.5, 12), storeMat);
    store.position.set(0, 2.75, -16);
    group.add(store);

    // Glass storefront
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(14, 3.5, 0.2), glassMat);
    glass.position.set(0, 2.5, -9.9);
    group.add(glass);

    this.scene.add(group);

    const box = new THREE.Box3(
      new THREE.Vector3(gx - 11, 0, gz - 22),
      new THREE.Vector3(gx + 11, 7, gz + 8)
    );
    this.colliders.push(box);
    this.obstacles.push({ box, type: 'building' });
  }

  // === BATTLE ROYALE TRAINING GROUNDS & TARGET RANGE ===
  private buildTrainingGrounds() {
    const tx = 110;
    const tz = 80;
    const group = new THREE.Group();
    group.position.set(tx, 0, tz);

    // Range Dirt Ground Pad
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 });
    const dirtPad = new THREE.Mesh(new THREE.PlaneGeometry(50, 45), dirtMat);
    dirtPad.rotation.x = -Math.PI / 2;
    dirtPad.position.y = 0.03;
    group.add(dirtPad);

    // Shooting Lane Barriers (Sandbags)
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    for (let i = 0; i < 5; i++) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.1, 0.8), sandbagMat);
      wall.position.set(-16 + i * 8, 0.55, 16);
      group.add(wall);
    }

    // Cardboard Pop-up Target Dummies at various ranges
    const targetMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
    const bullseyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const dummyGroup = new THREE.Group();
        dummyGroup.position.set(-12 + c * 8, 0, 6 - r * 8);

        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), sandbagMat);
        stand.position.y = 0.9;
        dummyGroup.add(stand);

        const silhouette = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.08), targetMat);
        silhouette.position.y = 2.0;
        dummyGroup.add(silhouette);

        const bullseye = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), bullseyeMat);
        bullseye.position.set(0, 2.2, 0.05);
        dummyGroup.add(bullseye);

        group.add(dummyGroup);
      }
    }

    // Obstacle Hurdles (Crates stack)
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 2.0), crateMat);
      crate.position.set(16, 1.0, -10 + i * 5);
      group.add(crate);
    }

    this.scene.add(group);
  }

  // === INDUSTRIAL WAREHOUSES ===
  private buildIndustrialWarehouses() {
    const wx = -90;
    const wz = 90;

    for (let i = 0; i < 2; i++) {
      const posX = wx + i * 36;
      const posZ = wz;

      const group = new THREE.Group();
      group.position.set(posX, 0, posZ);

      // Corrugated Metal Warehouse Body (Width 28, Height 11, Depth 22)
      const metalMat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x475569 : 0x334155,
        metalness: 0.7,
        roughness: 0.45,
      });
      const wh = new THREE.Mesh(new THREE.BoxGeometry(28, 11, 22), metalMat);
      wh.position.y = 5.5;
      group.add(wh);

      // Pitched Industrial Roof
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const roofGeo = new THREE.ConeGeometry(22, 4.5, 4);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 11 + 2.25;
      group.add(roof);

      // Roll-up Cargo Door
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 });
      const rollDoor = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 0.2), doorMat);
      rollDoor.position.set(0, 3.25, 11.1);
      group.add(rollDoor);

      this.scene.add(group);

      const box = new THREE.Box3(
        new THREE.Vector3(posX - 14.5, 0, posZ - 11.5),
        new THREE.Vector3(posX + 14.5, 14, posZ + 11.5)
      );
      this.colliders.push(box);
      this.obstacles.push({ box, type: 'building' });
    }
  }

  // Set night or day lighting on streetlights and windows
  public setNightMode(isNight: boolean) {
    for (const sl of this.streetLights) {
      sl.light.intensity = isNight ? 1.4 : 0;
      (sl.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isNight ? 1.0 : 0.1;
    }
  }

  // Check collision with city buildings/props
  public checkCollision(pos: THREE.Vector3, radius: number): boolean {
    const playerSphere = new THREE.Sphere(pos, radius);
    for (const col of this.colliders) {
      if (col.intersectsSphere(playerSphere)) {
        return true;
      }
    }
    return false;
  }
}

