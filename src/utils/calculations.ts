import {
  DesignElement,
  DesignSurface,
  Point2D,
  QuantityAssumptions,
  QuoteLineItem,
} from '../types/viverde';

export function calculatePolygonAreaAndPerimeter(points: Point2D[]): {
  areaM2: number;
  perimeterM: number;
} {
  if (points.length < 3) {
    return { areaM2: 0, perimeterM: 0 };
  }
  let areaSum = 0;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    areaSum += p1.x * p2.z - p2.x * p1.z;
    perimeter += Math.hypot(p2.x - p1.x, p2.z - p1.z);
  }
  return {
    areaM2: Number((Math.abs(areaSum) / 2).toFixed(2)),
    perimeterM: Number(perimeter.toFixed(2)),
  };
}

export function getRectPoints(centerX: number, centerZ: number, widthM: number, lengthM: number): Point2D[] {
  const hw = widthM / 2;
  const hl = lengthM / 2;
  return [
    { x: Number((centerX - hw).toFixed(2)), z: Number((centerZ - hl).toFixed(2)) },
    { x: Number((centerX + hw).toFixed(2)), z: Number((centerZ - hl).toFixed(2)) },
    { x: Number((centerX + hw).toFixed(2)), z: Number((centerZ + hl).toFixed(2)) },
    { x: Number((centerX - hw).toFixed(2)), z: Number((centerZ + hl).toFixed(2)) },
  ];
}

export function getPolygonCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, z: 0 };
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
  return {
    x: Number((sum.x / points.length).toFixed(2)),
    z: Number((sum.z / points.length).toFixed(2)),
  };
}

export interface MaterialEstimateSummary {
  totalSurfaceM2: number;
  lawnM2: number;
  gravelM2: number;
  barkM2: number;
  bedsM2: number;
  topsoilVolumeM3: number;
  gravelVolumeM3: number;
  edgingLengthMl: number;
  estimatedPlantsForBeds: number;
  estimatedTopsoilCost: number;
  estimatedEdgingCost: number;
}

export function calculateQuantityEstimates(
  surfaces: DesignSurface[],
  assumptions: QuantityAssumptions,
): MaterialEstimateSummary {
  let lawnM2 = 0;
  let gravelM2 = 0;
  let barkM2 = 0;
  let bedsM2 = 0;
  let edgingLengthMl = 0;

  for (const s of surfaces) {
    if (s.materialType === 'cesped_natural' || s.materialType === 'cesped_artificial') {
      lawnM2 += s.areaM2;
    } else if (s.materialType === 'grava') {
      gravelM2 += s.areaM2;
    } else if (s.materialType === 'corteza') {
      barkM2 += s.areaM2;
    } else if (s.materialType === 'parterre') {
      bedsM2 += s.areaM2;
    }
    if (s.includeEdging) {
      edgingLengthMl += s.perimeterM;
    }
  }

  const totalSurfaceM2 = Number(
    surfaces.reduce((acc, s) => acc + s.areaM2, 0).toFixed(2),
  );
  const plantedAreaM2 = lawnM2 + bedsM2;
  const topsoilVolumeM3 = Number(
    ((plantedAreaM2 * assumptions.topsoilThicknessCm) / 100).toFixed(2),
  );
  const gravelVolumeM3 = Number(
    ((gravelM2 * assumptions.gravelDepthCm) / 100).toFixed(2),
  );
  const spacingM = Math.max(0.15, assumptions.plantSpacingCm / 100);
  const estimatedPlantsForBeds =
    bedsM2 > 0 ? Math.ceil(bedsM2 / (spacingM * spacingM)) : 0;

  const estimatedTopsoilCost = Number(
    (topsoilVolumeM3 * assumptions.topsoilPricePerM3).toFixed(2),
  );
  const estimatedEdgingCost = Number(
    (edgingLengthMl * assumptions.edgingProductPricePerMl).toFixed(2),
  );

  return {
    totalSurfaceM2,
    lawnM2: Number(lawnM2.toFixed(2)),
    gravelM2: Number(gravelM2.toFixed(2)),
    barkM2: Number(barkM2.toFixed(2)),
    bedsM2: Number(bedsM2.toFixed(2)),
    topsoilVolumeM3,
    gravelVolumeM3,
    edgingLengthMl: Number(edgingLengthMl.toFixed(2)),
    estimatedPlantsForBeds,
    estimatedTopsoilCost,
    estimatedEdgingCost,
  };
}

