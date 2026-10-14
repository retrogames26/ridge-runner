import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PRESET_VEHICLES, buildVehicleRig, VehicleBlueprint, VehicleRig } from './vehicles';

// --- GAME STATE ---
let currentBlueprint: VehicleBlueprint = PRESET_VEHICLES[0];
let currentRig: VehicleRig;
let activeCheckpoint = 0;
let cameraMode: 'chase' | 'hood' | 'orbit' = 'chase';
let isMuted = false;

// Physics state
let posX = 0;
let posY = 2;
let posZ = 0;
let velX = 0;
let velY = 0;
let velZ = 0;
let yaw = 0;
let steerAngle = 0;
let speedKmh = 0;
let engineRpm = 900;
let currentGear = 1;
let wheelSpin = 0;

// Controls
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

// --- PROCEDURAL TERRAIN ENGINE ---
function getTerrainHeight(x: number, z: number): number {
  // Layered sinusoidal noise to generate mountain ridges, canyons, and valleys
  const scale1 = 0.012;
  const scale2 = 0.035;
  const scale3 = 0.085;

  let h = Math.sin(x * scale1) * Math.cos(z * scale1) * 18.0;
  h += Math.sin(x * scale2 + 1.2) * Math.cos(z * scale2 + 0.8) * 6.5;
  h += Math.sin(x * scale3) * Math.cos(z * scale3) * 1.8;

  // Flatten starting area around (0,0)
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter < 25) {
    const t = distFromCenter / 25;
    h = h * (t * t);
  }

  return h;
}

function getTerrainNormal(x: number, z: number): THREE.Vector3 {
  const eps = 0.4;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);

  const norm = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
  return norm.normalize();
}

// Checkpoints
const checkpoints: { x: number; z: number }[] = [
  { x: 0, z: 40 },
  { x: 35, z: 85 },
  { x: 80, z: 120 },
  { x: 120, z: 60 },
  { x: 75, z: -20 },
  { x: 20, z: -70 },
  { x: -50, z: -60 },
  { x: -80, z: 0 },
  { x: -40, z: 30 },
];

// --- PROCEDURAL AUDIO ENGINE ---
class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.osc1.connect(lowpass);
    this.osc2.connect(lowpass);
    lowpass.connect(this.gainNode);

    this.osc1.start();
    this.osc2.start();
  }

  update(rpm: number, speed: number) {
    if (!this.ctx || !this.osc1 || !this.osc2 || !this.gainNode) return;
    if (isMuted) {
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    const baseFreq = 38 + (rpm / 6000) * 115;
    this.osc1.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.04);
    this.osc2.frequency.setTargetAtTime(baseFreq * 1.5, this.ctx.currentTime, 0.04);

    const targetGain = 0.04 + Math.min(0.08, (Math.abs(speed) / 100) * 0.06);
    this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  toggleMute(): boolean {
    isMuted = !isMuted;
    return isMuted;
  }
}

const audio = new AudioEngine();

// --- SCENE SETUP ---
const container = document.getElementById('canvas-container') || document.body;
const width = window.innerWidth;
const height = window.innerHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#5b6876');
scene.fog = new THREE.FogExp2('#5b6876', 0.007);

const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Environment lighting
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f3f46, 0.85);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
sunLight.position.set(60, 110, 80);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 300;
const d = 45;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0006;
scene.add(sunLight);

// Build Mountain Terrain Geometry
const terrainSize = 600;
const terrainSegs = 140;
const terrainGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
terrainGeom.rotateX(-Math.PI / 2);

const posAttr = terrainGeom.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  posAttr.setY(i, getTerrainHeight(x, z));
}
terrainGeom.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.9,
  metalness: 0.1,
  flatShading: true,
});
const terrainMesh = new THREE.Mesh(terrainGeom, terrainMat);
terrainMesh.receiveShadow = true;
scene.add(terrainMesh);

// Checkpoint markers
const checkpointMeshes: THREE.Mesh[] = [];
const cpGeom = new THREE.TorusGeometry(3.2, 0.25, 8, 24);
cpGeom.rotateX(Math.PI / 2);

