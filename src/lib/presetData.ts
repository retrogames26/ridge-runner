import { PresetVehicle } from '../types/vehicle';

// Helper to create clean multi-view reference SVG data URLs
function createRefSvg(view: string, title: string, color: string, features: string[]): string {
  const featSvg = features
    .map((f, i) => `<text x="20" y="${230 + i * 22}" fill="#a1a1aa" font-size="12" font-family="monospace">▸ ${f}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320" viewBox="0 0 400 320">
    <rect width="100%" height="100%" fill="#18181b"/>
    <defs>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#27272a" stroke-width="1"/>
      </pattern>
      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}" />
        <stop offset="100%" stop-color="#121215" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
    <!-- View Badge -->
    <rect x="20" y="20" width="140" height="26" rx="4" fill="#27272a" stroke="#3f3f46" />
    <text x="90" y="37" fill="#e4e4e7" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">${view.toUpperCase()}</text>
    
    <!-- Vehicle Silhouette Representation -->
    <g transform="translate(40, 60)">
      ${getViewIllustration(view, color)}
    </g>

    <!-- Technical spec overlay -->
    <rect x="15" y="210" width="370" height="95" rx="6" fill="#121214" stroke="#27272a" opacity="0.9"/>
    <text x="25" y="225" fill="#e4e4e7" font-size="11" font-family="sans-serif" font-weight="bold">${title.toUpperCase()} SPEC</text>
    ${featSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getViewIllustration(view: string, color: string): string {
  if (view.includes('front')) {
    return `
      <!-- Front View Body -->
      <rect x="50" y="40" width="220" height="70" rx="8" fill="url(#bodyGrad)" stroke="#52525b" stroke-width="2"/>
      <polygon points="75,40 100,5 220,5 245,40" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <!-- Windshield -->
      <polygon points="85,38 105,10 215,10 235,38" fill="#38bdf8" opacity="0.3"/>
      <!-- Headlights -->
      <circle cx="75" cy="70" r="14" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <circle cx="245" cy="70" r="14" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <!-- Grille -->
      <rect x="105" y="58" width="110" height="26" rx="4" fill="#09090b" stroke="#3f3f46"/>
      <line x1="125" y1="58" x2="125" y2="84" stroke="#71717a" stroke-width="3"/>
      <line x1="145" y1="58" x2="145" y2="84" stroke="#71717a" stroke-width="3"/>
      <line x1="160" y1="58" x2="160" y2="84" stroke="#71717a" stroke-width="3"/>
      <line x1="175" y1="58" x2="175" y2="84" stroke="#71717a" stroke-width="3"/>
      <line x1="195" y1="58" x2="195" y2="84" stroke="#71717a" stroke-width="3"/>
      <!-- Front Heavy Bumper & Winch -->
      <rect x="35" y="100" width="250" height="22" rx="4" fill="#18181b" stroke="#eab308" stroke-width="2"/>
      <rect x="140" y="102" width="40" height="18" fill="#dc2626" rx="2"/>
      <!-- Tires -->
      <rect x="30" y="70" width="25" height="60" rx="6" fill="#09090b" stroke="#27272a" stroke-width="2"/>
      <rect x="265" y="70" width="25" height="60" rx="6" fill="#09090b" stroke="#27272a" stroke-width="2"/>
      <!-- Roof Lightbar -->
      <rect x="90" y="-3" width="140" height="8" rx="2" fill="#38bdf8" stroke="#0284c7"/>
    `;
  } else if (view.includes('side') || view.includes('left') || view.includes('right')) {
    return `
      <!-- Side Profile -->
      <path d="M 10 75 L 60 70 L 100 30 L 220 30 L 270 50 L 275 80 L 10 80 Z" fill="url(#bodyGrad)" stroke="#52525b" stroke-width="2"/>
      <!-- Side Glass Greenhouse -->
      <polygon points="105,34 165,34 165,65 75,65" fill="#38bdf8" opacity="0.3"/>
      <polygon points="172,34 220,34 250,55 172,65" fill="#38bdf8" opacity="0.3"/>
      <!-- Flared Wheel Arches -->
      <path d="M 40 80 A 28 28 0 0 1 96 80" fill="none" stroke="#eab308" stroke-width="4"/>
      <path d="M 200 80 A 28 28 0 0 1 256 80" fill="none" stroke="#eab308" stroke-width="4"/>
      <!-- Large Offroad Wheels -->
      <circle cx="68" cy="82" r="26" fill="#09090b" stroke="#27272a" stroke-width="3"/>
      <circle cx="68" cy="82" r="14" fill="#27272a" stroke="#71717a" stroke-width="2"/>
      <circle cx="228" cy="82" r="26" fill="#09090b" stroke="#27272a" stroke-width="3"/>
      <circle cx="228" cy="82" r="14" fill="#27272a" stroke="#71717a" stroke-width="2"/>
      <!-- Snorkel -->
      <path d="M 96 70 L 98 25 L 85 20" fill="none" stroke="#09090b" stroke-width="5"/>
      <!-- Roof Rack Tray -->
      <rect x="95" y="20" width="135" height="8" fill="#18181b" stroke="#52525b" stroke-width="2"/>
    `;
  } else if (view.includes('rear')) {
    return `
      <!-- Rear View -->
      <rect x="50" y="40" width="220" height="70" rx="8" fill="url(#bodyGrad)" stroke="#52525b" stroke-width="2"/>
      <polygon points="75,40 100,5 220,5 245,40" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <polygon points="85,38 105,10 215,10 235,38" fill="#38bdf8" opacity="0.3"/>
      <!-- Taillights -->
      <rect x="55" y="60" width="15" height="35" rx="3" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
      <rect x="250" y="60" width="15" height="35" rx="3" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
      <!-- Mounted Rear Spare Tire -->
      <circle cx="160" cy="70" r="26" fill="#09090b" stroke="#eab308" stroke-width="3"/>
      <circle cx="160" cy="70" r="13" fill="#27272a" stroke="#71717a"/>
      <!-- Dual Recovery Hooks -->
      <circle cx="80" cy="118" r="5" fill="none" stroke="#ef4444" stroke-width="3"/>
      <circle cx="240" cy="118" r="5" fill="none" stroke="#ef4444" stroke-width="3"/>
    `;
  } else if (view.includes('roof')) {
    return `
      <!-- Roof Top-Down View -->
      <rect x="70" y="10" width="180" height="120" rx="16" fill="url(#bodyGrad)" stroke="#52525b" stroke-width="2"/>
      <rect x="90" y="30" width="140" height="80" rx="6" fill="#18181b" stroke="#eab308" stroke-width="2"/>
      <line x1="115" y1="30" x2="115" y2="110" stroke="#52525b" stroke-width="2"/>
      <line x1="140" y1="30" x2="140" y2="110" stroke="#52525b" stroke-width="2"/>
      <line x1="165" y1="30" x2="165" y2="110" stroke="#52525b" stroke-width="2"/>
      <line x1="190" y1="30" x2="190" y2="110" stroke="#52525b" stroke-width="2"/>
      <!-- Cargo Boxes -->
      <rect x="95" y="40" width="35" height="30" fill="#047857" rx="3"/>
      <rect x="140" y="45" width="40" height="25" fill="#b45309" rx="3"/>
    `;
  } else {
    // 3/4 Perspective
    return `
      <polygon points="20,80 80,45 220,40 280,65 240,105 50,110" fill="url(#bodyGrad)" stroke="#52525b" stroke-width="2"/>
      <polygon points="80,45 110,18 200,15 220,40" fill="#38bdf8" opacity="0.35"/>
      <circle cx="65" cy="100" r="22" fill="#09090b" stroke="#eab308" stroke-width="3"/>
      <circle cx="215" cy="95" r="22" fill="#09090b" stroke="#eab308" stroke-width="3"/>
      <polygon points="220,65 270,68 260,95 210,90" fill="#27272a"/>
    `;
  }
}

export const PRESET_VEHICLES: PresetVehicle[] = [
  {
    id: 'defender_110_overland',
    name: 'Ridge Defender 110 Expedition',
    archetype: 'overland_camper',
    badge: 'EXPEDITION RIG',
    description: 'Iconic British off-roader with continuous high beltline, expedition roof rack, rear spare tire, snorkel, and heavy-duty approach angle.',
    blueprint: {
      name: 'Ridge Defender 110 Expedition',
      archetype: 'overland_camper',
      summary: 'Boxy all-terrain wagon with safari roof rack, A-pillar snorkel, beadlock rims, and rear door mounted spare.',
      proportions: {
        length: 4.75,
        width: 2.05,
        height: 2.18,
        groundClearance: 0.44,
        wheelbase: 2.85,
        trackWidth: 1.82,
        approachAngle: 48,
        departureAngle: 43,
      },
      cabStyle: 'suv_wagon',
      hood: {
        slope: 0.16,
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
        flareWidth: 0.15,
      },
      roofEquipment: {
        rack: 'expedition_tray',
        roofSpotlights: 'led_lightbar',
        snorkel: true,
        spareTireMounted: 'rear_door',
      },
      wheels: {
        tireRadius: 0.52,
        tireWidth: 0.35,
        rimStyle: 'beadlock_8hole',
        rimDiameterRatio: 0.52,
        deepTreadLugs: true,
      },
      materials: {
        primaryBodyColor: '#394634', // Forest Olive
        secondaryTrimColor: '#18191c',
        rimColor: '#121316',
        glassColor: '#1a2430',
        roughBody: 0.45,
        metalBody: 0.25,
      },
      suspensionRig: {
        springStiffness: 34000,
        suspensionTravel: 0.38,
        dampingFactor: 3400,
      },
    },
    referenceImages: [
      { angle: 'front', label: 'Front Orthogonal', svgData: createRefSvg('front', 'Front Fascia', '#394634', ['Round Heritage Headlamps', 'Tubular Steel Winch Bumper', 'Low-profile Hood Bulge']) },
      { angle: 'left', label: 'Left Side Profile', svgData: createRefSvg('left', 'Side Profile', '#394634', ['110" Wheelbase Proportion', 'A-Pillar Snorkel Intakes', 'High Clearance Rock Sliders']) },
      { angle: 'three_quarter_front', label: 'Front 3/4 Perspective', svgData: createRefSvg('three_quarter_front', 'Front 3/4', '#394634', ['Boxy Fender Flare Geometry', 'Beadlock Mud Terrain Wheels', 'Roof Tray Mounts']) },
      { angle: 'rear', label: 'Rear Gate View', svgData: createRefSvg('rear', 'Rear Elevation', '#394634', ['Full-size 35" Door Spare', 'Vertical Protected Taillights', 'Dual Shackle Points']) },
      { angle: 'roof', label: 'Overhead Roof View', svgData: createRefSvg('roof', 'Roof Tray', '#394634', ['Full Aluminum Cargo Basket', 'Pelican Overland Storage Cases', 'Forward LED Lightbar']) },
    ],
  },
  {
    id: 'baja_trophy_runner',
    name: 'Apex Baja Trophy Runner',
    archetype: 'baja_runner',
    badge: 'DESERT RUNNER',
    description: 'High-speed desert trophy truck with ultra-wide fiberglass flared fenders, dual bed-mounted spare tires, chase light rack, and extreme suspension travel.',
    blueprint: {
      name: 'Apex Baja Trophy Runner',
      archetype: 'baja_runner',
      summary: 'Aggressive widebody desert racer engineered for high-speed dune crossings and massive suspension articulation.',
      proportions: {
        length: 5.25,
        width: 2.28,
        height: 1.98,
        groundClearance: 0.48,
        wheelbase: 3.25,
        trackWidth: 2.10,
        approachAngle: 54,
        departureAngle: 50,
      },
      cabStyle: 'pickup_double_cab',
      hood: {
        slope: 0.22,
        scoop: true,
        powerBulge: true,
      },
      frontFascia: {
        grilleStyle: 'mesh_honeycomb',
        headlightStyle: 'split_led_bars',
        bullBar: 'stinger_crawler',
        winch: true,
      },
      wheelArches: {
        style: 'cutout_flared',
        flareWidth: 0.22,
      },
      roofEquipment: {
        rack: 'none',
        roofSpotlights: 'quad_round_pods',
        snorkel: false,
        spareTireMounted: 'bed_slanted',
      },
      wheels: {
        tireRadius: 0.58,
        tireWidth: 0.42,
        rimStyle: 'sport_5spoke',
        rimDiameterRatio: 0.48,
        deepTreadLugs: true,
      },
      materials: {
        primaryBodyColor: '#d97706', // Baja Desert Ochre / Amber
        secondaryTrimColor: '#18181b',
        rimColor: '#27272a',
        glassColor: '#0f172a',
        roughBody: 0.35,
        metalBody: 0.4,
      },
      suspensionRig: {
        springStiffness: 28000,
        suspensionTravel: 0.48,
        dampingFactor: 3800,
      },
    },
    referenceImages: [
      { angle: 'front', label: 'Front Orthogonal', svgData: createRefSvg('front', 'Front Baja', '#d97706', ['Prerunner Stinger Bumper', 'Twin High-Flow Hood Scoops', 'Wide Desert Stance']) },
      { angle: 'left', label: 'Side Profile', svgData: createRefSvg('left', 'Baja Profile', '#d97706', ['37" Trophy Desert Tires', 'Long-Travel Reservoir Shocks', 'Raked Pre-runner Stance']) },
      { angle: 'three_quarter_front', label: 'Front 3/4', svgData: createRefSvg('three_quarter_front', 'Front 3/4', '#d97706', ['Massive Flared Wheel Wells', 'Tubular Chassis Roll Cage', 'Baja Pod Spotlights']) },
      { angle: 'rear', label: 'Rear Chase Bed', svgData: createRefSvg('rear', 'Rear Bed', '#d97706', ['Angled Dual Spares in Bed', 'Baja Amber Chase Lightbar', 'High-Clearance Dovetail']) },
      { angle: 'roof', label: 'Roof Top-Down', svgData: createRefSvg('roof', 'Roof Layout', '#d97706', ['Roof Spotlights Array', 'Aggressive Hood Heat Extractors', 'Exposed Rear Bed Tubes']) },
    ],
  },
  {
    id: 'rock_crawler_special',
    name: 'Vortex Rubicon Rock Crawler',
    archetype: 'rock_crawler',
    badge: 'EXTREME CRAWLER',
    description: 'Purpose-built rock crawl machine with ultra-short front/rear overhangs, open tubular exo-cage, high portal ground clearance, and beadlock crawler tires.',
    blueprint: {
      name: 'Vortex Rubicon Rock Crawler',
      archetype: 'rock_crawler',
      summary: 'Maximum articulation rock crawler with tube doors, minimal armor bumpers, exposed winch, and 40-inch sticky compound tires.',
      proportions: {
        length: 4.10,
        width: 2.15,
        height: 2.05,
        groundClearance: 0.50,
        wheelbase: 2.60,
        trackWidth: 1.95,
        approachAngle: 65,
        departureAngle: 62,
      },
      cabStyle: 'open_cage_buggy',
      hood: {
        slope: 0.15,
        scoop: false,
        powerBulge: true,
      },
      frontFascia: {
        grilleStyle: 'slotted_vertical',
        headlightStyle: 'round_classic',
        bullBar: 'heavy_duty_winch_guard',
        winch: true,
      },
      wheelArches: {
        style: 'tubular_rock',
        flareWidth: 0.12,
      },
      roofEquipment: {
        rack: 'safari_tubular',
        roofSpotlights: 'twin_side_amber',
        snorkel: false,
        spareTireMounted: 'rear_door',
      },
      wheels: {
        tireRadius: 0.60,
        tireWidth: 0.40,
        rimStyle: 'beadlock_8hole',
        rimDiameterRatio: 0.44,
        deepTreadLugs: true,
      },
      materials: {
        primaryBodyColor: '#dc2626', // Molten Trail Crimson
        secondaryTrimColor: '#09090b',
        rimColor: '#eab308', // Gold / Bronze Beadlock ring
        glassColor: '#1e293b',
        roughBody: 0.5,
        metalBody: 0.2,
      },
      suspensionRig: {
        springStiffness: 26000,
        suspensionTravel: 0.45,
        dampingFactor: 3000,
      },
    },
    referenceImages: [
      { angle: 'front', label: 'Front Angle', svgData: createRefSvg('front', 'Crawler Front', '#dc2626', ['7-Slot Classic Grille', 'Stubby High-Clearance Bumper', 'Heavy Recovery Winch']) },
      { angle: 'left', label: 'Side Profile', svgData: createRefSvg('left', 'Crawler Side', '#dc2626', ['Extreme 65° Approach Angle', '40" Super-Swamper Tires', 'Open Tubular Rock Guards']) },
      { angle: 'three_quarter_front', label: 'Front 3/4', svgData: createRefSvg('three_quarter_front', 'Front 3/4', '#dc2626', ['High Clearance Portal Axles', 'Flat Aluminum Tube Fenders', 'Full Exo-Rollcage Structure']) },
      { angle: 'rear', label: 'Rear Stance', svgData: createRefSvg('rear', 'Crawler Rear', '#dc2626', ['Hinged Stinger Spare Carrier', 'High Lift Jack Mounted', 'Rear LED Rock Lights']) },
    ],
  },
  {
    id: 'polar_heavy_hauler',
    name: 'Grizzly Polar 6x6 Heavy Utility',
    archetype: 'heavy_truck',
    badge: 'HEAVY EXPEDITION',
    description: 'Massive arctic expedition transport with forward control cab, dual rooftop storage pods, heavy portal hub reduction, and military camouflage finish.',
    blueprint: {
      name: 'Grizzly Polar Heavy Utility',
      archetype: 'heavy_truck',
      summary: 'High-capacity portal axle overland truck built for sub-zero planetary expeditions and mud bogging.',
      proportions: {
        length: 5.40,
        width: 2.35,
        height: 2.50,
        groundClearance: 0.52,
        wheelbase: 3.30,
        trackWidth: 2.05,
        approachAngle: 50,
        departureAngle: 48,
      },
      cabStyle: 'camper_troopy',
      hood: {
        slope: 0.30,
        scoop: true,
        powerBulge: false,
      },
      frontFascia: {
        grilleStyle: 'minimal_armor',
        headlightStyle: 'quad_projector',
        bullBar: 'heavy_duty_winch_guard',
        winch: true,
      },
      wheelArches: {
        style: 'box_fender',
        flareWidth: 0.18,
      },
      roofEquipment: {
        rack: 'basket_rack',
        roofSpotlights: 'led_lightbar',
        snorkel: true,
        spareTireMounted: 'roof_basket',
      },
      wheels: {
        tireRadius: 0.62,
        tireWidth: 0.44,
        rimStyle: 'military_steelie',
        rimDiameterRatio: 0.50,
        deepTreadLugs: true,
      },
      materials: {
        primaryBodyColor: '#475569', // Battleship Slate
        secondaryTrimColor: '#0f172a',
        rimColor: '#020617',
        glassColor: '#1e293b',
        roughBody: 0.6,
        metalBody: 0.35,
      },
      suspensionRig: {
        springStiffness: 42000,
        suspensionTravel: 0.40,
        dampingFactor: 4200,
      },
    },
    referenceImages: [
      { angle: 'front', label: 'Front Orthogonal', svgData: createRefSvg('front', 'Front Polar', '#475569', ['Military Armored Nose', 'Quad Sealed Projectors', 'Integrated Hydraulic Winch']) },
      { angle: 'left', label: 'Side Profile', svgData: createRefSvg('left', 'Polar Profile', '#475569', ['Tall Cab-Over Greenhouse', 'Dual Fuel Long-Range Tanks', 'High Arctic Snorkel']) },
      { angle: 'three_quarter_front', label: 'Front 3/4', svgData: createRefSvg('three_quarter_front', 'Front 3/4', '#475569', ['Reinforced Portal Hubs', 'Deep Mud Lug Profiles', 'Roof Cargo Pods']) },
      { angle: 'rear', label: 'Rear Gate', svgData: createRefSvg('rear', 'Polar Rear', '#475569', ['Expedition Utility Tailgate', 'Emergency Tow Pintle Hitch', 'High Exhaust Pipe Outlet']) },
    ],
  },
];
