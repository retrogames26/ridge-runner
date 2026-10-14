import React, { useState } from 'react';
import { CameraAngle, UploadedImage, VehicleBlueprint } from '../types/vehicle';
import { PRESET_VEHICLES } from '../lib/presetData';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Info,
  Car,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface ImageUploadWorkflowProps {
  onVehicleGenerated: (blueprint: VehicleBlueprint) => void;
  onOpenPipelineModal: () => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
}

const VIEW_SLOTS: { angle: CameraAngle; label: string; desc: string }[] = [
  { angle: 'front', label: 'Front View', desc: 'Grille, headlights, bumper, winch, approach angle' },
  { angle: 'left', label: 'Left Side Profile', desc: 'Wheelbase, door cutouts, rocker panels, ground clearance' },
  { angle: 'right', label: 'Right Side Profile', desc: 'Snorkel, fender arches, exhaust, silhouette' },
  { angle: 'rear', label: 'Rear View', desc: 'Tailgate, spare tire mount, rear bumper, taillights' },
  { angle: 'three_quarter_front', label: 'Front 3/4 View', desc: 'Fender flare depth, hood rakes, stance width' },
  { angle: 'three_quarter_rear', label: 'Rear 3/4 View', desc: 'Bed/wagon greenhouse taper, rear departure angle' },
  { angle: 'roof', label: 'Roof / Overhead', desc: 'Roof rack, lightbars, cargo boxes, spare wheel' },
  { angle: 'interior', label: 'Interior / Cage', desc: 'Roll cage, seats, dash structure' },
];