checkpoints.forEach((cp, idx) => {
  const h = getTerrainHeight(cp.x, cp.z);
  const cpMat = new THREE.MeshBasicMaterial({
    color: idx === 0 ? 0xf59e0b : 0x10b981,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(cpGeom, cpMat);
  mesh.position.set(cp.x, h + 2.0, cp.z);
  scene.add(mesh);
  checkpointMeshes.push(mesh);
});

// Load Initial Vehicle
currentRig = buildVehicleRig(currentBlueprint);
scene.add(currentRig.root);

// Spawn position
posY = getTerrainHeight(0, 0) + currentRig.dimensions.tireRadius + currentRig.dimensions.groundClearance;
posX = 0;
posZ = 0;

// --- DOM ELEMENTS FOR HUD ---
const speedElem = document.getElementById('speed-val') as HTMLElement;
const gearElem = document.getElementById('gear-val') as HTMLElement;
const rpmBarElem = document.getElementById('rpm-bar') as HTMLElement;
const rigNameElem = document.getElementById('rig-name') as HTMLElement;
const cpElem = document.getElementById('cp-status') as HTMLElement;
const drawerElem = document.getElementById('vehicle-drawer') as HTMLElement;

// Update Rig Switcher UI
function updateVehicle(bp: VehicleBlueprint) {
  scene.remove(currentRig.root);
  currentBlueprint = bp;
  currentRig = buildVehicleRig(currentBlueprint);
  scene.add(currentRig.root);
  if (rigNameElem) rigNameElem.innerText = currentBlueprint.name;
}

// Input Handlers
window.addEventListener('keydown', (e) => {
  audio.init();
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = true;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = true;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = true;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = true;
      break;
    case 'Space':
      keys.brake = true;
      e.preventDefault();
      break;
    case 'KeyR':
      // Reset car
      posX = 0;
      posZ = 0;
      velX = 0;
      velY = 0;
      velZ = 0;
      yaw = 0;
      posY = getTerrainHeight(0, 0) + 1.2;
      break;
    case 'KeyC':
      cameraMode = cameraMode === 'chase' ? 'hood' : cameraMode === 'hood' ? 'orbit' : 'chase';
      break;
    case 'KeyM':
      audio.toggleMute();
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      keys.forward = false;
      break;
    case 'KeyS':
    case 'ArrowDown':
      keys.backward = false;
      break;
    case 'KeyA':
    case 'ArrowLeft':
      keys.left = false;
      break;
    case 'KeyD':
    case 'ArrowRight':
      keys.right = false;
      break;
    case 'Space':
      keys.brake = false;
      break;
  }
});

// Button events
document.getElementById('btn-switch-rig')?.addEventListener('click', () => {
  drawerElem?.classList.toggle('open');
});

document.getElementById('btn-cam')?.addEventListener('click', () => {
  cameraMode = cameraMode === 'chase' ? 'hood' : cameraMode === 'hood' ? 'orbit' : 'chase';
});

document.getElementById('btn-mute')?.addEventListener('click', () => {
  audio.toggleMute();
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  posX = 0;
  posZ = 0;
  velX = 0;
  velY = 0;
  velZ = 0;
  yaw = 0;
  posY = getTerrainHeight(0, 0) + 1.2;
});

// Rig Switch buttons
document.querySelectorAll('.vehicle-option').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const targetName = (e.currentTarget as HTMLElement).getAttribute('data-vehicle');
    const bp = PRESET_VEHICLES.find((p) => p.name === targetName);
    if (bp) {
      updateVehicle(bp);
      document.querySelectorAll('.vehicle-option').forEach((b) => b.classList.remove('active'));
      (e.currentTarget as HTMLElement).classList.add('active');
      drawerElem?.classList.remove('open');
    }
  });
});

// Camera positioning
const camPos = new THREE.Vector3(0, 4, -8);
const camTarget = new THREE.Vector3(0, 1.5, 0);

