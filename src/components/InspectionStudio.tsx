import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { VehicleBlueprint } from '../types/vehicle';
import { buildVehicleRig, exportVehicleToGLB, VehicleRig } from '../lib/vehicleMeshBuilder';
import {
  Download,
  RotateCcw,
  Sparkles,
  Eye,
  Sliders,
  Maximize2,
  Play,
  Sun,
  Layers,
  ChevronDown,
  ChevronUp,
  Activity,
  CheckCircle2
} from 'lucide-react';

interface InspectionStudioProps {
  blueprint: VehicleBlueprint;
  onUpdateBlueprint: (updated: VehicleBlueprint) => void;
  onStartDrive: () => void;
  onOpenPipelineModal: () => void;
}

export const InspectionStudio: React.FC<InspectionStudioProps> = ({
  blueprint,
  onUpdateBlueprint,
  onStartDrive,
  onOpenPipelineModal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rigRef = useRef<VehicleRig | null>(null);

  // Studio UI states
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [explodedVal, setExplodedVal] = useState<number>(0);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'sunset' | 'night'>('studio');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'inspect' | 'tune' | 'refine'>('inspect');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Live tuning offsets
  const [rideHeightOffset, setRideHeightOffset] = useState<number>(0);
  const [tireScale, setTireScale] = useState<number>(1.0);

  // Build & Rebuild Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0d10');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 2.2, 5.0);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8ed, 2.2);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-6, 3, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 1.2);
    rimLight.position.set(0, 4, -7);
    scene.add(rimLight);

    // Contact Ground Shadow & Grid
    const gridHelper = new THREE.GridHelper(20, 40, 0x3f3f46, 0x18181b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const shadowPlaneGeom = new THREE.PlaneGeometry(8, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeom, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005;
    scene.add(shadowPlane);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Do not go underground
    controls.minDistance = 2.0;
    controls.maxDistance = 14.0;
    controls.target.set(0, 0.9, 0);
    controlsRef.current = controls;

    // Instantiate Vehicle Rig
    const rig = buildVehicleRig(blueprint);
    rigRef.current = rig;
    scene.add(rig.root);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
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
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
    };
  }, [blueprint]);

  // Handle Wireframe Toggle
  useEffect(() => {
    if (!rigRef.current) return;
    rigRef.current.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if ('wireframe' in m) (m as any).wireframe = wireframe;
          });
        } else if (mesh.material && 'wireframe' in mesh.material) {
          (mesh.material as any).wireframe = wireframe;
        }
      }
    });
  }, [wireframe]);

  // Handle Exploded View separation
  useEffect(() => {
    if (!rigRef.current) return;
    const rig = rigRef.current;
    const factor = explodedVal; // 0 to 1

    // Body elevates upwards
    rig.bodyGroup.position.y = (rig.dimensions.tireRadius + rig.dimensions.groundClearance * 0.65) + factor * 0.8;
    // Chassis drops downwards
    rig.chassisGroup.position.y = (rig.dimensions.tireRadius + rig.dimensions.groundClearance * 0.65 - 0.12) - factor * 0.4;

    // Wheels extend outwards along track width
    const track = rig.dimensions.trackWidth;
    const base = rig.dimensions.wheelbase;
    const xSpread = factor * 0.55;

    rig.wheelFL.position.x = -track / 2 - xSpread;
    rig.wheelFR.position.x = track / 2 + xSpread;
    rig.wheelRL.position.x = -track / 2 - xSpread;
    rig.wheelRR.position.x = track / 2 + xSpread;
  }, [explodedVal]);

  // Handle Camera Presets
  const setCameraPreset = (view: 'iso' | 'front' | 'side' | 'rear' | 'top' | 'stance') => {
    if (!controlsRef.current) return;
    const camera = controlsRef.current.object as THREE.PerspectiveCamera;
    const target = controlsRef.current.target;
    target.set(0, 0.9, 0);

    switch (view) {
      case 'iso':
        camera.position.set(4.5, 2.2, 5.0);
        break;
      case 'front':
        camera.position.set(0, 1.2, 6.0);
        break;
      case 'side':
        camera.position.set(-6.2, 1.2, 0);
        break;
      case 'rear':
        camera.position.set(0, 1.4, -6.0);
        break;
      case 'top':
        camera.position.set(0, 7.5, 0.1);
        break;
      case 'stance':
        camera.position.set(3.8, 0.35, 3.8);
        break;
    }
    controlsRef.current.update();
  };

  // Export GLB file
  const handleExportGLB = async () => {
    if (!rigRef.current) return;
    setIsExporting(true);
    try {
      const blob = await exportVehicleToGLB(rigRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprint.name.toLowerCase().replace(/\s+/g, '_')}_game_ready.glb`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice('Exported game-ready .GLB with separated wheels and suspension mounts!');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportNotice(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // AI Refine Prompt
  const handleRefine = async () => {
    if (!refinePrompt.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch('/api/refine-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentBlueprint: blueprint,
          userPrompt: refinePrompt,
        }),
      });
      const data = await res.json();
      if (data.blueprint) {
        onUpdateBlueprint(data.blueprint);
        setRefinePrompt('');
        setExportNotice('Model refined and re-synthesized according to instructions!');
        setTimeout(() => setExportNotice(null), 4000);
      }
    } catch (err: any) {
      console.error('Refinement failed:', err);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden select-none">
      {/* 3D Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header & Spec Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg px-4 py-2.5 pointer-events-auto flex items-center gap-3 shadow-xl">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm tracking-wider text-zinc-100 uppercase">
                {blueprint.name}
              </span>
              <span className="text-[10px] bg-zinc-800 text-amber-400 px-1.5 py-0.5 rounded font-mono uppercase">
                {blueprint.archetype.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              L: {blueprint.proportions.length}m | W: {blueprint.proportions.width}m | Clearance: {blueprint.proportions.groundClearance}m | Rigged 4x4
            </p>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onOpenPipelineModal}
            className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md border border-zinc-700/80 px-3 py-2 rounded-lg text-xs font-mono text-zinc-300 transition-colors shadow-lg"
            title="Inspect 3D generation backend pipeline and outbound bridge"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Pipeline Status</span>
          </button>

          <button
            onClick={handleExportGLB}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-zinc-900/90 hover:bg-zinc-800 backdrop-blur-md border border-zinc-700/80 px-3.5 py-2 rounded-lg text-xs font-mono font-medium text-emerald-400 transition-colors shadow-lg"
            title="Export standard GLB asset with separated wheels and suspension mounts"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export .GLB'}</span>
          </button>

          <button
            onClick={onStartDrive}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-heading font-bold px-4 py-2 rounded-lg text-xs tracking-wider uppercase transition-colors shadow-lg shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Drive in Ridge Runners</span>
          </button>
        </div>
      </div>

      {/* Floating Notice / Toast */}
      {exportNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-2 rounded-lg text-xs font-mono flex items-center gap-2 shadow-2xl z-20 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Camera Quick View Pills (Floating Top Center-Left) */}
      <div className="absolute top-20 left-4 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-lg p-1.5 flex flex-col gap-1 z-10">
        <span className="text-[9px] uppercase font-mono text-zinc-500 px-1.5 py-0.5">Camera Angle</span>
        {(['iso', 'front', 'side', 'rear', 'top', 'stance'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setCameraPreset(view)}
            className="px-2 py-1 text-[11px] font-mono text-left text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors uppercase"
          >
            {view}
          </button>
        ))}
      </div>

      {/* Collapsible Unified Bottom Control Dock (Compliant with Three.js Skill layout) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-[840px] z-20 transition-transform duration-300 ${
          isDockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Button */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700/80 px-3 py-1 rounded-t-md text-[11px] font-mono text-zinc-300 flex items-center gap-1 shadow-lg"
          >
            {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isDockCollapsed ? 'Show Studio Dock' : 'Hide Controls (Zen Mode)'}</span>
          </button>
        </div>

        {/* Dock Content Panel */}
        <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/90 rounded-xl p-3 shadow-2xl">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('inspect')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeTab === 'inspect'
                    ? 'bg-zinc-800 text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D Inspect</span>
              </button>
              <button
                onClick={() => setActiveTab('tune')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeTab === 'tune'
                    ? 'bg-zinc-800 text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Dimensions & Stance</span>
              </button>
              <button
                onClick={() => setActiveTab('refine')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeTab === 'refine'
                    ? 'bg-zinc-800 text-amber-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Refine & Directives</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  wireframe ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-zinc-700 text-zinc-400'
                }`}
              >
                Wireframe
              </button>
            </div>
          </div>

          {/* TAB 1: INSPECTION & EXPLODED VIEW */}
          {activeTab === 'inspect' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    Exploded Assembly Slider
                  </span>
                  <span className="text-amber-400">{Math.round(explodedVal * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={explodedVal}
                  onChange={(e) => setExplodedVal(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  Separates body, ladder chassis, and 4 wheel hubs to inspect internal mechanical geometry.
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-xs font-mono text-zinc-400 mb-1">Vehicle Summary</span>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {blueprint.summary}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DIMENSIONS & STANCE TUNING */}
          {activeTab === 'tune' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">WHEELBASE</span>
                <span className="text-zinc-200 font-bold">{blueprint.proportions.wheelbase} m</span>
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">TRACK WIDTH</span>
                <span className="text-zinc-200 font-bold">{blueprint.proportions.trackWidth} m</span>
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">GROUND CLEARANCE</span>
                <span className="text-emerald-400 font-bold">{blueprint.proportions.groundClearance} m</span>
              </div>
              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">TIRE RADIUS</span>
                <span className="text-zinc-200 font-bold">{blueprint.wheels.tireRadius} m</span>
              </div>
            </div>
          )}

          {/* TAB 3: AI REFINEMENT & PROMPT */}
          {activeTab === 'refine' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 'Widen wheel arches by 15%, add an A-pillar snorkel and change color to olive green'"
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleRefine}
                  disabled={isRefining || !refinePrompt.trim()}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{isRefining ? 'Synthesizing...' : 'Refine'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Increase ground clearance by 10%',
                  'Make tires chunkier with deep mud lugs',
                  'Add tubular stinger bumper with winch',
                  'Install full overland roof cargo rack',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRefinePrompt(s)}
                    className="text-[10px] font-mono bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
