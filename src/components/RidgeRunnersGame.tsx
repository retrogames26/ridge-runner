import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VehicleBlueprint, VehiclePhysicsState } from '../types/vehicle';
import { buildVehicleRig, VehicleRig } from '../lib/vehicleMeshBuilder';
import { createTerrainWorld, TerrainWorld } from '../lib/terrainEngine';
import { VehicleController, DrivingControls } from '../lib/drivingPhysics';
import { audioEngine } from '../lib/audioEngine';
import { PRESET_VEHICLES } from '../lib/presetData';
import {
  Volume2,
  VolumeX,
  Camera,
  RotateCcw,
  Compass,
  Gauge,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Wrench,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface RidgeRunnersGameProps {
  currentBlueprint: VehicleBlueprint;
  onOpenStudio: () => void;
  onSelectVehicle: (bp: VehicleBlueprint) => void;
  onOpenPipelineModal: () => void;
}

export const RidgeRunnersGame: React.FC<RidgeRunnersGameProps> = ({
  currentBlueprint,
  onOpenStudio,
  onSelectVehicle,
  onOpenPipelineModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controllerRef = useRef<VehicleController | null>(null);
  const rigRef = useRef<VehicleRig | null>(null);
  const terrainRef = useRef<TerrainWorld | null>(null);

  // Keyboard controls state
  const controlsRef = useRef<DrivingControls>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    reset: false,
  });

  // UI state
  const [telemetry, setTelemetry] = useState<VehiclePhysicsState>({
    x: 0,
    y: 0,
    z: 0,
    speed: 0,
    rpm: 900,
    gear: 1,
    steerAngle: 0,
    wheelRotation: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    suspensionCompressions: [0.5, 0.5, 0.5, 0.5],
    isGrounded: true,
    inMud: false,
  });

  const [cameraMode, setCameraMode] = useState<'chase' | 'hood' | 'orbit'>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [activeCheckpoint, setActiveCheckpoint] = useState<number>(0);
  const [showVehicleDrawer, setShowVehicleDrawer] = useState<boolean>(false);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#789'); // Foggy horizon
    scene.fog = new THREE.FogExp2('#789', 0.007);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 350);
    cameraRef.current = camera;

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Sun & Atmosphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f3f46, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.4);
    sunLight.position.set(60, 110, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 300;
    const d = 45;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0006;
    scene.add(sunLight);

    // Build Terrain World
    const terrain = createTerrainWorld(scene);
    terrainRef.current = terrain;

    // Build Initial Vehicle Rig
    const rig = buildVehicleRig(currentBlueprint);
    rigRef.current = rig;
    scene.add(rig.root);

    // Driving Controller
    const controller = new VehicleController(rig, terrain);
    controllerRef.current = controller;

    // Start Audio Engine on first interaction
    const handleFirstInput = () => {
      audioEngine.start();
      window.removeEventListener('keydown', handleFirstInput);
      window.removeEventListener('click', handleFirstInput);
    };
    window.addEventListener('keydown', handleFirstInput);
    window.addEventListener('click', handleFirstInput);

    // Keyboard Listeners
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          controlsRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          controlsRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          controlsRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          controlsRef.current.right = true;
          break;
        case 'Space':
          controlsRef.current.brake = true;
          e.preventDefault();
          break;
        case 'KeyR':
          controlsRef.current.reset = true;
          break;
        case 'KeyC':
          setCameraMode((m) => (m === 'chase' ? 'hood' : m === 'hood' ? 'orbit' : 'chase'));
          break;
        case 'KeyM':
          setIsMuted(audioEngine.toggleMute());
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          controlsRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          controlsRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          controlsRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          controlsRef.current.right = false;
          break;
        case 'Space':
          controlsRef.current.brake = false;
          break;
        case 'KeyR':
          controlsRef.current.reset = false;
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Camera follow helpers
    const currentCamPos = new THREE.Vector3(0, 4, -8);
    const currentCamTarget = new THREE.Vector3(0, 1.5, 0);

    // Animation Render Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;
    let telemetryThrottle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      if (controllerRef.current) {
        const state = controllerRef.current.update(dt, controlsRef.current);

        // Update procedural audio
        audioEngine.update(state.rpm, state.speed, controlsRef.current.brake);

        // Throttle React state updates to ~25fps for silky smooth 60fps rendering
        telemetryThrottle += dt;
        if (telemetryThrottle > 0.04) {
          telemetryThrottle = 0;
          setTelemetry(state);

          // Checkpoint distance check
          if (terrain.checkpoints.length > 0) {
            const cp = terrain.checkpoints[activeCheckpoint % terrain.checkpoints.length];
            const dist = Math.hypot(state.x - cp.x, state.z - cp.z);
            if (dist < 5.0) {
              setActiveCheckpoint((prev) => (prev + 1) % terrain.checkpoints.length);
              audioEngine.playSuspensionThud();
            }
          }
        }

        // Camera Dynamics
        const pos = controllerRef.current.position;
        const yaw = controllerRef.current.yaw;
        const speed = state.speed;

        if (cameraMode === 'chase') {
          // Dynamic chase camera with speed pullback
          const fwdX = Math.sin(yaw);
          const fwdZ = Math.cos(yaw);
          const chaseDist = 6.8 + Math.min(3.5, Math.abs(speed) / 25);
          const chaseH = 2.4 + Math.min(1.0, Math.abs(speed) / 35);

          const targetCamX = pos.x - fwdX * chaseDist;
          const targetCamY = pos.y + chaseH;
          const targetCamZ = pos.z - fwdZ * chaseDist;

          currentCamPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
          currentCamTarget.lerp(new THREE.Vector3(pos.x + fwdX * 2, pos.y + 1.2, pos.z + fwdZ * 2), 0.15);

          camera.position.copy(currentCamPos);
          camera.lookAt(currentCamTarget);
        } else if (cameraMode === 'hood') {
          // Cockpit / Hood Camera
          const fwdX = Math.sin(yaw);
          const fwdZ = Math.cos(yaw);
          camera.position.set(pos.x + fwdX * 0.8, pos.y + 1.45, pos.z + fwdZ * 0.8);
          camera.lookAt(pos.x + fwdX * 15, pos.y + 1.2, pos.z + fwdZ * 15);
        } else {
          // Free Orbit Camera
          const orbitTime = clock.getElapsedTime() * 0.4;
          const orbitR = 8.5;
          camera.position.set(pos.x + Math.sin(orbitTime) * orbitR, pos.y + 3.0, pos.z + Math.cos(orbitTime) * orbitR);
          camera.lookAt(pos.x, pos.y + 1.0, pos.z);
        }

        // Keep sunlight following vehicle for sharp shadow fidelity
        sunLight.position.set(pos.x + 50, pos.y + 80, pos.z + 60);
        sunLight.target.position.set(pos.x, pos.y, pos.z);
        sunLight.target.updateMatrixWorld();
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(animationFrameId);
      terrain.dispose();
      renderer.dispose();
    };
  }, []);

  // Hot-swap vehicle rig without reloading the terrain or resetting the game
  useEffect(() => {
    if (!sceneRef.current || !controllerRef.current) return;
    const scene = sceneRef.current;

    // Remove old rig
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
    }

    // Build new rig
    const newRig = buildVehicleRig(currentBlueprint);
    rigRef.current = newRig;
    scene.add(newRig.root);

    // Update controller
    controllerRef.current.setRig(newRig);
  }, [currentBlueprint]);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* 3D Simulation Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top Header & HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl px-4 py-2.5 pointer-events-auto flex items-center gap-3 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-zinc-100 tracking-wider uppercase">
                RIDGE RUNNERS
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono uppercase">
                {currentBlueprint.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span>Checkpoint: {activeCheckpoint + 1} / 9</span>
              <span>•</span>
              <span className="text-emerald-400">Terrain Ground Clearance: {currentBlueprint.proportions.groundClearance}m</span>
            </div>
          </div>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowVehicleDrawer(!showVehicleDrawer)}
            className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 px-3 py-2 rounded-lg text-xs font-mono text-zinc-300 transition-colors shadow-lg"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Switch Rig</span>
          </button>

          <button
            onClick={() => setCameraMode((m) => (m === 'chase' ? 'hood' : m === 'hood' ? 'orbit' : 'chase'))}
            className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 px-3 py-2 rounded-lg text-xs font-mono text-zinc-300 transition-colors shadow-lg"
            title="Switch camera view (Key: C)"
          >
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span className="uppercase">{cameraMode} Cam</span>
          </button>

          <button
            onClick={() => setIsMuted(audioEngine.toggleMute())}
            className="bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 p-2 rounded-lg text-zinc-300 transition-colors shadow-lg"
            title="Mute / Unmute Audio (Key: M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={onOpenStudio}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-heading font-bold px-3.5 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-lg shadow-amber-500/20"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>3D Studio & Builder</span>
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Dashboard (Bottom Left) */}
      <div className="absolute bottom-5 left-5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-3.5 w-64 text-zinc-100 z-10 shadow-2xl">
        {/* Speedometer & Gear */}
        <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2 mb-2.5">
          <div>
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">TRAIL SPEED</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-heading font-bold text-zinc-100 tabular-nums">
                {Math.abs(telemetry.speed)}
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">KM/H</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">GEAR</span>
            <span className="text-2xl font-heading font-bold text-emerald-400">
              {telemetry.speed < -1 ? 'R' : telemetry.gear}
            </span>
          </div>
        </div>

        {/* Tachometer RPM Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
            <span>ENGINE RPM</span>
            <span className="text-zinc-300 tabular-nums">{telemetry.rpm}</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                telemetry.rpm > 5000 ? 'bg-red-500' : telemetry.rpm > 3500 ? 'bg-amber-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (telemetry.rpm / 6000) * 100)}%` }}
            />
          </div>
        </div>

        {/* 4-Wheel Suspension Travel Articulation Bars */}
        <div className="mb-2">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
            4-WHEEL SUSPENSION ARTICULATION
          </span>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {(['FL', 'FR', 'RL', 'RR'] as const).map((label, idx) => {
              const comp = telemetry.suspensionCompressions[idx];
              return (
                <div key={label} className="bg-zinc-950/70 p-1 rounded border border-zinc-800/80">
                  <span className="text-[9px] font-mono text-zinc-500 block">{label}</span>
                  <div className="w-full bg-zinc-800 h-8 rounded-sm overflow-hidden flex flex-col justify-end mt-1">
                    <div
                      className="bg-amber-500 w-full transition-all duration-75"
                      style={{ height: `${Math.round(comp * 100)}%` }}
                    />
                  </div>
                  <span className="text-[8px] font-mono text-zinc-400 block mt-0.5">
                    {Math.round(comp * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inclinometer: Pitch & Roll */}
        <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-400 border-t border-zinc-800/80">
          <span>Pitch: {telemetry.pitch > 0 ? '+' : ''}{telemetry.pitch.toFixed(1)}°</span>
          <span>Roll: {telemetry.roll > 0 ? '+' : ''}{telemetry.roll.toFixed(1)}°</span>
        </div>
      </div>

      {/* Driving Controls Legend & Reset Helper (Bottom Right) */}
      <div className="absolute bottom-5 right-5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-3 text-zinc-300 font-mono text-[11px] z-10 shadow-xl flex flex-col gap-1.5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-zinc-400 text-[10px]">
          <span>CONTROLS</span>
          <button
            onClick={() => controllerRef.current?.resetPosition(0, 0)}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Car [R]</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">W</kbd> / <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">▲</kbd> Accelerate</span>
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">S</kbd> / <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">▼</kbd> Reverse</span>
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">A</kbd> / <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">◄</kbd> Steer Left</span>
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">D</kbd> / <kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">►</kbd> Steer Right</span>
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">SPACE</kbd> Handbrake</span>
          <span><kbd className="bg-zinc-800 px-1 py-0.5 rounded text-zinc-200">C</kbd> Change Cam</span>
        </div>
      </div>

      {/* Floating Vehicle Switcher Drawer */}
      {showVehicleDrawer && (
        <div className="absolute top-18 right-5 w-72 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl p-3 shadow-2xl z-20 animate-fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <span className="text-xs font-mono font-bold text-zinc-200 uppercase">SELECT VEHICLE RIG</span>
            <button
              onClick={() => setShowVehicleDrawer(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {PRESET_VEHICLES.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectVehicle(p.blueprint);
                  setShowVehicleDrawer(false);
                }}
                className={`text-left p-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                  currentBlueprint.name === p.name
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-950/70 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="truncate">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-[10px] opacity-75 font-normal">{p.badge}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
