import { useCallback, useRef } from "react";
import { useAppState } from "../state/AppState";
import { SHAPES } from "../utils/presets";
import { parseFile } from "../utils/parsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Box,
  RotateCcw,
  Upload,
  Grid3X3,
  MapPin,
  Route,
} from "lucide-react";

export default function ControlPanel() {
  const {
    shapeIndex,
    setShapeIndex,
    shapeParams,
    setShapeParam,
    currentShape,
    setCustomPoly,
    polyhedron,
    gridSpacing,
    setGridSpacing,
    rotationSpeed,
    setRotationSpeed,
    wireframe,
    toggleWireframe,
    resetPoints,
    selectingPoint,
    pointA,
    pointB,
    path,
  } = useAppState();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = parseFile(reader.result as string, file.name);
          setCustomPoly(data);
          resetPoints();
        } catch (err) {
          alert(`Failed to parse file: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    },
    [setCustomPoly, resetPoints]
  );

  const pathLength =
    path.length >= 2
      ? path
          .reduce((sum, p, i) => {
            if (i === 0) return 0;
            return sum + p.distanceTo(path[i - 1]);
          }, 0)
          .toFixed(3)
      : null;

  const colsClass =
    currentShape.params.length >= 3
      ? "grid-cols-3"
      : currentShape.params.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <>
      {/* Shape selection */}
      <SidebarGroup>
        <SidebarGroupLabel>
          <Box className="h-3.5 w-3.5 mr-2" />
          Shape
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex flex-wrap gap-2 px-2">
                {SHAPES.map((shape, i) => (
                  <Button
                    key={shape.name}
                    variant={i === shapeIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setShapeIndex(i);
                      resetPoints();
                    }}
                    className="h-7 px-4 text-xs rounded-full"
                  >
                    {shape.name}
                  </Button>
                ))}
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Dimensions */}
      <SidebarGroup>
        <SidebarGroupLabel>Dimensions</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className={`grid gap-3 px-2 ${colsClass}`}>
            {currentShape.params.map((param) => (
              <div key={param.key} className="space-y-1.5">
                <Label className="text-[11px]">{param.label}</Label>
                <Input
                  type="number"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={shapeParams[param.key] ?? param.defaultValue}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v > 0) {
                      setShapeParam(param.key, v);
                      resetPoints();
                    }
                  }}
                  className="h-8 text-xs bg-muted/50"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 px-2 flex-wrap">
            <Badge variant="outline">{polyhedron.vertices.length} vertices</Badge>
            <Badge variant="outline">
              {new Set(
                polyhedron.faces.flatMap((f) =>
                  f.map((v, i) => [Math.min(v, f[(i + 1) % f.length]), Math.max(v, f[(i + 1) % f.length])].join(","))
                )
              ).size}{" "}
              edges
            </Badge>
            <Badge variant="outline">{polyhedron.faces.length} faces</Badge>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Grid spacing */}
      <SidebarGroup>
        <SidebarGroupLabel>
          <Grid3X3 className="h-3.5 w-3.5 mr-2" />
          Grid Snap: {gridSpacing}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 pt-1 pb-1">
            <Slider
              min={0.5}
              max={5}
              step={0.5}
              value={[gridSpacing]}
              onValueChange={(v) => {
                const val = Array.isArray(v) ? v[0] : v;
                setGridSpacing(val);
                resetPoints();
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 px-2">
            Grid cell size in units. Quads use a square grid; other faces use barycentric.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* File upload */}
      <SidebarGroup>
        <SidebarGroupLabel>
          <Upload className="h-3.5 w-3.5 mr-2" />
          Import
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2">
            <Input
              ref={fileRef}
              type="file"
              accept=".json,.obj"
              onChange={handleFile}
              className="h-8 text-xs cursor-pointer file:text-xs file:font-medium bg-muted/50"
            />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Rotation speed */}
      <SidebarGroup>
        <SidebarGroupLabel>Auto-Rotate: {rotationSpeed.toFixed(1)}</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 pt-1 pb-1">
            <Slider
              min={0}
              max={3}
              step={0.1}
              value={[rotationSpeed]}
              onValueChange={(v) => setRotationSpeed(Array.isArray(v) ? v[0] : v)}
            />
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Wireframe + Reset */}
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex items-center gap-2 px-2">
            <Button
              variant={wireframe ? "default" : "outline"}
              size="sm"
              onClick={toggleWireframe}
              className="h-8 px-3 text-xs"
            >
              {wireframe ? "Wireframe ON" : "Wireframe OFF"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={resetPoints}
              className="h-8 px-3 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Separator />

      {/* Point selection */}
      <SidebarGroup>
        <SidebarGroupLabel>
          <MapPin className="h-3.5 w-3.5 mr-2" />
          Surface Points
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="space-y-2 px-2">
            <PointStatus
              label="Point A"
              set={!!pointA}
              active={selectingPoint === "A"}
              colorClass="text-green-400"
              dotClass="bg-green-400"
            />
            <PointStatus
              label="Point B"
              set={!!pointB}
              active={selectingPoint === "B"}
              colorClass="text-red-400"
              dotClass="bg-red-400"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 px-2">
            Click the surface to place points.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Path info */}
      {pathLength && (
        <>
          <Separator />
          <SidebarGroup>
            <SidebarGroupLabel>
              <Route className="h-3.5 w-3.5 mr-2" />
              Geodesic Path
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2">
                <p className="text-primary font-mono text-sm font-semibold">
                  Length: {pathLength}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {path.length} waypoints · face-unfolding
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </>
  );
}

function PointStatus({
  label,
  set,
  active,
  colorClass,
  dotClass,
}: {
  label: string;
  set: boolean;
  active: boolean;
  colorClass: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-2 h-2 rounded-full ${set ? dotClass : "bg-muted"}`}
      />
      <span className={set ? colorClass : "text-muted-foreground"}>
        {label}: {set ? "Set" : active ? "Click to place..." : "Waiting"}
      </span>
    </div>
  );
}
