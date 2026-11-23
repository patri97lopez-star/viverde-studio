export type UserRole = 'super_admin' | 'company_admin' | 'employee' | 'client';

export type NavSection =
  | 'inicio'
  | 'catalogo'
  | 'disenador'
  | 'floristeria'
  | 'proyectos'
  | 'presupuestos'
  | 'soluciones'
  | 'panel_pro'
  | 'cuenta';

export type ProductCategory =
  | 'arboles'
  | 'arbustos'
  | 'plantas'
  | 'flores'
  | 'cesped'
  | 'materiales';

export type UnitOfMeasure = 'unidad' | 'm2' | 'm3' | 'ml';

export type SunExposure = 'sol_directo' | 'semisombra' | 'sombra';
export type WaterNeeds = 'bajo' | 'medio' | 'alto';
export type AvailabilityStatus = 'disponible' | 'bajo_pedido' | 'agotado';
export type IndoorOutdoorUse = 'exterior' | 'interior' | 'ambos';

export type ModelPreset =
  | 'olive_tree'
  | 'olive_bonsai_tree'
  | 'cypress_tree'
  | 'pine_tree'
  | 'maple_tree'
  | 'sakura_tree'
  | 'willow_tree'
  | 'birch_tree'
  | 'jacaranda_tree'
  | 'citrus_tree'
  | 'palm_tree'
  | 'date_palm_tree'
  | 'magnolia_tree'
  | 'lavender_shrub'
  | 'hydrangea_shrub'
  | 'rose_bush'
  | 'boxwood_shrub'
  | 'aromatic_shrub'
  | 'monstera_plant'
  | 'fern_plant'
  | 'succulent_plant'
  | 'flower_cluster'
  | 'flower_rose'
  | 'flower_tulip'
  | 'flower_daisy'
  | 'flower_sunflower'
  | 'flower_lily'
  | 'flower_orchid'
  | 'flower_tropical'
  | 'flower_hanging'
  | 'terracotta_pot'
  | 'architectural_planter'
  | 'pergola'
  | 'pool'
  | 'balinese_pool'
  | 'rustic_fireplace'
  | 'garden_bench'
  | 'garden_light'
  | 'surface_grass'
  | 'surface_gravel'
  | 'surface_bark'
  | 'surface_path'
  | 'surface_bed'
  | 'generic_box';

export interface ProductDimensions {
  heightCm: number;
  widthCm: number;
  depthCm?: number;
}

export interface Product {
  id: string;
  companyId: string;
  category: ProductCategory;
  subcategory: string;
  commercialName: string;
  botanicalName?: string;
  description: string;
  price: number;
  unit: UnitOfMeasure;
  sizeFormat: string;
  dimensions: ProductDimensions;
  sunExposure: SunExposure;
  waterNeeds: WaterNeeds;
  bloomingSeason: string;
  climateHardiness?: string;
  availability: AvailabilityStatus;
  landscapeUses: string[];
  colorName: string;
  colorHex: string;
  indoorOutdoor: IndoorOutdoorUse;
  imageUrl: string;
  model3dUrl?: string;
  modelPreset: ModelPreset;
  isDemoData: boolean;
  updatedAt: string;
}

