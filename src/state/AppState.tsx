import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { PolyhedronData, SurfacePoint } from "../types";
import { SHAPES, type ShapeType } from "../utils/presets";
import type { UnfoldingViz } from "../utils/pathfinding";

function defaultParams(shape: ShapeType): Record<string, number> {
  const p: Record<string, number> = {};
  for (const param of shape.params) p[param.key] = param.defaultValue;
  return p;
}

interface AppState {
  polyhedron: PolyhedronData;

  shapeIndex: number;
  setShapeIndex: (i: number) => void;
  shapeParams: Record<string, number>;
  setShapeParam: (key: string, value: number) => void;
  currentShape: ShapeType;

  customPoly: PolyhedronData | null;
  setCustomPoly: (p: PolyhedronData | null) => void;

  gridSpacing: number;
  setGridSpacing: (s: number) => void;

  hoverPoint: THREE.Vector3 | null;
  setHoverPoint: (p: THREE.Vector3 | null) => void;

  pointA: SurfacePoint | null;
  pointB: SurfacePoint | null;
  setPointA: (p: SurfacePoint | null) => void;
  setPointB: (p: SurfacePoint | null) => void;
  selectingPoint: "A" | "B";
  setSelectingPoint: (s: "A" | "B") => void;

  path: THREE.Vector3[];
  setPath: (p: THREE.Vector3[]) => void;

  unfoldings: UnfoldingViz[];
  setUnfoldings: (u: UnfoldingViz[]) => void;
  totalCandidates: number;
  setTotalCandidates: (n: number) => void;

  scale: number;
  setScale: (s: number) => void;
  rotationSpeed: number;
  setRotationSpeed: (s: number) => void;
  wireframe: boolean;
  toggleWireframe: () => void;

  resetPoints: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [shapeIndex, setShapeIndexRaw] = useState(0); // "Cuboid" by default
  const [shapeParams, setShapeParams] = useState<Record<string, number>>(
    defaultParams(SHAPES[0])
  );
  const [customPoly, setCustomPoly] = useState<PolyhedronData | null>(null);

  const currentShape = SHAPES[shapeIndex];

  const setShapeIndex = useCallback((i: number) => {
    setShapeIndexRaw(i);
    setShapeParams(defaultParams(SHAPES[i]));
    setCustomPoly(null);
  }, []);

  const setShapeParam = useCallback((key: string, value: number) => {
    setShapeParams((prev) => ({ ...prev, [key]: value }));
    setCustomPoly(null);
  }, []);

  const generatedPoly = useMemo(
    () => currentShape.generate(shapeParams),
    [currentShape, shapeParams]
  );

  const polyhedron = customPoly ?? generatedPoly;

  const [gridSpacing, setGridSpacing] = useState(1);
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null);

  const [pointA, setPointA] = useState<SurfacePoint | null>(null);
  const [pointB, setPointB] = useState<SurfacePoint | null>(null);
  const [selectingPoint, setSelectingPoint] = useState<"A" | "B">("A");
  const [path, setPath] = useState<THREE.Vector3[]>([]);
  const [unfoldings, setUnfoldings] = useState<UnfoldingViz[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [wireframe, setWireframe] = useState(false);

  const toggleWireframe = useCallback(() => setWireframe((w) => !w), []);
  const resetPoints = useCallback(() => {
    setPointA(null);
    setPointB(null);
    setPath([]);
    setUnfoldings([]);
    setTotalCandidates(0);
    setSelectingPoint("A");
  }, []);

  return (
    <Ctx.Provider
      value={{
        polyhedron,
        shapeIndex,
        setShapeIndex,
        shapeParams,
        setShapeParam,
        currentShape,
        customPoly,
        setCustomPoly,
        gridSpacing,
        setGridSpacing,
        hoverPoint,
        setHoverPoint,
        pointA,
        pointB,
        setPointA,
        setPointB,
        selectingPoint,
        setSelectingPoint,
        path,
        setPath,
        unfoldings,
        setUnfoldings,
        totalCandidates,
        setTotalCandidates,
        scale,
        setScale,
        rotationSpeed,
        setRotationSpeed,
        wireframe,
        toggleWireframe,
        resetPoints,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
