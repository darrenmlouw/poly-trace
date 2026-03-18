import * as THREE from "three";
import type { PolyhedronData, Vertex } from "../types";

/* ======================== 2-D helpers ======================== */

type Vec2 = [number, number];

function v2sub(a: Vec2, b: Vec2): Vec2 {
  return [a[0] - b[0], a[1] - b[1]];
}
function v2dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}
function v2cross(a: Vec2, b: Vec2): number {
  return a[0] * b[1] - a[1] * b[0];
}
function v2len(a: Vec2): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}
function v2dist(a: Vec2, b: Vec2): number {
  return v2len(v2sub(a, b));
}

/** Reflect point P across the line through A→B. */
function reflectAcrossLine(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const d = v2sub(b, a);
  const ap = v2sub(p, a);
  const t = v2dot(ap, d) / v2dot(d, d);
  return [2 * (a[0] + t * d[0]) - p[0], 2 * (a[1] + t * d[1]) - p[1]];
}

/**
 * Segment-segment intersection: (p1→p2) vs (p3→p4).
 * Returns { s, t } ∈ [0,1]² or null.
 */
function segSegHit(
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2,
): { s: number; t: number } | null {
  const d1 = v2sub(p2, p1);
  const d2 = v2sub(p4, p3);
  const cross = v2cross(d1, d2);
  if (Math.abs(cross) < 1e-12) return null;

  const d13 = v2sub(p3, p1);
  const s = v2cross(d13, d2) / cross;
  const t = v2cross(d13, d1) / cross;

  const EPS = -1e-6;
  const HI = 1 + 1e-6;
  if (s < EPS || s > HI || t < EPS || t > HI) return null;

  return {
    s: Math.max(0, Math.min(1, s)),
    t: Math.max(0, Math.min(1, t)),
  };
}

/* ======================== 3-D helpers ======================== */

function toV3(v: Vertex): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/** Barycentric point-in-triangle test (3-D, works on face plane). */
function insideTriangle(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): boolean {
  const v0 = c.clone().sub(a);
  const v1 = b.clone().sub(a);
  const v2 = p.clone().sub(a);
  const d00 = v0.dot(v0);
  const d01 = v0.dot(v1);
  const d02 = v0.dot(v2);
  const d11 = v1.dot(v1);
  const d12 = v1.dot(v2);
  const inv = 1 / (d00 * d11 - d01 * d01);
  const u = (d11 * d02 - d01 * d12) * inv;
  const v = (d00 * d12 - d01 * d02) * inv;
  const E = -0.001;
  return u >= E && v >= E && u + v <= 1.001;
}

/* ==================== Face adjacency ==================== */

interface AdjEntry {
  neighbor: number;
  edge: [number, number];
}

function buildFaceAdjacency(data: PolyhedronData): AdjEntry[][] {
  const edgeMap = new Map<string, { face: number; edge: [number, number] }[]>();
  const ek = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  for (let fi = 0; fi < data.faces.length; fi++) {
    const face = data.faces[fi];
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = ek(a, b);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push({ face: fi, edge: [a, b] });
    }
  }

  const adj: AdjEntry[][] = data.faces.map(() => []);
  for (const entries of edgeMap.values()) {
    if (entries.length === 2) {
      adj[entries[0].face].push({
        neighbor: entries[1].face,
        edge: entries[0].edge,
      });
      adj[entries[1].face].push({
        neighbor: entries[0].face,
        edge: entries[0].edge,
      });
    }
  }
  return adj;
}

function getSharedEdge(
  adj: AdjEntry[][],
  faceA: number,
  faceB: number,
): [number, number] {
  for (const e of adj[faceA]) {
    if (e.neighbor === faceB) return e.edge;
  }
  throw new Error(`Faces ${faceA} and ${faceB} not adjacent`);
}

/* ==================== Face-path enumeration (BFS) ==================== */

/**
 * Enumerate simple face-paths from src to dst using BFS.
 * BFS guarantees that shorter paths (fewer faces) are found first,
 * which prevents maxPaths from being exhausted on long detour paths
 * before the important short direct paths are discovered.
 */
