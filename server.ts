import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for multiple uploaded vehicle reference images (base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client (server-side only)
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Status & Pipeline Diagnostics endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash',
    pipeline: {
      activeEngine: 'Gemini Multimodal Blueprint & Parametric Low-Poly Generator',
      outboundBridgeReady: true,
      supportedViews: ['front', 'rear', 'left', 'right', 'three_quarter_front', 'three_quarter_rear', 'roof', 'interior'],
      exportFormats: ['GLB', 'glTF 2.0', 'JSON Blueprint'],
      physicsIntegration: 'Ridge Runners 4x4 Raycast Suspension Rig',
    },
  });
});

// External pipeline / outbound webhook test endpoint
app.post('/api/external-pipeline-test', async (req, res) => {
  const { webhookUrl, apiKey: extApiKey } = req.body;
  if (!webhookUrl) {
    return res.status(400).json({
      success: false,
      message: 'No webhook URL provided for outbound 3D generation pipeline.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const pingRes = await fetch(webhookUrl, {
      method: 'GET',
      headers: extApiKey ? { Authorization: `Bearer ${extApiKey}` } : {},
      signal: controller.signal,
    }).catch(err => {
      throw new Error(`Connection to outbound pipeline failed: ${err.message}`);
    });
    clearTimeout(timeout);

    res.json({
      success: pingRes.ok,
      status: pingRes.status,
      message: pingRes.ok
        ? 'Successfully connected to outbound 3D pipeline service.'
        : `Pipeline responded with HTTP status ${pingRes.status}.`,
    });
  } catch (error: any) {
    res.status(502).json({
      success: false,
      message: error.message || 'Failed to connect to external 3D generation service.',
    });
  }
});

// Helper to normalize GitHub repo input (e.g., "owner/repo" or "https://github.com/owner/repo" or "repo")
function parseRepoString(input: string): { owner: string; repo: string } {
  let cleaned = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return { owner: '', repo: parts[0] };
}