export interface CompanySettings {
  vatRate: number;
  defaultMarginPercent: number;
  transportFlatFee: number;
  laborRatePerHour: number;
  commercialTerms: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  email: string;
  ownerUid: string;
  memberUids: string[];
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyMember {
  uid: string;
  companyId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export type SpaceType =
  | 'Jardín particular'
  | 'Terraza'
  | 'Patio'
  | 'Jardín comunitario'
  | 'Zona verde pública'
  | 'Espacio comercial'
  | 'Proyecto de paisajismo';

export type TerrainShape = 'rectangular' | 'l_shape' | 'irregular';
export type DesignStyle =
  | 'Mediterráneo'
  | 'Moderno'
  | 'Tropical'
  | 'Minimalista'
  | 'Rústico'
  | 'Bajo mantenimiento';

export type ProjectStatus =
  | 'borrador'
  | 'propuesta'
  | 'aprobado'
  | 'en_ejecucion'
  | 'completado';

export interface Point2D {
  x: number;
  z: number;
}

export interface DesignElement {
  id: string;
  productId: string;
  name: string;
  category: ProductCategory;
  modelPreset: ModelPreset;
  model3dUrl?: string;
  colorHex: string;
  position: { x: number; y: number; z: number };
  rotationY: number;
  scale: number;
  quantity: number;
  unitPrice: number;
  unit: UnitOfMeasure;
  widthM: number;
  depthM: number;
  heightM: number;
}

export type SurfaceMaterialType =
  | 'cesped_natural'
  | 'cesped_artificial'
  | 'grava'
  | 'corteza'
  | 'parterre'
  | 'camino';

export interface DesignSurface {
  id: string;
  productId: string;
  name: string;
  materialType: SurfaceMaterialType;
  shapeType: 'rect' | 'polygon';
  points: Point2D[];
  areaM2: number;
  perimeterM: number;
  unitPrice: number;
  colorHex: string;
  includeEdging: boolean;
}

export interface QuantityAssumptions {
  topsoilThicknessCm: number;
  gravelDepthCm: number;
  plantSpacingCm: number;
  edgingProductPricePerMl: number;
  topsoilPricePerM3: number;
  includeTopsoilEstimate: boolean;
  includeEdgingEstimate: boolean;
}

export interface Project {
  id: string;
  companyId: string;
  ownerUid: string;
  clientId?: string;
  clientName?: string;
  name: string;
  spaceType: SpaceType;
  terrainShape: TerrainShape;
  widthM: number;
  lengthM: number;
  areaM2: number;
  designStyle: DesignStyle;
  targetBudget?: number;
  status: ProjectStatus;
  elements: DesignElement[];
  surfaces: DesignSurface[];
  assumptions: QuantityAssumptions;
  estimatedTotal: number;
  previewDataUrl?: string;
  shareEnabled?: boolean;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLineItem {
  id: string;
  productId: string;
  name: string;
  categoryGroup: 'plantas_arboles' | 'flores' | 'cesped' | 'materiales' | 'decorativos' | 'riego' | 'servicios';
  quantity: number;
  unit: UnitOfMeasure | 'h' | 'servicio';
  unitPrice: number;
  total: number;
}

export type QuoteStatus = 'borrador' | 'enviado' | 'aceptado' | 'rechazado';

export interface Quote {
  id: string;
  companyId: string;
  ownerUid: string;
  projectId: string;
  projectName: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  quoteNumber: string;
  items: QuoteLineItem[];
  surfacesSummary: { name: string; areaM2: number; perimeterM: number; cost: number }[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  transportCost: number;
  laborCost: number;
  installationCost: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  validUntil: string;
  notes: string;
  status: QuoteStatus;
  previewDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type FloralCompositionType =
  | 'Ramo de novia'
  | 'Ramo de regalo'
  | 'Decoración de bodas'
  | 'Centro de mesa'
  | 'Decoración de eventos'
  | 'Composición de Navidad'
  | 'Composición funeraria'
  | 'Decoración floral de establecimientos';

export interface FloralItem {
  id: string;
  productId: string;
  name: string;
  colorHex: string;
  stems: number;
  unitCost: number;
}

export interface FloralDesign {
  id: string;
  companyId: string;
  ownerUid: string;
  name: string;
  compositionType: FloralCompositionType;
  wrapperStyle: string;
  wrapperCost: number;
  vaseStyle: string;
  vaseCost: number;
  marginPercent: number;
  items: FloralItem[];
  materialsCost: number;
  retailPrice: number;
  createdAt: string;
}

export interface SharedProjectSnapshot {
  shareToken: string;
  projectName: string;
  companyName: string;
  spaceType: SpaceType | string;
  widthM: number;
  lengthM: number;
  areaM2: number;
  elements: DesignElement[];
  surfaces: DesignSurface[];
  estimatedTotal: number;
  previewDataUrl?: string;
  createdAt: string;
}