export const ImageUploadWorkflow: React.FC<ImageUploadWorkflowProps> = ({
  onVehicleGenerated,
  onOpenPipelineModal,
  isGenerating,
  setIsGenerating,
}) => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [vehicleName, setVehicleName] = useState<string>('Custom Expedition 4x4');
  const [userDirectives, setUserDirectives] = useState<string>('');
  const [genStep, setGenStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload handler
  const handleFileUpload = (angle: CameraAngle, label: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImages((prev) => {
        const filtered = prev.filter((img) => img.angle !== angle);
        return [
          ...filtered,
          {
            id: Math.random().toString(36).substring(7),
            angle,
            label,
            dataUrl,
            name: file.name,
            fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          },
        ];
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove specific uploaded image
  const removeImage = (angle: CameraAngle) => {
    setImages((prev) => prev.filter((img) => img.angle !== angle));
  };

  // Load Preset multi-view package
  const loadPreset = (presetId: string) => {
    const preset = PRESET_VEHICLES.find((p) => p.id === presetId);
    if (!preset) return;

    setVehicleName(preset.name);
    setUserDirectives(preset.description);

    const presetImages: UploadedImage[] = preset.referenceImages.map((ref, idx) => ({
      id: `preset_${presetId}_${idx}`,
      angle: ref.angle,
      label: ref.label,
      dataUrl: ref.svgData,
      name: `${preset.name} - ${ref.angle}.svg`,
      fileSize: 'Vector Ref',
    }));

    setImages(presetImages);
  };

  // Start Generation
  const handleGenerate = async () => {
    if (images.length === 0) {
      setErrorMsg('Please upload or select at least 1 vehicle reference view.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setGenStep('Aggregating multi-view reference perspectives...');

    try {
      await new Promise((r) => setTimeout(r, 600));
      setGenStep('Running Gemini 3.8 Flash multimodal structural analysis...');

      const payload = {
        images: images.map((img) => ({
          data: img.dataUrl,
          angle: img.angle,
          mimeType: img.dataUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/jpeg',
        })),
        vehicleName,
        userNotes: userDirectives,
      };

      const res = await fetch('/api/analyze-vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      setGenStep('Synthesizing low-poly geometry & rigging decoupled wheel hubs...');
      await new Promise((r) => setTimeout(r, 500));

      const data = await res.json();
      const blueprint: VehicleBlueprint = data.blueprint;

      setGenStep('Calibrating terrain alignment & suspension spring dampers...');
      await new Promise((r) => setTimeout(r, 400));

      onVehicleGenerated(blueprint);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMsg(`Generation notice: ${err.message}. A fallback low-poly rig will be loaded.`);
      // Load default preset if API failed
      const fallback = PRESET_VEHICLES[0].blueprint;
      onVehicleGenerated(fallback);
    } finally {
      setIsGenerating(false);
      setGenStep('');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 text-zinc-100 font-sans">
      {/* Title & Pipeline Diagnostics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono uppercase tracking-wider font-semibold">
              RIDGE RUNNERS RIG STUDIO
            </span>
            <span className="text-zinc-500 text-xs font-mono">v2.4 Neural Asset Pipeline</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-zinc-100 tracking-wide">
            IMAGE-TO-3D LOW-POLY VEHICLE BUILDER
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl font-sans">
            Upload multiple orthogonal & perspective angles of the same vehicle. Our pipeline analyzes all views
            simultaneously to generate clean, game-ready 3D low-poly geometry with decoupled wheels, suspension mounts,
            and terrain physics.
          </p>
        </div>

        <button
          onClick={onOpenPipelineModal}
          className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 px-3.5 py-2.5 rounded-lg text-xs font-mono text-zinc-300 transition-colors shrink-0 shadow-lg"
        >
          <Info className="w-4 h-4 text-amber-400" />
          <span>Pipeline & Outbound Bridge</span>
        </button>
      </div>

      {/* Preset Fast-Loader Section */}
      <div className="mb-6 bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            Quick-Load Reference Sets (Multi-View Photo Packages)
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">Click to test instant synthesis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_VEHICLES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset.id)}
              className="text-left bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 p-3 rounded-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-amber-400 px-1 py-0.5 bg-amber-500/10 rounded">
                  {preset.badge}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">{preset.referenceImages.length} Views</span>
              </div>
              <h4 className="font-heading font-semibold text-xs text-zinc-200 group-hover:text-white truncate">
                {preset.name}
              </h4>
              <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Info Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Vehicle Project Name</label>
          <input
            type="text"
            value={vehicleName}
            onChange={(e) => setVehicleName(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            placeholder="e.g. Defender 110 Trophy Rig"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
            Distinctive Features / Custom Directives (Optional)
          </label>
          <input
            type="text"
            value={userDirectives}
            onChange={(e) => setUserDirectives(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            placeholder="e.g. High clearance, beadlock mud tires, A-pillar snorkel, roof cargo basket, front winch"
          />
        </div>
      </div>

      {/* Multi-View Upload Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            Upload Vehicle Reference Views ({images.length} / {VIEW_SLOTS.length} Loaded)
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            All views are correlated into the same unified 3D vehicle
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {VIEW_SLOTS.map((slot) => {
            const existing = images.find((img) => img.angle === slot.angle);
            return (
              <div
                key={slot.angle}
                className={`relative rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                  existing
                    ? 'bg-zinc-900/90 border-amber-500/40 shadow-sm'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-heading font-semibold text-zinc-200">{slot.label}</span>
                    {existing ? (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> OK
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-zinc-500">Empty</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mb-2 font-mono">{slot.desc}</p>
                </div>

                {existing ? (
                  <div className="relative group/preview mt-1 rounded-lg overflow-hidden border border-zinc-700 aspect-video bg-zinc-950 flex items-center justify-center">
                    <img src={existing.dataUrl} alt={existing.label} className="w-full h-full object-contain p-1" />
                    <button
                      onClick={() => removeImage(slot.angle)}
                      className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-500 text-white p-1 rounded-md opacity-0 group-hover/preview:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex flex-col items-center justify-center border border-dashed border-zinc-700 hover:border-amber-400/60 rounded-lg aspect-video cursor-pointer bg-zinc-900/40 hover:bg-zinc-900 transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500 mb-1" />
                    <span className="text-[10px] text-zinc-400 font-mono">Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(slot.angle, slot.label, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-4 bg-red-950/80 border border-red-500/40 text-red-200 px-4 py-2.5 rounded-lg text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generator Trigger Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-semibold text-zinc-200 uppercase">
              {isGenerating ? 'Synthesizing Vehicle...' : 'Ready to Build Low-Poly Mesh'}
            </h4>
            <p className="text-[11px] text-zinc-400">
              {isGenerating
                ? genStep
                : `${images.length} views prepared. Synthesizes manifold body, suspension mounts, and decoupled wheels.`}
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || images.length === 0}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-heading font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing & Building...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Generate 3D Low-Poly Model</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
