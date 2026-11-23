import {
  DesignElement,
  DesignSurface,
  DesignStyle,
  Product,
  Project,
  SpaceType,
} from '../types/viverde';
import { calculatePolygonAreaAndPerimeter, getRectPoints } from '../utils/calculations';

export type GardenTemplateId =
  | 'mediterraneo'
  | 'moderno'
  | 'tropical'
  | 'minimalista'
  | 'rustico'
  | 'bajo_mantenimiento'
  | 'piscina_balinesa'
  | 'terraza';

export interface GardenStyleTemplateMeta {
  id: GardenTemplateId;
  title: string;
  style: DesignStyle;
  spaceType: SpaceType;
  widthM: number;
  lengthM: number;
  summary: string;
  referenceBudgetRange: string;
}

export const GARDEN_STYLE_TEMPLATES: GardenStyleTemplateMeta[] = [
  {
    id: 'mediterraneo',
    title: 'Jardín mediterráneo',
    style: 'Mediterráneo',
    spaceType: 'Jardín particular',
    widthM: 10,
    lengthM: 10,
    summary: 'Olivos centenarios, cipreses, limoneros en terracota, lavandas, romeros, grava caliza y pérgola rústica.',
    referenceBudgetRange: '1.850 € – 2.550 €',
  },
  {
    id: 'moderno',
    title: 'Jardín moderno',
    style: 'Moderno',
    spaceType: 'Jardín particular',
    widthM: 12,
    lengthM: 10,
    summary: 'Trazado ortogonal cuadrado, módulos simétricos de césped y grava, piscina espejo, boj cúbico, jardineras y LED.',
    referenceBudgetRange: '7.100 € – 8.600 €',
  },
  {
    id: 'tropical',
    title: 'Jardín tropical',
    style: 'Tropical',
    spaceType: 'Jardín particular',
    widthM: 12,
    lengthM: 9,
    summary: 'Estilo selva atlántica brasileña: palmeras imperiales, monsteras gigantes, aves del paraíso, helechos y deck de teca.',
    referenceBudgetRange: '1.650 € – 2.350 €',
  },
  {
    id: 'minimalista',
    title: 'Jardín minimalista',
    style: 'Minimalista',
    spaceType: 'Patio',
    widthM: 5,
    lengthM: 5,
    summary: 'Patio compacto de 25 m² con grava mineral, losas de travertino, olivo topiario nube, arce japonés, calas y banco.',
    referenceBudgetRange: '750 € – 1.150 €',
  },
  {
    id: 'rustico',
    title: 'Jardín rústico',
    style: 'Rústico',
    spaceType: 'Jardín particular',
    widthM: 14,
    lengthM: 10,
    summary: 'Estilo montaña con chimenea exterior de piedra, bancos de roble, pinos, cerezo, hortensias y camino de piedra.',
    referenceBudgetRange: '2.950 € – 3.850 €',
  },
  {
    id: 'bajo_mantenimiento',
    title: 'Jardín de bajo mantenimiento',
    style: 'Bajo mantenimiento',
    spaceType: 'Jardín comunitario',
    widthM: 12,
    lengthM: 8,
    summary: 'Xerojardín en grava caliza y acero corten, pino piñonero, olivo, agaves, suculentas, romeros y lavandas sin riego.',
    referenceBudgetRange: '1.450 € – 2.050 €',
  },
  {
    id: 'piscina_balinesa',
    title: 'Jardín con piscina balinesa',
    style: 'Tropical',
    spaceType: 'Jardín particular',
    widthM: 14,
    lengthM: 11,
    summary: 'Piscina balinesa en piedra Sukabumi esmeralda, tarima de teca, cama balinesa con pérgola y palmeras.',
    referenceBudgetRange: '7.400 € – 8.900 €',
  },
  {
    id: 'terraza',
    title: 'Jardines pequeños y terrazas',
    style: 'Minimalista',
    spaceType: 'Terraza',
    widthM: 6,
    lengthM: 4,
    summary: 'Limonero en maceta terracota, petunias colgantes, jardinera modular y césped artificial.',
    referenceBudgetRange: '620 € – 980 €',
  },
];

function findProduct(products: Product[], suffix: string): Product | undefined {
  return (
    products.find((p) => p.id.endsWith(`-${suffix}`)) ||
    products.find((p) => p.modelPreset === suffix) ||
    products[0]
  );
}

