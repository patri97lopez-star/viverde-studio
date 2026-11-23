import { create } from 'zustand';
import {
  buildPopulatedTemplateProject,
  GardenTemplateId,
} from '../data/gardenTemplates';
import { FloralPresetId } from '../data/floralPresets';
import {
  buildDemoCatalogForCompany,
  DEMO_CLIENTS,
  DEMO_COMPANIES,
  DEMO_FLORAL_DESIGNS,
  DEMO_MEMBERS,
  DEMO_PROJECTS,
  DEMO_QUOTES,
} from '../data/demoCatalog';
import {
  Client,
  Company,
  CompanyMember,
  DesignElement,
  DesignSurface,
  FloralDesign,
  NavSection,
  Product,
  Project,
  QuantityAssumptions,
  Quote,
  UserRole,
} from '../types/viverde';
import {
  buildQuoteLineItemsFromDesign,
  calculatePolygonAreaAndPerimeter,
  calculateQuoteTotals,
  getRectPoints,
} from '../utils/calculations';

const STORAGE_KEY = 'viverde_studio_tenant_store_v3';

export interface DesignerSnapshot {
  elements: DesignElement[];
  surfaces: DesignSurface[];
  widthM: number;
  lengthM: number;
  areaM2: number;
  assumptions: QuantityAssumptions;
}

export interface AuthSession {
  uid: string | null;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  isAuthenticated: boolean;
  cloudSynced: boolean;
}

interface PersistedData {
  companies: Company[];
  activeCompanyId: string;
  activeRole: UserRole;
  products: Product[];
  clients: Client[];
  projects: Project[];
  quotes: Quote[];
  floralDesigns: FloralDesign[];
  members: CompanyMember[];
}

function loadInitialData(): PersistedData {
  const defaultProducts = [
    ...buildDemoCatalogForCompany('viveros-solis'),
    ...buildDemoCatalogForCompany('floristeria-azahar'),
  ];
  const fallback: PersistedData = {
    companies: DEMO_COMPANIES,
    activeCompanyId: 'viveros-solis',
    activeRole: 'company_admin',
    products: defaultProducts,
    clients: DEMO_CLIENTS,
    projects: DEMO_PROJECTS,
    quotes: DEMO_QUOTES,
    floralDesigns: DEMO_FLORAL_DESIGNS,
    members: DEMO_MEMBERS,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedData>;
    if (!parsed.companies || parsed.companies.length === 0) return fallback;
    const cachedProducts = parsed.products && parsed.products.length > 0 ? parsed.products : defaultProducts;
    const defaultById = new Map(defaultProducts.map((p) => [p.id, p]));
    const templateBySuffix = new Map(
      buildDemoCatalogForCompany('viveros-solis').map((p) => [p.id.replace('viveros-solis-', ''), p]),
    );
    const refreshedCached = cachedProducts.map((p) => {
      if (!p.isDemoData) return p;
      const direct = defaultById.get(p.id);
      if (direct) {
        return { ...p, imageUrl: direct.imageUrl, subcategory: direct.subcategory };
      }
      const suffix = p.id.replace(`${p.companyId}-`, '');
      const template = templateBySuffix.get(suffix);
      return template ? { ...p, imageUrl: template.imageUrl, subcategory: template.subcategory } : p;
    });
    const existingIds = new Set(refreshedCached.map((p) => p.id));
    const missingDefaults = defaultProducts.filter((p) => !existingIds.has(p.id));
    return {
      companies: parsed.companies,
      activeCompanyId: parsed.activeCompanyId || parsed.companies[0].id,
      activeRole: parsed.activeRole || 'company_admin',
      products: missingDefaults.length > 0 ? [...refreshedCached, ...missingDefaults] : refreshedCached,
      clients: parsed.clients || DEMO_CLIENTS,
      projects: parsed.projects || DEMO_PROJECTS,
      quotes: parsed.quotes || DEMO_QUOTES,
      floralDesigns: parsed.floralDesigns || DEMO_FLORAL_DESIGNS,
      members: parsed.members || DEMO_MEMBERS,
    };
  } catch {
    return fallback;
  }
}

function persistData(state: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota overflow if preview image is large
  }
}

