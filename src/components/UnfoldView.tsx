import { useMemo, useRef, useState, useEffect } from "react";
import { useAppState } from "../state/AppState";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UnfoldingViz } from "../utils/pathfinding";

const FACE_COLORS = [
  "#4299e1", "#48bb78", "#ed8936", "#e53e3e",
  "#9f7aea", "#38b2ac", "#d69e2e", "#667eea",
  "#f56565", "#68d391", "#fc8181", "#63b3ed",
];

interface SvgData {
  unf: UnfoldingViz;
  w: number;
  h: number;
  tx: (x: number) => number;
  ty: (y: number) => number;
}

function prepSvg(unf: UnfoldingViz): SvgData {
  const { facePolys, a2, b2 } = unf;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const f of facePolys) {
    for (const [x, y] of f.verts) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  for (const p of [a2, b2]) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }

  const pad = Math.max(maxX - minX, maxY - minY) * 0.1 + 0.5;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  return {
    unf,
    w: maxX - minX,
    h: maxY - minY,
    tx: (x: number) => x - minX,
    ty: (y: number) => maxY - y,
  };
}

function UnfoldCard({ data, isBest, cardHeight }: { data: SvgData; isBest: boolean; cardHeight: number | null }) {
  const { unf, w, h, tx, ty } = data;
  const { facePolys, edges, a2, b2, length } = unf;
  const r = Math.max(w, h) * 0.015;
  const sw = r * 0.25;
  const lineColor = isBest ? "#facc15" : "#94a3b8";
  const labelFontSize = Math.max(w, h) * 0.045;

  return (
    <Card
      size="sm"
      className="shrink-0"
      style={{ height: cardHeight ?? undefined, ...(isBest ? { boxShadow: "0 0 0 1.5px #3b82f6" } : {}) }}
    >
      <CardHeader>
        <CardTitle className={isBest ? "text-primary" : "text-muted-foreground"}>
          {isBest ? "Shortest" : `#${unf.rank + 1}`}
        </CardTitle>
        <CardAction>
          <span className={`font-mono text-sm ${isBest ? "text-primary" : "text-muted-foreground"}`}>
            {length.toFixed(3)}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center justify-center flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%" }}
        >
          {/* Face polygons */}
          {facePolys.map((f, i) => {
            const pts = f.verts.map(([x, y]) => `${tx(x)},${ty(y)}`).join(" ");
            return (
              <polygon
                key={i}
                points={pts}
                fill={FACE_COLORS[f.faceIdx % FACE_COLORS.length]}
                fillOpacity={isBest ? 0.35 : 0.2}
                stroke={FACE_COLORS[f.faceIdx % FACE_COLORS.length]}
                strokeWidth={w * 0.003}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Fold lines */}
          {edges.map((e, i) => (
            <line
              key={`e${i}`}
              x1={tx(e.p1[0])} y1={ty(e.p1[1])}
              x2={tx(e.p2[0])} y2={ty(e.p2[1])}
              stroke="#fff"
              strokeWidth={w * 0.003}
              strokeOpacity={0.35}
              strokeDasharray={`${w * 0.012} ${w * 0.008}`}
            />
          ))}

          {/* Geodesic line */}
          <line
            x1={tx(a2[0])} y1={ty(a2[1])}
            x2={tx(b2[0])} y2={ty(b2[1])}
            stroke={lineColor}
            strokeWidth={w * (isBest ? 0.006 : 0.004)}
            strokeLinecap="round"
            strokeOpacity={isBest ? 1 : 0.7}
          />

          {/* Length label at midpoint, following line angle */}
          {(() => {
            const mx = (tx(a2[0]) + tx(b2[0])) / 2;
            const my = (ty(a2[1]) + ty(b2[1])) / 2;
            let angle = Math.atan2(ty(b2[1]) - ty(a2[1]), tx(b2[0]) - tx(a2[0])) * (180 / Math.PI);
            // Keep text readable (not upside-down)
            if (angle > 90) angle -= 180;
            if (angle < -90) angle += 180;
            const offset = labelFontSize * 0.4;
            return (
              <text
                x={mx}
                y={my - offset}
                fill={lineColor}
                fontSize={labelFontSize * 0.7}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
                transform={`rotate(${angle}, ${mx}, ${my - offset})`}
              >
                {parseFloat(length.toFixed(2))}
              </text>
            );
          })()}

          {/* Point A */}
          <circle cx={tx(a2[0])} cy={ty(a2[1])} r={r} fill="#22c55e" stroke="#fff" strokeWidth={sw} />
          <text x={tx(a2[0]) + r * 1.8} y={ty(a2[1]) - r * 0.5} fill="#22c55e" fontSize={r * 2.5} fontWeight="bold">A</text>

          {/* Point B */}
          <circle cx={tx(b2[0])} cy={ty(b2[1])} r={r} fill="#ef4444" stroke="#fff" strokeWidth={sw} />
          <text x={tx(b2[0]) + r * 1.8} y={ty(b2[1]) - r * 0.5} fill="#ef4444" fontSize={r * 2.5} fontWeight="bold">B</text>
        </svg>
      </CardContent>
    </Card>
  );
}

export default function UnfoldView() {
  const { unfoldings, totalCandidates } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerH(entry.contentRect.height);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const svgs = useMemo(
    () => unfoldings.map((u) => prepSvg(u)),
    [unfoldings]
  );

  // On mobile (<768px): 1 card at a time = full container height
  // On desktop: 2 cards at a time = half (minus gap and padding)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const gap = 12; // gap-3 = 0.75rem = 12px
  const border = 2; // p-px = 1px top + 1px bottom
  const cardHeight = containerH > 0
    ? (isMobile ? containerH - border : (containerH - gap - border) / 2)
    : null;

  if (svgs.length === 0) {
    return (
      <div ref={containerRef} className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
        Place two points to see the unfolding
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col gap-3 p-px pr-4">
          {svgs.map((s, i) => (
            <UnfoldCard key={i} data={s} isBest={i === 0} cardHeight={cardHeight} />
          ))}
          {totalCandidates > svgs.length && (
            <p className="text-center text-xs text-muted-foreground py-1">
              Showing {svgs.length} of {totalCandidates} unfoldings
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
