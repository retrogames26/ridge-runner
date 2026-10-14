import React, { useState, useEffect } from 'react';
import {
  Github,
  GitBranch,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  ExternalLink,
  Lock,
  Globe,
  FileCode,
  Box,
  Play,
  RotateCw,
  X,
  Copy,
  Check,
  Send,
  Sparkles,
  Layers
} from 'lucide-react';
import { VehicleBlueprint } from '../types/vehicle';
import { buildVehicleRig, exportVehicleToGLB } from '../lib/vehicleMeshBuilder';

interface GitHubRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBlueprint: VehicleBlueprint;
  onLoadBlueprint?: (blueprint: VehicleBlueprint) => void;
}

interface RepoInfo {
  fullName: string;
  name: string;
  owner: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string;
  htmlUrl: string;
  hasWriteAccess: boolean;
}

export const GitHubRepoModal: React.FC<GitHubRepoModalProps> = ({
  isOpen,
  onClose,
  currentBlueprint,
  onLoadBlueprint,
}) => {
  const [repoInput, setRepoInput] = useState<string>(() => {
    return localStorage.getItem('rr_github_repo') || 'outbouund';
  });
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('rr_github_token') || '';
  });
  const [targetBranch, setTargetBranch] = useState<string>('main');

  const [activeTab, setActiveTab] = useState<'connect' | 'commit' | 'pipeline' | 'browse'>('connect');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Commit status
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitFormat, setCommitFormat] = useState<'both' | 'glb' | 'json'>('both');
  const [commitResult, setCommitResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);

  // Dispatch workflow status
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [workflowEventType, setWorkflowEventType] = useState<string>('ridge_runners_generate_3d');

  // Browse files
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Auto-verify if repo was saved
  useEffect(() => {
    if (isOpen && repoInput && !repoInfo && !isVerifying) {
      handleVerifyRepo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerifyRepo = async () => {
    if (!repoInput.trim()) {
      setVerifyError('Please enter a repository name or URL');
      return;
    }
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch('/api/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoInput: repoInput.trim(),
          token: githubToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to verify repository (HTTP ${res.status})`);
      }

      setRepoInfo(data.repo);
      setTargetBranch(data.repo.defaultBranch || 'main');
      localStorage.setItem('rr_github_repo', repoInput.trim());
      if (githubToken) {
        localStorage.setItem('rr_github_token', githubToken.trim());
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Could not connect to GitHub repository');
      setRepoInfo(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCommitAsset = async () => {
    if (!repoInfo) {
      setCommitResult({ success: false, message: 'Please connect and verify repository first.' });
      return;
    }

    setIsCommitting(true);
    setCommitResult(null);

    try {
      const vehicleSlug = currentBlueprint.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      let committedUrls: string[] = [];

      // 1. Commit JSON Blueprint
      if (commitFormat === 'json' || commitFormat === 'both') {
        const jsonString = JSON.stringify(currentBlueprint, null, 2);
        const jsonBase64 = btoa(unescape(encodeURIComponent(jsonString)));
        const filePath = `assets/vehicles/${vehicleSlug}.json`;

        const resJson = await fetch('/api/github/commit-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoInput: repoInfo.fullName,
            token: githubToken.trim(),
            branch: targetBranch,
            filePath,
            contentBase64: jsonBase64,
            commitMessage: `feat(vehicles): sync 3D blueprint for ${currentBlueprint.name} [${timestamp}]`,
          }),
        });
        const dataJson = await resJson.json();
        if (!resJson.ok || !dataJson.success) {
          throw new Error(dataJson.message || `Failed to commit ${filePath}`);
        }
        if (dataJson.commit?.htmlUrl) committedUrls.push(dataJson.commit.htmlUrl);
      }

      // 2. Commit GLB 3D Model
      if (commitFormat === 'glb' || commitFormat === 'both') {
        const rig = buildVehicleRig(currentBlueprint);
        const glbBlob = await exportVehicleToGLB(rig);
        
        // Convert Blob to Base64
        const arrayBuffer = await glbBlob.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const glbBase64 = btoa(binary);
        const filePath = `assets/models/${vehicleSlug}.glb`;

        const resGlb = await fetch('/api/github/commit-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoInput: repoInfo.fullName,
            token: githubToken.trim(),
            branch: targetBranch,
            filePath,
            contentBase64: glbBase64,
            commitMessage: `feat(models): export low-poly 3D GLB for ${currentBlueprint.name}`,
          }),
        });
        const dataGlb = await resGlb.json();
        if (!resGlb.ok || !dataGlb.success) {
          throw new Error(dataGlb.message || `Failed to commit ${filePath}`);
        }
        if (dataGlb.commit?.htmlUrl) committedUrls.push(dataGlb.commit.htmlUrl);
      }

      setCommitResult({
        success: true,
        message: `Successfully pushed ${commitFormat.toUpperCase()} asset(s) to ${repoInfo.fullName} on branch ${targetBranch}!`,
        url: committedUrls[0] || repoInfo.htmlUrl,
      });
    } catch (err: any) {
      setCommitResult({
        success: false,
        message: err.message || 'Failed to commit asset to GitHub repository.',
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDispatchPipeline = async () => {
    if (!repoInfo) {
      setDispatchResult({ success: false, message: 'Please connect to repository first.' });
      return;
    }
    if (!githubToken.trim()) {
      setDispatchResult({ success: false, message: 'GitHub token with "repo" or "workflow" scope is required to trigger Actions.' });
      return;
    }

    setIsDispatching(true);
    setDispatchResult(null);

    try {
      const res = await fetch('/api/github/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoInput: repoInfo.fullName,
          token: githubToken.trim(),
          eventType: workflowEventType,
          clientPayload: {
            vehicleName: currentBlueprint.name,
            archetype: currentBlueprint.archetype,
            proportions: currentBlueprint.proportions,
            triggeredAt: new Date().toISOString(),
            source: 'Ridge Runners AI Studio Studio Bridge',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Workflow dispatch failed.');
      }

      setDispatchResult({
        success: true,
        message: data.message || `Dispatched event '${workflowEventType}' to GitHub Actions!`,
      });
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Error sending repository dispatch event.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleListFiles = async (dirPath: string = 'assets') => {
    if (!repoInfo) return;
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/github/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoInput: repoInfo.fullName,
          token: githubToken.trim() || undefined,
          path: dirPath,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setRepoFiles(data.files);
      } else {
        setRepoFiles([]);
      }
    } catch (err) {
      setRepoFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-zinc-100 uppercase tracking-wide">
                  GitHub Outbound Bridge
                </h2>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">
                  outbouund
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Sync 3D assets, commits & CI/CD generation pipelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900 px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('connect')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            Repository Config
          </button>

          <button
            onClick={() => setActiveTab('commit')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'commit'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Push 3D Assets
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'pipeline'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Actions Dispatch
          </button>

          <button
            onClick={() => {
              setActiveTab('browse');
              handleListFiles();
            }}
            className={`pb-2.5 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'browse'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Browse Files
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: CONNECT */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                <label className="block text-xs font-mono font-medium text-zinc-300">
                  Target GitHub Repository
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={repoInput}
                      onChange={(e) => setRepoInput(e.target.value)}
                      placeholder="e.g. outbouund or username/outbouund or ridge-runners"
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleVerifyRepo}
                    disabled={isVerifying}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    {isVerifying ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderGit2 className="w-3.5 h-3.5" />
                    )}
                    Verify Repo
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                  <span>Quick Presets:</span>
                  <button
                    onClick={() => {
                      setRepoInput('outbouund');
                    }}
                    className="text-amber-400 underline hover:text-amber-300 font-mono"
                  >
                    outbouund
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setRepoInput('ridge-runners');
                    }}
                    className="text-amber-400 underline hover:text-amber-300 font-mono"
                  >
                    ridge-runners
                  </button>
                </div>
              </div>

              {/* Personal Access Token input */}
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-zinc-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    GitHub Personal Access Token (PAT)
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Required for private repos, commits, & dispatch
                  </span>
                </div>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (stored in browser session)"
                  className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-zinc-400">
                  Needs <code className="text-amber-300 bg-zinc-800 px-1 py-0.5 rounded">repo</code> or <code className="text-amber-300 bg-zinc-800 px-1 py-0.5 rounded">workflow</code> scopes to commit models and dispatch CI/CD.
                </p>
              </div>

              {/* Verified Repo Badge */}
              {repoInfo && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        Repository Connected
                      </span>
                    </div>
                    <a
                      href={repoInfo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                    >
                      View on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">Repository</div>
                      <div className="font-bold text-zinc-200 truncate">{repoInfo.name}</div>
                    </div>
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">Owner</div>
                      <div className="font-bold text-zinc-200 truncate">{repoInfo.owner}</div>
                    </div>
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">Default Branch</div>
                      <div className="font-bold text-zinc-200 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-amber-400" />
                        {repoInfo.defaultBranch}
                      </div>
                    </div>
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">Visibility</div>
                      <div className="font-bold text-zinc-200 flex items-center gap-1">
                        {repoInfo.isPrivate ? (
                          <><Lock className="w-3 h-3 text-amber-400" /> Private</>
                        ) : (
                          <><Globe className="w-3 h-3 text-emerald-400" /> Public</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {verifyError && (
                <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Connection Error</div>
                    <div>{verifyError}</div>
                  </div>
                </div>
              )}

              {/* Git CLI instructions */}
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-zinc-300">
                    CLI Integration Commands
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `git remote add outbouund https://github.com/${repoInfo?.fullName || repoInput}.git`,
                        'cli_remote'
                      )
                    }
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    {copiedText === 'cli_remote' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy remote cmd
                  </button>
                </div>
                <pre className="bg-zinc-900 p-2.5 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800">
                  git remote add outbouund https://github.com/{repoInfo?.fullName || repoInput}.git
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: PUSH 3D ASSETS */}
          {activeTab === 'commit' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-zinc-300">Active Vehicle Asset</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    {currentBlueprint.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">Archetype</div>
                    <div className="font-bold text-zinc-200 capitalize">{currentBlueprint.archetype.replace('_', ' ')}</div>
                  </div>
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase">Target Branch</div>
                    <input
                      type="text"
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 mt-0.5 text-xs text-amber-300 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-mono text-zinc-400">Export Format Payload:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setCommitFormat('both')}
                      className={`p-2.5 rounded-lg border text-center transition-colors ${
                        commitFormat === 'both'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      GLB + Blueprint
                      <div className="text-[9px] text-zinc-500">Full 3D & Schema</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommitFormat('glb')}
                      className={`p-2.5 rounded-lg border text-center transition-colors ${
                        commitFormat === 'glb'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      GLB Binary Only
                      <div className="text-[9px] text-zinc-500">.glb 3D mesh</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommitFormat('json')}
                      className={`p-2.5 rounded-lg border text-center transition-colors ${
                        commitFormat === 'json'
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      JSON Blueprint
                      <div className="text-[9px] text-zinc-500">Config Schema</div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCommitAsset}
                  disabled={isCommitting || !repoInfo}
                  className="w-full mt-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/10"
                >
                  {isCommitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Committing 3D Model to GitHub...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Commit & Push Assets to Repository
                    </>
                  )}
                </button>
              </div>

              {commitResult && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    commitResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {commitResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {commitResult.success ? 'Commit Succeeded' : 'Commit Failed'}
                  </div>
                  <div>{commitResult.message}</div>
                  {commitResult.url && (
                    <a
                      href={commitResult.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 underline pt-1"
                    >
                      View Commit on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTIONS DISPATCH */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-mono font-bold text-zinc-200 uppercase">
                    Trigger GitHub Actions 3D Pipeline
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Send a <code className="text-amber-300 bg-zinc-900 px-1 py-0.5 rounded font-mono">repository_dispatch</code> event to run automated mesh baking, LOD generation, or physics rigs on GitHub runners.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-zinc-400">Event Type:</label>
                  <input
                    type="text"
                    value={workflowEventType}
                    onChange={(e) => setWorkflowEventType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1">
                  <div className="text-zinc-500 uppercase text-[10px]">Payload Transmitted:</div>
                  <pre className="text-amber-400/90 whitespace-pre-wrap">
                    {JSON.stringify(
                      {
                        vehicleName: currentBlueprint.name,
                        archetype: currentBlueprint.archetype,
                        wheelbase: currentBlueprint.proportions.wheelbase,
                        groundClearance: currentBlueprint.proportions.groundClearance,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <button
                  onClick={handleDispatchPipeline}
                  disabled={isDispatching || !repoInfo}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  {isDispatching ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Dispatching to GitHub Actions...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Trigger Workflow Dispatch
                    </>
                  )}
                </button>
              </div>

              {dispatchResult && (
                <div
                  className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
                    dispatchResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {dispatchResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    {dispatchResult.success ? 'Workflow Triggered' : 'Dispatch Failed'}
                  </div>
                  <div>{dispatchResult.message}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BROWSE FILES */}
          {activeTab === 'browse' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-zinc-300">
                    Repository Assets Browser
                  </span>
                  <button
                    onClick={() => handleListFiles('assets')}
                    disabled={isLoadingFiles || !repoInfo}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {!repoInfo ? (
                  <div className="text-xs text-zinc-500 font-mono py-4 text-center">
                    Please connect a repository first in the 'Repository Config' tab.
                  </div>
                ) : isLoadingFiles ? (
                  <div className="text-xs text-amber-400 font-mono py-4 text-center flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Scanning repository for vehicle models & blueprints...
                  </div>
                ) : repoFiles.length === 0 ? (
                  <div className="text-xs text-zinc-500 font-mono py-6 text-center space-y-1">
                    <div>No files in <code className="text-zinc-400">assets/</code> yet.</div>
                    <div className="text-[11px] text-zinc-600">
                      Use the "Push 3D Assets" tab to commit your first Ridge Runners vehicle!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {repoFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {file.name.endsWith('.glb') ? (
                            <Box className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                          )}
                          <span className="text-zinc-200 truncate">{file.name}</span>
                          <span className="text-[10px] text-zinc-500">{file.type}</span>
                        </div>
                        <a
                          href={file.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-white flex items-center gap-1 text-[11px] shrink-0"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Ridge Runners 3D Studio Bridge</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
