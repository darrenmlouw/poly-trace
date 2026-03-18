import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import PolyhedronMesh from "./PolyhedronMesh";
import { useAppState } from "../state/AppState";
import { Card, CardContent } from "@/components/ui/card";
import { usePanelBgColor } from "../hooks/use-panel-bg-color";

export default function Viewport() {
  const { polyhedron } = useAppState();

  const camPos = useMemo(() => {
    let maxR = 1;
    for (const v of polyhedron.vertices) {
      const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      if (r > maxR) maxR = r;
    }
    const d = maxR * 1.8;
    return [d * 0.8, d * 0.6, d] as [number, number, number];
  }, [polyhedron]);

  const bgColor = usePanelBgColor();
  return (
    <Card className="w-full h-full overflow-hidden" style={{ backgroundColor: bgColor }}>
      <CardContent className="p-0 w-full h-full">
        <Canvas
          camera={{ position: camPos, fov: 50 }}
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={[bgColor]} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[50, 50, 50]} intensity={0.8} />
          <directionalLight position={[-30, -30, 20]} intensity={0.3} />

          <PolyhedronMesh />

          <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        </Canvas>
      </CardContent>
    </Card>
  );
}
