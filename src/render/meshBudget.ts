/**
 * Tessellation budget for procedural heroes/monsters/gear.
 * Keeps authored part counts and silhouettes; only thins sphere/capsule segments.
 */
import * as THREE from "three";
import { isConstrainedGpu } from "./quality";

/** 1 = authored density; phones cut harder, desktop still shaves a little. */
export function meshDensity(): number {
  return isConstrainedGpu() ? 0.55 : 0.78;
}

function segs(n: number, min: number): number {
  return Math.max(min, Math.round(n * meshDensity()));
}

export function sphere(
  radius: number,
  widthSegments = 16,
  heightSegments = 12,
  phiStart?: number,
  phiLength?: number,
  thetaStart?: number,
  thetaLength?: number,
): THREE.SphereGeometry {
  return new THREE.SphereGeometry(
    radius,
    segs(widthSegments, 6),
    segs(heightSegments, 4),
    phiStart,
    phiLength,
    thetaStart,
    thetaLength,
  );
}

export function capsule(
  radius: number,
  length: number,
  capSegments = 4,
  radialSegments = 8,
): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(radius, length, segs(capSegments, 2), segs(radialSegments, 5));
}

export function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  radialSegments = 8,
  heightSegments = 1,
  openEnded?: boolean,
  thetaStart?: number,
  thetaLength?: number,
): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    segs(radialSegments, 5),
    Math.max(1, segs(heightSegments, 1)),
    openEnded,
    thetaStart,
    thetaLength,
  );
}

export function torus(
  radius: number,
  tube: number,
  radialSegments = 8,
  tubularSegments = 16,
  arc?: number,
): THREE.TorusGeometry {
  return new THREE.TorusGeometry(radius, tube, segs(radialSegments, 4), segs(tubularSegments, 8), arc);
}

export function cone(
  radius: number,
  height: number,
  radialSegments = 8,
  heightSegments = 1,
  openEnded?: boolean,
  thetaStart?: number,
  thetaLength?: number,
): THREE.ConeGeometry {
  return new THREE.ConeGeometry(
    radius,
    height,
    segs(radialSegments, 5),
    Math.max(1, segs(heightSegments, 1)),
    openEnded,
    thetaStart,
    thetaLength,
  );
}

/** RoundedBox segment rings — 3 authored → 2 desktop / 1 phone. */
export function roundSegs(authored = 3): number {
  return segs(authored, 1);
}