function makeElement(
  prod: Product | undefined,
  x: number,
  z: number,
  opts: { rotationY?: number; scale?: number; quantity?: number } = {},
): DesignElement | null {
  if (!prod) return null;
  return {
    id: `el-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: prod.id,
    name: prod.commercialName,
    category: prod.category,
    modelPreset: prod.modelPreset,
    model3dUrl: prod.model3dUrl,
    colorHex: prod.colorHex,
    position: { x, y: 0, z },
    rotationY: opts.rotationY ?? 0,
    scale: opts.scale ?? 1,
    quantity: opts.quantity ?? 1,
    unitPrice: prod.price,
    unit: prod.unit,
    widthM: Math.max(0.35, (prod.dimensions.widthCm || 60) / 100),
    depthM: Math.max(0.35, (prod.dimensions.depthCm || prod.dimensions.widthCm || 60) / 100),
    heightM: Math.max(0.25, (prod.dimensions.heightCm || 80) / 100),
  };
}

function makeSurface(
  prod: Product | undefined,
  cx: number,
  cz: number,
  w: number,
  l: number,
  materialType: DesignSurface['materialType'],
  includeEdging = true,
): DesignSurface | null {
  if (!prod) return null;
  const points = getRectPoints(cx, cz, w, l);
  const { areaM2, perimeterM } = calculatePolygonAreaAndPerimeter(points);
  return {
    id: `surf-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: prod.id,
    name: prod.commercialName,
    materialType,
    shapeType: 'rect',
    points,
    areaM2,
    perimeterM,
    unitPrice: prod.price,
    colorHex: prod.colorHex,
    includeEdging,
  };
}