function enumerateFacePaths(
  adj: AdjEntry[][],
  src: number,
  dst: number,
  maxDepth: number,
  maxPaths = 500,
): number[][] {
  const result: number[][] = [];
  const queue: { path: number[]; visited: Set<number> }[] = [
    { path: [src], visited: new Set([src]) },
  ];
  let head = 0;

  while (head < queue.length && result.length < maxPaths) {
    const { path, visited } = queue[head++];
    const cur = path[path.length - 1];

    for (const { neighbor } of adj[cur]) {
      if (result.length >= maxPaths) break;
      if (visited.has(neighbor)) continue;

      const newPath = [...path, neighbor];

      if (neighbor === dst) {
        result.push(newPath);
      } else if (newPath.length < maxDepth) {
        const newVisited = new Set(visited);
        newVisited.add(neighbor);
        queue.push({ path: newPath, visited: newVisited });
      }
    }
  }

  return result;
}

/* ==================== 2-D face projection ==================== */

function projectFaceTo2D(verts3D: THREE.Vector3[]) {
  const origin = verts3D[0].clone();
  const e1 = verts3D[1].clone().sub(origin);
  const e2 = verts3D[verts3D.length > 2 ? 2 : 1].clone().sub(origin);

  const xAxis = e1.clone().normalize();
  const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

  const coords: Vec2[] = verts3D.map((v) => {
    const d = v.clone().sub(origin);
    return [d.dot(xAxis), d.dot(yAxis)] as Vec2;
  });
  return { coords, xAxis, yAxis, origin };
}

function mapPointTo2D(
  pt: THREE.Vector3,
  verts3D: THREE.Vector3[],
  verts2D: Vec2[],
): Vec2 {
  const o = verts3D[0];
  const u = verts3D[1].clone().sub(o);
  const v = verts3D[2].clone().sub(o);
  const d = pt.clone().sub(o);

  const uu = u.dot(u),
    uv = u.dot(v),
    vv = v.dot(v);
  const du = d.dot(u),
    dv = d.dot(v);
  const det = uu * vv - uv * uv;
  if (Math.abs(det) < 1e-14) return verts2D[0];

  const s = (vv * du - uv * dv) / det;
  const t = (uu * dv - uv * du) / det;

  const o2 = verts2D[0];
  const u2 = v2sub(verts2D[1], o2);
  const v2 = v2sub(verts2D[2], o2);

  return [o2[0] + s * u2[0] + t * v2[0], o2[1] + s * u2[1] + t * v2[1]];
}

/* ==================== Unfolding ==================== */

interface EdgeSeg2D {
  vi1: number;
  vi2: number;
  p1: Vec2;
  p2: Vec2;
}

interface Unfolded {
  a2: Vec2;
  b2: Vec2;
  edges: EdgeSeg2D[];
  facePolys: { faceIdx: number; verts: Vec2[] }[];
}

