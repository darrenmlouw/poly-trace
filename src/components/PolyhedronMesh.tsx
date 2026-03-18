import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useAppState } from "../state/AppState";
import { buildGeometry, buildEdgesGeometry } from "../utils/geometry";
import { computeGeodesicPath, findFaceForPoint } from "../utils/pathfinding";
import { buildFaceGridGeometry, snapToFaceGrid } from "../utils/gridUtils";

// Palette for face colouring – cycles for shapes with many faces
const FACE_COLORS = [
  "#4299e1", "#48bb78", "#ed8936", "#e53e3e",
  "#9f7aea", "#38b2ac", "#d69e2e", "#667eea",
  "#f56565", "#68d391", "#fc8181", "#63b3ed",
];

export default function PolyhedronMesh() {
  const {
    polyhedron,
    pointA,
    pointB,
    setPointA,
    setPointB,
    selectingPoint,
    setSelectingPoint,
    setPath,
    setUnfoldings,
    setTotalCandidates,
    scale,
    rotationSpeed,
    wireframe,
    gridSpacing,
    setHoverPoint,
    path,
    hoverPoint,
  } = useAppState();

  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Shared no-op raycast to keep marker / overlay meshes out of intersection list
  const noRaycast = useCallback(() => {}, []);

  // Indexed geometry used for raycasting
  const geometry = useMemo(() => buildGeometry(polyhedron), [polyhedron]);

  // Edge-line geometry
  const edgesGeo = useMemo(() => buildEdgesGeometry(polyhedron), [polyhedron]);

  // Face grid geometry
  const gridGeo = useMemo(
    () => buildFaceGridGeometry(polyhedron, gridSpacing),
    [polyhedron, gridSpacing],
  );

  // Triangle → original-face mapping (for per-face colouring)
  const triToFace = useMemo(() => {
    const map: number[] = [];
    for (let fi = 0; fi < polyhedron.faces.length; fi++) {
      const numTris = polyhedron.faces[fi].length - 2;
      for (let t = 0; t < numTris; t++) map.push(fi);
    }
    return map;
  }, [polyhedron]);

  // Non-indexed geometry with per-face vertex colours
  const coloredGeo = useMemo(() => {
    const geo = geometry.clone().toNonIndexed();
    const count = geo.getAttribute("position").count;
    const colors = new Float32Array(count * 3);

    const palette = FACE_COLORS.map((hex) => new THREE.Color(hex));

    for (let tri = 0; tri < count / 3; tri++) {
      const faceIdx = triToFace[tri] ?? 0;
      const col = palette[faceIdx % palette.length];
      for (let v = 0; v < 3; v++) {
        const off = (tri * 3 + v) * 3;
        colors[off] = col.r;
        colors[off + 1] = col.g;
        colors[off + 2] = col.b;
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [geometry, triToFace]);

  // Auto-rotate
  useFrame((_, delta) => {
    if (groupRef.current && rotationSpeed > 0) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  // Compute geodesic path when both points are placed
  useEffect(() => {
    if (!pointA || !pointB) return;
    const result = computeGeodesicPath(
      polyhedron,
      pointA.position,
      pointA.faceIndex,
      pointB.position,
      pointB.faceIndex,
    );
    setPath(result.path);
    setUnfoldings(result.unfoldings);
    setTotalCandidates(result.totalCandidates);
  }, [pointA, pointB, polyhedron, setPath, setUnfoldings, setTotalCandidates]);

  // Hover → show snap preview dot
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      const intersect = event.intersections.find((i) => i.object === meshRef.current);
      if (!intersect) { setHoverPoint(null); return; }

      const point = intersect.point.clone();
      if (groupRef.current) groupRef.current.worldToLocal(point);

      const fi = intersect.faceIndex != null
        ? (triToFace[intersect.faceIndex] ?? findFaceForPoint(point, polyhedron))
        : findFaceForPoint(point, polyhedron);
      const snapped = snapToFaceGrid(point, fi, polyhedron, gridSpacing);
      setHoverPoint(snapped);
    },
    [polyhedron, gridSpacing, setHoverPoint, triToFace],
  );

  const handlePointerLeave = useCallback(() => setHoverPoint(null), [setHoverPoint]);

  // Path line points (local coordinates)
  const linePoints = useMemo(() => {
    if (path.length < 2) return null;
    return path.map((p) => p.toArray() as [number, number, number]);
  }, [path]);

  // Path line geometry (raw BufferGeometry for reliable depthTest control)
  const pathGeo = useMemo(() => {
    if (!linePoints) return null;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(linePoints.length * 3);
    for (let i = 0; i < linePoints.length; i++) {
      positions[i * 3] = linePoints[i][0];
      positions[i * 3 + 1] = linePoints[i][1];
      positions[i * 3 + 2] = linePoints[i][2];
    }
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [linePoints]);
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const intersect = event.intersections.find((i) => i.object === meshRef.current);
      if (!intersect) return;

      const point = intersect.point.clone();
      if (groupRef.current) {
        groupRef.current.worldToLocal(point);
      }

      const faceIndex = intersect.faceIndex != null
        ? (triToFace[intersect.faceIndex] ?? findFaceForPoint(point, polyhedron))
        : findFaceForPoint(point, polyhedron);
      const snapped = snapToFaceGrid(point, faceIndex, polyhedron, gridSpacing);
      const surfacePoint = { position: snapped, faceIndex };

      if (selectingPoint === "A") {
        setPointA(surfacePoint);
        setSelectingPoint("B");
      } else {
        setPointB(surfacePoint);
        setSelectingPoint("A");
      }
    },
    [selectingPoint, setPointA, setPointB, setSelectingPoint, polyhedron, gridSpacing, triToFace],
  );

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      <mesh
        ref={meshRef}
        geometry={coloredGeo}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          wireframe={wireframe}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      {/* Face grid */}
      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </lineSegments>

      {/* Edges */}
      {!wireframe && (
        <lineSegments geometry={edgesGeo}>
          <lineBasicMaterial color="black" linewidth={1} />
        </lineSegments>
      )}

      {/* Path line */}
      {pathGeo && (
        <primitive object={new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: "#ffee00", depthTest: false }))} renderOrder={999} />
      )}

      {/* Hover preview dot */}
      {hoverPoint && (
        <mesh position={hoverPoint} renderOrder={999} raycast={noRaycast}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshBasicMaterial color="#fbbf24" depthTest={false} />
        </mesh>
      )}

      {/* Point A marker */}
      {pointA && (
        <group position={pointA.position}>
          {/* White outline (thin ring) */}
          <mesh renderOrder={1000} raycast={noRaycast}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color="#ffffff" depthTest={false} />
          </mesh>
          {/* Colored fill */}
          <mesh renderOrder={1001} raycast={noRaycast}>
            <sphereGeometry args={[0.27, 16, 16]} />
            <meshBasicMaterial color="#22c55e" depthTest={false} />
          </mesh>
          {/* Label */}
          <Html
            position={[0, 0, 0]}
            center
            zIndexRange={[1, 0]}
            style={{ pointerEvents: "none", userSelect: "none", transform: "translate(18px, -18px)" }}
          >
            <span style={{
              color: "#22c55e",
              fontWeight: 700,
              fontSize: 16,
              textShadow: "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.6)",
            }}>A</span>
          </Html>
        </group>
      )}

      {/* Point B marker */}
      {pointB && (
        <group position={pointB.position}>
          {/* White outline (thin ring) */}
          <mesh renderOrder={1000} raycast={noRaycast}>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color="#ffffff" depthTest={false} />
          </mesh>
          {/* Colored fill */}
          <mesh renderOrder={1001} raycast={noRaycast}>
            <sphereGeometry args={[0.27, 16, 16]} />
            <meshBasicMaterial color="#ef4444" depthTest={false} />
          </mesh>
          {/* Label */}
          <Html
            position={[0, 0, 0]}
            center
            zIndexRange={[1, 0]}
            style={{ pointerEvents: "none", userSelect: "none", transform: "translate(18px, -18px)" }}
          >
            <span style={{
              color: "#ef4444",
              fontWeight: 700,
              fontSize: 16,
              textShadow: "0 0 6px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,0.8), 0 0 1px rgba(0,0,0,0.6)",
            }}>B</span>
          </Html>
        </group>
      )}
    </group>
  );
}
