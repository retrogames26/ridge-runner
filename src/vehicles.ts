import * as THREE from 'three';

export interface VehicleBlueprint {
  name: string;
  archetype: string;
  summary: string;
  proportions: {
    length: number;
    width: number;
    height: number;
    groundClearance: number;
    wheelbase: number;
    trackWidth: number;
  };
  cabStyle: string;
  hood: {
    slope: number;
    scoop: boolean;
    powerBulge: boolean;
  };
  frontFascia: {
    grilleStyle: string;
    headlightStyle: string;
    bullBar: string;
    winch: boolean;
  };
  wheelArches: {
    style: string;
    flareWidth: number;
  };
  roofEquipment: {
    rack: string;
    roofSpotlights: string;
    snorkel: boolean;
    spareTireMounted: string;
  };
  wheels: {
    tireRadius: number;
    tireWidth: number;
    rimStyle: string;
    rimDiameterRatio: number;
    deepTreadLugs: boolean;
  };
  materials: {
    primaryBodyColor: string;
    secondaryTrimColor: string;
    rimColor: string;
    glassColor: string;
    roughBody?: number;
    metalBody?: number;
  };
  suspensionRig: {
    springStiffness: number;
    suspensionTravel: number;
    dampingFactor: number;
  };
}

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheelFL: THREE.Group;
  wheelFR: THREE.Group;
  wheelRL: THREE.Group;
  wheelRR: THREE.Group;
  wheelMeshFL: THREE.Group;
  wheelMeshFR: THREE.Group;
  wheelMeshRL: THREE.Group;
  wheelMeshRR: THREE.Group;
  dimensions: {
    length: number;
    width: number;
    height: number;
    wheelbase: number;
    trackWidth: number;
    tireRadius: number;
    groundClearance: number;
  };
  blueprint: VehicleBlueprint;
}

export const PRESET_VEHICLES: VehicleBlueprint[] = [
  {
    name: 'Scout 4x4 Expedition',
    archetype: 'scout_4x4',
    summary: 'High-clearance short-wheelbase trail scout with heavy-duty rock sliders.',
    proportions: {
      length: 4.4,
      width: 1.95,
      height: 2.1,
      groundClearance: 0.44,
      wheelbase: 2.65,
      trackWidth: 1.78,
    },
    cabStyle: 'suv_short_wheelbase',
    hood: { slope: 0.18, scoop: true, powerBulge: true },
    frontFascia: {
      grilleStyle: 'slotted_vertical',
      headlightStyle: 'round_classic',
      bullBar: 'tubular_low',
      winch: true,
    },
    wheelArches: { style: 'cutout_flared', flareWidth: 0.14 },
    roofEquipment: {
      rack: 'basket_rack',
      roofSpotlights: 'quad_round_pods',
      snorkel: true,
      spareTireMounted: 'rear_door',
    },
    wheels: {
      tireRadius: 0.52,
      tireWidth: 0.35,
      rimStyle: 'beadlock_8hole',
      rimDiameterRatio: 0.52,
      deepTreadLugs: true,
    },
    materials: {
      primaryBodyColor: '#eab308',
      secondaryTrimColor: '#18181b',
      rimColor: '#18181b',
      glassColor: '#0f172a',
      roughBody: 0.35,
      metalBody: 0.3,
    },
    suspensionRig: {
      springStiffness: 32000,
      suspensionTravel: 0.4,
      dampingFactor: 3200,
    },
  },
  {
    name: 'Baja Dune Runner',
    archetype: 'baja_runner',
    summary: 'Trophy-truck inspired long-travel suspension rig built for high-speed desert dunes.',
    proportions: {
      length: 4.85,
      width: 2.2,
      height: 1.85,
      groundClearance: 0.48,
      wheelbase: 3.1,
      trackWidth: 1.98,
    },
    cabStyle: 'open_cage_buggy',
    hood: { slope: 0.26, scoop: true, powerBulge: false },
    frontFascia: {
      grilleStyle: 'mesh_honeycomb',
      headlightStyle: 'split_led_bars',
      bullBar: 'stinger_crawler',
      winch: false,
    },
    wheelArches: { style: 'tubular_rock', flareWidth: 0.22 },
    roofEquipment: {
      rack: 'none',
      roofSpotlights: 'led_lightbar',
      snorkel: false,
      spareTireMounted: 'bed_slanted',
    },
    wheels: {
      tireRadius: 0.56,
      tireWidth: 0.42,
      rimStyle: 'sport_5spoke',
      rimDiameterRatio: 0.48,
      deepTreadLugs: true,
    },
    materials: {
      primaryBodyColor: '#06b6d4',
      secondaryTrimColor: '#09090b',
      rimColor: '#d4d4d8',
      glassColor: '#082f49',
      roughBody: 0.25,
      metalBody: 0.5,
    },
    suspensionRig: {
      springStiffness: 26000,
      suspensionTravel: 0.55,
      dampingFactor: 2800,
    },
  },
  {
    name: 'Heavy Duty Overland Truck',
    archetype: 'heavy_truck',
    summary: 'Rugged commercial-grade 4x4 rig with armored front fascia and heavy roof tray.',
    proportions: {
      length: 5.2,
      width: 2.25,
      height: 2.45,
      groundClearance: 0.5,
      wheelbase: 3.3,
      trackWidth: 1.95,
    },
    cabStyle: 'pickup_double_cab',
    hood: { slope: 0.12, scoop: false, powerBulge: true },
    frontFascia: {
      grilleStyle: 'horizontal_bars',
      headlightStyle: 'rectangular_modern',
      bullBar: 'heavy_duty_winch_guard',
      winch: true,
    },
    wheelArches: { style: 'box_fender', flareWidth: 0.18 },
    roofEquipment: {
      rack: 'expedition_tray',
      roofSpotlights: 'led_lightbar',
      snorkel: true,
      spareTireMounted: 'roof_basket',
    },
    wheels: {
      tireRadius: 0.58,
      tireWidth: 0.4,
      rimStyle: 'military_steelie',
      rimDiameterRatio: 0.5,
      deepTreadLugs: true,
    },
    materials: {
      primaryBodyColor: '#4d5b43',
      secondaryTrimColor: '#18181b',
      rimColor: '#27272a',
      glassColor: '#1e293b',
      roughBody: 0.5,
      metalBody: 0.2,
    },
    suspensionRig: {
      springStiffness: 42000,
      suspensionTravel: 0.42,
      dampingFactor: 4200,
    },
  },
];