// GitHub API: Verify Repository Access
app.post('/api/github/verify', async (req, res) => {
  const { repoInput, token } = req.body;
  if (!repoInput) {
    return res.status(400).json({ success: false, message: 'Please provide a repository name or URL.' });
  }

  let { owner, repo } = parseRepoString(repoInput);

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'RidgeRunners-3D-Studio',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  }

  try {
    // If owner was omitted, fetch authenticated user
    if (!owner && token) {
      const userRes = await fetch('https://api.github.com/user', { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        owner = userData.login;
      }
    }

    if (!owner) {
      return res.status(400).json({
        success: false,
        message: 'Could not determine repository owner. Please format as "owner/repo" (e.g. your-username/outbouund).',
      });
    }

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      const errData = await repoRes.json().catch(() => ({}));
      return res.status(repoRes.status).json({
        success: false,
        message: errData.message || `GitHub returned HTTP ${repoRes.status}. Check repository name and token permissions.`,
      });
    }

    const repoData = await repoRes.json();
    res.json({
      success: true,
      repo: {
        fullName: repoData.full_name,
        name: repoData.name,
        owner: repoData.owner?.login,
        defaultBranch: repoData.default_branch || 'main',
        isPrivate: repoData.private,
        description: repoData.description,
        htmlUrl: repoData.html_url,
        hasWriteAccess: repoData.permissions?.push ?? true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GitHub API: Commit Asset File (GLB or Blueprint JSON)
app.post('/api/github/commit-asset', async (req, res) => {
  const { repoInput, token, branch, filePath, contentBase64, commitMessage } = req.body;
  if (!repoInput || !token || !filePath || !contentBase64) {
    return res.status(400).json({ success: false, message: 'Missing required commit parameters.' });
  }

  let { owner, repo } = parseRepoString(repoInput);
  const targetBranch = branch || 'main';

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token.trim()}`,
    'User-Agent': 'RidgeRunners-3D-Studio',
  };

  try {
    // Check if file already exists to get SHA
    let existingSha: string | undefined;
    const checkRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`,
      { headers }
    );
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      existingSha = checkData.sha;
    }

    // Put file contents
    const putPayload: any = {
      message: commitMessage || `Add 3D vehicle asset: ${filePath}`,
      content: contentBase64,
      branch: targetBranch,
    };
    if (existingSha) {
      putPayload.sha = existingSha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(putPayload),
      }
    );

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({
        success: false,
        message: errData.message || `Failed to commit to ${filePath} (HTTP ${putRes.status}).`,
      });
    }

    const commitData = await putRes.json();
    res.json({
      success: true,
      commit: {
        sha: commitData.commit?.sha,
        htmlUrl: commitData.commit?.html_url || commitData.content?.html_url,
        path: filePath,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GitHub API: Trigger repository_dispatch event for GitHub Actions pipeline
app.post('/api/github/dispatch', async (req, res) => {
  const { repoInput, token, eventType, clientPayload } = req.body;
  if (!repoInput || !token) {
    return res.status(400).json({ success: false, message: 'Missing repo or token.' });
  }

  const { owner, repo } = parseRepoString(repoInput);
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token.trim()}`,
    'User-Agent': 'RidgeRunners-3D-Studio',
    'Content-Type': 'application/json',
  };

  try {
    const dispatchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType || 'ridge_runners_generate_3d',
        client_payload: clientPayload || {},
      }),
    });

    if (dispatchRes.status === 204 || dispatchRes.ok) {
      res.json({
        success: true,
        message: `Dispatched '${eventType || 'ridge_runners_generate_3d'}' workflow to ${owner}/${repo}!`,
      });
    } else {
      const err = await dispatchRes.json().catch(() => ({}));
      res.status(dispatchRes.status).json({
        success: false,
        message: err.message || `Dispatch failed with HTTP ${dispatchRes.status}`,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GitHub API: List Files in Repo Directory
app.post('/api/github/list-files', async (req, res) => {
  const { repoInput, token, path: dirPath } = req.body;
  const { owner, repo } = parseRepoString(repoInput || '');
  if (!owner || !repo) {
    return res.status(400).json({ success: false, message: 'Invalid repo name.' });
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'RidgeRunners-3D-Studio',
  };
  if (token) headers['Authorization'] = `Bearer ${token.trim()}`;

  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath || ''}`,
      { headers }
    );
    if (!listRes.ok) {
      return res.status(listRes.status).json({ success: false, files: [] });
    }
    const files = await listRes.json();
    res.json({ success: true, files: Array.isArray(files) ? files : [files] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Vehicle Multi-View Image Analysis & Blueprint Generation
app.post('/api/analyze-vehicle', async (req, res) => {
  try {
    const { images, vehicleName, userNotes } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one reference image.' });
    }

    if (!aiClient) {
      // Fallback mock/procedural estimation if no API key is present
      return res.json({
        blueprint: getDefaultBlueprint(vehicleName || 'Custom 4x4 Scout'),
        source: 'procedural-default',
        note: 'Gemini API key not configured; using high-fidelity procedural 4x4 blueprint.',
      });
    }

    // Prepare image parts for Gemini 3.8 Flash
    const contents: any[] = [];
    const imageParts: any[] = [];

    images.forEach((img: { data: string; mimeType?: string; angle?: string }, idx: number) => {
      let base64 = img.data;
      if (base64.includes(';base64,')) {
        base64 = base64.split(';base64,')[1];
      }
      imageParts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: base64,
        },
      });
      imageParts.push({
        text: `[Camera View: ${img.angle || `Reference View ${idx + 1}`}]`,
      });
    });

    const promptText = `
You are a senior 3D automotive modeler and technical vehicle architect for the low-poly off-road game "Ridge Runners".
Analyze all the provided reference images of this vehicle together.
Crucially: Do not treat the images as separate disconnected views or flat decals. Synthesize the complete 3D form, silhouette, proportion, and distinctive off-road hardware of this specific vehicle into an exact low-poly blueprint schema.

Vehicle Name or Style Target: ${vehicleName || 'Off-Road Vehicle'}
User Specific Directives: ${userNotes || 'Accurately preserve unique silhouette, ground clearance, wheel arches, roof equipment, bumper, and light cluster shapes.'}

Extract and determine the detailed low-poly geometry blueprint with strict realism for game physics:
- archetype: One of ["heavy_truck", "classic_suv", "baja_runner", "rock_crawler", "overland_camper", "scout_4x4", "military_utility"]
- body: length (3.8 to 5.4m), width (1.8 to 2.4m), height (1.6 to 2.6m), groundClearance (0.28 to 0.55m), wheelbase (2.2 to 3.4m), trackWidth (1.6 to 2.2m)
- cabStyle: One of ["pickup_single_cab", "pickup_double_cab", "suv_wagon", "suv_short_wheelbase", "open_cage_buggy", "camper_troopy"]
- hoodShape: slope (0.05 to 0.35), scoop (true/false), powerBulge (true/false)
- frontFascia:
  - grilleStyle: One of ["slotted_vertical", "mesh_honeycomb", "horizontal_bars", "minimal_armor", "retro_square"]
  - headlightStyle: One of ["round_classic", "rectangular_modern", "split_led_bars", "quad_projector"]
  - bullBar: One of ["none", "tubular_low", "heavy_duty_winch_guard", "stinger_crawler"]
  - winch: boolean
- wheelArches:
  - style: One of ["cutout_flared", "box_fender", "tubular_rock", "pocket_riveted"]
  - flareWidth: number (0.05 to 0.25)
- roofAccessories:
  - rack: One of ["none", "basket_rack", "expedition_tray", "safari_tubular"]
  - roofSpotlights: One of ["none", "led_lightbar", "quad_round_pods", "twin_side_amber"]
  - snorkel: boolean
  - spareTireMounted: One of ["none", "rear_door", "roof_basket", "bed_slanted"]
- wheels:
  - tireRadius: number (0.42 to 0.65m)
  - tireWidth: number (0.28 to 0.45m)
  - rimStyle: One of ["beadlock_8hole", "military_steelie", "sport_5spoke", "heavy_duty_split"]
  - rimDiameterRatio: number (0.45 to 0.60)
  - deepTreadLugs: boolean
- materials:
  - primaryBodyColor: hex code string (e.g. "#4a5848")
  - secondaryTrimColor: hex code string (e.g. "#22252a")
  - rimColor: hex code string (e.g. "#1f1f22" or "#d0954b")
  - glassColor: hex code string (e.g. "#1e293b")
  - roughBody: number between 0.2 and 0.85
  - metalBody: number between 0.05 and 0.8
- suspensionRig:
  - springStiffness: number (22000 to 45000)
  - suspensionTravel: number (0.25 to 0.50m)
  - dampingFactor: number (2000 to 4500)
- notes: Brief 2-sentence summary of why these parameters match the uploaded vehicle views.
`;

    contents.push(...imageParts);
    contents.push({ text: promptText });

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            archetype: { type: Type.STRING },
            summary: { type: Type.STRING },
            proportions: {
              type: Type.OBJECT,
              properties: {
                length: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER },
                groundClearance: { type: Type.NUMBER },
                wheelbase: { type: Type.NUMBER },
                trackWidth: { type: Type.NUMBER },
                approachAngle: { type: Type.NUMBER },
                departureAngle: { type: Type.NUMBER },
              },
              required: ['length', 'width', 'height', 'groundClearance', 'wheelbase', 'trackWidth'],
            },
            cabStyle: { type: Type.STRING },
            hood: {
              type: Type.OBJECT,
              properties: {
                slope: { type: Type.NUMBER },
                scoop: { type: Type.BOOLEAN },
                powerBulge: { type: Type.BOOLEAN },
              },
              required: ['slope', 'scoop', 'powerBulge'],
            },
            frontFascia: {
              type: Type.OBJECT,
              properties: {
                grilleStyle: { type: Type.STRING },
                headlightStyle: { type: Type.STRING },
                bullBar: { type: Type.STRING },
                winch: { type: Type.BOOLEAN },
              },
              required: ['grilleStyle', 'headlightStyle', 'bullBar', 'winch'],
            },
            wheelArches: {
              type: Type.OBJECT,
              properties: {
                style: { type: Type.STRING },
                flareWidth: { type: Type.NUMBER },
              },
              required: ['style', 'flareWidth'],
            },
            roofEquipment: {
              type: Type.OBJECT,
              properties: {
                rack: { type: Type.STRING },
                roofSpotlights: { type: Type.STRING },
                snorkel: { type: Type.BOOLEAN },
                spareTireMounted: { type: Type.STRING },
              },
              required: ['rack', 'roofSpotlights', 'snorkel', 'spareTireMounted'],
            },
            wheels: {
              type: Type.OBJECT,
              properties: {
                tireRadius: { type: Type.NUMBER },
                tireWidth: { type: Type.NUMBER },
                rimStyle: { type: Type.STRING },
                rimDiameterRatio: { type: Type.NUMBER },
                deepTreadLugs: { type: Type.BOOLEAN },
              },
              required: ['tireRadius', 'tireWidth', 'rimStyle', 'rimDiameterRatio', 'deepTreadLugs'],
            },
            materials: {
              type: Type.OBJECT,
              properties: {
                primaryBodyColor: { type: Type.STRING },
                secondaryTrimColor: { type: Type.STRING },
                rimColor: { type: Type.STRING },
                glassColor: { type: Type.STRING },
                roughBody: { type: Type.NUMBER },
                metalBody: { type: Type.NUMBER },
              },
              required: ['primaryBodyColor', 'secondaryTrimColor', 'rimColor', 'glassColor'],
            },
            suspensionRig: {
              type: Type.OBJECT,
              properties: {
                springStiffness: { type: Type.NUMBER },
                suspensionTravel: { type: Type.NUMBER },
                dampingFactor: { type: Type.NUMBER },
              },
              required: ['springStiffness', 'suspensionTravel', 'dampingFactor'],
            },
          },
          required: ['name', 'archetype', 'proportions', 'cabStyle', 'frontFascia', 'roofEquipment', 'wheels', 'materials'],
        },
      },
    });

    const parsedBlueprint = JSON.parse(response.text || '{}');
    res.json({
      blueprint: parsedBlueprint,
      source: 'gemini-3.8-flash-vision',
      model: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Vehicle analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze vehicle images with Gemini.',
      details: error.message,
      fallbackBlueprint: getDefaultBlueprint('Custom 4x4 Rig'),
    });
  }
});