function mapCategoryGroup(
  category: DesignElement['category'],
  preset: string,
): QuoteLineItem['categoryGroup'] {
  if (category === 'arboles' || category === 'arbustos' || category === 'plantas') {
    return 'plantas_arboles';
  }
  if (category === 'flores') return 'flores';
  if (category === 'cesped') return 'cesped';
  if (preset === 'pergola' || preset === 'pool' || preset === 'garden_bench' || preset === 'garden_light' || preset === 'terracotta_pot') {
    return 'decorativos';
  }
  return 'materiales';
}

export function buildQuoteLineItemsFromDesign(
  elements: DesignElement[],
  surfaces: DesignSurface[],
  assumptions: QuantityAssumptions,
): QuoteLineItem[] {
  const grouped = new Map<string, QuoteLineItem>();

  for (const el of elements) {
    const existing = grouped.get(el.productId);
    const qty = el.quantity || 1;
    if (existing) {
      existing.quantity += qty;
      existing.total = Number((existing.quantity * existing.unitPrice).toFixed(2));
    } else {
      grouped.set(el.productId, {
        id: `line-${el.productId}`,
        productId: el.productId,
        name: el.name,
        categoryGroup: mapCategoryGroup(el.category, el.modelPreset),
        quantity: qty,
        unit: el.unit,
        unitPrice: el.unitPrice,
        total: Number((qty * el.unitPrice).toFixed(2)),
      });
    }
  }

  for (const surf of surfaces) {
    const key = `surf-${surf.productId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity = Number((existing.quantity + surf.areaM2).toFixed(2));
      existing.total = Number((existing.quantity * existing.unitPrice).toFixed(2));
    } else {
      grouped.set(key, {
        id: `line-${key}`,
        productId: surf.productId,
        name: surf.name,
        categoryGroup:
          surf.materialType === 'cesped_natural' || surf.materialType === 'cesped_artificial'
            ? 'cesped'
            : 'materiales',
        quantity: Number(surf.areaM2.toFixed(2)),
        unit: 'm2',
        unitPrice: surf.unitPrice,
        total: Number((surf.areaM2 * surf.unitPrice).toFixed(2)),
      });
    }
  }

  const estimates = calculateQuantityEstimates(surfaces, assumptions);
  if (assumptions.includeTopsoilEstimate && estimates.topsoilVolumeM3 > 0) {
    grouped.set('est-topsoil', {
      id: 'line-est-topsoil',
      productId: 'est-topsoil',
      name: `Tierra vegetal estimada (${assumptions.topsoilThicknessCm} cm espesor)`,
      categoryGroup: 'materiales',
      quantity: estimates.topsoilVolumeM3,
      unit: 'm3',
      unitPrice: assumptions.topsoilPricePerM3,
      total: estimates.estimatedTopsoilCost,
    });
  }
  if (assumptions.includeEdgingEstimate && estimates.edgingLengthMl > 0) {
    grouped.set('est-edging', {
      id: 'line-est-edging',
      productId: 'est-edging',
      name: 'Bordura perimetral acero Corten (calculada por perímetro)',
      categoryGroup: 'materiales',
      quantity: estimates.edgingLengthMl,
      unit: 'ml',
      unitPrice: assumptions.edgingProductPricePerMl,
      total: estimates.estimatedEdgingCost,
    });
  }

  return Array.from(grouped.values());
}

export function calculateQuoteTotals(params: {
  items: QuoteLineItem[];
  discountPercent: number;
  transportCost: number;
  laborCost: number;
  installationCost: number;
  vatRate: number;
}) {
  const subtotal = Number(
    params.items.reduce((acc, item) => acc + item.total, 0).toFixed(2),
  );
  const discountAmount = Number(
    ((subtotal * Math.max(0, Math.min(100, params.discountPercent))) / 100).toFixed(2),
  );
  const taxableBase = Math.max(
    0,
    subtotal - discountAmount + params.transportCost + params.laborCost + params.installationCost,
  );
  const vatAmount = Number(((taxableBase * params.vatRate) / 100).toFixed(2));
  const total = Number((taxableBase + vatAmount).toFixed(2));
  return {
    subtotal,
    discountAmount,
    vatAmount,
    total,
  };
}

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
