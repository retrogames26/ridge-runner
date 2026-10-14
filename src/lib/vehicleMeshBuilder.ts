import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { VehicleBlueprint } from '../types/vehicle';

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  chassisGroup: THREE.Group;
  wheelFL: THREE.Group;
  wheelFR: THREE.Group;
  wheelRL: THREE.Group;
  wheelRR: THREE.Group;
  wheelMeshFL: THREE.Group;
  wheelMeshFR: THREE.Group;
  wheelMeshRL: THREE.Group;
  wheelMeshRR: THREE.Group;
  suspensionAnchors: {
    fl: THREE.Vector3;
    fr: THREE.Vector3;
    rl: THREE.Vector3;
    rr: THREE.Vector3;
  };
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

export function buildVehicleRig(blueprint: VehicleBlueprint): VehicleRig {
  const root = new THREE.Group();
  root.name = `Vehicle_${blueprint.name.replace(/\s+/g, '_')}`;

  const { proportions, wheels, cabStyle, hood, frontFascia, wheelArches, roofEquipment, materials } = blueprint;
  const p = proportions;
  const w = wheels;

  // Key dimensions
  const length = p.length || 4.7;
  const width = p.width || 2.05;
  const height = p.height || 2.15;
  const wheelbase = p.wheelbase || 2.85;
  const trackWidth = p.trackWidth || 1.82;
  const tireRadius = w.tireRadius || 0.52;
  const tireWidth = w.tireWidth || 0.35;
  const groundClearance = p.groundClearance || 0.42;

  // Materials Library
  const matBody = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.primaryBodyColor || '#394634'),
    roughness: materials.roughBody ?? 0.4,
    metalness: materials.metalBody ?? 0.25,
    flatShading: true,
  });

  const matTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.secondaryTrimColor || '#18191c'),
    roughness: 0.8,
    metalness: 0.2,
    flatShading: true,
  });

  const matGlass = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.glassColor || '#141d26'),
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.82,
    flatShading: true,
  });

  const matMetal = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4d4d8'),
    roughness: 0.25,
    metalness: 0.9,
    flatShading: true,
  });

  const matRubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1c1e21'),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const matRim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.rimColor || '#18181b'),
    roughness: 0.4,
    metalness: 0.7,
    flatShading: true,
  });

  const matBeadlock = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materials.rimColor === '#18181b' ? '#ca8a04' : '#ef4444'),
    roughness: 0.35,
    metalness: 0.8,
    flatShading: true,
  });

  const matHeadlight = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#fffbeb'),
    emissive: new THREE.Color('#fef08a'),
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.5,
    flatShading: true,
  });

  const matTaillight = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#dc2626'),
    emissive: new THREE.Color('#b91c1c'),
    emissiveIntensity: 0.8,
    roughness: 0.2,
    flatShading: true,
  });

  const matAmber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f59e0b'),
    emissive: new THREE.Color('#d97706'),
    emissiveIntensity: 0.6,
    roughness: 0.2,
    flatShading: true,
  });

  // Base Y positioning:
  // When at rest on flat ground y=0, wheels are at y = tireRadius.
  // Body baseline rests at y = tireRadius + (groundClearance - 0.1)
  const bodyBaseY = tireRadius + (groundClearance * 0.65);

  // Group Hierarchy
  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'Body';
  bodyGroup.position.set(0, bodyBaseY, 0);

  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'Chassis';
  chassisGroup.position.set(0, bodyBaseY - 0.12, 0);

  // 1. CHASSIS LADDER FRAME & SKID PLATES
  const frameLength = length * 0.88;
  const frameWidth = width * 0.55;
  const railGeom = new THREE.BoxGeometry(0.08, 0.12, frameLength);
  const leftRail = new THREE.Mesh(railGeom, matTrim);
  leftRail.position.set(-frameWidth / 2, 0, 0);
  const rightRail = new THREE.Mesh(railGeom, matTrim);
  rightRail.position.set(frameWidth / 2, 0, 0);
  chassisGroup.add(leftRail, rightRail);

  // Crossmembers
  for (let z = -frameLength / 2 + 0.4; z <= frameLength / 2 - 0.4; z += frameLength / 4) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, 0.08, 0.08), matTrim);
    cross.position.set(0, 0, z);
    chassisGroup.add(cross);
  }

  // Underbody skid plate & differentials
  const skidGeom = new THREE.BoxGeometry(frameWidth * 0.9, 0.04, length * 0.45);
  const skidPlate = new THREE.Mesh(skidGeom, matTrim);
  skidPlate.position.set(0, -0.06, 0.1);
  chassisGroup.add(skidPlate);

  // Axle housings & differentials
  const axleWidth = trackWidth * 0.9;
  const frontAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, axleWidth, 8), matTrim);
  frontAxle.rotation.z = Math.PI / 2;
  frontAxle.position.set(0, -(bodyBaseY - tireRadius), wheelbase / 2);
  const frontDiff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matTrim);
  frontDiff.position.set(-0.15, -(bodyBaseY - tireRadius), wheelbase / 2);

  const rearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, axleWidth, 8), matTrim);
  rearAxle.rotation.z = Math.PI / 2;
  rearAxle.position.set(0, -(bodyBaseY - tireRadius), -wheelbase / 2);
  const rearDiff = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matTrim);
  rearDiff.position.set(0.1, -(bodyBaseY - tireRadius), -wheelbase / 2);

  chassisGroup.add(frontAxle, frontDiff, rearAxle, rearDiff);

  // Exhaust pipe & muffler
  const exhaustGeom = new THREE.CylinderGeometry(0.035, 0.035, length * 0.6, 8);
  const exhaust = new THREE.Mesh(exhaustGeom, matMetal);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(width * 0.32, -0.05, -length * 0.15);
  chassisGroup.add(exhaust);

  // 2. MAIN VEHICLE BODY TUB & SCULPTING
  const bodyWidth = width * 0.88;
  const bodyLength = length * 0.92;
  const bodyHeight = height * 0.44;

  // Lower body tub
  const tubGeom = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
  const bodyTub = new THREE.Mesh(tubGeom, matBody);
  bodyTub.position.set(0, bodyHeight / 2, 0);
  bodyTub.castShadow = true;
  bodyTub.receiveShadow = true;
  bodyGroup.add(bodyTub);

  // Rocker panels / side rock sliders
  const sliderGeom = new THREE.BoxGeometry(0.1, 0.06, wheelbase * 0.85);
  const leftSlider = new THREE.Mesh(sliderGeom, matTrim);
  leftSlider.position.set(-bodyWidth / 2 - 0.05, 0.05, 0);
  const rightSlider = new THREE.Mesh(sliderGeom, matTrim);
  rightSlider.position.set(bodyWidth / 2 + 0.05, 0.05, 0);
  bodyGroup.add(leftSlider, rightSlider);

  // 3. HOOD / BONNET
  const hoodLength = length * 0.32;
  const hoodZ = wheelbase / 2 + hoodLength / 2 - 0.25;
  const hoodHeight = bodyHeight * 0.85;

  const hoodGeom = new THREE.BoxGeometry(bodyWidth * 0.94, 0.12, hoodLength);
  const hoodMesh = new THREE.Mesh(hoodGeom, matBody);
  hoodMesh.position.set(0, hoodHeight, hoodZ);
  hoodMesh.rotation.x = -hood.slope * 0.45;
  bodyGroup.add(hoodMesh);

  // Power Bulge or Hood Scoop
  if (hood.powerBulge || hood.scoop) {
    const bulgeWidth = bodyWidth * 0.4;
    const bulgeGeom = new THREE.BoxGeometry(bulgeWidth, 0.07, hoodLength * 0.65);
    const hoodBulge = new THREE.Mesh(bulgeGeom, matBody);
    hoodBulge.position.set(0, hoodHeight + 0.07, hoodZ - 0.05);
    bodyGroup.add(hoodBulge);

    if (hood.scoop) {
      const scoopOpening = new THREE.Mesh(new THREE.BoxGeometry(bulgeWidth * 0.8, 0.04, 0.05), matTrim);
      scoopOpening.position.set(0, hoodHeight + 0.09, hoodZ + hoodLength * 0.2);
      bodyGroup.add(scoopOpening);
    }
  }

  // 4. FRONT FASCIA & GRILLE
  const frontZ = length / 2 - 0.05;
  const fasciaY = bodyHeight * 0.55;
  const grilleWidth = bodyWidth * 0.72;
  const grilleHeight = bodyHeight * 0.45;

  // Grille surround
  const grilleSurround = new THREE.Mesh(new THREE.BoxGeometry(grilleWidth + 0.08, grilleHeight + 0.06, 0.06), matTrim);
  grilleSurround.position.set(0, fasciaY, frontZ);
  bodyGroup.add(grilleSurround);

  // Grille Pattern
  if (frontFascia.grilleStyle === 'slotted_vertical') {
    // 7 vertical slots (Jeep / Rubicon style)
    const slotCount = 7;
    const slotW = grilleWidth / (slotCount * 2);
    for (let i = 0; i < slotCount; i++) {
      const slotX = -grilleWidth / 2 + slotW * (i * 2 + 1);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(slotW * 0.8, grilleHeight * 0.75, 0.04), matTrim);
      slot.position.set(slotX, fasciaY, frontZ + 0.035);
      bodyGroup.add(slot);
    }
  } else if (frontFascia.grilleStyle === 'mesh_honeycomb') {
    // Honeycomb / mesh texture block
    const meshInlay = new THREE.Mesh(new THREE.BoxGeometry(grilleWidth * 0.9, grilleHeight * 0.75, 0.04), matTrim);
    meshInlay.position.set(0, fasciaY, frontZ + 0.035);
    bodyGroup.add(meshInlay);
  } else {
    // Horizontal slats (Defender / Land Cruiser style)
    for (let sy = -grilleHeight * 0.3; sy <= grilleHeight * 0.3; sy += 0.08) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(grilleWidth * 0.88, 0.03, 0.04), matTrim);
      slat.position.set(0, fasciaY + sy, frontZ + 0.035);
      bodyGroup.add(slat);
    }
  }

  // Headlights
  const lightOffset = grilleWidth / 2 + 0.12;
  if (frontFascia.headlightStyle === 'round_classic') {
    const headGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    headGeom.rotateX(Math.PI / 2);

    const leftHead = new THREE.Mesh(headGeom, matHeadlight);
    leftHead.position.set(-lightOffset, fasciaY, frontZ + 0.02);
    const rightHead = new THREE.Mesh(headGeom, matHeadlight);
    rightHead.position.set(lightOffset, fasciaY, frontZ + 0.02);

    const bezelGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.06, 12);
    bezelGeom.rotateX(Math.PI / 2);
    const leftBezel = new THREE.Mesh(bezelGeom, matTrim);
    leftBezel.position.set(-lightOffset, fasciaY, frontZ);
    const rightBezel = new THREE.Mesh(bezelGeom, matTrim);
    rightBezel.position.set(lightOffset, fasciaY, frontZ);

    bodyGroup.add(leftHead, rightHead, leftBezel, rightBezel);
  } else {
    // Rectangular / LED bar headlights
    const headGeom = new THREE.BoxGeometry(0.22, 0.12, 0.06);
    const leftHead = new THREE.Mesh(headGeom, matHeadlight);
    leftHead.position.set(-lightOffset, fasciaY, frontZ + 0.02);
    const rightHead = new THREE.Mesh(headGeom, matHeadlight);
    rightHead.position.set(lightOffset, fasciaY, frontZ + 0.02);
    bodyGroup.add(leftHead, rightHead);
  }

  // Amber side markers / turn indicators
  const indicatorGeom = new THREE.BoxGeometry(0.06, 0.08, 0.04);
  const leftInd = new THREE.Mesh(indicatorGeom, matAmber);
  leftInd.position.set(-bodyWidth / 2 + 0.04, fasciaY, frontZ + 0.02);
  const rightInd = new THREE.Mesh(indicatorGeom, matAmber);
  rightInd.position.set(bodyWidth / 2 - 0.04, fasciaY, frontZ + 0.02);
  bodyGroup.add(leftInd, rightInd);

  // Front Heavy Bumper & Winch
  const bumperWidth = width * 0.98;
  const bumperGeom = new THREE.BoxGeometry(bumperWidth, 0.18, 0.22);
  const frontBumper = new THREE.Mesh(bumperGeom, matTrim);
  frontBumper.position.set(0, 0.15, frontZ + 0.14);
  bodyGroup.add(frontBumper);

  // Bull Bar
  if (frontFascia.bullBar !== 'none') {
    const barR = 0.04;
    const barH = frontFascia.bullBar === 'stinger_crawler' ? 0.65 : 0.35;
    const barGeom = new THREE.CylinderGeometry(barR, barR, bumperWidth * 0.65, 8);
    barGeom.rotateZ(Math.PI / 2);
    const bullBarTop = new THREE.Mesh(barGeom, matTrim);
    bullBarTop.position.set(0, 0.22 + barH, frontZ + 0.2);

    // Uprights
    const uprightGeom = new THREE.CylinderGeometry(barR, barR, barH, 8);
    const leftUpright = new THREE.Mesh(uprightGeom, matTrim);
    leftUpright.position.set(-bumperWidth * 0.25, 0.22 + barH / 2, frontZ + 0.18);
    if (frontFascia.bullBar === 'stinger_crawler') {
      leftUpright.rotation.x = 0.45;
      bullBarTop.position.z += 0.15;
    }
    const rightUpright = new THREE.Mesh(uprightGeom, matTrim);
    rightUpright.position.set(bumperWidth * 0.25, 0.22 + barH / 2, frontZ + 0.18);
    if (frontFascia.bullBar === 'stinger_crawler') {
      rightUpright.rotation.x = 0.45;
    }

    bodyGroup.add(bullBarTop, leftUpright, rightUpright);
  }

  // Winch Drum
  if (frontFascia.winch) {
    const winchBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.16), matTrim);
    winchBase.position.set(0, 0.22, frontZ + 0.24);
    const winchDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12), matMetal);
    winchDrum.rotation.z = Math.PI / 2;
    winchDrum.position.set(0, 0.22, frontZ + 0.24);
    // Red hook
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.015, 6, 12), matTaillight);
    hook.position.set(0, 0.16, frontZ + 0.32);
    hook.rotation.x = Math.PI / 2;
    bodyGroup.add(winchBase, winchDrum, hook);
  }

  // D-Ring Recovery Shackles
  for (const sx of [-bumperWidth * 0.35, bumperWidth * 0.35]) {
    const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 6, 12), matAmber);
    dRing.position.set(sx, 0.12, frontZ + 0.26);
    bodyGroup.add(dRing);
  }

  // 5. CABIN GREENHOUSE (ROOF, WINDSHIELD, WINDOWS)
  const cabHeight = height - bodyBaseY - bodyHeight;
  const cabWidth = bodyWidth * 0.88;
  const isPickup = cabStyle.includes('pickup');
  const isOpenCage = cabStyle === 'open_cage_buggy';

  let cabLength = length * 0.58;
  let cabCenterZ = -0.15;

  if (isPickup) {
    cabLength = cabStyle === 'pickup_single_cab' ? length * 0.32 : length * 0.46;
    cabCenterZ = 0.2;
  }

  if (isOpenCage) {
    // Tubular Rollcage structure for Rock Crawler
    const cageTubeR = 0.04;
    const halfW = cabWidth / 2;
    const halfL = cabLength / 2;

    const createTube = (p1: THREE.Vector3, p2: THREE.Vector3) => {
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const geom = new THREE.CylinderGeometry(cageTubeR, cageTubeR, len, 8);
      geom.translate(0, len / 2, 0);
      geom.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geom, matTrim);
      mesh.position.copy(p1);
      mesh.lookAt(p2);
      return mesh;
    };

    // 4 Corner A/B pillars
    const pFL = new THREE.Vector3(-halfW, bodyHeight, cabCenterZ + halfL);
    const pFR = new THREE.Vector3(halfW, bodyHeight, cabCenterZ + halfL);
    const pRL = new THREE.Vector3(-halfW, bodyHeight, cabCenterZ - halfL);
    const pRR = new THREE.Vector3(halfW, bodyHeight, cabCenterZ - halfL);

    const pRoofFL = new THREE.Vector3(-halfW * 0.85, bodyHeight + cabHeight, cabCenterZ + halfL * 0.8);
    const pRoofFR = new THREE.Vector3(halfW * 0.85, bodyHeight + cabHeight, cabCenterZ + halfL * 0.8);
    const pRoofRL = new THREE.Vector3(-halfW * 0.85, bodyHeight + cabHeight, cabCenterZ - halfL * 0.9);
    const pRoofRR = new THREE.Vector3(halfW * 0.85, bodyHeight + cabHeight, cabCenterZ - halfL * 0.9);

    bodyGroup.add(
      createTube(pFL, pRoofFL),
      createTube(pFR, pRoofFR),
      createTube(pRL, pRoofRL),
      createTube(pRR, pRoofRR),
      createTube(pRoofFL, pRoofFR),
      createTube(pRoofRL, pRoofRR),
      createTube(pRoofFL, pRoofRL),
      createTube(pRoofFR, pRoofRR),
      // Cross brace
      createTube(pRoofRL, pRoofFR)
    );

    // Driver & passenger low-poly racing seats
    for (const seatX of [-cabWidth * 0.25, cabWidth * 0.25]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.6, 0.45), matTrim);
      seat.position.set(seatX, bodyHeight + 0.3, cabCenterZ);
      bodyGroup.add(seat);
    }
  } else {
    // Enclosed Cabin Greenhouse
    const greenhouseGeom = new THREE.BoxGeometry(cabWidth, cabHeight, cabLength);
    const greenhouse = new THREE.Mesh(greenhouseGeom, matBody);
    greenhouse.position.set(0, bodyHeight + cabHeight / 2, cabCenterZ);
    greenhouse.castShadow = true;
    bodyGroup.add(greenhouse);

    // Raked Windshield
    const windW = cabWidth * 0.92;
    const windH = cabHeight * 0.85;
    const windGeom = new THREE.PlaneGeometry(windW, windH);
    const windshield = new THREE.Mesh(windGeom, matGlass);
    windshield.position.set(0, bodyHeight + cabHeight / 2, cabCenterZ + cabLength / 2 + 0.02);
    windshield.rotation.x = -0.22; // Rake angle
    bodyGroup.add(windshield);

    // Side Windows
    const sideWinGeom = new THREE.PlaneGeometry(cabLength * 0.88, cabHeight * 0.72);
    const leftSideWin = new THREE.Mesh(sideWinGeom, matGlass);
    leftSideWin.rotation.y = -Math.PI / 2;
    leftSideWin.position.set(-cabWidth / 2 - 0.01, bodyHeight + cabHeight / 2, cabCenterZ);

    const rightSideWin = new THREE.Mesh(sideWinGeom, matGlass);
    rightSideWin.rotation.y = Math.PI / 2;
    rightSideWin.position.set(cabWidth / 2 + 0.01, bodyHeight + cabHeight / 2, cabCenterZ);

    bodyGroup.add(leftSideWin, rightSideWin);

    // Rear Windshield (if not pickup)
    if (!isPickup) {
      const rearWinGeom = new THREE.PlaneGeometry(windW * 0.85, windH * 0.8);
      const rearWin = new THREE.Mesh(rearWinGeom, matGlass);
      rearWin.rotation.y = Math.PI;
      rearWin.position.set(0, bodyHeight + cabHeight / 2, cabCenterZ - cabLength / 2 - 0.01);
      bodyGroup.add(rearWin);
    }
  }

  // 6. PICKUP BED (if applicable)
  if (isPickup) {
    const bedLength = length * 0.85 - cabLength;
    const bedCenterZ = cabCenterZ - cabLength / 2 - bedLength / 2;
    const bedHeight = bodyHeight * 0.9;

    // Bed walls
    const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, 0.08, bedLength), matTrim);
    bedFloor.position.set(0, bodyHeight * 0.2, bedCenterZ);

    const bedLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, bedHeight, bedLength), matBody);
    bedLeft.position.set(-bodyWidth / 2, bodyHeight / 2, bedCenterZ);

    const bedRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, bedHeight, bedLength), matBody);
    bedRight.position.set(bodyWidth / 2, bodyHeight / 2, bedCenterZ);

    const bedTail = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bedHeight, 0.08), matBody);
    bedTail.position.set(0, bodyHeight / 2, bedCenterZ - bedLength / 2);

    bodyGroup.add(bedFloor, bedLeft, bedRight, bedTail);
  }

  // 7. FLARED WHEEL ARCHES & FENDERS
  const archFlare = wheelArches.flareWidth || 0.15;
  const archW = tireWidth + archFlare + 0.08;
  const archR = tireRadius * 1.35;

  const createWheelArch = (xPos: number, zPos: number) => {
    const archGroup = new THREE.Group();
    const isLeft = xPos < 0;

    if (wheelArches.style === 'tubular_rock') {
      // Tubular rock fender
      const tubeGeom = new THREE.TorusGeometry(archR, 0.035, 6, 12, Math.PI);
      const tube = new THREE.Mesh(tubeGeom, matTrim);
      tube.rotation.y = isLeft ? -Math.PI / 2 : Math.PI / 2;
      tube.position.set(xPos, 0, zPos);
      archGroup.add(tube);
    } else {
      // Boxy or sculpted fender flare
      const flareBoxGeom = new THREE.BoxGeometry(archFlare, archR * 0.9, archR * 1.6);
      const flare = new THREE.Mesh(flareBoxGeom, matTrim);
      flare.position.set(xPos + (isLeft ? -archFlare / 2 : archFlare / 2), bodyHeight * 0.35, zPos);
      archGroup.add(flare);
    }
    return archGroup;
  };

  const archFL = createWheelArch(-bodyWidth / 2, wheelbase / 2);
  const archFR = createWheelArch(bodyWidth / 2, wheelbase / 2);
  const archRL = createWheelArch(-bodyWidth / 2, -wheelbase / 2);
  const archRR = createWheelArch(bodyWidth / 2, -wheelbase / 2);
  bodyGroup.add(archFL, archFR, archRL, archRR);

  // 8. SIDE MIRRORS
  const mirrorGeom = new THREE.BoxGeometry(0.14, 0.12, 0.08);
  const leftMirror = new THREE.Mesh(mirrorGeom, matTrim);
  leftMirror.position.set(-cabWidth / 2 - 0.14, bodyHeight + 0.25, cabCenterZ + cabLength / 2 - 0.1);
  const leftMirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), matGlass);
  leftMirrorGlass.rotation.y = -Math.PI / 2;
  leftMirrorGlass.position.set(-cabWidth / 2 - 0.21, bodyHeight + 0.25, cabCenterZ + cabLength / 2 - 0.1);

  const rightMirror = new THREE.Mesh(mirrorGeom, matTrim);
  rightMirror.position.set(cabWidth / 2 + 0.14, bodyHeight + 0.25, cabCenterZ + cabLength / 2 - 0.1);
  const rightMirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), matGlass);
  rightMirrorGlass.rotation.y = Math.PI / 2;
  rightMirrorGlass.position.set(cabWidth / 2 + 0.21, bodyHeight + 0.25, cabCenterZ + cabLength / 2 - 0.1);

  bodyGroup.add(leftMirror, leftMirrorGlass, rightMirror, rightMirrorGlass);

  // 9. SNORKEL (along A-pillar)
  if (roofEquipment.snorkel) {
    const snorkelTubeGeom = new THREE.CylinderGeometry(0.04, 0.04, cabHeight * 1.1, 8);
    const snorkelTube = new THREE.Mesh(snorkelTubeGeom, matTrim);
    snorkelTube.position.set(-cabWidth / 2 - 0.06, bodyHeight + cabHeight * 0.55, cabCenterZ + cabLength / 2 - 0.05);
    snorkelTube.rotation.z = -0.15; // Lean against A-pillar

    // Ram air top intake
    const snorkelTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), matTrim);
    snorkelTop.position.set(-cabWidth / 2 - 0.06, bodyHeight + cabHeight + 0.12, cabCenterZ + cabLength / 2 - 0.05);
    bodyGroup.add(snorkelTube, snorkelTop);
  }

  // 10. ROOF RACK & SPOTLIGHTS
  const roofTopY = bodyHeight + cabHeight;
  if (roofEquipment.rack !== 'none' && !isOpenCage) {
    const rackW = cabWidth * 0.95;
    const rackL = cabLength * 0.9;
    const rackH = 0.12;

    // Outer perimeter tray
    const rackGeom = new THREE.BoxGeometry(rackW, rackH, rackL);
    const rackMesh = new THREE.Mesh(rackGeom, matTrim);
    rackMesh.position.set(0, roofTopY + rackH / 2 + 0.05, cabCenterZ);
    bodyGroup.add(rackMesh);

    // Cross slats
    for (let rz = -rackL / 2 + 0.2; rz <= rackL / 2 - 0.2; rz += 0.35) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(rackW * 0.88, 0.04, 0.04), matTrim);
      slat.position.set(0, roofTopY + rackH + 0.05, cabCenterZ + rz);
      bodyGroup.add(slat);
    }

    // Overland Cargo boxes
    const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.7), new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.6, flatShading: true }));
    box1.position.set(-rackW * 0.22, roofTopY + rackH + 0.16, cabCenterZ - 0.2);
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.55), new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.6, flatShading: true }));
    box2.position.set(rackW * 0.22, roofTopY + rackH + 0.15, cabCenterZ + 0.15);
    bodyGroup.add(box1, box2);
  }

  // Roof Spotlights
  if (roofEquipment.roofSpotlights === 'led_lightbar') {
    const barWidth = cabWidth * 0.85;
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(barWidth, 0.08, 0.08), matTrim);
    lightbar.position.set(0, roofTopY + 0.06, cabCenterZ + cabLength / 2 + 0.02);

    const lightEmitter = new THREE.Mesh(new THREE.BoxGeometry(barWidth * 0.92, 0.05, 0.02), matHeadlight);
    lightEmitter.position.set(0, roofTopY + 0.06, cabCenterZ + cabLength / 2 + 0.07);
    bodyGroup.add(lightbar, lightEmitter);
  } else if (roofEquipment.roofSpotlights === 'quad_round_pods') {
    for (let podX = -cabWidth * 0.3; podX <= cabWidth * 0.3; podX += cabWidth * 0.2) {
      const podGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10);
      podGeom.rotateX(Math.PI / 2);
      const pod = new THREE.Mesh(podGeom, matHeadlight);
      pod.position.set(podX, roofTopY + 0.1, cabCenterZ + cabLength / 2);
      bodyGroup.add(pod);
    }
  }

  // 11. SPARE TIRE MOUNT
  if (roofEquipment.spareTireMounted !== 'none') {
    const spareGroup = createWheelAssembly(w, matRubber, matRim, matBeadlock);
    spareGroup.scale.set(0.95, 0.95, 0.95);

    if (roofEquipment.spareTireMounted === 'rear_door') {
      spareGroup.position.set(0, bodyHeight * 0.7, -length / 2 - 0.08);
      spareGroup.rotation.y = Math.PI / 2;
    } else if (roofEquipment.spareTireMounted === 'roof_basket') {
      spareGroup.position.set(0, roofTopY + 0.22, cabCenterZ);
      spareGroup.rotation.x = Math.PI / 2;
    } else if (roofEquipment.spareTireMounted === 'bed_slanted') {
      spareGroup.position.set(0, bodyHeight * 0.6, -length * 0.25);
      spareGroup.rotation.x = 0.55;
    }
    bodyGroup.add(spareGroup);
  }

  // 12. REAR LIGHTS & TAILGATE
  const rearZ = -length / 2 + 0.02;
  const tailH = bodyHeight * 0.45;
  const tailGeom = new THREE.BoxGeometry(0.12, 0.28, 0.05);

  const leftTail = new THREE.Mesh(tailGeom, matTaillight);
  leftTail.position.set(-bodyWidth / 2 + 0.14, tailH, rearZ);
  const rightTail = new THREE.Mesh(tailGeom, matTaillight);
  rightTail.position.set(bodyWidth / 2 - 0.14, tailH, rearZ);
  bodyGroup.add(leftTail, rightTail);

  // Rear bumper with tow hitch
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.16, 0.18), matTrim);
  rearBumper.position.set(0, 0.15, rearZ - 0.1);
  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), matTrim);
  hitch.position.set(0, 0.12, rearZ - 0.2);
  bodyGroup.add(rearBumper, hitch);

  // Add Body & Chassis to root
  root.add(bodyGroup);
  root.add(chassisGroup);

  // 13. SEPARATED ROTATING WHEEL HUBS
  // Crucial: Wheels are separate groups so driving physics can rotate them!
  const halfTrack = trackWidth / 2;
  const halfBase = wheelbase / 2;

  // Wheel assembly factory
  function makeWheel(name: string, isFront: boolean, isLeft: boolean) {
    const pivot = new THREE.Group();
    pivot.name = name;
    // Set position at exact wheel hub coordinate
    const x = isLeft ? -halfTrack : halfTrack;
    const y = tireRadius;
    const z = isFront ? halfBase : -halfBase;
    pivot.position.set(x, y, z);

    // Inner mesh group that spins with wheel rotation
    const spinGroup = new THREE.Group();
    spinGroup.name = `${name}_Spin`;
    const wheelMesh = createWheelAssembly(w, matRubber, matRim, matBeadlock);
    // Face correct side
    wheelMesh.rotation.y = isLeft ? 0 : Math.PI;
    spinGroup.add(wheelMesh);
    pivot.add(spinGroup);

    return { pivot, spinGroup };
  }

  const { pivot: wheelFL, spinGroup: wheelMeshFL } = makeWheel('Wheel_FL', true, true);
  const { pivot: wheelFR, spinGroup: wheelMeshFR } = makeWheel('Wheel_FR', true, false);
  const { pivot: wheelRL, spinGroup: wheelMeshRL } = makeWheel('Wheel_RL', false, true);
  const { pivot: wheelRR, spinGroup: wheelMeshRR } = makeWheel('Wheel_RR', false, false);

  root.add(wheelFL, wheelFR, wheelRL, wheelRR);

  // Suspension Attachment Anchors (for physics raycasts and spring-damper logic)
  const suspensionAnchors = {
    fl: new THREE.Vector3(-halfTrack, bodyBaseY, halfBase),
    fr: new THREE.Vector3(halfTrack, bodyBaseY, halfBase),
    rl: new THREE.Vector3(-halfTrack, bodyBaseY, -halfBase),
    rr: new THREE.Vector3(halfTrack, bodyBaseY, -halfBase),
  };

  return {
    root,
    bodyGroup,
    chassisGroup,
    wheelFL,
    wheelFR,
    wheelRL,
    wheelRR,
    wheelMeshFL,
    wheelMeshFR,
    wheelMeshRL,
    wheelMeshRR,
    suspensionAnchors,
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

/**
 * Creates high-detail low-poly off-road wheel:
 * Deep lug tire, beadlock rim, brake rotor & caliper
 */
function createWheelAssembly(
  w: VehicleBlueprint['wheels'],
  matRubber: THREE.Material,
  matRim: THREE.Material,
  matBeadlock: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const radius = w.tireRadius || 0.52;
  const width = w.tireWidth || 0.35;
  const rimRatio = w.rimDiameterRatio || 0.52;
  const rimRadius = radius * rimRatio;

  // 1. Tire Main Donut Cylinder
  const tireGeom = new THREE.CylinderGeometry(radius, radius, width, 16, 1, false);
  tireGeom.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeom, matRubber);
  tire.castShadow = true;
  group.add(tire);

  // 2. 3D Tread Lugs (Radial off-road mud knobs)
  if (w.deepTreadLugs) {
    const lugCount = 14;
    const lugGeom = new THREE.BoxGeometry(width * 0.85, radius * 0.08, 0.08);
    for (let i = 0; i < lugCount; i++) {
      const angle = (i / lugCount) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeom, matRubber);
      lug.position.set(0, Math.sin(angle) * (radius + 0.02), Math.cos(angle) * (radius + 0.02));
      lug.rotation.x = angle;
      group.add(lug);
    }
  }

  // 3. Rim Center & Deep Dish
  const rimGeom = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.95, 12);
  rimGeom.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeom, matRim);
  group.add(rim);

  // 4. Beadlock Outer Ring
  const beadlockGeom = new THREE.RingGeometry(rimRadius * 0.85, rimRadius * 1.02, 12);
  const beadlock = new THREE.Mesh(beadlockGeom, matBeadlock);
  beadlock.rotation.y = -Math.PI / 2;
  beadlock.position.set(-width / 2 - 0.01, 0, 0);
  group.add(beadlock);

  // 5. Center Hub Cap & Lugs
  const hubGeom = new THREE.CylinderGeometry(rimRadius * 0.28, rimRadius * 0.28, width * 0.98, 8);
  hubGeom.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeom, matRim);
  group.add(hub);

  // 6. Brake Disc Rotor (Behind rim)
  const rotorGeom = new THREE.CylinderGeometry(rimRadius * 0.75, rimRadius * 0.75, 0.02, 12);
  rotorGeom.rotateZ(Math.PI / 2);
  const rotor = new THREE.Mesh(rotorGeom, new THREE.MeshStandardMaterial({ color: '#71717a', metalness: 0.9, roughness: 0.2 }));
  rotor.position.set(0.04, 0, 0);
  // Red Caliper
  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, rimRadius * 0.35, rimRadius * 0.25),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3, flatShading: true })
  );
  caliper.position.set(0.04, rimRadius * 0.5, 0);
  group.add(rotor, caliper);

  return group;
}

/**
 * Exports the vehicle hierarchy to glTF 2.0 / GLB binary with embedded materials and extras
 */
export async function exportVehicleToGLB(vehicleRig: VehicleRig): Promise<Blob> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    // Clone to prepare clean export hierarchy
    const exportRoot = vehicleRig.root.clone(true);
    exportRoot.userData = {
      generator: 'Ridge Runners Vehicle Builder',
      archetype: vehicleRig.blueprint.archetype,
      proportions: vehicleRig.blueprint.proportions,
      suspensionRig: vehicleRig.blueprint.suspensionRig,
      wheels: vehicleRig.blueprint.wheels,
    };

    exporter.parse(
      exportRoot,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          const jsonStr = JSON.stringify(result, null, 2);
          resolve(new Blob([jsonStr], { type: 'application/json' }));
        }
      },
      (error) => {
        reject(error);
      },
      {
        binary: true,
        embedImages: true,
      }
    );
  });
}