function createFreshDraftProject(companyId: string, ownerUid: string): Project {
  const now = new Date().toISOString();
  return {
    id: `proj-${Date.now()}`,
    companyId,
    ownerUid,
    name: 'Mi Jardín Mediterráneo',
    spaceType: 'Jardín particular',
    terrainShape: 'rectangular',
    widthM: 10,
    lengthM: 10,
    areaM2: 100,
    designStyle: 'Mediterráneo',
    targetBudget: 3000,
    status: 'borrador',
    elements: [],
    surfaces: [],
    assumptions: {
      topsoilThicknessCm: 15,
      gravelDepthCm: 5,
      plantSpacingCm: 50,
      edgingProductPricePerMl: 12.5,
      topsoilPricePerM3: 28,
      includeTopsoilEstimate: false,
      includeEdgingEstimate: false,
    },
    estimatedTotal: 0,
    shareEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export interface ViverdeState extends PersistedData {
  activeNav: NavSection;
  auth: AuthSession;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Designer active state
  activeProject: Project;
  showProjectWizard: boolean;
  selectedElementId: string | null;
  selectedSurfaceId: string | null;
  viewMode: '3d' | '2d';
  cameraPreset: 'perspective' | 'top' | 'front';
  cameraNonce: number;
  zoomDelta: number;
  timeOfDay: 'morning' | 'midday' | 'sunset' | 'night';
  growthYears: 0 | 3 | 5;
  pendingPlacementProductId: string | null;
  pendingFloralPresetId: FloralPresetId | null;
  drawingSurfaceTool: {
    active: boolean;
    mode: 'rect' | 'polygon';
    productId: string | null;
  };
  undoStack: DesignerSnapshot[];
  redoStack: DesignerSnapshot[];
  selectedQuoteId: string | null;
  latestCanvasPreview: string | null;
  leads: {
    id: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    segment: string;
    message: string;
    createdAt: string;
  }[];

  // Navigation & Notifications
  setActiveNav: (nav: NavSection) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Auth & Multi-Tenant
  setAuthSession: (session: Partial<AuthSession>) => void;
  switchCompany: (companyId: string) => void;
  setActiveRole: (role: UserRole) => void;
  createCompanyTenant: (input: { name: string; email: string; phone: string; address: string }) => void;
  updateActiveCompany: (patch: Partial<Company> & { settingsPatch?: Partial<Company['settings']> }) => void;
  addCompanyMember: (member: Omit<CompanyMember, 'companyId' | 'createdAt'>) => void;
  updateMemberRole: (uid: string, role: UserRole) => void;

  // Catalog CRUD
  addProduct: (product: Omit<Product, 'id' | 'companyId' | 'updatedAt'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Clients CRUD
  addClient: (client: Omit<Client, 'id' | 'companyId' | 'createdAt'>) => Client;

  // Designer Controls
  setShowProjectWizard: (open: boolean) => void;
  startNewProjectFromWizard: (params: {
    name: string;
    spaceType: Project['spaceType'];
    widthM: number;
    lengthM: number;
    areaM2: number;
    terrainShape: Project['terrainShape'];
    designStyle: Project['designStyle'];
    targetBudget?: number;
    clientId?: string;
    clientName?: string;
  }) => void;
  openProjectInDesigner: (projectId: string) => void;
  loadPopulatedTemplate: (templateId: GardenTemplateId, preferredView?: '2d' | '3d') => void;
  clearActiveDesign: () => void;
  importProjectJson: (proj: Project) => void;
  setViewMode: (mode: '3d' | '2d') => void;
  setCameraPreset: (preset: 'perspective' | 'top' | 'front') => void;
  triggerZoom: (delta: number) => void;
  setTimeOfDay: (time: 'morning' | 'midday' | 'sunset' | 'night') => void;
  setGrowthYears: (years: 0 | 3 | 5) => void;
  selectElement: (id: string | null) => void;
  selectSurface: (id: string | null) => void;
  setPendingPlacementProduct: (productId: string | null) => void;
  openFloralPreset: (presetId: FloralPresetId) => void;
  clearPendingFloralPreset: () => void;
  setDrawingSurfaceTool: (tool: { active: boolean; mode: 'rect' | 'polygon'; productId: string | null }) => void;
  setLatestCanvasPreview: (dataUrl: string | null) => void;
  submitCommercialLead: (lead: { name: string; company: string; email: string; phone: string; segment: string; message: string }) => void;

  // Designer Mutations (with Undo/Redo & Real-time cost sync)
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  updateTerrainDimensions: (widthM: number, lengthM: number) => void;
  updateAssumptions: (patch: Partial<QuantityAssumptions>) => void;
  addElementToDesign: (product: Product, pos?: { x: number; z: number }, count?: number) => void;
  updateElement: (id: string, patch: Partial<DesignElement>, recordUndo?: boolean) => void;
  duplicateElement: (id: string) => void;
  deleteElement: (id: string) => void;
  swapElementProduct: (elementId: string, newProduct: Product) => void;

  addSurfaceToDesign: (params: {
    product: Product;
    points: { x: number; z: number }[];
    shapeType: 'rect' | 'polygon';
    targetAreaM2?: number;
    includeEdging?: boolean;
  }) => void;
  updateSurface: (id: string, patch: Partial<DesignSurface>) => void;
  resizeSurfaceToArea: (id: string, targetAreaM2: number) => void;
  deleteSurface: (id: string) => void;

  // Projects CRUD
  saveActiveProject: (previewDataUrl?: string) => Project;
  duplicateProject: (id: string) => Project | null;
  deleteProject: (id: string) => void;
  updateProjectStatus: (id: string, status: Project['status']) => void;
  toggleShareProject: (id: string) => string | null;

  // Quotes CRUD
  generateQuoteFromActiveProject: (clientOverride?: Partial<Client>) => Quote;
  generateQuoteFromProject: (projectId: string, clientOverride?: Partial<Client>) => Quote | null;
  saveCustomQuote: (quote: Quote) => void;
  selectQuote: (id: string | null) => void;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  duplicateQuote: (id: string) => Quote | null;
  deleteQuote: (id: string) => void;

  // Floral Designs CRUD
  saveFloralDesign: (design: Omit<FloralDesign, 'id' | 'companyId' | 'ownerUid' | 'createdAt'>) => FloralDesign;
  deleteFloralDesign: (id: string) => void;

  // Hydrate from Firestore
  hydrateFromCloud: (payload: Partial<PersistedData>) => void;
}

const initialData = loadInitialData();
const initialProject =
  initialData.projects.find((p) => p.companyId === initialData.activeCompanyId) ||
  createFreshDraftProject(initialData.activeCompanyId, 'demo-owner');

function computeProjectEstimatedTotal(project: Project, company: Company): number {
  const items = buildQuoteLineItemsFromDesign(
    project.elements,
    project.surfaces,
    project.assumptions,
  );
  const totals = calculateQuoteTotals({
    items,
    discountPercent: 0,
    transportCost: 0,
    laborCost: 0,
    installationCost: 0,
    vatRate: company.settings.vatRate,
  });
  return totals.subtotal;
}

function snapshotOf(p: Project): DesignerSnapshot {
  return {
    elements: JSON.parse(JSON.stringify(p.elements)),
    surfaces: JSON.parse(JSON.stringify(p.surfaces)),
    widthM: p.widthM,
    lengthM: p.lengthM,
    areaM2: p.areaM2,
    assumptions: { ...p.assumptions },
  };
}

function saveSlice(s: ViverdeState): void {
  persistData({
    companies: s.companies,
    activeCompanyId: s.activeCompanyId,
    activeRole: s.activeRole,
    products: s.products,
    clients: s.clients,
    projects: s.projects,
    quotes: s.quotes,
    floralDesigns: s.floralDesigns,
    members: s.members,
  });
}

export const useViverdeStore = create<ViverdeState>((set, get) => ({
  ...initialData,
  activeNav: 'inicio',
  auth: {
    uid: null,
    displayName: 'Sesión de demostración',
    email: null,
    photoURL: null,
    isAuthenticated: false,
    cloudSynced: false,
  },
  toast: null,

  activeProject: initialProject,
  showProjectWizard: false,
  selectedElementId: null,
  selectedSurfaceId: null,
  viewMode: '2d',
  cameraPreset: 'perspective',
  cameraNonce: 0,
  zoomDelta: 0,
  timeOfDay: 'midday',
  growthYears: 0,
  pendingPlacementProductId: null,
  pendingFloralPresetId: null,
  drawingSurfaceTool: { active: false, mode: 'rect', productId: null },
  undoStack: [],
  redoStack: [],
  selectedQuoteId: initialData.quotes.find((q) => q.companyId === initialData.activeCompanyId)?.id || null,
  latestCanvasPreview: null,
  leads: [],

  setActiveNav: (nav) => set({ activeNav: nav }),
  showToast: (message, type = 'success') => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),

  setAuthSession: (session) =>
    set((s) => ({ auth: { ...s.auth, ...session } })),

  switchCompany: (companyId) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === companyId);
      if (!company) return s;
      const companyProject =
        s.projects.find((p) => p.companyId === companyId) ||
        createFreshDraftProject(companyId, s.auth.uid || 'demo-owner');
      const companyQuote = s.quotes.find((q) => q.companyId === companyId)?.id || null;
      const next: ViverdeState = {
        ...s,
        activeCompanyId: companyId,
        activeProject: companyProject,
        selectedElementId: null,
        selectedSurfaceId: null,
        selectedQuoteId: companyQuote,
        undoStack: [],
        redoStack: [],
        toast: { message: `Espacio de trabajo cambiado a ${company.name}`, type: 'info' },
      };
      saveSlice(next);
      return next;
    }),

  setActiveRole: (role) =>
    set((s) => {
      const next = { ...s, activeRole: role };
      saveSlice(next);
      return next;
    }),

  createCompanyTenant: (input) =>
    set((s) => {
      const id = `emp-${Date.now()}`;
      const now = new Date().toISOString();
      const ownerUid = s.auth.uid || `owner-${Date.now()}`;
      const newCompany: Company = {
        id,
        name: input.name.trim(),
        logoUrl: '',
        address: input.address.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        ownerUid,
        memberUids: [ownerUid],
        settings: {
          vatRate: 21,
          defaultMarginPercent: 35,
          transportFlatFee: 60,
          laborRatePerHour: 35,
          commercialTerms: 'Precios de demostración editables. Validez 30 días.',
        },
        createdAt: now,
        updatedAt: now,
      };
      const newCatalog = buildDemoCatalogForCompany(id);
      const newProject = createFreshDraftProject(id, ownerUid);
      const newMember: CompanyMember = {
        uid: ownerUid,
        companyId: id,
        name: s.auth.displayName || 'Administrador',
        email: input.email.trim(),
        role: 'company_admin',
        createdAt: now,
      };
      const next: ViverdeState = {
        ...s,
        companies: [...s.companies, newCompany],
        activeCompanyId: id,
        products: [...s.products, ...newCatalog],
        members: [...s.members, newMember],
        activeProject: newProject,
        selectedElementId: null,
        selectedSurfaceId: null,
        selectedQuoteId: null,
        toast: { message: `Empresa "${newCompany.name}" creada con catálogo aislado.`, type: 'success' },
      };
      saveSlice(next);
      return next;
    }),

  updateActiveCompany: (patch) =>
    set((s) => {
      const companies = s.companies.map((c) => {
        if (c.id !== s.activeCompanyId) return c;
        return {
          ...c,
          ...patch,
          settings: patch.settingsPatch ? { ...c.settings, ...patch.settingsPatch } : c.settings,
          updatedAt: new Date().toISOString(),
        };
      });
      const next = {
        ...s,
        companies,
        toast: { message: 'Configuración de empresa guardada.', type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  addCompanyMember: (member) =>
    set((s) => {
      const newMember: CompanyMember = {
        ...member,
        companyId: s.activeCompanyId,
        createdAt: new Date().toISOString(),
      };
      const next = {
        ...s,
        members: [...s.members, newMember],
        toast: { message: `Usuario ${newMember.name} añadido al equipo.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  updateMemberRole: (uid, role) =>
    set((s) => {
      const next = {
        ...s,
        members: s.members.map((m) =>
          m.companyId === s.activeCompanyId && m.uid === uid ? { ...m, role } : m,
        ),
        toast: { message: 'Rol de usuario actualizado.', type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  addProduct: (input) => {
    const s = get();
    const newProd: Product = {
      ...input,
      id: `${s.activeCompanyId}-prod-${Date.now()}`,
      companyId: s.activeCompanyId,
      updatedAt: new Date().toISOString(),
    };
    set((state) => {
      const next = {
        ...state,
        products: [newProd, ...state.products],
        toast: { message: `Producto "${newProd.commercialName}" añadido al catálogo.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return newProd;
  },

  updateProduct: (id, patch) =>
    set((s) => {
      const products = s.products.map((p) =>
        p.id === id && p.companyId === s.activeCompanyId
          ? { ...p, ...patch, updatedAt: new Date().toISOString() }
          : p,
      );
      const next = {
        ...s,
        products,
        toast: { message: 'Ficha de producto actualizada.', type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  deleteProduct: (id) =>
    set((s) => {
      const next = {
        ...s,
        products: s.products.filter((p) => !(p.id === id && p.companyId === s.activeCompanyId)),
        toast: { message: 'Producto eliminado del catálogo de la empresa.', type: 'info' as const },
      };
      saveSlice(next);
      return next;
    }),

  addClient: (input) => {
    const s = get();
    const client: Client = {
      ...input,
      id: `cli-${Date.now()}`,
      companyId: s.activeCompanyId,
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const next = {
        ...state,
        clients: [client, ...state.clients],
        toast: { message: `Cliente "${client.name}" registrado.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return client;
  },

  setShowProjectWizard: (open) => set({ showProjectWizard: open }),

  startNewProjectFromWizard: (params) =>
    set((s) => {
      const now = new Date().toISOString();
      const areaM2 = Number((params.widthM * params.lengthM).toFixed(2)) || params.areaM2;
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        companyId: s.activeCompanyId,
        ownerUid: s.auth.uid || 'demo-owner',
        clientId: params.clientId,
        clientName: params.clientName,
        name: params.name.trim() || 'Nuevo Proyecto de Jardín',
        spaceType: params.spaceType,
        terrainShape: params.terrainShape,
        widthM: params.widthM,
        lengthM: params.lengthM,
        areaM2,
        designStyle: params.designStyle,
        targetBudget: params.targetBudget,
        status: 'borrador',
        elements: [],
        surfaces: [],
        assumptions: {
          topsoilThicknessCm: 15,
          gravelDepthCm: 5,
          plantSpacingCm: 50,
          edgingProductPricePerMl: 12.5,
          topsoilPricePerM3: 28,
          includeTopsoilEstimate: false,
          includeEdgingEstimate: false,
        },
        estimatedTotal: 0,
        shareEnabled: false,
        createdAt: now,
        updatedAt: now,
      };
      return {
        ...s,
        activeProject: newProj,
        showProjectWizard: false,
        selectedElementId: null,
        selectedSurfaceId: null,
        undoStack: [],
        redoStack: [],
        activeNav: 'disenador',
        toast: { message: `Terreno "${newProj.name}" (${newProj.areaM2} m²) listo para diseñar.`, type: 'success' },
      };
    }),

  openProjectInDesigner: (projectId) =>
    set((s) => {
      const found = s.projects.find(
        (p) => p.id === projectId && p.companyId === s.activeCompanyId,
      );
      if (!found) return s;
      return {
        ...s,
        activeProject: JSON.parse(JSON.stringify(found)),
        selectedElementId: null,
        selectedSurfaceId: null,
        showProjectWizard: false,
        undoStack: [],
        redoStack: [],
        activeNav: 'disenador',
      };
    }),

  loadPopulatedTemplate: (templateId, preferredView = '3d') =>
    set((s) => {
      const companyProducts = s.products.filter((p) => p.companyId === s.activeCompanyId);
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const populated = buildPopulatedTemplateProject({
        templateId,
        companyId: s.activeCompanyId,
        ownerUid: s.auth.uid || 'demo-owner',
        companyProducts,
      });
      populated.estimatedTotal = computeProjectEstimatedTotal(populated, company);
      return {
        ...s,
        activeProject: populated,
        viewMode: preferredView,
        cameraPreset: 'perspective',
        cameraNonce: s.cameraNonce + 1,
        selectedElementId: null,
        selectedSurfaceId: null,
        showProjectWizard: false,
        undoStack: [],
        redoStack: [],
        activeNav: 'disenador',
        toast: {
          message: `Plantilla "${populated.name}" cargada con vegetación y superficies 3D.`,
          type: 'success',
        },
      };
    }),

  clearActiveDesign: () =>
    set((s) => {
      const updated: Project = {
        ...s.activeProject,
        elements: [],
        surfaces: [],
        estimatedTotal: 0,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedElementId: null,
        selectedSurfaceId: null,
        toast: { message: 'Terreno despejado. Puedes deshacer si lo necesitas.', type: 'info' },
      };
    }),

  importProjectJson: (proj) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const now = new Date().toISOString();
      const imported: Project = {
        ...proj,
        id: `proj-${Date.now()}`,
        companyId: s.activeCompanyId,
        ownerUid: s.auth.uid || 'demo-owner',
        name: `${proj.name || 'Proyecto importado'} (Importado)`,
        shareEnabled: false,
        shareToken: undefined,
        createdAt: now,
        updatedAt: now,
      };
      imported.estimatedTotal = computeProjectEstimatedTotal(imported, company);
      const next = {
        ...s,
        projects: [imported, ...s.projects],
        activeProject: imported,
        activeNav: 'disenador' as NavSection,
        toast: { message: `Proyecto "${imported.name}" importado y abierto.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setCameraPreset: (preset) =>
    set((s) => ({ cameraPreset: preset, cameraNonce: s.cameraNonce + 1, viewMode: '3d' })),
  triggerZoom: (delta) => set((s) => ({ zoomDelta: s.zoomDelta + delta })),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setGrowthYears: (growthYears) => set({ growthYears }),
  selectElement: (id) => set({ selectedElementId: id, selectedSurfaceId: null }),
  selectSurface: (id) => set({ selectedSurfaceId: id, selectedElementId: null }),
  setPendingPlacementProduct: (productId) => set({ pendingPlacementProductId: productId }),
  openFloralPreset: (presetId) =>
    set({ pendingFloralPresetId: presetId, activeNav: 'floristeria' }),
  clearPendingFloralPreset: () => set({ pendingFloralPresetId: null }),
  setDrawingSurfaceTool: (tool) => set({ drawingSurfaceTool: tool }),
  setLatestCanvasPreview: (dataUrl) => set({ latestCanvasPreview: dataUrl }),
  submitCommercialLead: (lead) =>
    set((s) => ({
      leads: [
        {
          ...lead,
          id: `lead-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
        ...s.leads,
      ],
      toast: {
        message: 'Solicitud recibida correctamente. El equipo comercial se pondrá en contacto contigo.',
        type: 'success',
      },
    })),

  pushUndoSnapshot: () =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
      redoStack: [],
    })),

  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const prev = s.undoStack[s.undoStack.length - 1];
      const currentSnap = snapshotOf(s.activeProject);
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const restored: Project = {
        ...s.activeProject,
        elements: prev.elements,
        surfaces: prev.surfaces,
        widthM: prev.widthM,
        lengthM: prev.lengthM,
        areaM2: prev.areaM2,
        assumptions: prev.assumptions,
        updatedAt: new Date().toISOString(),
      };
      restored.estimatedTotal = computeProjectEstimatedTotal(restored, company);
      return {
        ...s,
        activeProject: restored,
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, currentSnap],
      };
    }),

  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const nextSnap = s.redoStack[s.redoStack.length - 1];
      const currentSnap = snapshotOf(s.activeProject);
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const restored: Project = {
        ...s.activeProject,
        elements: nextSnap.elements,
        surfaces: nextSnap.surfaces,
        widthM: nextSnap.widthM,
        lengthM: nextSnap.lengthM,
        areaM2: nextSnap.areaM2,
        assumptions: nextSnap.assumptions,
        updatedAt: new Date().toISOString(),
      };
      restored.estimatedTotal = computeProjectEstimatedTotal(restored, company);
      return {
        ...s,
        activeProject: restored,
        undoStack: [...s.undoStack, currentSnap],
        redoStack: s.redoStack.slice(0, -1),
      };
    }),

  updateTerrainDimensions: (widthM, lengthM) =>
    set((s) => {
      const w = Math.max(2, Math.min(200, Number(widthM.toFixed(2))));
      const l = Math.max(2, Math.min(200, Number(lengthM.toFixed(2))));
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const updated: Project = {
        ...s.activeProject,
        widthM: w,
        lengthM: l,
        areaM2: Number((w * l).toFixed(2)),
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
      };
    }),

  updateAssumptions: (patch) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const updated: Project = {
        ...s.activeProject,
        assumptions: { ...s.activeProject.assumptions, ...patch },
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return { ...s, activeProject: updated };
    }),

  addElementToDesign: (product, pos, count = 1) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const newElements: DesignElement[] = [];
      const baseX = pos?.x ?? 0;
      const baseZ = pos?.z ?? 0;
      const hw = s.activeProject.widthM / 2 - 0.6;
      const hl = s.activeProject.lengthM / 2 - 0.6;

      for (let i = 0; i < count; i++) {
        const offsetX = count > 1 ? ((i % 4) - 1.5) * 0.85 : 0;
        const offsetZ = count > 1 ? (Math.floor(i / 4) - 0.5) * 0.85 : 0;
        const px = Math.max(-hw, Math.min(hw, Number((baseX + offsetX).toFixed(2))));
        const pz = Math.max(-hl, Math.min(hl, Number((baseZ + offsetZ).toFixed(2))));
        newElements.push({
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
          productId: product.id,
          name: product.commercialName,
          category: product.category,
          modelPreset: product.modelPreset,
          model3dUrl: product.model3dUrl,
          colorHex: product.colorHex,
          position: { x: px, y: 0, z: pz },
          rotationY: 0,
          scale: 1,
          quantity: 1,
          unitPrice: product.price,
          unit: product.unit,
          widthM: Math.max(0.35, (product.dimensions.widthCm || 60) / 100),
          depthM: Math.max(0.35, (product.dimensions.depthCm || product.dimensions.widthCm || 60) / 100),
          heightM: Math.max(0.25, (product.dimensions.heightCm || 80) / 100),
        });
      }

      const updated: Project = {
        ...s.activeProject,
        elements: [...s.activeProject.elements, ...newElements],
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedElementId: newElements[newElements.length - 1]?.id || null,
        selectedSurfaceId: null,
        pendingPlacementProductId: null,
      };
    }),

  updateElement: (id, patch, recordUndo = false) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const elements = s.activeProject.elements.map((el) =>
        el.id === id ? { ...el, ...patch } : el,
      );
      const updated: Project = {
        ...s.activeProject,
        elements,
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: recordUndo ? [...s.undoStack.slice(-24), snapshotOf(s.activeProject)] : s.undoStack,
        redoStack: recordUndo ? [] : s.redoStack,
        activeProject: updated,
      };
    }),

  duplicateElement: (id) =>
    set((s) => {
      const orig = s.activeProject.elements.find((el) => el.id === id);
      if (!orig) return s;
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const copy: DesignElement = {
        ...orig,
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        position: {
          x: Number((orig.position.x + 0.9).toFixed(2)),
          y: 0,
          z: Number((orig.position.z + 0.9).toFixed(2)),
        },
      };
      const updated: Project = {
        ...s.activeProject,
        elements: [...s.activeProject.elements, copy],
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedElementId: copy.id,
      };
    }),

  deleteElement: (id) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const updated: Project = {
        ...s.activeProject,
        elements: s.activeProject.elements.filter((el) => el.id !== id),
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
      };
    }),

  swapElementProduct: (elementId, newProduct) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const elements = s.activeProject.elements.map((el) =>
        el.id === elementId
          ? {
              ...el,
              productId: newProduct.id,
              name: newProduct.commercialName,
              category: newProduct.category,
              modelPreset: newProduct.modelPreset,
              model3dUrl: newProduct.model3dUrl,
              colorHex: newProduct.colorHex,
              unitPrice: newProduct.price,
              unit: newProduct.unit,
              widthM: Math.max(0.35, (newProduct.dimensions.widthCm || 60) / 100),
              depthM: Math.max(0.35, (newProduct.dimensions.depthCm || newProduct.dimensions.widthCm || 60) / 100),
              heightM: Math.max(0.25, (newProduct.dimensions.heightCm || 80) / 100),
            }
          : el,
      );
      const updated: Project = { ...s.activeProject, elements, updatedAt: new Date().toISOString() };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
      };
    }),

  addSurfaceToDesign: ({ product, points, shapeType, targetAreaM2, includeEdging = false }) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      let finalPoints = points;
      if (targetAreaM2 && targetAreaM2 > 0 && shapeType === 'rect') {
        const aspect = 1.4;
        const w = Math.min(s.activeProject.widthM - 0.4, Math.sqrt(targetAreaM2 * aspect));
        const l = targetAreaM2 / Math.max(0.5, w);
        finalPoints = getRectPoints(0, 0, w, l);
      }
      const { areaM2, perimeterM } = calculatePolygonAreaAndPerimeter(finalPoints);
      const finalArea = targetAreaM2 && targetAreaM2 > 0 ? targetAreaM2 : areaM2;

      const matMap: Record<string, DesignSurface['materialType']> = {
        surface_grass: product.subcategory.toLowerCase().includes('artificial') ? 'cesped_artificial' : 'cesped_natural',
        surface_gravel: 'grava',
        surface_bark: 'corteza',
        surface_path: 'camino',
        surface_bed: 'parterre',
      };

      const surf: DesignSurface = {
        id: `surf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        name: product.commercialName,
        materialType: matMap[product.modelPreset] || 'parterre',
        shapeType,
        points: finalPoints,
        areaM2: Number(finalArea.toFixed(2)),
        perimeterM,
        unitPrice: product.price,
        colorHex: product.colorHex,
        includeEdging,
      };

      const updated: Project = {
        ...s.activeProject,
        surfaces: [...s.activeProject.surfaces, surf],
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedSurfaceId: surf.id,
        selectedElementId: null,
        drawingSurfaceTool: { active: false, mode: 'rect', productId: null },
      };
    }),

  updateSurface: (id, patch) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const surfaces = s.activeProject.surfaces.map((sf) => {
        if (sf.id !== id) return sf;
        const merged = { ...sf, ...patch };
        if (patch.points) {
          const calc = calculatePolygonAreaAndPerimeter(patch.points);
          merged.areaM2 = calc.areaM2;
          merged.perimeterM = calc.perimeterM;
        }
        return merged;
      });
      const updated: Project = {
        ...s.activeProject,
        surfaces,
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return { ...s, activeProject: updated };
    }),

  resizeSurfaceToArea: (id, targetAreaM2) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const surfaces = s.activeProject.surfaces.map((sf) => {
        if (sf.id !== id || targetAreaM2 <= 0) return sf;
        const currentArea = Math.max(0.1, sf.areaM2);
        const factor = Math.sqrt(targetAreaM2 / currentArea);
        const cx = sf.points.reduce((a, p) => a + p.x, 0) / sf.points.length;
        const cz = sf.points.reduce((a, p) => a + p.z, 0) / sf.points.length;
        const scaledPoints = sf.points.map((p) => ({
          x: Number((cx + (p.x - cx) * factor).toFixed(2)),
          z: Number((cz + (p.z - cz) * factor).toFixed(2)),
        }));
        const calc = calculatePolygonAreaAndPerimeter(scaledPoints);
        return {
          ...sf,
          points: scaledPoints,
          areaM2: Number(targetAreaM2.toFixed(2)),
          perimeterM: calc.perimeterM,
        };
      });
      const updated: Project = {
        ...s.activeProject,
        surfaces,
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
      };
    }),

  deleteSurface: (id) =>
    set((s) => {
      const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
      const updated: Project = {
        ...s.activeProject,
        surfaces: s.activeProject.surfaces.filter((sf) => sf.id !== id),
        updatedAt: new Date().toISOString(),
      };
      updated.estimatedTotal = computeProjectEstimatedTotal(updated, company);
      return {
        ...s,
        undoStack: [...s.undoStack.slice(-24), snapshotOf(s.activeProject)],
        redoStack: [],
        activeProject: updated,
        selectedSurfaceId: s.selectedSurfaceId === id ? null : s.selectedSurfaceId,
      };
    }),

  saveActiveProject: (previewDataUrl) => {
    const s = get();
    const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
    const now = new Date().toISOString();
    const saved: Project = {
      ...s.activeProject,
      companyId: s.activeCompanyId,
      ownerUid: s.auth.uid || s.activeProject.ownerUid || 'demo-owner',
      estimatedTotal: computeProjectEstimatedTotal(s.activeProject, company),
      previewDataUrl: previewDataUrl || s.latestCanvasPreview || s.activeProject.previewDataUrl,
      updatedAt: now,
    };

    const exists = s.projects.some((p) => p.id === saved.id);
    const projects = exists
      ? s.projects.map((p) => (p.id === saved.id ? saved : p))
      : [saved, ...s.projects];

    set((state) => {
      const next = {
        ...state,
        activeProject: saved,
        projects,
        toast: { message: `Proyecto "${saved.name}" guardado correctamente.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return saved;
  },

  duplicateProject: (id) => {
    const s = get();
    const orig = s.projects.find((p) => p.id === id && p.companyId === s.activeCompanyId);
    if (!orig) return null;
    const now = new Date().toISOString();
    const copy: Project = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `proj-${Date.now()}`,
      name: `${orig.name} (Copia)`,
      status: 'borrador',
      shareEnabled: false,
      shareToken: undefined,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const next = {
        ...state,
        projects: [copy, ...state.projects],
        toast: { message: `Proyecto duplicado: "${copy.name}".`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return copy;
  },

  deleteProject: (id) =>
    set((s) => {
      const projects = s.projects.filter((p) => !(p.id === id && p.companyId === s.activeCompanyId));
      const next = {
        ...s,
        projects,
        toast: { message: 'Proyecto eliminado.', type: 'info' as const },
      };
      saveSlice(next);
      return next;
    }),

  updateProjectStatus: (id, status) =>
    set((s) => {
      const projects = s.projects.map((p) =>
        p.id === id && p.companyId === s.activeCompanyId
          ? { ...p, status, updatedAt: new Date().toISOString() }
          : p,
      );
      const next = {
        ...s,
        projects,
        activeProject: s.activeProject.id === id ? { ...s.activeProject, status } : s.activeProject,
        toast: { message: 'Estado del proyecto actualizado.', type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  toggleShareProject: (id) => {
    const s = get();
    const proj = s.projects.find((p) => p.id === id && p.companyId === s.activeCompanyId);
    if (!proj) return null;
    const token = proj.shareToken || `shr-${Date.now().toString(36)}`;
    const shareEnabled = !proj.shareEnabled;
    set((state) => {
      const projects = state.projects.map((p) =>
        p.id === id ? { ...p, shareEnabled, shareToken: token } : p,
      );
      const next = {
        ...state,
        projects,
        toast: {
          message: shareEnabled ? 'Enlace de solo lectura activado.' : 'Enlace público desactivado.',
          type: 'info' as const,
        },
      };
      saveSlice(next);
      return next;
    });
    return shareEnabled ? token : null;
  },

  generateQuoteFromActiveProject: (clientOverride) => {
    const savedProj = get().saveActiveProject();
    const quote = get().generateQuoteFromProject(savedProj.id, clientOverride);
    return quote!;
  },

  generateQuoteFromProject: (projectId: string, clientOverride?: Partial<Client>) => {
    const s = get();
    const proj = s.projects.find((p) => p.id === projectId && p.companyId === s.activeCompanyId);
    if (!proj) return null;
    const company = s.companies.find((c) => c.id === s.activeCompanyId) || s.companies[0];
    const client = s.clients.find((c) => c.id === proj.clientId && c.companyId === s.activeCompanyId);
    const items = buildQuoteLineItemsFromDesign(proj.elements, proj.surfaces, proj.assumptions);
    const transportCost = company.settings.transportFlatFee;
    const laborCost = 0;
    const installationCost = 0;
    const totals = calculateQuoteTotals({
      items,
      discountPercent: 0,
      transportCost,
      laborCost,
      installationCost,
      vatRate: company.settings.vatRate,
    });
    const now = new Date().toISOString();
    const validUntilDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const newQuote: Quote = {
      id: `quote-${Date.now()}`,
      companyId: s.activeCompanyId,
      ownerUid: s.auth.uid || proj.ownerUid,
      projectId: proj.id,
      projectName: proj.name,
      clientId: client?.id,
      clientName: clientOverride?.name || client?.name || proj.clientName || 'Cliente Particular',
      clientEmail: clientOverride?.email || client?.email || '',
      clientPhone: clientOverride?.phone || client?.phone || '',
      clientAddress: clientOverride?.address || client?.address || '',
      quoteNumber: `PRE-${new Date().getFullYear()}-${String(s.quotes.length + 101).padStart(4, '0')}`,
      items,
      surfacesSummary: proj.surfaces.map((sf) => ({
        name: sf.name,
        areaM2: sf.areaM2,
        perimeterM: sf.perimeterM,
        cost: Number((sf.areaM2 * sf.unitPrice).toFixed(2)),
      })),
      subtotal: totals.subtotal,
      discountPercent: 0,
      discountAmount: totals.discountAmount,
      transportCost,
      laborCost,
      installationCost,
      vatRate: company.settings.vatRate,
      vatAmount: totals.vatAmount,
      total: totals.total,
      validUntil: validUntilDate,
      notes: 'Precios de demostración orientativos editables. Calculado automáticamente desde VIVERDE STUDIO.',
      status: 'borrador',
      previewDataUrl: proj.previewDataUrl || s.latestCanvasPreview || undefined,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const next = {
        ...state,
        quotes: [newQuote, ...state.quotes],
        selectedQuoteId: newQuote.id,
        activeNav: 'presupuestos' as NavSection,
        toast: { message: `Presupuesto ${newQuote.quoteNumber} generado desde el diseño.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return newQuote;
  },

  saveCustomQuote: (quote) =>
    set((state) => {
      const next = {
        ...state,
        quotes: [quote, ...state.quotes],
        selectedQuoteId: quote.id,
        activeNav: 'presupuestos' as NavSection,
        toast: { message: `Presupuesto ${quote.quoteNumber} guardado en Presupuestos.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    }),

  selectQuote: (id) => set({ selectedQuoteId: id }),

  updateQuote: (id, patch) =>
    set((s) => {
      const quotes = s.quotes.map((q) => {
        if (q.id !== id || q.companyId !== s.activeCompanyId) return q;
        const merged = { ...q, ...patch, updatedAt: new Date().toISOString() };
        const totals = calculateQuoteTotals({
          items: merged.items,
          discountPercent: merged.discountPercent,
          transportCost: merged.transportCost,
          laborCost: merged.laborCost,
          installationCost: merged.installationCost,
          vatRate: merged.vatRate,
        });
        return { ...merged, ...totals };
      });
      const next = { ...s, quotes };
      saveSlice(next);
      return next;
    }),

  duplicateQuote: (id) => {
    const s = get();
    const orig = s.quotes.find((q) => q.id === id && q.companyId === s.activeCompanyId);
    if (!orig) return null;
    const now = new Date().toISOString();
    const copy: Quote = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `quote-${Date.now()}`,
      quoteNumber: `PRE-${new Date().getFullYear()}-${String(s.quotes.length + 101).padStart(4, '0')}`,
      status: 'borrador',
      createdAt: now,
      updatedAt: now,
    };
    set((state) => {
      const next = {
        ...state,
        quotes: [copy, ...state.quotes],
        selectedQuoteId: copy.id,
        toast: { message: `Presupuesto duplicado: ${copy.quoteNumber}.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return copy;
  },

  deleteQuote: (id) =>
    set((s) => {
      const quotes = s.quotes.filter((q) => !(q.id === id && q.companyId === s.activeCompanyId));
      const next = {
        ...s,
        quotes,
        selectedQuoteId: s.selectedQuoteId === id ? quotes[0]?.id || null : s.selectedQuoteId,
        toast: { message: 'Presupuesto eliminado.', type: 'info' as const },
      };
      saveSlice(next);
      return next;
    }),

  saveFloralDesign: (input) => {
    const s = get();
    const design: FloralDesign = {
      ...input,
      id: `floral-${Date.now()}`,
      companyId: s.activeCompanyId,
      ownerUid: s.auth.uid || 'demo-owner',
      createdAt: new Date().toISOString(),
    };
    set((state) => {
      const next = {
        ...state,
        floralDesigns: [design, ...state.floralDesigns],
        toast: { message: `Composición "${design.name}" guardada.`, type: 'success' as const },
      };
      saveSlice(next);
      return next;
    });
    return design;
  },

  deleteFloralDesign: (id) =>
    set((s) => {
      const next = {
        ...s,
        floralDesigns: s.floralDesigns.filter((d) => !(d.id === id && d.companyId === s.activeCompanyId)),
        toast: { message: 'Composición floral eliminada.', type: 'info' as const },
      };
      saveSlice(next);
      return next;
    }),

  hydrateFromCloud: (payload) =>
    set((s) => {
      const next = { ...s, ...payload };
      saveSlice(next);
      return next;
    }),
}));
