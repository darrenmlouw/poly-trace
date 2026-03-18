import type * as THREE from "three";

/** A vertex in 3D space. */
export interface Vertex {
  x: number;
  y: number;
  z: number;
}

/** A face defined by indices into a vertex array. Can be 3+ sided. */
export type Face = number[];

/** Full polyhedron definition. */
export interface PolyhedronData {
  vertices: Vertex[];
  faces: Face[];
}

/** A point on the surface defined by a 3D position. */
export interface SurfacePoint {
  position: THREE.Vector3;
  faceIndex: number;
}

/** Graph edge for pathfinding. */
export interface GraphEdge {
  to: number;
  weight: number;
}

/** Adjacency-list graph. */
export type Graph = GraphEdge[][];
