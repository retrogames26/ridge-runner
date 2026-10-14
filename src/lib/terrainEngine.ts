import * as THREE from 'three';

export interface TerrainWorld {
  mesh: THREE.Mesh;
  getHeight: (x: number, z: number) => number;
  getNormal: (x: number, z: number) => THREE.Vector3;
  checkpoints: THREE.Vector3[];
  dispose: () => void;
}

// Procedural multi-octave terrain noise
function terrainNoise(x: number, z: number): number {
  // Base low frequency rolling hills
  const h1 = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 8.0;
  // Medium ridge and canyon features
  const h2 = Math.sin(x * 0.035 + 1.2) * Math.cos(z * 0.038 - 0.8) * 3.8;
  // Suspension mogul ruts along main trails
  const trailDist = Math.abs(x - Math.sin(z * 0.02) * 25);
  let rut = 0;
  if (trailDist < 12) {
    // Dirt moguls to test vehicle suspension articulation!
    rut = Math.sin(z * 0.25) * 0.45 * (1 - trailDist / 12);
  }
  // Rocky crags
  const h3 = Math.sin(x * 0.08) * Math.sin(z * 0.08) * 0.8;

  // Flatten starting area around (0, 0)
  const distFromOrigin = Math.sqrt(x * x + z * z);
  const originDamp = Math.min(1.0, Math.max(0.0, (distFromOrigin - 10) / 30));

  return (h1 + h2 + rut + h3) * originDamp;
}

export function createTerrainWorld(scene: THREE.Scene): TerrainWorld {
  const size = 320;
  const segments = 160;

  const geom = new THREE.PlaneGeometry(size, size, segments, segments);
  geom.rotateX(-Math.PI / 2);

  const pos = geom.attributes.position;
  const colors: number[] = [];

  const colMud = new THREE.Color('#38281d');
  const colGrass = new THREE.Color('#4d5b38');
  const colRock = new THREE.Color('#64646a');
  const colDirt = new THREE.Color('#6b553e');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainNoise(x, z);
    pos.setY(i, y);

    // Height & slope based coloring
    const c = new THREE.Color();
    if (y < -1.5) {
      c.lerpColors(colMud, colDirt, (y + 4) / 2.5);
    } else if (y < 3.5) {
      c.lerpColors(colDirt, colGrass, (y + 1.5) / 5.0);
    } else {
      c.lerpColors(colGrass, colRock, Math.min(1, (y - 3.5) / 6.0));
    }
    colors.push(c.r, c.g, c.b);
  }

  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geom, terrainMat);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Checkpoints along the off-road trail
  const checkpoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0, 25),
    new THREE.Vector3(25, 0, 65),
    new THREE.Vector3(55, 0, 110),
    new THREE.Vector3(15, 0, 140),
    new THREE.Vector3(-45, 0, 115),
    new THREE.Vector3(-60, 0, 40),
    new THREE.Vector3(-30, 0, -20),
    new THREE.Vector3(10, 0, -50),
    new THREE.Vector3(0, 0, 0),
  ];

  // Adjust checkpoints to terrain height
  checkpoints.forEach((cp) => {
    cp.y = terrainNoise(cp.x, cp.z) + 1.2;
    createCheckpointGate(scene, cp);
  });

  // Scatter Low-Poly Nature (Rocks & Pine Trees)
  scatterEnvironmentProps(scene, terrainNoise);

  const getHeight = (x: number, z: number): number => {
    return terrainNoise(x, z);
  };

  const getNormal = (x: number, z: number): THREE.Vector3 => {
    const eps = 0.5;
    const hL = terrainNoise(x - eps, z);
    const hR = terrainNoise(x + eps, z);
    const hD = terrainNoise(x, z - eps);
    const hU = terrainNoise(x, z + eps);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
    return normal;
  };

  const dispose = () => {
    geom.dispose();
    terrainMat.dispose();
    scene.remove(mesh);
  };

  return { mesh, getHeight, getNormal, checkpoints, dispose };
}

function createCheckpointGate(scene: THREE.Scene, pos: THREE.Vector3) {
  const gateGroup = new THREE.Group();
  gateGroup.position.copy(pos);

  const postGeom = new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, flatShading: true });

  const leftPost = new THREE.Mesh(postGeom, postMat);
  leftPost.position.set(-2.8, 1.6, 0);
  const rightPost = new THREE.Mesh(postGeom, postMat);
  rightPost.position.set(2.8, 1.6, 0);

  const bannerGeom = new THREE.BoxGeometry(5.6, 0.6, 0.1);
  const bannerMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    emissive: '#d97706',
    emissiveIntensity: 0.4,
    flatShading: true,
  });
  const banner = new THREE.Mesh(bannerGeom, bannerMat);
  banner.position.set(0, 3.2, 0);

  gateGroup.add(leftPost, rightPost, banner);
  scene.add(gateGroup);
}

function scatterEnvironmentProps(scene: THREE.Scene, getHeight: (x: number, z: number) => number) {
  // Low-poly Pine Tree Instancing
  const treeCount = 90;
  const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, 1.8, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3f2e1e', roughness: 0.9, flatShading: true });
  const pineGeom = new THREE.ConeGeometry(1.6, 3.5, 5);
  const pineMat = new THREE.MeshStandardMaterial({ color: '#264228', roughness: 0.8, flatShading: true });

  const rockGeom = new THREE.DodecahedronGeometry(1.2, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.95, flatShading: true });

  // Scatter randomly away from center track
  for (let i = 0; i < treeCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 120;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getHeight(x, z);

    // Tree
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, y, z);
    const scale = 0.8 + Math.random() * 0.6;
    treeGroup.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 0.9;
    const foliage = new THREE.Mesh(pineGeom, pineMat);
    foliage.position.y = 2.8;

    treeGroup.add(trunk, foliage);
    scene.add(treeGroup);
  }

  // Boulders
  for (let j = 0; j < 50; j++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 110;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getHeight(x, z);

    const rock = new THREE.Mesh(rockGeom, rockMat);
    const rScale = 0.5 + Math.random() * 1.4;
    rock.scale.set(rScale, rScale * (0.6 + Math.random() * 0.4), rScale);
    rock.position.set(x, y + 0.3, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(rock);
  }
}
