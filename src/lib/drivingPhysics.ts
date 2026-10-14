import * as THREE from 'three';
import { VehicleRig } from './vehicleMeshBuilder';
import { TerrainWorld } from './terrainEngine';
import { VehiclePhysicsState } from '../types/vehicle';

export interface DrivingControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  reset: boolean;
}

export class VehicleController {
  private rig: VehicleRig;
  private terrain: TerrainWorld;

  // Transform state
  public position: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0; // facing direction (+Z is forward)
  public pitch: number = 0;
  public roll: number = 0;
  public steerAngle: number = 0;
  public wheelSpinAngle: number = 0;
  public speedKmh: number = 0;
  public rpm: number = 900;
  public gear: number = 1;

  // Suspension states
  public compressions: [number, number, number, number] = [0.5, 0.5, 0.5, 0.5]; // FL, FR, RL, RR

  // Physics constants
  private maxSteer: number = 0.52; // ~30 degrees
  private maxSpeedForward: number = 85; // km/h
  private maxSpeedReverse: number = -30;
  private acceleration: number = 22.0;
  private brakePower: number = 32.0;
  private dragCoeff: number = 0.96;
  private turnSpeed: number = 2.4;

  constructor(rig: VehicleRig, terrain: TerrainWorld) {
    this.rig = rig;
    this.terrain = terrain;

    // Place vehicle initially above terrain
    const startH = terrain.getHeight(0, 0);
    this.position.set(0, startH + rig.dimensions.tireRadius + rig.dimensions.groundClearance, 0);
  }

  public setRig(newRig: VehicleRig) {
    this.rig = newRig;
  }

  public resetPosition(x: number = 0, z: number = 0) {
    this.position.x = x;
    this.position.z = z;
    const groundH = this.terrain.getHeight(x, z);
    this.position.y = groundH + this.rig.dimensions.tireRadius + this.rig.dimensions.groundClearance;
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.roll = 0;
    this.speedKmh = 0;
    this.rpm = 900;
    this.gear = 1;
  }

