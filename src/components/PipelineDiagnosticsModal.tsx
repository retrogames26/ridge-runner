import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  Send,
  Code2,
  Link,
  Check,
  GitBranch,
  Github,
  Terminal,
  Copy,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface PipelineDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PipelineDiagnosticsModal: React.FC<PipelineDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'git_connect' | 'pipeline' | 'architecture'>('git_connect');
  const [gitRepoUrl, setGitRepoUrl] = useState<string>('https://github.com/your-username/outbouund.git');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://api.outbouund.dev/v1/generate-3d');
  const [extApiKey, setExtApiKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedGitCmd, setCopiedGitCmd] = useState<string | null>(null);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  if (!isOpen) return null;

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/external-pipeline-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, apiKey: extApiKey }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed to outbound server.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGitCmd(id);
    setTimeout(() => setCopiedGitCmd(null), 2500);
  };

  const sampleSchema = `{
  "name": "Custom 4x4 Rig",
  "archetype": "overland_camper",
  "proportions": {
    "length": 4.75, "width": 2.05, "height": 2.18,
    "groundClearance": 0.44, "wheelbase": 2.85, "trackWidth": 1.82
  },
  "wheels": {
    "tireRadius": 0.52, "tireWidth": 0.35, "rimStyle": "beadlock_8hole", "deepTreadLugs": true
  },
  "suspensionRig": { "springStiffness": 34000, "suspensionTravel": 0.38, "dampingFactor": 3400 }
}`;

  const gitPushCommand = `git init
git remote add origin ${gitRepoUrl}
git add .
git commit -m "Integrate Ridge Runners image-to-3D vehicle builder"
git branch -M main
git push -u origin main`;

  const gitBranchCommand = `git init
git remote add origin ${gitRepoUrl}
git fetch origin
git checkout -b feature/3d-builder
git add .
git commit -m "Add Ridge Runners 3D vehicle builder & driving engine"
git push -u origin feature/3d-builder`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-zinc-100 uppercase tracking-wide">
                Connect Existing Repo & 3D Pipeline
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                How to connect your existing 'outbouund' repo instead of creating a new one
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-800 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('git_connect')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors ${
              activeTab === 'git_connect'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>1. Connect Existing GitHub Repo</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors ${
              activeTab === 'pipeline'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>2. Outbound 3D API / Webhook</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono border-b-2 transition-colors ${
              activeTab === 'architecture'
                ? 'border-amber-400 text-amber-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>3. Pipeline Architecture</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-zinc-300 font-sans">
          {/* TAB 1: CONNECT TO EXISTING REPO */}
          {activeTab === 'git_connect' && (
            <div className="space-y-4">
              {/* Method A: Direct Git Push to your existing repo */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-semibold text-xs text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    Option A: Push This Applet Directly Into Your Existing Repo
                  </h3>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  You can connect this working applet directly to your existing GitHub repository (<code className="text-zinc-300 bg-zinc-800 px-1 py-0.5 rounded">outbouund</code>) by setting your git remote:
                </p>

                {/* Git URL input */}
                <div className="mb-3">
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                    Your GitHub Repo URL
                  </label>
                  <input
                    type="text"
                    value={gitRepoUrl}
                    onChange={(e) => setGitRepoUrl(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Terminal Commands Block */}
                <div className="bg-black/80 rounded-lg p-3 border border-zinc-800 font-mono text-[11px] text-zinc-300 relative group">
                  <button
                    onClick={() => copyToClipboard(gitPushCommand, 'push_main')}
                    className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copiedGitCmd === 'push_main' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedGitCmd === 'push_main' ? 'Copied!' : 'Copy Commands'}</span>
                  </button>
                  <pre className="overflow-x-auto whitespace-pre leading-relaxed text-amber-300/90">
                    {gitPushCommand}
                  </pre>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Want to push to a separate feature branch instead of main?</span>
                  <button
                    onClick={() => copyToClipboard(gitBranchCommand, 'push_branch')}
                    className="text-amber-400 hover:text-amber-300 font-mono text-[11px] flex items-center gap-1 font-semibold"
                  >
                    {copiedGitCmd === 'push_branch' ? <Check className="w-3 h-3" /> : <GitBranch className="w-3 h-3" />}
                    <span>{copiedGitCmd === 'push_branch' ? 'Copied Branch Commands!' : 'Copy Feature Branch Command'}</span>
                  </button>
                </div>
              </div>

              {/* Method B: AI Studio Native GitHub Import */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <h3 className="font-heading font-semibold text-xs text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Github className="w-4 h-4 text-emerald-400" />
                  Option B: AI Studio "Import From GitHub"
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  If you want AI Studio to directly load your repository at the start of a session:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-zinc-300 mt-2 space-y-1.5 font-mono">
                  <li>From the AI Studio home / dashboard, choose <strong className="text-zinc-100">"Import from GitHub"</strong>.</li>
                  <li>Paste your existing repository URL (<code className="text-amber-400">https://github.com/your-username/outbouund</code>).</li>
                  <li>AI Studio will clone your existing repository directly into the container workspace without generating an empty project!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: OUTBOUND WEBHOOK & 3D PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4">
                <h4 className="font-heading font-semibold text-xs text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-amber-400" />
                  Connect Outbound 3D Asset Pipeline Service
                </h4>
                <p className="text-[11px] text-zinc-400 mb-3">
                  If your <code className="bg-zinc-800 px-1 py-0.5 rounded text-amber-300">outbouund</code> repo runs an external service (e.g. FastAPI / Flask / Node backend running Blender or a neural mesh model), configure the endpoint here:
                </p>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                      Outbound Webhook / Service URL
                    </label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.outbouund.dev/v1/generate-3d or http://localhost:8000"
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
                      Bearer Token / API Key (Optional)
                    </label>
                    <input
                      type="password"
                      value={extApiKey}
                      onChange={(e) => setExtApiKey(e.target.value)}
                      placeholder="Optional authentication token"
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={testConnection}
                      disabled={isTesting}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 px-4 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3 h-3 text-amber-400" />
                      <span>{isTesting ? 'Testing Connection...' : 'Test Webhook'}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(sampleSchema);
                        setCopiedSchema(true);
                        setTimeout(() => setCopiedSchema(false), 2000);
                      }}
                      className="text-zinc-400 hover:text-zinc-200 text-xs font-mono flex items-center gap-1"
                    >
                      {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code2 className="w-3.5 h-3.5" />}
                      <span>{copiedSchema ? 'Copied Blueprint Schema!' : 'Copy Payload Schema'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                        testResult.success
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold">{testResult.success ? 'Connected: ' : 'Status: '}</span>
                        <span>{testResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PIPELINE ARCHITECTURE */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-zinc-950/70 border border-emerald-500/30 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Built-in Active Engine
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                      ONLINE
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-zinc-100">
                    Gemini 3.8 Flash Vision + Parametric Rig Engine
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Processes all uploaded orthogonal & perspective images concurrently, extracts 3D geometry topology,
                    and synthesizes clean manifold low-poly hierarchy with decoupled wheel hubs and spring dampers.
                  </p>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      External Outbound Bridge
                    </span>
                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                      READY
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-zinc-100">
                    outbouund / External 3D Pipeline
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Connect your external 3D neural generation runner (e.g. Hunyuan3D-2, Tripo3D, Meshy, or headless Blender).
                    Ridge Runners can forward uploaded images or JSON blueprints to your webhook.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-heading font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
