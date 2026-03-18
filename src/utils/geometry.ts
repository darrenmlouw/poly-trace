import * as THREE from "three";
import type { PolyhedronData, Face } from "../types";

/**
 * Triangulate an n-gon face using fan triangulation from vertex 0.
 */
export function triangulateFace(face: Face): [number, number, number][] {
  const tris: [number, number, number][] = [];
  for (let i = 1; i < face.length - 1; i++) {
    tris.push([face[0], face[i], face[i + 1]]);
  }
  return tris;
}

/**
 * Build a THREE.BufferGeometry from PolyhedronData.
 * All n-gon faces are fan-triangulated; normals are computed automatically.
 */
export function buildGeometry(data: PolyhedronData): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  data.vertices.forEach((v) => positions.push(v.x, v.y, v.z));
  data.faces.forEach((face) => {
    triangulateFace(face).forEach(([a, b, c]) => indices.push(a, b, c));
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Build line-segment geometry for all unique edges in the original faces.
 */
export function buildEdgesGeometry(data: PolyhedronData): THREE.BufferGeometry {
  const edgeSet = new Set<string>();
  const positions: number[] = [];
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  data.faces.forEach((face) => {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const k = key(a, b);
      if (!edgeSet.has(k)) {
        edgeSet.add(k);
        const va = data.vertices[a];
        const vb = data.vertices[b];
        positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
      }
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}
