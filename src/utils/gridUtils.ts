import * as THREE from "three";
import type { PolyhedronData, Vertex } from "../types";

type Vec2 = [number, number];

function toV3(v: Vertex): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/* ============ Face coordinate frame (for quad grid) ============ */

interface FaceFrame {
  origin: THREE.Vector3;
  xAxis: THREE.Vector3;
  yAxis: THREE.Vector3;
  normal: THREE.Vector3;
  poly2D: Vec2[];
}

function getFaceFrame(data: PolyhedronData, fi: number): FaceFrame {
  const face = data.faces[fi];
  const verts = face.map((vi) => toV3(data.vertices[vi]));

  const origin = verts[0].clone();
  const e1 = verts[1].clone().sub(origin);
  const e2 = verts[verts.length > 2 ? 2 : 1].clone().sub(origin);

  const xAxis = e1.clone().normalize();
  const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

  const poly2D: Vec2[] = verts.map((v) => {
    const d = v.clone().sub(origin);
    return [d.dot(xAxis), d.dot(yAxis)] as Vec2;
  });

  return { origin, xAxis, yAxis, normal, poly2D };
}

/* ============ Scanline polygon clipping (for quad grid) ============ */

function scanlineHits(poly: Vec2[], axis: 0 | 1, value: number): number[] {
  const other = 1 - axis;
  const hits: number[] = [];

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = a[axis] - value;
    const db = b[axis] - value;

    if (da * db < 0) {
      const t = da / (da - db);
      hits.push(a[other] + t * (b[other] - a[other]));
    }
  }

  hits.sort((a, b) => a - b);
  return hits;
}