export function buildVehicleRig(blueprint: VehicleBlueprint): VehicleRig {
  const root = new THREE.Group();
  root.name = `Vehicle_${blueprint.name.replace(/\s+/g, '_')}`;

  const { proportions, wheels, materials } = blueprint;
  const p = proportions;
  const w = wheels;

  const length = p.length;
  const width = p.width;
  const height = p.height;
  const wheelbase = p.wheelbase;
  const trackWidth = p.trackWidth;
  const tireRadius = w.tireRadius;
  const tireWidth = w.tireWidth;
  const groundClearance = p.groundClearance;

  // Materials
  const matBody = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.primaryBodyColor),
    roughness: materials.roughBody ?? 0.4,
    metalness: materials.metalBody ?? 0.3,
    flatShading: true,
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.secondaryTrimColor),
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });

  const matGlass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.glassColor),
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.8,
  });

  const matRubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#18181b'),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const matRim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.rimColor),
    roughness: 0.35,
    metalness: 0.7,
    flatShading: true,
  });

  const matLight = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const matTail = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Body Group
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'BodyGroup';
  root.add(bodyGroup);

  // Main Cab & Chassis
  const cabLength = length * 0.75;
  const cabHeight = height * 0.55;
  const cabWidth = width * 0.88;
  const cabY = groundClearance + cabHeight / 2;

  const cabGeom = new THREE.BoxGeometry(cabWidth, cabHeight, cabLength);
  const cabMesh = new THREE.Mesh(cabGeom, matBody);
  cabMesh.position.set(0, cabY, 0);
  cabMesh.castShadow = true;
  bodyGroup.add(cabMesh);

  // Greenhouse / Cabin Roof
  const greenhouseLength = cabLength * 0.58;
  const greenhouseHeight = height * 0.42;
  const greenhouseWidth = cabWidth * 0.82;
  const greenhouseGeom = new THREE.BoxGeometry(greenhouseWidth, greenhouseHeight, greenhouseLength);
  const greenhouseMesh = new THREE.Mesh(greenhouseGeom, matGlass);
  greenhouseMesh.position.set(0, cabY + cabHeight / 2 + greenhouseHeight / 2 - 0.05, -cabLength * 0.08);
  greenhouseMesh.castShadow = true;
  bodyGroup.add(greenhouseMesh);

  // Roof cap
  const roofGeom = new THREE.BoxGeometry(greenhouseWidth * 1.04, 0.08, greenhouseLength * 1.02);
  const roofMesh = new THREE.Mesh(roofGeom, matBody);
  roofMesh.position.set(0, greenhouseMesh.position.y + greenhouseHeight / 2 + 0.04, greenhouseMesh.position.z);
  roofMesh.castShadow = true;
  bodyGroup.add(roofMesh);

  // Front Hood & Grille
  const hoodLength = cabLength * 0.36;
  const hoodGeom = new THREE.BoxGeometry(cabWidth * 0.94, cabHeight * 0.4, hoodLength);
  const hoodMesh = new THREE.Mesh(hoodGeom, matBody);
  hoodMesh.position.set(0, cabY + cabHeight * 0.22, cabLength * 0.38);
  bodyGroup.add(hoodMesh);

  // Front Grille
  const grilleGeom = new THREE.BoxGeometry(cabWidth * 0.75, cabHeight * 0.3, 0.06);
  const grilleMesh = new THREE.Mesh(grilleGeom, matTrim);
  grilleMesh.position.set(0, cabY + cabHeight * 0.15, cabLength * 0.5 + 0.02);
  bodyGroup.add(grilleMesh);

  // Headlights
  const lightGeom = new THREE.BoxGeometry(cabWidth * 0.15, cabHeight * 0.15, 0.05);
  const leftLight = new THREE.Mesh(lightGeom, matLight);
  leftLight.position.set(-cabWidth * 0.35, cabY + cabHeight * 0.2, cabLength * 0.5 + 0.03);
  const rightLight = new THREE.Mesh(lightGeom, matLight);
  rightLight.position.set(cabWidth * 0.35, cabY + cabHeight * 0.2, cabLength * 0.5 + 0.03);
  bodyGroup.add(leftLight, rightLight);

  // Taillights
  const tailGeom = new THREE.BoxGeometry(cabWidth * 0.12, cabHeight * 0.25, 0.05);
  const leftTail = new THREE.Mesh(tailGeom, matTail);
  leftTail.position.set(-cabWidth * 0.38, cabY + cabHeight * 0.15, -cabLength * 0.5 - 0.02);
  const rightTail = new THREE.Mesh(tailGeom, matTail);
  rightTail.position.set(cabWidth * 0.38, cabY + cabHeight * 0.15, -cabLength * 0.5 - 0.02);
  bodyGroup.add(leftTail, rightTail);

  // Front Bumper with Bullbar
  const bumperGeom = new THREE.BoxGeometry(width * 0.98, 0.22, 0.25);
  const frontBumper = new THREE.Mesh(bumperGeom, matTrim);
  frontBumper.position.set(0, groundClearance + 0.1, cabLength * 0.52);
  bodyGroup.add(frontBumper);

  // Rear Bumper
  const rearBumper = new THREE.Mesh(bumperGeom, matTrim);
  rearBumper.position.set(0, groundClearance + 0.1, -cabLength * 0.52);
  bodyGroup.add(rearBumper);

  // Wheels creation function
  const createWheelMesh = () => {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireGeom = new THREE.CylinderGeometry(tireRadius, tireRadius, tireWidth, 16);
    tireGeom.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeom, matRubber);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    // Rim
    const rimRadius = tireRadius * 0.55;
    const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius, tireWidth * 1.02, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeom, matRim);
    wheelGroup.add(rimMesh);

    return wheelGroup;
  };

  const halfTrack = trackWidth / 2;
  const halfBase = wheelbase / 2;

  // Suspension & Wheel pivots
  const wheelFL = new THREE.Group();
  wheelFL.position.set(-halfTrack, tireRadius, halfBase);
  const wheelMeshFL = createWheelMesh();
  wheelFL.add(wheelMeshFL);

  const wheelFR = new THREE.Group();
  wheelFR.position.set(halfTrack, tireRadius, halfBase);
  const wheelMeshFR = createWheelMesh();
  wheelFR.add(wheelMeshFR);

  const wheelRL = new THREE.Group();
  wheelRL.position.set(-halfTrack, tireRadius, -halfBase);
  const wheelMeshRL = createWheelMesh();
  wheelRL.add(wheelMeshRL);

  const wheelRR = new THREE.Group();
  wheelRR.position.set(halfTrack, tireRadius, -halfBase);
  const wheelMeshRR = createWheelMesh();
  wheelRR.add(wheelMeshRR);

  root.add(wheelFL, wheelFR, wheelRL, wheelRR);

  return {
    root,
    bodyGroup,
    wheelFL,
    wheelFR,
    wheelRL,
    wheelRR,
    wheelMeshFL,
    wheelMeshFR,
    wheelMeshRL,
    wheelMeshRR,
    dimensions: {
      length,
      width,
      height,
      wheelbase,
      trackWidth,
      tireRadius,
      groundClearance,
    },
    blueprint,
  };
}
