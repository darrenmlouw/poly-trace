import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useAppState } from "../state/AppState";

/** Renders the shortest-path line and the two selected endpoint markers. */
export default function PathOverlay() {
  const { pointA, pointB, path, scale, hoverPoint } = useAppState();

  const linePoints = useMemo(() => {
    if (path.length < 2) return null;
    return path.map((p) => p.toArray() as [number, number, number]);
  }, [path]);

  return (
    <group scale={[scale, scale, scale]}>
      {/* Path line */}
      {linePoints && (
        <Line
          points={linePoints}
          color="#facc15"
          lineWidth={6}
          depthTest={false}
        />
      )}

      {/* Hover preview dot */}
      {hoverPoint && (
        <mesh position={hoverPoint}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.7}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Point A marker */}
      {pointA && (
        <mesh position={pointA.position}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#22c55e" depthTest={false} />
        </mesh>
      )}

      {/* Point B marker */}
      {pointB && (
        <mesh position={pointB.position}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshBasicMaterial color="#ef4444" depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