function pointInPoly(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (
      poly[i][1] > p[1] !== poly[j][1] > p[1] &&
      p[0] <
        ((poly[j][0] - poly[i][0]) * (p[1] - poly[i][1])) /
          (poly[j][1] - poly[i][1]) +
          poly[i][0]
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/* ============ Barycentric helpers (for triangle faces) ============ */

function baryTo3D(
  i: number,
  j: number,
  k: number,
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  N: number,
): THREE.Vector3 {
  const s = 1 / N;
  return new THREE.Vector3(
    (i * v0.x + j * v1.x + k * v2.x) * s,
    (i * v0.y + j * v1.y + k * v2.y) * s,
    (i * v0.z + j * v1.z + k * v2.z) * s,
  );
}

/** Average edge length of a face. */
function avgEdgeLength(verts: THREE.Vector3[]): number {
  let total = 0;
  for (let i = 0; i < verts.length; i++) {
    total += verts[i].distanceTo(verts[(i + 1) % verts.length]);
  }
  return total / verts.length;
}

/* ============ Grid geometry builder ============ */

/**
 * Build line-segment geometry for surface grids.
 * - Quad faces (4-sided): square grid at the given spacing (real units).
 * - Non-quad faces: barycentric subdivision where N = avg edge length / spacing.
 */
export function buildFaceGridGeometry(
  data: PolyhedronData,
  spacing: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const OFFSET = 0.005;

  for (let fi = 0; fi < data.faces.length; fi++) {
    const face = data.faces[fi];
    const verts = face.map((vi) => toV3(data.vertices[vi]));
    if (verts.length < 3) continue;

    const e1 = verts[1].clone().sub(verts[0]);
    const e2 = verts[verts.length > 2 ? 2 : 1].clone().sub(verts[0]);
    const nOff = new THREE.Vector3().crossVectors(e1, e2).normalize().multiplyScalar(OFFSET);

    if (face.length === 4) {
      // ---- Square grid for quads ----
      const { origin, xAxis, yAxis, normal, poly2D } = getFaceFrame(data, fi);
      const nOffQ = normal.clone().multiplyScalar(OFFSET);

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const [x, y] of poly2D) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      const to3 = (x: number, y: number) =>
        origin.clone()
          .add(xAxis.clone().multiplyScalar(x))
          .add(yAxis.clone().multiplyScalar(y))
          .add(nOffQ);

      // Horizontal lines (constant y)
      const yStart = Math.ceil(minY / spacing) * spacing;
      for (let y = yStart; y <= maxY + 1e-9; y += spacing) {
        const hits = scanlineHits(poly2D, 1, y);
        for (let i = 0; i + 1 < hits.length; i += 2) {
          const p1 = to3(hits[i], y);
          const p2 = to3(hits[i + 1], y);
          positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }

      // Vertical lines (constant x)
      const xStart = Math.ceil(minX / spacing) * spacing;
      for (let x = xStart; x <= maxX + 1e-9; x += spacing) {
        const hits = scanlineHits(poly2D, 0, x);
        for (let i = 0; i + 1 < hits.length; i += 2) {
          const p1 = to3(x, hits[i]);
          const p2 = to3(x, hits[i + 1]);
          positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
    } else if (face.length === 3) {
      // ---- Barycentric grid for triangles ----
      const avg = avgEdgeLength(verts);
      const N = Math.max(1, Math.round(avg / spacing));

      const v0 = verts[0];
      const v1 = verts[1];
      const v2 = verts[2];

      const pt = (i: number, j: number, k: number) =>
        baryTo3D(i, j, k, v0, v1, v2, N).add(nOff.clone());

      const addSeg = (a: THREE.Vector3, b: THREE.Vector3) => {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      };

      for (let i = 0; i <= N; i++) {
        for (let j = 0; j < N - i; j++) {
          addSeg(pt(i, j, N - i - j), pt(i, j + 1, N - i - j - 1));
        }
      }
      for (let j = 0; j <= N; j++) {
        for (let i = 0; i < N - j; i++) {
          addSeg(pt(i, j, N - i - j), pt(i + 1, j, N - i - j - 1));
        }
      }
      for (let k = 0; k <= N; k++) {
        for (let i = 0; i < N - k; i++) {
          const j = N - i - k;
          addSeg(pt(i, j, k), pt(i + 1, j - 1, k));
        }
      }
    } else {
      // ---- Concentric polygon + radial grid for 5+ sided faces ----
      const centroid = new THREE.Vector3();
      for (const v of verts) centroid.add(v);
      centroid.divideScalar(verts.length);

      // Ring count from avg vertex-to-centroid distance
      let avgDist = 0;
      for (const v of verts) avgDist += v.distanceTo(centroid);
      avgDist /= verts.length;
      const N = Math.max(1, Math.round(avgDist / spacing));

      // Edge subdivisions from avg edge length
      const avg = avgEdgeLength(verts);
      const M = Math.max(1, Math.round(avg / spacing));

      const numV = verts.length;

      // Helper: grid point at ring t, edge i, subdivision m
      const gp = (t: number, i: number, m: number): THREE.Vector3 => {
        const frac = t / N;
        const edgePt = verts[i].clone().lerp(verts[(i + 1) % numV], m / M);
        return edgePt.lerp(centroid, frac).add(nOff.clone());
      };

      const addSeg = (a: THREE.Vector3, b: THREE.Vector3) => {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      };

      // Ring lines (concentric polygons) — skip innermost (all points = centroid)
      for (let t = 0; t < N; t++) {
        for (let i = 0; i < numV; i++) {
          for (let m = 0; m < M; m++) {
            const nextI = m === M - 1 ? (i + 1) % numV : i;
            const nextM = m === M - 1 ? 0 : m + 1;
            addSeg(gp(t, i, m), gp(t, nextI, nextM));
          }
        }
      }

      // Radial lines (outer ring → centroid)
      for (let i = 0; i < numV; i++) {
        for (let m = 0; m < M; m++) {
          for (let t = 0; t < N; t++) {
            addSeg(gp(t, i, m), gp(t + 1, i, m));
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

/* ============ Snap to grid ============ */

/**
 * Snap a 3-D surface point to the nearest grid intersection on its face.
 * - Quad faces: snap to the square grid at the given spacing.
 * - Non-quad faces: snap to barycentric grid points.
 * - Face vertices (corners) are always candidates.
 */
export function snapToFaceGrid(
  point: THREE.Vector3,
  faceIndex: number,
  data: PolyhedronData,
  spacing: number,
): THREE.Vector3 {
  const face = data.faces[faceIndex];
  const verts = face.map((vi) => toV3(data.vertices[vi]));

  let bestPoint = point.clone();
  let bestDist = Infinity;

  const consider = (candidate: THREE.Vector3) => {
    const d = point.distanceToSquared(candidate);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = candidate;
    }
  };

  // Always consider face vertices (corners)
  for (const v of verts) {
    consider(v.clone());
  }

  if (face.length === 4) {
    // ---- Square grid snap for quads ----
    const { origin, xAxis, yAxis, poly2D } = getFaceFrame(data, faceIndex);

    const d = point.clone().sub(origin);
    const px = d.dot(xAxis);
    const py = d.dot(yAxis);

    const rx = Math.round(px / spacing) * spacing;
    const ry = Math.round(py / spacing) * spacing;

    const R = 3;
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const gx = rx + dx * spacing;
        const gy = ry + dy * spacing;

        if (pointInPoly([gx, gy], poly2D)) {
          consider(
            origin.clone()
              .add(xAxis.clone().multiplyScalar(gx))
              .add(yAxis.clone().multiplyScalar(gy))
          );
        }
      }
    }
  } else if (face.length === 3) {
    // ---- Barycentric snap for triangles ----
    const avg = avgEdgeLength(verts);
    const N = Math.max(1, Math.round(avg / spacing));

    const v0 = verts[0];
    const v1 = verts[1];
    const v2 = verts[2];

    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N - i; j++) {
        const k = N - i - j;
        consider(baryTo3D(i, j, k, v0, v1, v2, N));
      }
    }
  } else {
    // ---- Concentric polygon snap for 5+ sided faces ----
    const centroid = new THREE.Vector3();
    for (const v of verts) centroid.add(v);
    centroid.divideScalar(verts.length);

    let avgDist = 0;
    for (const v of verts) avgDist += v.distanceTo(centroid);
    avgDist /= verts.length;
    const N = Math.max(1, Math.round(avgDist / spacing));

    const avg = avgEdgeLength(verts);
    const M = Math.max(1, Math.round(avg / spacing));

    const numV = verts.length;
    for (let t = 0; t <= N; t++) {
      const frac = t / N;
      for (let i = 0; i < numV; i++) {
        for (let m = 0; m < M; m++) {
          const edgePt = verts[i].clone().lerp(verts[(i + 1) % numV], m / M);
          consider(edgePt.lerp(centroid, frac));
        }
      }
    }
    consider(centroid.clone());
  }

  return bestPoint;
}