// --- MAIN GAME LOOP ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // 1. Steering & Inputs
  const maxSteer = 0.52;
  const targetSteer = keys.left ? maxSteer : keys.right ? -maxSteer : 0;
  steerAngle += (targetSteer - steerAngle) * Math.min(1, dt * 10);

  // 2. Acceleration & Braking
  const fwdX = Math.sin(yaw);
  const fwdZ = Math.cos(yaw);

  let engineForce = 0;
  if (keys.forward) engineForce += 24.0;
  if (keys.backward) engineForce -= 14.0;

  if (keys.brake) {
    velX *= 0.88;
    velZ *= 0.88;
  }

  // Apply engine force in facing direction
  velX += fwdX * engineForce * dt;
  velZ += fwdZ * engineForce * dt;

  // Drag and friction
  velX *= 0.96;
  velZ *= 0.96;

  // Steering rotates facing direction based on forward speed
  const fwdSpeed = velX * fwdX + velZ * fwdZ;
  yaw += steerAngle * (fwdSpeed / 8.0) * dt * 1.8;

  // Position integration
  posX += velX * dt;
  posZ += velZ * dt;

  // Terrain Conformance & Suspension
  const groundH = getTerrainHeight(posX, posZ);
  const targetY = groundH + currentRig.dimensions.tireRadius + currentRig.dimensions.groundClearance * 0.5;
  posY += (targetY - posY) * Math.min(1, dt * 12);

  // Surface normal for pitch/roll
  const norm = getTerrainNormal(posX, posZ);
  const up = new THREE.Vector3(0, 1, 0);
  const quatSurface = new THREE.Quaternion().setFromUnitVectors(up, norm);
  const quatYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  currentRig.root.quaternion.multiplyQuaternions(quatSurface, quatYaw);

  currentRig.root.position.set(posX, posY, posZ);

  // Wheel steering & rotation
  currentRig.wheelFL.rotation.y = steerAngle;
  currentRig.wheelFR.rotation.y = steerAngle;

  wheelSpin += fwdSpeed * dt * 2.5;
  currentRig.wheelMeshFL.rotation.x = wheelSpin;
  currentRig.wheelMeshFR.rotation.x = wheelSpin;
  currentRig.wheelMeshRL.rotation.x = wheelSpin;
  currentRig.wheelMeshRR.rotation.x = wheelSpin;

  // Speed & telemetry
  speedKmh = Math.round(fwdSpeed * 3.6);
  currentGear = speedKmh < -1 ? -1 : speedKmh > 75 ? 4 : speedKmh > 48 ? 3 : speedKmh > 22 ? 2 : 1;
  engineRpm = Math.min(6500, Math.max(900, 900 + Math.abs(speedKmh) * 55));

  // Update Audio
  audio.update(engineRpm, speedKmh);

  // Checkpoints
  const currentCP = checkpoints[activeCheckpoint % checkpoints.length];
  const distToCP = Math.hypot(posX - currentCP.x, posZ - currentCP.z);
  if (distToCP < 5.5) {
    activeCheckpoint = (activeCheckpoint + 1) % checkpoints.length;
    checkpointMeshes.forEach((m, idx) => {
      (m.material as THREE.MeshBasicMaterial).color.set(idx === activeCheckpoint ? 0xf59e0b : 0x10b981);
    });
  }

  // Update HUD elements
  if (speedElem) speedElem.innerText = Math.abs(speedKmh).toString();
  if (gearElem) gearElem.innerText = currentGear === -1 ? 'R' : currentGear.toString();
  if (rpmBarElem) {
    rpmBarElem.style.width = `${Math.min(100, (engineRpm / 6000) * 100)}%`;
    rpmBarElem.style.backgroundColor = engineRpm > 5200 ? '#ef4444' : engineRpm > 3600 ? '#f59e0b' : '#10b981';
  }
  if (cpElem) cpElem.innerText = `Checkpoint: ${activeCheckpoint + 1} / ${checkpoints.length}`;

  // Camera Dynamics
  if (cameraMode === 'chase') {
    const chaseDist = 6.8 + Math.min(3.5, Math.abs(fwdSpeed) / 8);
    const chaseH = 2.4 + Math.min(1.0, Math.abs(fwdSpeed) / 10);

    const targetCamX = posX - fwdX * chaseDist;
    const targetCamY = posY + chaseH;
    const targetCamZ = posZ - fwdZ * chaseDist;

    camPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
    camTarget.lerp(new THREE.Vector3(posX + fwdX * 2, posY + 1.2, posZ + fwdZ * 2), 0.15);

    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  } else if (cameraMode === 'hood') {
    camera.position.set(posX + fwdX * 0.8, posY + 1.45, posZ + fwdZ * 0.8);
    camera.lookAt(posX + fwdX * 15, posY + 1.2, posZ + fwdZ * 15);
  } else {
    const orbitTime = clock.getElapsedTime() * 0.4;
    const orbitR = 8.5;
    camera.position.set(posX + Math.sin(orbitTime) * orbitR, posY + 3.0, posZ + Math.cos(orbitTime) * orbitR);
    camera.lookAt(posX, posY + 1.0, posZ);
  }

  // Sun following
  sunLight.position.set(posX + 50, posY + 80, posZ + 60);
  sunLight.target.position.set(posX, posY, posZ);
  sunLight.target.updateMatrixWorld();

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