function unfoldFacePath(
  fp: number[],
  data: PolyhedronData,
  adj: AdjEntry[][],
  ptA: THREE.Vector3,
  ptB: THREE.Vector3,
): Unfolded | null {
  if (fp.length === 0) return null;

  const perFace: Vec2[][] = [];
  const edges: EdgeSeg2D[] = [];

  const f0 = data.faces[fp[0]];
  const f0v = f0.map((vi) => toV3(data.vertices[vi]));
  const { coords, xAxis, yAxis, origin } = projectFaceTo2D(f0v);
  perFace.push(coords);

  const dp = ptA.clone().sub(origin);
  const a2: Vec2 = [dp.dot(xAxis), dp.dot(yAxis)];
  const facePolys: { faceIdx: number; verts: Vec2[] }[] = [
    { faceIdx: fp[0], verts: [...coords] },
  ];

  for (let i = 1; i < fp.length; i++) {
    const prevIdx = fp[i - 1];
    const currIdx = fp[i];
    const edge = getSharedEdge(adj, prevIdx, currIdx);

    const prevFace = data.faces[prevIdx];
    const currFace = data.faces[currIdx];
    const prevPos = perFace[i - 1];

    const e1pi = prevFace.indexOf(edge[0]);
    const e2pi = prevFace.indexOf(edge[1]);
    if (e1pi === -1 || e2pi === -1) return null;
    const e1G = prevPos[e1pi];
    const e2G = prevPos[e2pi];

    edges.push({ vi1: edge[0], vi2: edge[1], p1: e1G, p2: e2G });

    const currV3 = currFace.map((vi) => toV3(data.vertices[vi]));
    const { coords: loc } = projectFaceTo2D(currV3);

    const e1ci = currFace.indexOf(edge[0]);
    const e2ci = currFace.indexOf(edge[1]);
    if (e1ci === -1 || e2ci === -1) return null;

    const dL = v2sub(loc[e2ci], loc[e1ci]);
    const dG = v2sub(e2G, e1G);
    const ang = Math.atan2(dG[1], dG[0]) - Math.atan2(dL[1], dL[0]);
    const co = Math.cos(ang);
    const si = Math.sin(ang);

    let tr: Vec2[] = loc.map((p) => {
      const dx = p[0] - loc[e1ci][0];
      const dy = p[1] - loc[e1ci][1];
      return [
        e1G[0] + co * dx - si * dy,
        e1G[1] + si * dx + co * dy,
      ] as Vec2;
    });

    const prevCx = prevPos.reduce((s, p) => s + p[0], 0) / prevPos.length;
    const prevCy = prevPos.reduce((s, p) => s + p[1], 0) / prevPos.length;

    const nonEdge = currFace
      .map((_, j) => j)
      .filter((j) => j !== e1ci && j !== e2ci);

    if (nonEdge.length > 0) {
      const newCx =
        nonEdge.reduce((s, j) => s + tr[j][0], 0) / nonEdge.length;
      const newCy =
        nonEdge.reduce((s, j) => s + tr[j][1], 0) / nonEdge.length;

      const eDir = v2sub(e2G, e1G);
      const crossPrev = v2cross(eDir, v2sub([prevCx, prevCy], e1G));
      const crossNew = v2cross(eDir, v2sub([newCx, newCy], e1G));

      if (crossPrev * crossNew > 0) {
        tr = tr.map((p) => reflectAcrossLine(p, e1G, e2G));
      }
    }

    perFace.push(tr);
    facePolys.push({ faceIdx: currIdx, verts: [...tr] });
  }

  const lastFace = data.faces[fp[fp.length - 1]];
  const lastV3 = lastFace.map((vi) => toV3(data.vertices[vi]));
  const lastPos = perFace[perFace.length - 1];
  const b2 = mapPointTo2D(ptB, lastV3, lastPos);

  return { a2, b2, edges, facePolys };
}

/* ==================== Validate & extract 3-D path ==================== */

function extractPath(
  data: PolyhedronData,
  unf: Unfolded,
  ptA: THREE.Vector3,
  ptB: THREE.Vector3,
): { len: number; pts: THREE.Vector3[] } | null {
  const { a2, b2, edges } = unf;
  const crossings: THREE.Vector3[] = [];

  for (const { vi1, vi2, p1, p2 } of edges) {
    const hit = segSegHit(a2, b2, p1, p2);
    if (!hit) return null;
    crossings.push(
      toV3(data.vertices[vi1]).lerp(toV3(data.vertices[vi2]), hit.t),
    );
  }

  return {
    len: v2dist(a2, b2),
    pts: [ptA.clone(), ...crossings, ptB.clone()],
  };
}

/* ==================== Face detection ==================== */

