import React, { useState } from 'react';
import { VehicleBlueprint } from './types/vehicle';
import { PRESET_VEHICLES } from './lib/presetData';
import { ImageUploadWorkflow } from './components/ImageUploadWorkflow';
import { InspectionStudio } from './components/InspectionStudio';
import { RidgeRunnersGame } from './components/RidgeRunnersGame';
import { PipelineDiagnosticsModal } from './components/PipelineDiagnosticsModal';
import { GitHubRepoModal } from './components/GitHubRepoModal';
import {
  UploadCloud,
  Box,
  Gamepad2,
  Activity,
  Github,
  GitBranch
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'studio' | 'drive'>('upload');
  const [currentBlueprint, setCurrentBlueprint] = useState<VehicleBlueprint>(PRESET_VEHICLES[0].blueprint);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);

  // When a vehicle is synthesized or updated
  const handleVehicleGenerated = (newBlueprint: VehicleBlueprint) => {
    setCurrentBlueprint(newBlueprint);
    setActiveTab('studio');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="h-14 bg-zinc-950/90 border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-heading font-bold text-base">
            RR
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm tracking-wider text-zinc-100 uppercase">
                RIDGE RUNNERS
              </span>
              <span className="hidden sm:inline-block text-[10px] bg-zinc-800 text-amber-400 px-1.5 py-0.5 rounded font-mono uppercase">
                IMAGE-TO-3D BUILDER
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline">
              Active Rig: <span className="text-zinc-300">{currentBlueprint.name}</span>
            </span>
          </div>
        </div>

        {/* Workflow Mode Tabs */}
        <nav className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1. Upload & Analyze</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'studio'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2. 3D Inspection Studio</span>
            <span className="sm:hidden">Inspect</span>
          </button>

          <button
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
              activeTab === 'drive'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3. Drive Game</span>
            <span className="sm:hidden">Drive</span>
          </button>
        </nav>

        {/* GitHub outbouund & Pipeline Links */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGitHubModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-mono bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white px-3 py-1.5 rounded-lg transition-colors shadow"
            title="Connect your outbouund GitHub repository for asset sync, commits, and CI/CD pipelines"
          >
            <Github className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">outbouund</span>
            <span className="text-[10px] bg-amber-500/10 text-amber-300 px-1 rounded hidden lg:inline">Connect</span>
          </button>

          <button
            onClick={() => setIsPipelineModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-amber-400 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
            title="Inspect 3D generation backend pipeline and outbound bridge"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Pipeline Status</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'upload' && (
          <div className="w-full h-full overflow-y-auto">
            <ImageUploadWorkflow
              onVehicleGenerated={handleVehicleGenerated}
              onOpenPipelineModal={() => setIsPipelineModalOpen(true)}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </div>
        )}

        {activeTab === 'studio' && (
          <InspectionStudio
            blueprint={currentBlueprint}
            onUpdateBlueprint={setCurrentBlueprint}
            onStartDrive={() => setActiveTab('drive')}
            onOpenPipelineModal={() => setIsPipelineModalOpen(true)}
          />
        )}

        {activeTab === 'drive' && (
          <RidgeRunnersGame
            currentBlueprint={currentBlueprint}
            onOpenStudio={() => setActiveTab('studio')}
            onSelectVehicle={setCurrentBlueprint}
            onOpenPipelineModal={() => setIsPipelineModalOpen(true)}
          />
        )}
      </main>

      {/* GitHub outbouund Repository Connection Modal */}
      <GitHubRepoModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        currentBlueprint={currentBlueprint}
        onLoadBlueprint={(bp) => {
          setCurrentBlueprint(bp);
          setActiveTab('studio');
        }}
      />

      {/* Pipeline Diagnostics & Outbound Bridge Modal */}
      <PipelineDiagnosticsModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
      />
    </div>
  );
}