export function buildPopulatedTemplateProject(params: {
  templateId: GardenTemplateId;
  companyId: string;
  ownerUid: string;
  companyProducts: Product[];
}): Project {
  const meta =
    GARDEN_STYLE_TEMPLATES.find((t) => t.id === params.templateId) || GARDEN_STYLE_TEMPLATES[0];
  const prods = params.companyProducts;

  const elements: DesignElement[] = [];
  const surfaces: DesignSurface[] = [];
  const pushEl = (
    suffix: string,
    x: number,
    z: number,
    opts?: { rotationY?: number; scale?: number; quantity?: number },
  ) => {
    const el = makeElement(findProduct(prods, suffix), x, z, opts);
    if (el) elements.push(el);
  };
  const pushSurf = (
    suffix: string,
    cx: number,
    cz: number,
    w: number,
    l: number,
    mat: DesignSurface['materialType'],
    edging = true,
  ) => {
    const sf = makeSurface(findProduct(prods, suffix), cx, cz, w, l, mat, edging);
    if (sf) surfaces.push(sf);
  };

  switch (params.templateId) {
    case 'piscina_balinesa': {
      pushSurf('cesped-natural', 1.2, 0.2, 10.5, 9.2, 'cesped_natural', true);
      pushSurf('grava-decorativa', -4.8, -3.2, 3.6, 3.6, 'grava', true);
      pushSurf('camino-travertino', -4.8, 2.2, 2.2, 6.2, 'camino', false);
      pushEl('piscina-balinesa', 1.4, -0.8, { scale: 1.05 });
      pushEl('palmera-datilera', -4.8, -3.4, { scale: 1.05 });
      pushEl('palmera', 5.2, -3.6, { rotationY: 0.7, scale: 1.0 });
      pushEl('strelitzia-ave-paraiso', -3.6, -3.4, { rotationY: 0.4 });
      pushEl('strelitzia-ave-paraiso', 5.3, 1.8, { rotationY: 2.2 });
      pushEl('helecho', -3.4, 3.6, { quantity: 3 });
      pushEl('monstera', 4.8, 3.6, { rotationY: 1.2 });
      pushEl('baliza-led', -3.6, 0.2);
      pushEl('baliza-led', -3.6, 3.2);
      pushEl('baliza-led', 4.6, -2.5);
      break;
    }
    case 'mediterraneo': {
      pushSurf('grava-decorativa', 0, 0, 9.2, 9.2, 'grava', true);
      pushSurf('camino-travertino', 2.0, 2.0, 4.4, 3.8, 'camino', true);
      pushEl('olivo-mediterraneo', -2.8, -2.5, { rotationY: 0.4, scale: 1.05 });
      pushEl('cipres-toscana', 3.4, -3.5);
      pushEl('cipres-toscana', 3.9, -2.1);
      pushEl('cipres-toscana', 2.1, -3.7);
      pushEl('limonero', -3.2, 2.2);
      pushEl('maceta-terracota', -3.2, 2.2, { scale: 0.95 });
      pushEl('naranjo-dulce', -1.8, 3.2);
      pushEl('maceta-terracota', -1.8, 3.2, { scale: 0.95 });
      pushEl('lavanda', -1.2, -2.6, { quantity: 4 });
      pushEl('lavanda', -2.6, 0.2, { quantity: 4 });
      pushEl('romero', -0.4, 2.6, { quantity: 3 });
      pushEl('geranio', 3.5, 2.6, { quantity: 3 });
      pushEl('pergola-madera', 2.1, 2.0, { scale: 0.9 });
      pushEl('banco-teca', -0.2, -3.6);
      pushEl('baliza-led', 0.2, 1.0);
      break;
    }
    case 'moderno': {
      pushSurf('grava-decorativa', 0, 0, 11.4, 9.4, 'grava', true);
      pushSurf('cesped-artificial', -3.2, -2.2, 4.0, 4.0, 'cesped_artificial', true);
      pushSurf('cesped-artificial', -3.2, 2.4, 4.0, 3.6, 'cesped_artificial', true);
      pushSurf('camino-travertino', -0.2, 0, 1.4, 9.2, 'camino', true);
      pushSurf('camino-travertino', -3.2, 0.2, 4.4, 1.1, 'camino', false);
      pushEl('piscina-minimalista', 3.0, -1.6, { scale: 0.95 });
      pushEl('pergola-madera', 3.0, 2.5, { scale: 0.85 });
      pushEl('boj', -5.1, -4.1);
      pushEl('boj', -1.3, -4.1);
      pushEl('boj', -5.1, 4.1);
      pushEl('boj', -1.3, 4.1);
      pushEl('jardinera-arquitectonica', 0.9, -4.0);
      pushEl('jardinera-arquitectonica', 5.0, -4.0);
      pushEl('jardinera-arquitectonica', 0.9, 4.0);
      pushEl('abedul-multitronco', -4.8, -0.8, { rotationY: 0 });
      pushEl('cala-minimalista', 0.9, 0.8, { quantity: 3 });
      pushEl('baliza-led', -0.8, -3.4);
      pushEl('baliza-led', -0.8, 0.2);
      pushEl('baliza-led', -0.8, 3.4);
      pushEl('baliza-led', 5.2, 0.4);
      break;
    }
    case 'tropical': {
      pushSurf('cesped-natural', 0, 0, 10.6, 8.0, 'cesped_natural', true);
      pushSurf('corteza-pino', -3.6, -2.0, 3.8, 4.0, 'corteza', true);
      pushSurf('corteza-pino', 3.6, 0.8, 3.6, 5.4, 'corteza', true);
      pushSurf('camino-travertino', -0.2, 0.2, 1.4, 7.6, 'camino', false);
      pushEl('palmera', -4.2, -2.8, { scale: 1.12 });
      pushEl('palmera-datilera', 4.1, -2.6, { rotationY: 1.4, scale: 1.05 });
      pushEl('palmera', 0.4, -3.2, { rotationY: 0.7, scale: 0.95 });
      pushEl('strelitzia-ave-paraiso', 3.2, -0.4, { quantity: 3 });
      pushEl('strelitzia-ave-paraiso', -2.6, -2.8, { rotationY: 1.8, quantity: 2 });
      pushEl('monstera', 3.4, 2.2, { quantity: 3 });
      pushEl('monstera', -3.8, 2.2, { rotationY: 1.2, quantity: 2 });
      pushEl('helecho', -2.4, -0.2, { quantity: 5 });
      pushEl('helecho', 2.4, 2.8, { quantity: 4 });
      pushEl('banco-teca', -3.6, 0.4, { rotationY: 1.57 });
      break;
    }
    case 'minimalista': {
      pushSurf('grava-decorativa', 0, 0, 4.4, 4.4, 'grava', true);
      pushSurf('camino-travertino', 0, 0.4, 1.4, 2.8, 'camino', false);
      pushEl('olivo-bonsai-nube', -1.4, -1.2, { rotationY: 0.5, scale: 0.85 });
      pushEl('jardinera-arquitectonica', -1.4, -1.2, { scale: 0.85 });
      pushEl('arce-japones', 1.4, -1.3, { rotationY: 1.1, scale: 0.85 });
      pushEl('boj', 1.2, 1.4, { scale: 0.8 });
      pushEl('boj', 1.8, 1.1, { scale: 0.75 });
      pushEl('cala-minimalista', 1.4, 0.4, { quantity: 3 });
      pushEl('banco-teca', 0, -1.6, { scale: 0.78 });
      break;
    }
    case 'rustico': {
      pushSurf('corteza-pino', 0, 0, 12.6, 8.8, 'corteza', false);
      pushSurf('camino-travertino', 0, 0.2, 4.4, 7.8, 'camino', false);
      pushEl('chimenea-piedra-montana', 0, -2.8, { scale: 1.05 });
      pushEl('banco-teca', -1.8, -1.2, { rotationY: 1.35 });
      pushEl('banco-teca', 1.8, -1.2, { rotationY: -1.35 });
      pushEl('pino-pinonero', -5.2, -3.4, { scale: 1.15 });
      pushEl('pino-pinonero', -3.6, -3.9, { scale: 0.95 });
      pushEl('cerezo-sakura', 4.3, -2.8);
      pushEl('sauce-lloron', 5.1, 1.2);
      pushEl('hortensia', -3.4, 0.6, { quantity: 4 });
      pushEl('rosal', -3.8, -1.2, { quantity: 4 });
      pushEl('rosal', 3.6, -0.6, { quantity: 3 });
      pushEl('margarita-silvestre', 3.4, 2.2, { quantity: 6 });
      pushEl('lavanda', -3.0, 2.8, { quantity: 4 });
      pushEl('baliza-led', -1.4, 1.6);
      pushEl('baliza-led', 1.4, 1.6);
      break;
    }
    case 'bajo_mantenimiento': {
      pushSurf('grava-decorativa', 0, 0, 11.2, 7.2, 'grava', true);
      pushSurf('corteza-pino', -3.3, -1.4, 4.0, 3.8, 'corteza', true);
      pushSurf('cesped-artificial', 3.2, 1.3, 4.0, 3.4, 'cesped_artificial', true);
      pushSurf('camino-travertino', 0.1, 0, 1.5, 6.8, 'camino', false);
      pushEl('pino-pinonero', -3.8, -1.9, { scale: 1.05 });
      pushEl('olivo-mediterraneo', -4.2, 1.8, { rotationY: 0.6 });
      pushEl('suculenta', -2.4, -0.6, { quantity: 5 });
      pushEl('suculenta', 2.4, -2.1, { quantity: 5 });
      pushEl('romero', -2.8, 2.3, { quantity: 4 });
      pushEl('lavanda', 3.4, -1.6, { quantity: 5 });
      pushEl('baliza-led', -0.9, -2.2);
      pushEl('baliza-led', 1.1, 1.4);
      break;
    }
    case 'terraza': {
      pushSurf('camino-travertino', 0, 0, 5.4, 3.4, 'camino', false);
      pushSurf('cesped-artificial', -0.9, 0.1, 2.8, 2.8, 'cesped_artificial', true);
      pushEl('limonero', -2.0, -0.8, { scale: 0.9 });
      pushEl('maceta-terracota', -2.0, -0.8, { scale: 0.95 });
      pushEl('jardinera-arquitectonica', -0.2, -1.2);
      pushEl('jardinera-arquitectonica', 1.5, -1.2);
      pushEl('petunia-colgante', -0.2, -1.0, { quantity: 3 });
      pushEl('petunia-colgante', 1.5, -1.0, { quantity: 3 });
      pushEl('lavanda', 2.0, 0.7, { quantity: 2 });
      pushEl('romero', 2.1, 1.2, { quantity: 2 });
      pushEl('banco-teca', 1.3, 0.2, { rotationY: -1.57, scale: 0.8 });
      pushEl('baliza-led', 2.0, 0.1);
      break;
    }
  }

  const now = new Date().toISOString();
  const subtotal =
    elements.reduce((acc, el) => acc + el.quantity * el.unitPrice, 0) +
    surfaces.reduce((acc, sf) => acc + sf.areaM2 * sf.unitPrice, 0);

  return {
    id: `proj-${Date.now()}`,
    companyId: params.companyId,
    ownerUid: params.ownerUid,
    name: `${meta.title} (${meta.widthM * meta.lengthM} m²)`,
    spaceType: meta.spaceType,
    terrainShape: 'rectangular',
    widthM: meta.widthM,
    lengthM: meta.lengthM,
    areaM2: meta.widthM * meta.lengthM,
    designStyle: meta.style,
    targetBudget: Math.max(1200, Math.round(subtotal * 1.25)),
    status: 'borrador',
    elements,
    surfaces,
    assumptions: {
      topsoilThicknessCm: 15,
      gravelDepthCm: 5,
      plantSpacingCm: 50,
      edgingProductPricePerMl: 12.5,
      topsoilPricePerM3: 28,
      includeTopsoilEstimate: false,
      includeEdgingEstimate: false,
    },
    estimatedTotal: Number(subtotal.toFixed(2)),
    shareEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export interface GardenInsights {
  weeklyLitersSummer: number;
  waterBadgeLabel: 'Muy bajo (Xerojardín)' | 'Eficiente' | 'Moderado' | 'Alto consumo';
  vegetationCoveragePercent: number;
  sunBalance: {
    solDirecto: number;
    semisombra: number;
    sombra: number;
  };
  advice: string;
}

export function computeGardenInsights(project: Project, products: Product[]): GardenInsights {
  const prodMap = new Map(products.map((p) => [p.id, p]));
  let weeklyLiters = 0;
  let solDirecto = 0;
  let semisombra = 0;
  let sombra = 0;
  let hasShadeProvider = false;
  let canopyAreaM2 = 0;

  for (const el of project.elements) {
    const prod = prodMap.get(el.productId);
    const qty = el.quantity || 1;
    if (el.category === 'arboles' || el.modelPreset === 'pergola') {
      hasShadeProvider = true;
    }
    if (el.category === 'arboles' || el.category === 'arbustos' || el.category === 'plantas' || el.category === 'flores') {
      const r = Math.max(0.25, ((el.widthM || 0.7) * (el.scale || 1)) / 2);
      canopyAreaM2 += Math.PI * r * r * Math.min(qty, 6);
    }

    if (prod) {
      if (prod.sunExposure === 'sol_directo') solDirecto += qty;
      else if (prod.sunExposure === 'semisombra') semisombra += qty;
      else sombra += qty;

      const baseLit =
        el.category === 'arboles'
          ? prod.waterNeeds === 'bajo'
            ? 14
            : prod.waterNeeds === 'medio'
              ? 28
              : 45
          : el.category === 'arbustos' || el.category === 'plantas' || el.category === 'flores'
            ? prod.waterNeeds === 'bajo'
              ? 3.5
              : prod.waterNeeds === 'medio'
                ? 7.5
                : 14
            : 0;
      weeklyLiters += baseLit * qty;
    }
  }

  let naturalGrassM2 = 0;
  let plantedBedsM2 = 0;
  for (const sf of project.surfaces) {
    if (sf.materialType === 'cesped_natural') {
      naturalGrassM2 += sf.areaM2;
      weeklyLiters += sf.areaM2 * 26;
    } else if (sf.materialType === 'parterre' || sf.materialType === 'corteza') {
      plantedBedsM2 += sf.areaM2;
    }
  }

  const totalArea = Math.max(1, project.areaM2);
  const vegetationCoveragePercent = Math.min(
    100,
    Math.round(((naturalGrassM2 + plantedBedsM2 + canopyAreaM2 * 0.65) / totalArea) * 100),
  );

  const roundedLiters = Math.round(weeklyLiters);
  const litersPerM2 = roundedLiters / totalArea;
  const waterBadgeLabel: GardenInsights['waterBadgeLabel'] =
    litersPerM2 <= 2.5
      ? 'Muy bajo (Xerojardín)'
      : litersPerM2 <= 8
        ? 'Eficiente'
        : litersPerM2 <= 18
          ? 'Moderado'
          : 'Alto consumo';

  let advice = 'Equilibrio hídrico y solar adecuado para la composición actual.';
  if (sombra > 0 && !hasShadeProvider) {
    advice =
      'Has incluido especies de sombra sin copa de árbol o pérgola cercana. Añade un árbol de sombra o pérgola para protegerlas.';
  } else if (naturalGrassM2 > totalArea * 0.55) {
    advice =
      'El césped natural supera el 55 % del terreno. Combinarlo con grava caliza o corteza reduce el riego estival hasta un 35 %.';
  } else if (project.elements.length === 0 && project.surfaces.length === 0) {
    advice = 'Añade árboles, plantas o una plantilla de estilo para analizar riego, sombra y cobertura vegetal.';
  }

  return {
    weeklyLitersSummer: roundedLiters,
    waterBadgeLabel,
    vegetationCoveragePercent,
    sunBalance: { solDirecto, semisombra, sombra },
    advice,
  };
}