export function findFaceForPoint(
  point: THREE.Vector3,
  data: PolyhedronData,
): number {
  let bestFace = 0;
  let bestDist = Infinity;

  for (let fi = 0; fi < data.faces.length; fi++) {
    const face = data.faces[fi];
    if (face.length < 3) continue;

    const v0 = toV3(data.vertices[face[0]]);
    const v1 = toV3(data.vertices[face[1]]);
    const v2 = toV3(data.vertices[face[2]]);

    const n = new THREE.Vector3().crossVectors(
      v1.clone().sub(v0),
      v2.clone().sub(v0),
    );
    if (n.length() < 1e-10) continue;
    n.normalize();

    const planeDist = Math.abs(n.dot(point.clone().sub(v0)));

    const proj = point
      .clone()
      .sub(n.clone().multiplyScalar(n.dot(point.clone().sub(v0))));

    for (let i = 1; i < face.length - 1; i++) {
      const a = toV3(data.vertices[face[0]]);
      const b = toV3(data.vertices[face[i]]);
      const c = toV3(data.vertices[face[i + 1]]);
      if (insideTriangle(proj, a, b, c) && planeDist < bestDist) {
        bestDist = planeDist;
        bestFace = fi;
        break;
      }
    }
  }

  if (bestDist === Infinity) {
    for (let fi = 0; fi < data.faces.length; fi++) {
      const face = data.faces[fi];
      if (face.length < 3) continue;
      const v0 = toV3(data.vertices[face[0]]);
      const v1 = toV3(data.vertices[face[1]]);
      const v2 = toV3(data.vertices[face[2]]);
      const n = new THREE.Vector3().crossVectors(
        v1.clone().sub(v0),
        v2.clone().sub(v0),
      );
      if (n.length() < 1e-10) continue;
      n.normalize();
      const d = Math.abs(n.dot(point.clone().sub(v0)));
      if (d < bestDist) {
        bestDist = d;
        bestFace = fi;
      }
    }
  }

  return bestFace;
}

/** Exported shape of the 2-D unfolding visualisation data. */
export interface UnfoldingViz {
  facePolys: { faceIdx: number; verts: [number, number][] }[];
  edges: { p1: [number, number]; p2: [number, number] }[];
  a2: [number, number];
  b2: [number, number];
  length: number;
  rank: number; // 0 = shortest
}

export interface GeodesicResult {
  path: THREE.Vector3[];
  unfoldings: UnfoldingViz[];
  totalCandidates: number;
}

/* ==================== Public API ==================== */

export function computeGeodesicPath(
  data: PolyhedronData,
  ptA: THREE.Vector3,
  faceA: number,
  ptB: THREE.Vector3,
  faceB: number,
): GeodesicResult {
  if (faceA === faceB) {
    const len = ptA.distanceTo(ptB);
    return {
      path: [ptA.clone(), ptB.clone()],
      totalCandidates: 1,
      unfoldings: [{
        facePolys: [],
        edges: [],
        a2: [0, 0],
        b2: [len, 0],
        length: len,
        rank: 0,
      }],
    };
  }

  const adj = buildFaceAdjacency(data);
  const maxDepth = Math.min(data.faces.length, 12);
  const fps = enumerateFacePaths(adj, faceA, faceB, maxDepth);

  const candidates: { len: number; pts: THREE.Vector3[]; unf: Unfolded }[] = [];

  for (const fp of fps) {
    const unf = unfoldFacePath(fp, data, adj, ptA, ptB);
    if (!unf) continue;
    const res = extractPath(data, unf, ptA, ptB);
    if (res) {
      candidates.push({ len: res.len, pts: res.pts, unf });
    }
  }

  candidates.sort((a, b) => a.len - b.len);
  const topN = candidates.slice(0, 20);

  const unfoldings: UnfoldingViz[] = topN.map((c, i) => ({
    facePolys: c.unf.facePolys,
    edges: c.unf.edges.map((e) => ({ p1: e.p1, p2: e.p2 })),
    a2: c.unf.a2,
    b2: c.unf.b2,
    length: c.len,
    rank: i,
  }));

  const best = topN[0];
  return {
    path: best ? best.pts : [ptA.clone(), ptB.clone()],
    unfoldings,
    totalCandidates: candidates.length,
  };
}
