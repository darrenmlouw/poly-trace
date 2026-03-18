import type { PolyhedronData, Vertex } from "../types";

/**
 * Parse a JSON string into PolyhedronData.
 * Expected format: { "vertices": [[x,y,z], ...], "faces": [[i,j,k,...], ...] }
 * Also accepts: { "vertices": [{"x":..,"y":..,"z":..}, ...], ... }
 */
export function parseJSON(text: string): PolyhedronData {
  const obj = JSON.parse(text);
  if (!obj.vertices || !obj.faces) {
    throw new Error('JSON must contain "vertices" and "faces" arrays');
  }

  const vertices: Vertex[] = obj.vertices.map((v: number[] | Vertex) => {
    if (Array.isArray(v)) return { x: v[0], y: v[1], z: v[2] };
    return { x: v.x, y: v.y, z: v.z };
  });

  const faces: number[][] = obj.faces.map((f: number[]) => [...f]);

  if (vertices.length < 4) throw new Error("Need at least 4 vertices");
  if (faces.length < 4) throw new Error("Need at least 4 faces");

  return { vertices, faces };
}

/**
 * Parse a simple OBJ string (v / f lines) into PolyhedronData.
 * OBJ face indices are 1-based; we convert to 0-based.
 */
export function parseOBJ(text: string): PolyhedronData {
  const vertices: Vertex[] = [];
  const faces: number[][] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("v ")) {
      const parts = line.split(/\s+/).slice(1).map(Number);
      vertices.push({ x: parts[0], y: parts[1], z: parts[2] });
    } else if (line.startsWith("f ")) {
      const parts = line
        .split(/\s+/)
        .slice(1)
        .map((tok) => {
          const idx = parseInt(tok.split("/")[0], 10);
          return idx - 1; // OBJ is 1-based
        });
      faces.push(parts);
    }
  }

  if (vertices.length < 4) throw new Error("OBJ has fewer than 4 vertices");
  if (faces.length < 4) throw new Error("OBJ has fewer than 4 faces");

  return { vertices, faces };
}

/**
 * Detect format and parse.
 */
export function parseFile(text: string, filename: string): PolyhedronData {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "obj") return parseOBJ(text);
  return parseJSON(text);
}
