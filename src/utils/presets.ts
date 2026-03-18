import type { PolyhedronData, Vertex } from "../types";

// ==================== Shape type definitions ====================

export interface ShapeParam {
  key: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export interface ShapeType {
  name: string;
  params: ShapeParam[];
  generate: (values: Record<string, number>) => PolyhedronData;
}

// ==================== Generators ====================

function makeBox(w: number, h: number, d: number): PolyhedronData {
  const hw = w / 2,
    hh = h / 2,
    hd = d / 2;
  return {
    vertices: [
      { x: -hw, y: -hh, z: -hd }, // 0
      { x: hw, y: -hh, z: -hd }, //  1
      { x: hw, y: hh, z: -hd }, //   2
      { x: -hw, y: hh, z: -hd }, //  3
      { x: -hw, y: -hh, z: hd }, //  4
      { x: hw, y: -hh, z: hd }, //   5
      { x: hw, y: hh, z: hd }, //    6
      { x: -hw, y: hh, z: hd }, //   7
    ],
    faces: [
      [0, 1, 2, 3], // back   (z = -hd)
      [4, 5, 6, 7], // front  (z = +hd)
      [0, 1, 5, 4], // bottom (y = -hh)
      [2, 3, 7, 6], // top    (y = +hh)
      [0, 3, 7, 4], // left   (x = -hw)
      [1, 2, 6, 5], // right  (x = +hw)
    ],
  };
}

function scaleVerts(verts: Vertex[], s: number): Vertex[] {
  return verts.map((v) => ({ x: v.x * s, y: v.y * s, z: v.z * s }));
}

function makeOctahedron(size: number): PolyhedronData {
  return {
    vertices: scaleVerts(
      [
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
      ],
      size
    ),
    faces: [
      [0, 2, 4],
      [2, 1, 4],
      [1, 3, 4],
      [3, 0, 4],
      [0, 5, 2],
      [2, 5, 1],
      [1, 5, 3],
      [3, 5, 0],
    ],
  };
}

function makeDodecahedron(size: number): PolyhedronData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const v = (x: number, y: number, z: number): Vertex => ({ x, y, z });
  return {
    vertices: scaleVerts(
      [
        v(1, 1, 1),
        v(1, 1, -1),
        v(1, -1, 1),
        v(1, -1, -1),
        v(-1, 1, 1),
        v(-1, 1, -1),
        v(-1, -1, 1),
        v(-1, -1, -1),
        v(0, invPhi, phi),
        v(0, invPhi, -phi),
        v(0, -invPhi, phi),
        v(0, -invPhi, -phi),
        v(invPhi, phi, 0),
        v(invPhi, -phi, 0),
        v(-invPhi, phi, 0),
        v(-invPhi, -phi, 0),
        v(phi, 0, invPhi),
        v(phi, 0, -invPhi),
        v(-phi, 0, invPhi),
        v(-phi, 0, -invPhi),
      ],
      size
    ),
    faces: [
      [0, 8, 10, 2, 16],
      [0, 16, 17, 1, 12],
      [0, 12, 14, 4, 8],
      [1, 17, 3, 11, 9],
      [1, 9, 5, 14, 12],
      [2, 10, 6, 15, 13],
      [2, 13, 3, 17, 16],
      [3, 13, 15, 7, 11],
      [4, 14, 5, 19, 18],
      [4, 18, 6, 10, 8],
      [5, 9, 11, 7, 19],
      [6, 18, 19, 7, 15],
    ],
  };
}

function makeIcosahedron(size: number): PolyhedronData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const v = (x: number, y: number, z: number): Vertex => ({ x, y, z });
  return {
    vertices: scaleVerts(
      [
        v(0, 1, phi),
        v(0, 1, -phi),
        v(0, -1, phi),
        v(0, -1, -phi),
        v(1, phi, 0),
        v(1, -phi, 0),
        v(-1, phi, 0),
        v(-1, -phi, 0),
        v(phi, 0, 1),
        v(phi, 0, -1),
        v(-phi, 0, 1),
        v(-phi, 0, -1),
      ],
      size
    ),
    faces: [
      [0, 2, 8],
      [0, 8, 4],
      [0, 4, 6],
      [0, 6, 10],
      [0, 10, 2],
      [2, 5, 8],
      [8, 5, 9],
      [8, 9, 4],
      [4, 9, 1],
      [4, 1, 6],
      [6, 1, 11],
      [6, 11, 10],
      [10, 11, 7],
      [10, 7, 2],
      [2, 7, 5],
      [3, 5, 7],
      [3, 7, 11],
      [3, 11, 1],
      [3, 1, 9],
      [3, 9, 5],
    ],
  };
}

// ==================== Shape list ====================

export const SHAPES: ShapeType[] = [
  {
    name: "Cuboid",
    params: [
      { key: "width", label: "W", defaultValue: 12, min: 0.5, max: 200, step: 0.5 },
      { key: "height", label: "H", defaultValue: 12, min: 0.5, max: 200, step: 0.5 },
      { key: "depth", label: "D", defaultValue: 30, min: 0.5, max: 200, step: 0.5 },
    ],
    generate: (v) => makeBox(v.width, v.height, v.depth),
  },
  {
    name: "Octahedron",
    params: [
      { key: "size", label: "Size", defaultValue: 10, min: 0.5, max: 100, step: 0.5 },
    ],
    generate: (v) => makeOctahedron(v.size),
  },
  {
    name: "Dodecahedron",
    params: [
      { key: "size", label: "Size", defaultValue: 6, min: 0.5, max: 50, step: 0.5 },
    ],
    generate: (v) => makeDodecahedron(v.size),
  },
  {
    name: "Icosahedron",
    params: [
      { key: "size", label: "Size", defaultValue: 8, min: 0.5, max: 100, step: 0.5 },
    ],
    generate: (v) => makeIcosahedron(v.size),
  },
];