  public update(dt: number, controls: DrivingControls): VehiclePhysicsState {
    const clampedDt = Math.min(dt, 0.05);

    if (controls.reset) {
      this.resetPosition(this.position.x, this.position.z);
    }

    const dims = this.rig.dimensions;
    const halfTrack = dims.trackWidth / 2;
    const halfBase = dims.wheelbase / 2;
    const tireRadius = dims.tireRadius;

    // 1. Steering Input with speed-sensitive damping
    const targetSteer = (controls.left ? 1 : 0) - (controls.right ? 1 : 0);
    const speedDamp = Math.max(0.4, 1.0 - Math.abs(this.speedKmh) / 140);
    const steerRate = 6.0;
    this.steerAngle = THREE.MathUtils.damp(
      this.steerAngle,
      targetSteer * this.maxSteer * speedDamp,
      steerRate,
      clampedDt
    );

    // 2. Drive & Brake Input
    let throttle = 0;
    if (controls.forward) throttle += 1;
    if (controls.backward) throttle -= 1;

    const currentSpeedMs = this.velocity.length() * (this.velocity.dot(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))) >= 0 ? 1 : -1);
    this.speedKmh = currentSpeedMs * 3.6;

    // Engine acceleration
    if (throttle > 0 && this.speedKmh < this.maxSpeedForward) {
      const accelForce = this.acceleration * (1.0 - this.speedKmh / this.maxSpeedForward);
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.velocity.addScaledVector(fwd, accelForce * clampedDt);
    } else if (throttle < 0 && this.speedKmh > this.maxSpeedReverse) {
      const revForce = this.acceleration * 0.7;
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.velocity.addScaledVector(fwd, -revForce * clampedDt);
    }

    // Brakes
    if (controls.brake) {
      const brakeDamp = Math.pow(0.1, clampedDt);
      this.velocity.multiplyScalar(brakeDamp);
    }

    // Natural Drag & Rolling Friction
    this.velocity.multiplyScalar(Math.pow(this.dragCoeff, clampedDt * 20));

    // Yaw rotation based on steering and speed
    if (Math.abs(currentSpeedMs) > 0.1) {
      const turnAmount = (currentSpeedMs / dims.wheelbase) * Math.sin(this.steerAngle);
      this.yaw += turnAmount * clampedDt * this.turnSpeed;
    }

    // Advance vehicle XZ position
    this.position.x += this.velocity.x * clampedDt;
    this.position.z += this.velocity.z * clampedDt;

    // 3. SUSPENSION & TERRAIN ALIGNMENT RAYCASTS
    // Calculate world positions for 4 wheel contact patches
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    const getWheelWorldPos = (localX: number, localZ: number) => {
      const wx = this.position.x + (cosY * localX + sinY * localZ);
      const wz = this.position.z + (-sinY * localX + cosY * localZ);
      const gh = this.terrain.getHeight(wx, wz);
      return { wx, wz, gh };
    };

    const wFL = getWheelWorldPos(-halfTrack, halfBase);
    const wFR = getWheelWorldPos(halfTrack, halfBase);
    const wRL = getWheelWorldPos(-halfTrack, -halfBase);
    const wRR = getWheelWorldPos(halfTrack, -halfBase);

    // Compute target ground elevation under front and rear axles
    const frontGroundAvg = (wFL.gh + wFR.gh) / 2;
    const rearGroundAvg = (wRL.gh + wRR.gh) / 2;
    const leftGroundAvg = (wFL.gh + wRL.gh) / 2;
    const rightGroundAvg = (wFR.gh + wRR.gh) / 2;

    const overallGroundAvg = (frontGroundAvg + rearGroundAvg) / 2;

    // Pitch: angle between front and rear ground
    const targetPitch = Math.atan2(frontGroundAvg - rearGroundAvg, dims.wheelbase);
    // Roll: angle between left and right ground
    const targetRoll = Math.atan2(leftGroundAvg - rightGroundAvg, dims.trackWidth);

    // Smoothly damp pitch & roll for physical suspension weight
    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 14.0, clampedDt);
    this.roll = THREE.MathUtils.damp(this.roll, targetRoll, 14.0, clampedDt);

    // Target vertical Y position:
    // Guarantees vehicle never sinks into terrain!
    // Body base sits at ground elevation + tire radius + ground clearance
    const targetBodyY = overallGroundAvg + tireRadius + dims.groundClearance * 0.45;
    this.position.y = THREE.MathUtils.damp(this.position.y, targetBodyY, 18.0, clampedDt);

    // Hard safeguard against sinking:
    const absoluteMinY = Math.max(wFL.gh, wFR.gh, wRL.gh, wRR.gh) + tireRadius + 0.1;
    if (this.position.y < absoluteMinY) {
      this.position.y = absoluteMinY;
    }

    // 4. Update Suspension Compression values
    const restSuspensionDist = dims.groundClearance * 0.65;
    const getComp = (gh: number) => {
      const dist = this.position.y - (gh + tireRadius);
      const comp = 1.0 - (dist / (restSuspensionDist * 1.5));
      return Math.max(0.1, Math.min(0.95, comp));
    };

    this.compressions = [
      getComp(wFL.gh),
      getComp(wFR.gh),
      getComp(wRL.gh),
      getComp(wRR.gh),
    ];

    // 5. Update Wheel Spin Rotation
    const wheelRotSpeed = currentSpeedMs / tireRadius;
    this.wheelSpinAngle += wheelRotSpeed * clampedDt;

    // 6. Apply transforms to Three.js Vehicle Rig
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.set(0, this.yaw, 0, 'YXZ');
    this.rig.root.rotateX(this.pitch);
    this.rig.root.rotateZ(this.roll);

    // Steering rotation on front wheel pivots
    this.rig.wheelFL.rotation.y = this.steerAngle;
    this.rig.wheelFR.rotation.y = this.steerAngle;

    // Rolling spin on inner wheel meshes
    this.rig.wheelMeshFL.rotation.x = this.wheelSpinAngle;
    this.rig.wheelMeshFR.rotation.x = this.wheelSpinAngle;
    this.rig.wheelMeshRL.rotation.x = this.wheelSpinAngle;
    this.rig.wheelMeshRR.rotation.x = this.wheelSpinAngle;

    // Dynamic wheel vertical adjustment to hug terrain surface
    const adjustWheelY = (wheelGroup: THREE.Group, gh: number) => {
      const localGroundY = gh + tireRadius - this.position.y;
      wheelGroup.position.y = THREE.MathUtils.damp(wheelGroup.position.y, localGroundY + 0.12, 16.0, clampedDt);
    };
    adjustWheelY(this.rig.wheelFL, wFL.gh);
    adjustWheelY(this.rig.wheelFR, wFR.gh);
    adjustWheelY(this.rig.wheelRL, wRL.gh);
    adjustWheelY(this.rig.wheelRR, wRR.gh);

    // 7. Calculate RPM and Gear simulation
    const absSpeed = Math.abs(this.speedKmh);
    if (absSpeed < 20) {
      this.gear = 1;
      this.rpm = 900 + (absSpeed / 20) * 3200;
    } else if (absSpeed < 45) {
      this.gear = 2;
      this.rpm = 1800 + ((absSpeed - 20) / 25) * 3400;
    } else if (absSpeed < 70) {
      this.gear = 3;
      this.rpm = 2200 + ((absSpeed - 45) / 25) * 3600;
    } else {
      this.gear = 4;
      this.rpm = 2500 + ((absSpeed - 70) / 30) * 3500;
    }

    if (throttle > 0 && absSpeed < 5) {
      this.rpm = Math.min(5500, this.rpm + 2500 * clampedDt);
    }

    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      speed: Math.round(this.speedKmh),
      rpm: Math.round(this.rpm),
      gear: this.gear,
      steerAngle: this.steerAngle,
      wheelRotation: this.wheelSpinAngle,
      pitch: (this.pitch * 180) / Math.PI,
      roll: (this.roll * 180) / Math.PI,
      yaw: (this.yaw * 180) / Math.PI,
      suspensionCompressions: this.compressions,
      isGrounded: true,
      inMud: overallGroundAvg < -1.0,
    };
  }
}
