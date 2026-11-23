import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Calculator,
  Copy,
  Download,
  Droplets,
  Eraser,
  FileText,
  FolderPlus,
  Layers,
  Map as MapIcon,
  Moon,
  Plus,
  Redo2,
  RotateCw,
  Save,
  Search,
  Sprout,
  Square,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  computeGardenInsights,
  GARDEN_STYLE_TEMPLATES,
  GardenTemplateId,
} from '../../data/gardenTemplates';
import { useViverdeStore } from '../../store/useViverdeStore';
import { syncProjectToCloud, syncQuoteToCloud } from '../../lib/firestoreSync';
import { Product } from '../../types/viverde';
import {
  buildQuoteLineItemsFromDesign,
  calculateQuantityEstimates,
  calculateQuoteTotals,
  formatEuro,
  getRectPoints,
} from '../../utils/calculations';
import { Plan2DViewport } from './Plan2DViewport';
import { ProjectWizardModal } from './ProjectWizardModal';
import { ThreeViewport } from './ThreeViewport';

export const GardenDesigner: React.FC = () => {
  const {
    activeProject,
    activeCompanyId,
    companies,
    products,
    selectedElementId,
    selectedSurfaceId,
    viewMode,
    timeOfDay,
    growthYears,
    undoStack,
    redoStack,
    pendingPlacementProductId,
    drawingSurfaceTool,
    setViewMode,
    setCameraPreset,
    triggerZoom,
    setTimeOfDay,
    setGrowthYears,
    loadPopulatedTemplate,
    clearActiveDesign,
    setShowProjectWizard,
    setPendingPlacementProduct,
    setDrawingSurfaceTool,
    setLatestCanvasPreview,
    undo,
    redo,
    updateTerrainDimensions,
    updateAssumptions,
    addElementToDesign,
    updateElement,
    duplicateElement,
    deleteElement,
    swapElementProduct,
    addSurfaceToDesign,
    updateSurface,
    resizeSurfaceToArea,
    deleteSurface,
    saveActiveProject,
    generateQuoteFromActiveProject,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === activeCompanyId),
    [products, activeCompanyId],
  );

  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState('all');
  const [quickBatchQty, setQuickBatchQty] = useState<number>(1);
  const [quickSurfaceM2, setQuickSurfaceM2] = useState<number>(35);
  const [showEstimator, setShowEstimator] = useState(false);

  const captureRef = useRef<(() => string | null) | null>(null);

  const filteredLibrary = useMemo(() => {
    const q = libSearch.trim().toLowerCase();
    return companyProducts.filter((p) => {
      if (libCategory !== 'all' && p.category !== libCategory) return false;
      if (q && !`${p.commercialName} ${p.subcategory} ${p.botanicalName || ''}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [companyProducts, libSearch, libCategory]);

  const selectedElement = activeProject.elements.find((e) => e.id === selectedElementId) || null;
  const selectedSurface = activeProject.surfaces.find((s) => s.id === selectedSurfaceId) || null;

  const lineItems = useMemo(
    () =>
      buildQuoteLineItemsFromDesign(
        activeProject.elements,
        activeProject.surfaces,
        activeProject.assumptions,
      ),
    [activeProject.elements, activeProject.surfaces, activeProject.assumptions],
  );

  const estimates = useMemo(
    () => calculateQuantityEstimates(activeProject.surfaces, activeProject.assumptions),
    [activeProject.surfaces, activeProject.assumptions],
  );

  const insights = useMemo(
    () => computeGardenInsights(activeProject, companyProducts),
    [activeProject, companyProducts],
  );

  const liveTotals = useMemo(
    () =>
      calculateQuoteTotals({
        items: lineItems,
        discountPercent: 0,
        transportCost: 0,
        laborCost: 0,
        installationCost: 0,
        vatRate: company.settings.vatRate,
      }),
    [lineItems, company.settings.vatRate],
  );

  const handleSave = () => {
    const snap = captureRef.current ? captureRef.current() : null;
    if (snap) setLatestCanvasPreview(snap);
    const saved = saveActiveProject(snap || undefined);
    void syncProjectToCloud(saved).catch(() => {});
  };

  const handleGenerateQuote = () => {
    const snap = captureRef.current ? captureRef.current() : null;
    if (snap) setLatestCanvasPreview(snap);
    const savedProj = saveActiveProject(snap || undefined);
    const quote = generateQuoteFromActiveProject();
    void syncQuoteToCloud(quote, savedProj).catch(() => {});
  };

  const handleExportDesign = () => {
    const snap = captureRef.current ? captureRef.current() : null;
    if (snap) {
      const a = document.createElement('a');
      a.href = snap;
      a.download = `${activeProject.name.replace(/\s+/g, '_')}_3D.png`;
      a.click();
      showToast('Imagen 3D del diseño exportada.', 'success');
    } else {
      const blob = new Blob([JSON.stringify(activeProject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.replace(/\s+/g, '_')}_proyecto.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Archivo JSON del proyecto exportado.', 'success');
    }
  };

  const handleQuickAddProduct = (prod: Product) => {
    if (prod.unit === 'm2') {
      addSurfaceToDesign({
        product: prod,
        points: getRectPoints(0, 0, 5, 4),
        shapeType: 'rect',
        targetAreaM2: quickSurfaceM2,
      });
      showToast(`Superficie de ${quickSurfaceM2} m² de ${prod.commercialName} añadida.`, 'success');
    } else {
      addElementToDesign(prod, { x: 0, z: 0 }, quickBatchQty);
      showToast(`${quickBatchQty} × ${prod.commercialName} añadidos al diseño.`, 'success');
    }
  };

  const handleUploadGltf = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedElement) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    updateElement(selectedElement.id, { model3dUrl: blobUrl }, true);
    showToast(`Modelo 3D "${file.name}" vinculado al elemento.`, 'success');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-[680px] bg-[#F4F0E7]">
      <ProjectWizardModal />

      {/* Top Designer Toolbar */}
      <div className="bg-white border-b border-[#303632]/15 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-display text-base sm:text-lg font-semibold text-[#183D32] leading-tight">
              {activeProject.name}
            </h1>
            <p className="text-[11px] text-[#303632]/70 font-mono tabular-nums">
              {activeProject.spaceType} · {activeProject.widthM} × {activeProject.lengthM} m ({activeProject.areaM2} m²)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowProjectWizard(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Nuevo terreno</span>
          </button>
          <select
            value=""
            aria-label="Cargar plantilla de estilo 3D"
            onChange={(e) => {
              if (e.target.value) {
                loadPopulatedTemplate(e.target.value as GardenTemplateId, '3d');
                e.target.value = '';
              }
            }}
            className="px-2.5 py-1.5 bg-[#DDE8D8]/65 hover:bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg border border-[#183D32]/15 cursor-pointer"
          >
            <option value="">Cargar plantilla...</option>
            {GARDEN_STYLE_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title}
              </option>
            ))}
          </select>
        </div>

        {/* Center View & Camera Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-[#F4F0E7] p-1 rounded-lg mr-1">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === '2d' ? 'bg-[#183D32] text-white' : 'text-[#303632] hover:text-[#183D32]'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Vista 2D</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === '3d' ? 'bg-[#183D32] text-white' : 'text-[#303632] hover:text-[#183D32]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Vista 3D</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCameraPreset('top')}
            className="px-2.5 py-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Superior
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('front')}
            className="px-2.5 py-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset('perspective')}
            className="px-2.5 py-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] text-xs font-medium rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            3D Libre
          </button>

          <button
            type="button"
            onClick={() => triggerZoom(1)}
            aria-label="Acercar zoom"
            className="p-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] rounded-lg cursor-pointer"
          >
            <ZoomIn className="w-4 h-4 text-[#183D32]" />
          </button>
          <button
            type="button"
            onClick={() => triggerZoom(-1)}
            aria-label="Alejar zoom"
            className="p-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] rounded-lg cursor-pointer"
          >
            <ZoomOut className="w-4 h-4 text-[#183D32]" />
          </button>

          <button
            type="button"
            onClick={undo}
            disabled={undoStack.length === 0}
            aria-label="Deshacer"
            title="Deshacer"
            className="p-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] disabled:opacity-40 rounded-lg cursor-pointer"
          >
            <Undo2 className="w-4 h-4 text-[#183D32]" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoStack.length === 0}
            aria-label="Rehacer"
            title="Rehacer"
            className="p-1.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] disabled:opacity-40 rounded-lg cursor-pointer"
          >
            <Redo2 className="w-4 h-4 text-[#183D32]" />
          </button>
          <button
            type="button"
            onClick={clearActiveDesign}
            disabled={activeProject.elements.length === 0 && activeProject.surfaces.length === 0}
            aria-label="Despejar terreno"
            title="Despejar terreno"
            className="p-1.5 bg-white border border-[#303632]/15 hover:bg-red-50 disabled:opacity-40 rounded-lg cursor-pointer"
          >
            <Eraser className="w-4 h-4 text-[#303632]" />
          </button>

          {/* Solar & Growth Simulator in 3D */}
          {viewMode === '3d' && (
            <div className="flex items-center gap-1 bg-[#F4F0E7] p-1 rounded-lg ml-1">
              {(
                [
                  ['morning', 'Mañana', Sunrise],
                  ['midday', 'Día', Sun],
                  ['sunset', 'Tarde', Sunset],
                  ['night', 'Noche', Moon],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTimeOfDay(id)}
                  title={`Iluminación: ${label}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    timeOfDay === id ? 'bg-[#183D32] text-white' : 'text-[#303632] hover:bg-white/70'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              ))}
              <span className="w-px h-4 bg-[#303632]/15 mx-0.5" aria-hidden="true" />
              {([0, 3, 5] as const).map((yrs) => (
                <button
                  key={yrs}
                  type="button"
                  onClick={() => setGrowthYears(yrs)}
                  title={`Crecimiento botánico: ${yrs === 0 ? 'Plantación hoy' : `+${yrs} años`}`}
                  className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono tabular-nums font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    growthYears === yrs ? 'bg-[#183D32] text-white' : 'text-[#303632] hover:bg-white/70'
                  }`}
                >
                  {yrs === 0 && <Sprout className="w-3 h-3" />}
                  <span>{yrs === 0 ? 'Hoy' : `+${yrs}a`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Primary Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportDesign}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#303632]/20 hover:bg-[#F4F0E7] text-xs font-semibold text-[#303632] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32] text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateQuote}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generar presupuesto</span>
          </button>
        </div>
      </div>

      {/* 3-Zone Editor Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT PANEL: Biblioteca de elementos */}
        <aside className="lg:col-span-3 bg-white border-r border-[#303632]/15 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3.5 border-b border-[#303632]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#183D32]">
                Biblioteca de elementos
              </h2>
              <span className="text-[11px] text-[#303632]/60">Arrastra o añade</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#303632]/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                placeholder="Buscar olivo, lavanda, césped..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs focus:outline-none focus:border-[#183D32]"
              />
            </div>

            <select
              value={libCategory}
              onChange={(e) => setLibCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
            >
              <option value="all">Todas las categorías</option>
              <option value="arboles">Árboles</option>
              <option value="arbustos">Arbustos</option>
              <option value="plantas">Plantas</option>
              <option value="flores">Flores</option>
              <option value="cesped">Césped y cubresuelos (m²)</option>
              <option value="materiales">Materiales, pérgolas y piscinas</option>
            </select>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <label className="flex items-center justify-between bg-[#F4F0E7] px-2 py-1 rounded">
                <span>Lote plantas:</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={quickBatchQty}
                  onChange={(e) => setQuickBatchQty(Math.max(1, Number(e.target.value)))}
                  className="w-11 text-right font-mono font-semibold bg-white border border-[#303632]/15 rounded px-1"
                />
              </label>
              <label className="flex items-center justify-between bg-[#F4F0E7] px-2 py-1 rounded">
                <span>Área m²:</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quickSurfaceM2}
                  onChange={(e) => setQuickSurfaceM2(Math.max(1, Number(e.target.value)))}
                  className="w-12 text-right font-mono font-semibold bg-white border border-[#303632]/15 rounded px-1"
                />
              </label>
            </div>
          </div>

          {/* Pending placement banner if user came from Catalog */}
          {pendingPlacementProductId && (() => {
            const pendingProd = companyProducts.find((p) => p.id === pendingPlacementProductId);
            return (
              <div className="mx-3 mt-2 p-2.5 bg-[#DDE8D8] rounded-lg text-xs text-[#183D32] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">
                    {pendingProd ? pendingProd.commercialName : 'Elemento listo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingPlacementProduct(null)}
                    className="underline font-semibold cursor-pointer shrink-0"
                  >
                    Salir
                  </button>
                </div>
                {pendingProd && (
                  <button
                    type="button"
                    onClick={() => handleQuickAddProduct(pendingProd)}
                    className="w-full py-1.5 px-2.5 bg-[#183D32] text-white text-[11px] font-semibold rounded cursor-pointer"
                  >
                    Colocar {pendingProd.unit === 'm2' ? `${quickSurfaceM2} m²` : `×${quickBatchQty} en el terreno`}
                  </button>
                )}
              </div>
            );
          })()}

          {/* Element list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredLibrary.map((prod) => {
              const isArea = prod.unit === 'm2';
              return (
                <div
                  key={prod.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/viverde-product-id', prod.id);
                  }}
                  className="p-2.5 bg-[#F4F0E7]/45 hover:bg-[#DDE8D8]/45 border border-[#303632]/10 rounded-lg transition-colors cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#183D32] truncate">
                        {prod.commercialName}
                      </p>
                      <p className="text-[11px] text-[#303632]/70 font-mono tabular-nums">
                        {formatEuro(prod.price)} / {prod.unit === 'm2' ? 'm²' : prod.unit === 'm3' ? 'm³' : prod.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAddProduct(prod)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#183D32] hover:bg-[#122e25] text-white text-[11px] font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isArea ? `${quickSurfaceM2}m²` : `×${quickBatchQty}`}</span>
                    </button>
                  </div>

                  {isArea && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('2d');
                          setDrawingSurfaceTool({ active: true, mode: 'rect', productId: prod.id });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 bg-white border border-[#303632]/15 hover:border-[#183D32] text-[10px] font-medium text-[#183D32] rounded cursor-pointer"
                      >
                        <Square className="w-2.5 h-2.5" />
                        <span>Dibujar rect.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('2d');
                          setDrawingSurfaceTool({ active: true, mode: 'polygon', productId: prod.id });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 bg-white border border-[#303632]/15 hover:border-[#183D32] text-[10px] font-medium text-[#183D32] rounded cursor-pointer"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>Polígono</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER PANEL: Synchronized 2D / 3D Canvas */}
        <main className="lg:col-span-6 relative min-h-[380px] lg:min-h-0">
          {viewMode === '2d' ? (
            <Plan2DViewport
              onRegisterCapture={(fn) => {
                captureRef.current = fn;
              }}
            />
          ) : (
            <ThreeViewport
              onRegisterCapture={(fn) => {
                captureRef.current = fn;
              }}
            />
          )}
        </main>

        {/* RIGHT PANEL: Properties & Live Cost Summary */}
        <aside className="lg:col-span-3 bg-white border-l border-[#303632]/15 flex flex-col min-h-0 overflow-y-auto">
          {/* Terrain Dimensions Quick Control */}
          <div className="p-4 border-b border-[#303632]/10">
            <h2 className="font-display text-sm font-semibold text-[#183D32] mb-2.5">
              Dimensiones del terreno
            </h2>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-[#303632]/65 mb-0.5">Ancho (m)</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  step={0.5}
                  value={activeProject.widthM}
                  onChange={(e) => updateTerrainDimensions(Number(e.target.value), activeProject.lengthM)}
                  className="w-full px-2 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#303632]/65 mb-0.5">Largo (m)</label>
                <input
                  type="number"
                  min={2}
                  max={200}
                  step={0.5}
                  value={activeProject.lengthM}
                  onChange={(e) => updateTerrainDimensions(activeProject.widthM, Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#303632]/65 mb-0.5">Área m²</label>
                <div className="px-2 py-1.5 bg-[#DDE8D8]/50 rounded font-mono font-semibold text-[#183D32] tabular-nums">
                  {activeProject.areaM2}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Element Properties */}
          {selectedElement && (
            <div className="p-4 border-b border-[#303632]/10 space-y-3 bg-[#F4F0E7]/35">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-[#303632]/60">Elemento seleccionado</p>
                  <h3 className="text-sm font-semibold text-[#183D32]">{selectedElement.name}</h3>
                  <p className="text-[11px] text-[#303632]/65">
                    {selectedElement.model3dUrl
                      ? 'Modelo 3D GLB/GLTF activo'
                      : 'Modelo 3D procedimental (sustituto geométrico)'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateElement(selectedElement.id)}
                    aria-label="Duplicar elemento"
                    className="p-1.5 bg-white border border-[#303632]/15 rounded hover:bg-[#DDE8D8] cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#183D32]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteElement(selectedElement.id)}
                    aria-label="Eliminar elemento"
                    className="p-1.5 bg-white border border-red-200 rounded hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-700" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Posición X (m)</label>
                  <input
                    type="number"
                    step={0.2}
                    value={selectedElement.position.x}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, x: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-[#303632]/15 rounded font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Posición Z (m)</label>
                  <input
                    type="number"
                    step={0.2}
                    value={selectedElement.position.z}
                    onChange={(e) =>
                      updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, z: Number(e.target.value) },
                      })
                    }
                    className="w-full px-2 py-1 bg-white border border-[#303632]/15 rounded font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">
                    Rotación ({Math.round((selectedElement.rotationY * 180) / Math.PI)}°)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="range"
                      min={0}
                      max={6.28}
                      step={0.1}
                      value={selectedElement.rotationY}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { rotationY: Number(e.target.value) })
                      }
                      className="w-full accent-[#183D32]"
                    />
                    <RotateCw className="w-3.5 h-3.5 text-[#303632]/50 shrink-0" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">
                    Escala ({selectedElement.scale.toFixed(2)}×)
                  </label>
                  <input
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.05}
                    value={selectedElement.scale}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { scale: Number(e.target.value) })
                    }
                    className="w-full accent-[#183D32]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Unidades en lote</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={selectedElement.quantity}
                    onChange={(e) =>
                      updateElement(
                        selectedElement.id,
                        { quantity: Math.max(1, Number(e.target.value)) },
                        true,
                      )
                    }
                    className="w-full px-2 py-1 bg-white border border-[#303632]/15 rounded font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Cambiar por otro</label>
                  <select
                    value={selectedElement.productId}
                    onChange={(e) => {
                      const np = companyProducts.find((p) => p.id === e.target.value);
                      if (np) swapElementProduct(selectedElement.id, np);
                    }}
                    className="w-full px-1.5 py-1 bg-white border border-[#303632]/15 rounded text-[11px]"
                  >
                    {companyProducts
                      .filter((p) => p.unit !== 'm2')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.commercialName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 bg-white border border-dashed border-[#183D32]/40 rounded-lg text-[11px] font-medium text-[#183D32] hover:bg-[#DDE8D8]/30 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Importar modelo .GLB / .GLTF</span>
                <input type="file" accept=".glb,.gltf" onChange={handleUploadGltf} className="hidden" />
              </label>
            </div>
          )}

          {/* Selected Surface Properties */}
          {selectedSurface && (
            <div className="p-4 border-b border-[#303632]/10 space-y-3 bg-[#F4F0E7]/35">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-[#303632]/60">Superficie seleccionada</p>
                  <h3 className="text-sm font-semibold text-[#183D32]">{selectedSurface.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSurface(selectedSurface.id)}
                  aria-label="Eliminar superficie"
                  className="p-1.5 bg-white border border-red-200 rounded hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-700" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Superficie (m²)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={selectedSurface.areaM2}
                    onChange={(e) =>
                      resizeSurfaceToArea(selectedSurface.id, Math.max(0.5, Number(e.target.value)))
                    }
                    className="w-full px-2 py-1 bg-white border border-[#303632]/15 rounded font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#303632]/65 mb-0.5">Perímetro</label>
                  <div className="px-2 py-1 bg-white border border-[#303632]/10 rounded font-mono tabular-nums">
                    {selectedSurface.perimeterM} m
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#303632] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSurface.includeEdging}
                  onChange={(e) =>
                    updateSurface(selectedSurface.id, { includeEdging: e.target.checked })
                  }
                  className="accent-[#183D32]"
                />
                <span>Añadir bordura perimetral Corten</span>
              </label>
            </div>
          )}

          {/* Configurable Quantity Calculator */}
          <div className="p-4 border-b border-[#303632]/10">
            <button
              type="button"
              onClick={() => setShowEstimator((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#183D32] cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Calculadora de cantidades y supuestos
              </span>
              <span>{showEstimator ? 'Ocultar' : 'Configurar'}</span>
            </button>

            {showEstimator && (
              <div className="mt-3 space-y-2.5 text-xs">
                <p className="text-[11px] text-[#303632]/70">
                  Fórmulas transparentes y editables según criterio técnico del proyecto:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#303632]/65">Espesor tierra (cm)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={activeProject.assumptions.topsoilThicknessCm}
                      onChange={(e) =>
                        updateAssumptions({ topsoilThicknessCm: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full px-2 py-1 bg-[#F4F0E7] rounded font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#303632]/65">Profund. grava (cm)</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={activeProject.assumptions.gravelDepthCm}
                      onChange={(e) =>
                        updateAssumptions({ gravelDepthCm: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full px-2 py-1 bg-[#F4F0E7] rounded font-mono tabular-nums"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-[#303632]/65">
                      Separación plantación en parterres (cm)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={200}
                      step={5}
                      value={activeProject.assumptions.plantSpacingCm}
                      onChange={(e) =>
                        updateAssumptions({ plantSpacingCm: Math.max(15, Number(e.target.value)) })
                      }
                      className="w-full px-2 py-1 bg-[#F4F0E7] rounded font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-[#F4F0E7] rounded-lg space-y-1 font-mono text-[11px] tabular-nums">
                  <div>Tierra vegetal: {estimates.topsoilVolumeM3} m³</div>
                  <div>Volumen grava: {estimates.gravelVolumeM3} m³</div>
                  <div>Bordura perímetro: {estimates.edgingLengthMl} ml</div>
                  <div>Plantas parterre est.: {estimates.estimatedPlantsForBeds} ud</div>
                </div>

                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeProject.assumptions.includeTopsoilEstimate}
                    onChange={(e) =>
                      updateAssumptions({ includeTopsoilEstimate: e.target.checked })
                    }
                    className="accent-[#183D32]"
                  />
                  <span>Incluir tierra vegetal en presupuesto</span>
                </label>

                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeProject.assumptions.includeEdgingEstimate}
                    onChange={(e) =>
                      updateAssumptions({ includeEdgingEstimate: e.target.checked })
                    }
                    className="accent-[#183D32]"
                  />
                  <span>Incluir borduras por perímetro</span>
                </label>
              </div>
            )}
          </div>

          {/* Ecological, Irrigation & Sunlight Balance */}
          <div className="p-4 border-b border-[#303632]/10 space-y-2.5 bg-[#F4F0E7]/35">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#183D32]">
                <Droplets className="w-3.5 h-3.5" />
                Balance hídrico y solar
              </span>
              <span className="text-[11px] font-semibold text-[#183D32]">
                {insights.waterBadgeLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="bg-white border border-[#303632]/10 rounded-lg py-1.5 px-1">
                <p className="text-[#303632]/65">Riego estival</p>
                <p className="font-mono font-semibold text-[#183D32] tabular-nums">
                  {insights.weeklyLitersSummer} L/sem
                </p>
              </div>
              <div className="bg-white border border-[#303632]/10 rounded-lg py-1.5 px-1">
                <p className="text-[#303632]/65">Cobertura</p>
                <p className="font-mono font-semibold text-[#183D32] tabular-nums">
                  {insights.vegetationCoveragePercent}% verde
                </p>
              </div>
              <div className="bg-white border border-[#303632]/10 rounded-lg py-1.5 px-1">
                <p className="text-[#303632]/65">Sol / Sombra</p>
                <p className="font-mono font-semibold text-[#183D32] tabular-nums">
                  {insights.sunBalance.solDirecto}/{insights.sunBalance.semisombra + insights.sunBalance.sombra}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-[#303632]/80 leading-relaxed">
              {insights.advice}
            </p>
          </div>

          {/* Real-time Cost Summary */}
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#183D32] mb-2">
                Resumen de presupuesto en tiempo real
              </h2>

              {lineItems.length === 0 ? (
                <p className="text-xs text-[#303632]/70 py-4">
                  Añade árboles, plantas o superficies desde la biblioteca izquierda para ver el desglose instantáneo.
                </p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1 border-b border-[#303632]/5"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#303632] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#303632]/60 font-mono tabular-nums">
                          {item.quantity} {item.unit === 'm2' ? 'm²' : item.unit} × {formatEuro(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-mono font-semibold text-[#183D32] tabular-nums shrink-0">
                        {formatEuro(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#303632]/15 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#303632]/75">
                <span>Subtotal material y plantas</span>
                <span className="font-mono tabular-nums">{formatEuro(liveTotals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#303632]/75">
                <span>IVA ({company.settings.vatRate}%)</span>
                <span className="font-mono tabular-nums">{formatEuro(liveTotals.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#183D32] pt-1">
                <span>Total estimado</span>
                <span className="font-mono tabular-nums">{formatEuro(liveTotals.total)}</span>
              </div>
              <button
                type="button"
                onClick={handleGenerateQuote}
                disabled={lineItems.length === 0}
                className="w-full mt-2 py-2.5 px-4 bg-[#183D32] hover:bg-[#122e25] disabled:opacity-45 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Generar presupuesto oficial
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
