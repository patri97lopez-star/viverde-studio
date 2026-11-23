import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useViverdeStore } from '../../store/useViverdeStore';
import { DesignElement, Point2D } from '../../types/viverde';
import { getPolygonCentroid, getRectPoints } from '../../utils/calculations';

interface Plan2DViewportProps {
  onRegisterCapture?: (fn: () => string | null) => void;
}

export const Plan2DViewport: React.FC<Plan2DViewportProps> = ({ onRegisterCapture }) => {
  const {
    activeProject,
    selectedElementId,
    selectedSurfaceId,
    selectElement,
    selectSurface,
    updateElement,
    pushUndoSnapshot,
    pendingPlacementProductId,
    drawingSurfaceTool,
    setDrawingSurfaceTool,
    products,
    activeCompanyId,
    addElementToDesign,
    addSurfaceToDesign,
    zoomDelta,
  } = useViverdeStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [polyPoints, setPolyPoints] = useState<Point2D[]>([]);
  const [rectStart, setRectStart] = useState<Point2D | null>(null);
  const [rectCurrent, setRectCurrent] = useState<Point2D | null>(null);

  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === activeCompanyId),
    [products, activeCompanyId],
  );

  useEffect(() => {
    if (!onRegisterCapture) return;
    onRegisterCapture(() => {
      try {
        const w = 900;
        const h = 540;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#ECE8DD';
        ctx.fillRect(0, 0, w, h);

        const padPx = 44;
        const scale = Math.min(
          (w - padPx * 2) / Math.max(1, activeProject.widthM),
          (h - padPx * 2) / Math.max(1, activeProject.lengthM),
        );
        const cx = w / 2;
        const cy = h / 2;
        const toPx = (x: number, z: number): [number, number] => [cx + x * scale, cy + z * scale];

        // Plot rect
        const plotW = activeProject.widthM * scale;
        const plotH = activeProject.lengthM * scale;
        ctx.fillStyle = '#F9F7F1';
        ctx.fillRect(cx - plotW / 2, cy - plotH / 2, plotW, plotH);
        ctx.strokeStyle = '#183D32';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - plotW / 2, cy - plotH / 2, plotW, plotH);

        // Surfaces
        for (const sf of activeProject.surfaces) {
          if (sf.points.length < 3) continue;
          ctx.beginPath();
          sf.points.forEach((pt, idx) => {
            const [px, py] = toPx(pt.x, pt.z);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fillStyle = sf.colorHex || '#A7B9A0';
          ctx.globalAlpha = 0.65;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#303632';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Elements
        for (const el of activeProject.elements) {
          const [px, py] = toPx(el.position.x, el.position.z);
          const rad = Math.max(6, ((el.widthM / 2) * (el.scale || 1)) * scale);
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.fillStyle = el.colorHex || '#6E8267';
          ctx.globalAlpha = 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#183D32';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    });
  }, [onRegisterCapture, activeProject]);

  // Compute SVG viewBox centered around (0,0) in meters
  const pad = 2.2;
  const zoomFactor = Math.max(0.55, Math.min(1.8, 1 - zoomDelta * 0.08));
  const halfW = (activeProject.widthM / 2 + pad) * zoomFactor;
  const halfL = (activeProject.lengthM / 2 + pad) * zoomFactor;

  const clientToWorld = (clientX: number, clientY: number): Point2D => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, z: 0 };
    const rect = svg.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    const x = -halfW + nx * (halfW * 2);
    const z = -halfL + ny * (halfL * 2);
    return {
      x: Number(x.toFixed(2)),
      z: Number(z.toFixed(2)),
    };
  };

  const clampToTerrain = (pt: Point2D): Point2D => {
    const maxW = activeProject.widthM / 2;
    const maxL = activeProject.lengthM / 2;
    return {
      x: Number(Math.max(-maxW, Math.min(maxW, pt.x)).toFixed(2)),
      z: Number(Math.max(-maxL, Math.min(maxL, pt.z)).toFixed(2)),
    };
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = clampToTerrain(clientToWorld(e.clientX, e.clientY));

    // Surface drawing modes
    if (drawingSurfaceTool.active && drawingSurfaceTool.productId) {
      const prod = companyProducts.find((p) => p.id === drawingSurfaceTool.productId);
      if (!prod) return;

      if (drawingSurfaceTool.mode === 'rect') {
        setRectStart(pt);
        setRectCurrent(pt);
      } else {
        setPolyPoints((prev) => [...prev, pt]);
      }
      return;
    }

    // Pending single-click placement
    if (pendingPlacementProductId) {
      const prod = companyProducts.find((p) => p.id === pendingPlacementProductId);
      if (prod) {
        addElementToDesign(prod, pt, 1);
      }
      return;
    }

    if ((e.target as SVGElement).dataset.bg === 'true') {
      selectElement(null);
      selectSurface(null);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = clampToTerrain(clientToWorld(e.clientX, e.clientY));
    if (rectStart && drawingSurfaceTool.active && drawingSurfaceTool.mode === 'rect') {
      setRectCurrent(pt);
      return;
    }
    if (draggingId) {
      updateElement(draggingId, { position: { x: pt.x, y: 0, z: pt.z } }, false);
    }
  };

  const handleSvgPointerUp = () => {
    if (rectStart && rectCurrent && drawingSurfaceTool.active && drawingSurfaceTool.productId) {
      const w = Math.abs(rectCurrent.x - rectStart.x);
      const l = Math.abs(rectCurrent.z - rectStart.z);
      const prod = companyProducts.find((p) => p.id === drawingSurfaceTool.productId);
      if (prod && w >= 0.4 && l >= 0.4) {
        const cx = (rectStart.x + rectCurrent.x) / 2;
        const cz = (rectStart.z + rectCurrent.z) / 2;
        addSurfaceToDesign({
          product: prod,
          points: getRectPoints(cx, cz, w, l),
          shapeType: 'rect',
        });
      }
      setRectStart(null);
      setRectCurrent(null);
    }
    if (draggingId) {
      setDraggingId(null);
    }
  };

  const handleFinishPolygon = () => {
    if (polyPoints.length < 3 || !drawingSurfaceTool.productId) return;
    const prod = companyProducts.find((p) => p.id === drawingSurfaceTool.productId);
    if (prod) {
      addSurfaceToDesign({
        product: prod,
        points: polyPoints,
        shapeType: 'polygon',
      });
    }
    setPolyPoints([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const productId = e.dataTransfer.getData('application/viverde-product-id');
    if (!productId) return;
    const prod = companyProducts.find((p) => p.id === productId);
    if (!prod) return;
    const pt = clampToTerrain(clientToWorld(e.clientX, e.clientY));
    if (prod.unit === 'm2') {
      addSurfaceToDesign({
        product: prod,
        points: getRectPoints(pt.x, pt.z, 3, 3),
        shapeType: 'rect',
      });
    } else {
      addElementToDesign(prod, pt, 1);
    }
  };

  const selectedEl: DesignElement | undefined = activeProject.elements.find(
    (el) => el.id === selectedElementId,
  );

  // Nearest neighbor distance for selected element
  const nearestNeighbor = useMemo(() => {
    if (!selectedEl) return null;
    let best: { el: DesignElement; dist: number } | null = null;
    for (const other of activeProject.elements) {
      if (other.id === selectedEl.id) continue;
      const d = Math.hypot(
        other.position.x - selectedEl.position.x,
        other.position.z - selectedEl.position.z,
      );
      if (!best || d < best.dist) {
        best = { el: other, dist: Number(d.toFixed(2)) };
      }
    }
    return best;
  }, [selectedEl, activeProject.elements]);

  const terrainW = activeProject.widthM;
  const terrainL = activeProject.lengthM;
  const xMin = -terrainW / 2;
  const xMax = terrainW / 2;
  const zMin = -terrainL / 2;
  const zMax = terrainL / 2;

  const gridLinesX: number[] = [];
  for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 1) gridLinesX.push(x);
  const gridLinesZ: number[] = [];
  for (let z = Math.ceil(zMin); z <= Math.floor(zMax); z += 1) gridLinesZ.push(z);

  return (
    <div
      className="relative w-full h-full bg-[#ECE8DD] select-none overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Top 2D Tool Status Bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 border border-[#303632]/15 rounded-lg px-3 py-1.5 text-xs text-[#303632] font-mono tabular-nums">
          Plano 2D · Escala 1 cuadrícula = 1,00 m · Terreno {terrainW} × {terrainL} m ({activeProject.areaM2} m²)
        </div>

        {drawingSurfaceTool.active && (
          <div className="bg-[#183D32] text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
            <span>
              {drawingSurfaceTool.mode === 'rect'
                ? 'Arrastra sobre el plano para dibujar superficie rectangular'
                : `Haz clic en vértices (${polyPoints.length} puntos)`}
            </span>
            {drawingSurfaceTool.mode === 'polygon' && polyPoints.length >= 3 && (
              <button
                type="button"
                onClick={handleFinishPolygon}
                className="px-2 py-0.5 bg-white text-[#183D32] font-semibold rounded cursor-pointer"
              >
                Cerrar polígono
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDrawingSurfaceTool({ active: false, mode: 'rect', productId: null });
                setPolyPoints([]);
              }}
              className="underline cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {pendingPlacementProductId && (
          <div className="bg-[#183D32] text-white rounded-lg px-3 py-1.5 text-xs">
            Haz clic en cualquier punto del plano para colocar el elemento
          </div>
        )}
      </div>

      {/* Bottom Scale Bar */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 border border-[#303632]/15 rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#303632]">
        0 m ━━ 1 m ━━ 2 m · Arrastra plantas desde el catálogo o mueve elementos directamente
      </div>

      <svg
        ref={svgRef}
        viewBox={`${-halfW} ${-halfL} ${halfW * 2} ${halfL * 2}`}
        className="w-full h-full touch-none cursor-crosshair"
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
      >
        {/* Outer surrounding ground */}
        <rect
          x={-halfW * 2}
          y={-halfL * 2}
          width={halfW * 4}
          height={halfL * 4}
          fill="#EAE5D8"
          data-bg="true"
        />

        {/* Terrain plot */}
        <rect
          x={xMin}
          y={zMin}
          width={terrainW}
          height={terrainL}
          fill="#F9F7F1"
          stroke="#183D32"
          strokeWidth={0.08}
          data-bg="true"
        />

        {/* 1m Grid */}
        {gridLinesX.map((gx) => (
          <line
            key={`gx-${gx}`}
            x1={gx}
            y1={zMin}
            x2={gx}
            y2={zMax}
            stroke="#303632"
            strokeOpacity={gx === 0 ? 0.2 : 0.08}
            strokeWidth={0.03}
          />
        ))}
        {gridLinesZ.map((gz) => (
          <line
            key={`gz-${gz}`}
            x1={xMin}
            y1={gz}
            x2={xMax}
            y2={gz}
            stroke="#303632"
            strokeOpacity={gz === 0 ? 0.2 : 0.08}
            strokeWidth={0.03}
          />
        ))}

        {/* Dimension labels */}
        <text
          x={0}
          y={zMin - 0.35}
          textAnchor="middle"
          fontSize={0.38}
          fill="#183D32"
          fontFamily="JetBrains Mono, monospace"
        >
          {terrainW} m
        </text>
        <text
          x={xMin - 0.4}
          y={0}
          textAnchor="middle"
          fontSize={0.38}
          fill="#183D32"
          fontFamily="JetBrains Mono, monospace"
          transform={`rotate(-90 ${xMin - 0.4} 0)`}
        >
          {terrainL} m
        </text>

        {/* Surfaces */}
        {activeProject.surfaces.map((surf) => {
          const pts = surf.points.map((p) => `${p.x},${p.z}`).join(' ');
          const centroid = getPolygonCentroid(surf.points);
          const isSel = selectedSurfaceId === surf.id;
          return (
            <g
              key={surf.id}
              onClick={(e) => {
                e.stopPropagation();
                selectSurface(surf.id);
              }}
              className="cursor-pointer"
            >
              <polygon
                points={pts}
                fill={surf.colorHex || '#A7B9A0'}
                fillOpacity={0.55}
                stroke={isSel ? '#183D32' : surf.includeEdging ? '#8C4A2F' : '#303632'}
                strokeWidth={isSel ? 0.1 : 0.04}
                strokeDasharray={isSel ? '0.18 0.08' : undefined}
              />
              <text
                x={centroid.x}
                y={centroid.z}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={0.34}
                fontWeight="600"
                fill="#183D32"
              >
                {surf.areaM2} m²
              </text>
            </g>
          );
        })}

        {/* Active Rect Preview */}
        {rectStart && rectCurrent && (
          <rect
            x={Math.min(rectStart.x, rectCurrent.x)}
            y={Math.min(rectStart.z, rectCurrent.z)}
            width={Math.abs(rectCurrent.x - rectStart.x)}
            height={Math.abs(rectCurrent.z - rectStart.z)}
            fill="#A7B9A0"
            fillOpacity={0.45}
            stroke="#183D32"
            strokeWidth={0.07}
            strokeDasharray="0.16 0.1"
          />
        )}

        {/* Active Polygon Preview */}
        {polyPoints.length > 0 && (
          <g>
            <polyline
              points={polyPoints.map((p) => `${p.x},${p.z}`).join(' ')}
              fill="none"
              stroke="#183D32"
              strokeWidth={0.07}
            />
            {polyPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.z} r={0.14} fill="#183D32" />
            ))}
          </g>
        )}

        {/* Distance Guide Lines for Selected Element */}
        {selectedEl && (
          <g>
            <line
              x1={selectedEl.position.x}
              y1={selectedEl.position.z}
              x2={xMin}
              y2={selectedEl.position.z}
              stroke="#183D32"
              strokeWidth={0.03}
              strokeDasharray="0.12 0.1"
            />
            <text
              x={(selectedEl.position.x + xMin) / 2}
              y={selectedEl.position.z - 0.15}
              textAnchor="middle"
              fontSize={0.28}
              fill="#183D32"
              fontFamily="JetBrains Mono, monospace"
            >
              {(selectedEl.position.x - xMin).toFixed(1)}m
            </text>

            <line
              x1={selectedEl.position.x}
              y1={selectedEl.position.z}
              x2={selectedEl.position.x}
              y2={zMin}
              stroke="#183D32"
              strokeWidth={0.03}
              strokeDasharray="0.12 0.1"
            />
            <text
              x={selectedEl.position.x + 0.18}
              y={(selectedEl.position.z + zMin) / 2}
              fontSize={0.28}
              fill="#183D32"
              fontFamily="JetBrains Mono, monospace"
            >
              {(selectedEl.position.z - zMin).toFixed(1)}m
            </text>

            {nearestNeighbor && (
              <g>
                <line
                  x1={selectedEl.position.x}
                  y1={selectedEl.position.z}
                  x2={nearestNeighbor.el.position.x}
                  y2={nearestNeighbor.el.position.z}
                  stroke="#8C4A2F"
                  strokeWidth={0.035}
                  strokeDasharray="0.1 0.08"
                />
                <text
                  x={(selectedEl.position.x + nearestNeighbor.el.position.x) / 2}
                  y={(selectedEl.position.z + nearestNeighbor.el.position.z) / 2 - 0.12}
                  textAnchor="middle"
                  fontSize={0.28}
                  fill="#8C4A2F"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {nearestNeighbor.dist}m
                </text>
              </g>
            )}
          </g>
        )}

        {/* Placed Elements */}
        {activeProject.elements.map((el) => {
          const isSel = selectedElementId === el.id;
          const radius = Math.max(0.28, (el.widthM / 2) * (el.scale || 1));
          const isRectStruct =
            el.modelPreset === 'pergola' ||
            el.modelPreset === 'pool' ||
            el.modelPreset === 'balinese_pool' ||
            el.modelPreset === 'rustic_fireplace' ||
            el.modelPreset === 'garden_bench';

          return (
            <g
              key={el.id}
              transform={`translate(${el.position.x}, ${el.position.z}) rotate(${(el.rotationY * 180) / Math.PI})`}
              onPointerDown={(e) => {
                e.stopPropagation();
                pushUndoSnapshot();
                selectElement(el.id);
                setDraggingId(el.id);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              {isRectStruct ? (
                <rect
                  x={-(el.widthM * el.scale) / 2}
                  y={-(el.depthM * el.scale) / 2}
                  width={el.widthM * el.scale}
                  height={el.depthM * el.scale}
                  rx={0.08}
                  fill={el.colorHex || '#7A5438'}
                  fillOpacity={0.75}
                  stroke={isSel ? '#183D32' : '#303632'}
                  strokeWidth={isSel ? 0.09 : 0.04}
                />
              ) : (
                <circle
                  cx={0}
                  cy={0}
                  r={radius}
                  fill={el.colorHex || '#6E8267'}
                  fillOpacity={0.8}
                  stroke={isSel ? '#183D32' : '#303632'}
                  strokeWidth={isSel ? 0.09 : 0.035}
                />
              )}
              <circle cx={0} cy={0} r={0.07} fill="#FFFFFF" />
              {el.quantity > 1 && (
                <text
                  x={radius + 0.12}
                  y={-radius + 0.1}
                  fontSize={0.28}
                  fontWeight="700"
                  fill="#183D32"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ×{el.quantity}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
