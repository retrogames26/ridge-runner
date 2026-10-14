/**
 * Ridge Runners - Image-to-3D Low-Poly Vehicle Types
 */

export type VehicleArchetype =
  | 'overland_camper'
  | 'baja_runner'
  | 'rock_crawler'
  | 'classic_suv'
  | 'heavy_truck'
  | 'scout_4x4'
  | 'military_utility';

export type CameraAngle =
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'three_quarter_front'
  | 'three_quarter_rear'
  | 'roof'
  | 'interior'
  | 'other';

export interface UploadedImage {
  id: string;
  angle: CameraAngle;
  label: string;
  dataUrl: string; // base64
  name: string;
  fileSize?: string;
}

export interface VehicleBlueprint {
  name: string;
  archetype: VehicleArchetype;
  summary: string;
  proportions: {
    length: number; // in meters (e.g. 4.6)
    width: number; // in meters (e.g. 2.05)
    height: number; // in meters (e.g. 2.1)
    groundClearance: number; // in meters (e.g. 0.42)
    wheelbase: number; // in meters (e.g. 2.8)
    trackWidth: number; // in meters (e.g. 1.8)
    approachAngle?: number; // degrees
    departureAngle?: number; // degrees
  };
  cabStyle:
    | 'pickup_single_cab'
    | 'pickup_double_cab'
    | 'suv_wagon'
    | 'suv_short_wheelbase'
    | 'open_cage_buggy'
    | 'camper_troopy';
  hood: {
    slope: number;
    scoop: boolean;
    powerBulge: boolean;
  };
  frontFascia: {
    grilleStyle:
      | 'slotted_vertical'
      | 'mesh_honeycomb'
      | 'horizontal_bars'
      | 'minimal_armor'
      | 'retro_square';
    headlightStyle:
      | 'round_classic'
      | 'rectangular_modern'
      | 'split_led_bars'
      | 'quad_projector';
    bullBar: 'none' | 'tubular_low' | 'heavy_duty_winch_guard' | 'stinger_crawler';
    winch: boolean;
  };
  wheelArches: {
    style: 'cutout_flared' | 'box_fender' | 'tubular_rock' | 'pocket_riveted';
    flareWidth: number; // 0.05 to 0.25
  };
  roofEquipment: {
    rack: 'none' | 'basket_rack' | 'expedition_tray' | 'safari_tubular';
    roofSpotlights: 'none' | 'led_lightbar' | 'quad_round_pods' | 'twin_side_amber';
    snorkel: boolean;
    spareTireMounted: 'none' | 'rear_door' | 'roof_basket' | 'bed_slanted';
  };
  wheels: {
    tireRadius: number; // 0.45 to 0.65
    tireWidth: number; // 0.28 to 0.45
    rimStyle:
      | 'beadlock_8hole'
      | 'military_steelie'
      | 'sport_5spoke'
      | 'heavy_duty_split';
    rimDiameterRatio: number; // 0.45 to 0.60
    deepTreadLugs: boolean;
  };
  materials: {
    primaryBodyColor: string; // hex
    secondaryTrimColor: string; // hex
    rimColor: string; // hex
    glassColor: string; // hex
    roughBody?: number;
    metalBody?: number;
  };
  suspensionRig: {
    springStiffness: number; // N/m (e.g. 32000)
    suspensionTravel: number; // meters (e.g. 0.38)
    dampingFactor: number; // N*s/m (e.g. 3200)
  };
}

export interface VehiclePhysicsState {
  x: number;
  y: number;
  z: number;
  speed: number; // km/h
  rpm: number;
  gear: number;
  steerAngle: number; // radians
  wheelRotation: number; // radians
  pitch: number;
  roll: number;
  yaw: number;
  suspensionCompressions: [number, number, number, number]; // FL, FR, RL, RR (0 to 1)
  isGrounded: boolean;
  inMud: boolean;
}

export interface PresetVehicle {
  id: string;
  name: string;
  archetype: VehicleArchetype;
  description: string;
  badge: string;
  blueprint: VehicleBlueprint;
  referenceImages: { angle: CameraAngle; label: string; svgData: string }[];
}