// Refine Blueprint endpoint
app.post('/api/refine-blueprint', async (req, res) => {
  try {
    const { currentBlueprint, userPrompt } = req.body;
    if (!aiClient) {
      return res.json({
        blueprint: currentBlueprint,
        message: 'Gemini client not initialized; returning modified blueprint.',
      });
    }

    const prompt = `
You are refining the 3D vehicle blueprint for Ridge Runners.
Current Blueprint JSON:
${JSON.stringify(currentBlueprint, null, 2)}

User's refinement request:
"${userPrompt}"

Update the vehicle blueprint parameters according to this request while keeping all required fields intact and physically harmonious.
Return the updated JSON conforming to the same vehicle blueprint format.
`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const refined = JSON.parse(response.text || '{}');
    res.json({ blueprint: refined, source: 'gemini-3.8-flash-refinement' });
  } catch (err: any) {
    console.error('Refinement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback high-fidelity blueprint generator
function getDefaultBlueprint(name: string) {
  return {
    name: name || 'Ridge Defender 110 Rig',
    archetype: 'overland_camper',
    summary: 'Rugged heavy-duty overland rig featuring expedition roof rack, modular box arches, and beadlock terrain tires.',
    proportions: {
      length: 4.65,
      width: 2.05,
      height: 2.15,
      groundClearance: 0.42,
      wheelbase: 2.85,
      trackWidth: 1.82,
      approachAngle: 45,
      departureAngle: 42,
    },
    cabStyle: 'suv_wagon',
    hood: {
      slope: 0.18,
      scoop: false,
      powerBulge: true,
    },
    frontFascia: {
      grilleStyle: 'horizontal_bars',
      headlightStyle: 'round_classic',
      bullBar: 'tubular_low',
      winch: true,
    },
    wheelArches: {
      style: 'box_fender',
      flareWidth: 0.14,
    },
    roofEquipment: {
      rack: 'expedition_tray',
      roofSpotlights: 'led_lightbar',
      snorkel: true,
      spareTireMounted: 'rear_door',
    },
    wheels: {
      tireRadius: 0.52,
      tireWidth: 0.34,
      rimStyle: 'beadlock_8hole',
      rimDiameterRatio: 0.52,
      deepTreadLugs: true,
    },
    materials: {
      primaryBodyColor: '#3d483b', // Military Olive / Forest Drab
      secondaryTrimColor: '#1c1e21',
      rimColor: '#18191c',
      glassColor: '#182430',
      roughBody: 0.45,
      metalBody: 0.25,
    },
    suspensionRig: {
      springStiffness: 32000,
      suspensionTravel: 0.38,
      dampingFactor: 3200,
    },
  };
}

// Serve Vite in development or static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ridge Runners Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
