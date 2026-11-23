import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Droplets,
  Filter,
  Plus,
  Ruler,
  Scale,
  Search,
  Sun,
  X,
} from 'lucide-react';
import { useViverdeStore } from '../../store/useViverdeStore';
import {
  AvailabilityStatus,
  IndoorOutdoorUse,
  Product,
  ProductCategory,
  SunExposure,
  WaterNeeds,
} from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';
import { BotanicalImage } from '../ui/BotanicalImage';

const CATEGORY_LABELS: { id: 'all' | ProductCategory; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'arboles', label: 'Árboles' },
  { id: 'arbustos', label: 'Arbustos' },
  { id: 'plantas', label: 'Plantas' },
  { id: 'flores', label: 'Flores' },
  { id: 'cesped', label: 'Césped y cubresuelos' },
  { id: 'materiales', label: 'Materiales' },
];

const SUN_LABELS: Record<SunExposure, string> = {
  sol_directo: 'Sol directo',
  semisombra: 'Semisombra',
  sombra: 'Sombra',
};

const WATER_LABELS: Record<WaterNeeds, string> = {
  bajo: 'Riego bajo',
  medio: 'Riego medio',
  alto: 'Riego alto',
};

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  disponible: 'Disponible',
  bajo_pedido: 'Bajo pedido',
  agotado: 'Agotado',
};

type SortOrder = 'default' | 'price_asc' | 'price_desc' | 'height_asc' | 'height_desc';

export const CatalogView: React.FC = () => {
  const {
    products,
    activeCompanyId,
    companies,
    setPendingPlacementProduct,
    setDrawingSurfaceTool,
    setActiveNav,
    showToast,
  } = useViverdeStore();

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === activeCompanyId),
    [products, activeCompanyId],
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | ProductCategory>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');
  const [sunFilter, setSunFilter] = useState<'all' | SunExposure>('all');
  const [waterFilter, setWaterFilter] = useState<'all' | WaterNeeds>('all');
  const [availFilter, setAvailFilter] = useState<'all' | AvailabilityStatus>('all');
  const [useFilter, setUseFilter] = useState<'all' | IndoorOutdoorUse>('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [bloomFilter, setBloomFilter] = useState('all');
  const [maxPrice, setMaxPrice] = useState<number>(7000);
  const [maxHeightCm, setMaxHeightCm] = useState<number>(600);
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const distinctColors = useMemo(
    () => Array.from(new Set(companyProducts.map((p) => p.colorName))).sort(),
    [companyProducts],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: companyProducts.length };
    companyProducts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [companyProducts]);

  const availableSubcategories = useMemo(() => {
    const scoped =
      category === 'all'
        ? companyProducts
        : companyProducts.filter((p) => p.category === category);
    const map = new Map<string, number>();
    scoped.forEach((p) => {
      map.set(p.subcategory, (map.get(p.subcategory) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [companyProducts, category]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = companyProducts.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (subcategoryFilter !== 'all' && p.subcategory !== subcategoryFilter) return false;
      if (sunFilter !== 'all' && p.sunExposure !== sunFilter) return false;
      if (waterFilter !== 'all' && p.waterNeeds !== waterFilter) return false;
      if (availFilter !== 'all' && p.availability !== availFilter) return false;
      if (useFilter !== 'all' && p.indoorOutdoor !== useFilter && p.indoorOutdoor !== 'ambos') {
        return false;
      }
      if (colorFilter !== 'all' && p.colorName !== colorFilter) return false;
      if (bloomFilter !== 'all' && !p.bloomingSeason.toLowerCase().includes(bloomFilter)) {
        return false;
      }
      if (p.price > maxPrice) return false;
      if (p.dimensions.heightCm > maxHeightCm) return false;
      if (q) {
        const hay = `${p.commercialName} ${p.botanicalName || ''} ${p.subcategory} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortOrder === 'price_asc') return [...list].sort((a, b) => a.price - b.price);
    if (sortOrder === 'price_desc') return [...list].sort((a, b) => b.price - a.price);
    if (sortOrder === 'height_asc') return [...list].sort((a, b) => a.dimensions.heightCm - b.dimensions.heightCm);
    if (sortOrder === 'height_desc') return [...list].sort((a, b) => b.dimensions.heightCm - a.dimensions.heightCm);
    return list;
  }, [
    companyProducts,
    search,
    category,
    subcategoryFilter,
    sunFilter,
    waterFilter,
    availFilter,
    useFilter,
    colorFilter,
    bloomFilter,
    maxPrice,
    maxHeightCm,
    sortOrder,
  ]);

  const compareProducts = useMemo(
    () => companyProducts.filter((p) => compareIds.includes(p.id)),
    [companyProducts, compareIds],
  );

  const toggleCompare = (prodId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(prodId)) return prev.filter((id) => id !== prodId);
      if (prev.length >= 3) {
        showToast('Puedes comparar hasta 3 especies o materiales a la vez.', 'info');
        return prev;
      }
      return [...prev, prodId];
    });
  };

  const handleAddToDesigner = (prod: Product) => {
    if (prod.unit === 'm2') {
      setDrawingSurfaceTool({ active: true, mode: 'rect', productId: prod.id });
      setPendingPlacementProduct(null);
      showToast(`"${prod.commercialName}" listo: dibuja o define la superficie en m².`, 'info');
    } else {
      setPendingPlacementProduct(prod.id);
      setDrawingSurfaceTool({ active: false, mode: 'rect', productId: null });
      showToast(`"${prod.commercialName}" preparado para colocar en el diseñador.`, 'success');
    }
    setSelectedProduct(null);
    setShowCompareModal(false);
    setActiveNav('disenador');
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8 pb-24">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#303632]/10">
        <div>
          <p className="text-xs font-medium text-[#183D32]/80 mb-1">
            Catálogo digital · {activeCompany.name}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#183D32]">
            Plantas, árboles, flores y materiales
          </h1>
          <p className="text-sm text-[#303632]/75 mt-1">
            Precios orientativos competitivos editables desde el Panel Profesional. Compara hasta 3 fichas o añádelas al diseño 3D.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#303632]/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar olivo, lavanda, grava..."
              aria-label="Buscar en catálogo"
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#303632]/15 rounded-lg text-sm focus:outline-none focus:border-[#183D32]"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#303632]/15 rounded-lg px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#183D32]" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Ordenar catálogo"
              className="text-xs font-medium text-[#183D32] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="default">Orden: Destacados</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="height_asc">Altura: menor a mayor</option>
              <option value="height_desc">Altura: mayor a menor</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#303632]/15 rounded-lg text-xs font-semibold text-[#183D32] hover:bg-[#DDE8D8]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-2">
        {CATEGORY_LABELS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setCategory(cat.id);
              setSubcategoryFilter('all');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              category === cat.id
                ? 'bg-[#183D32] text-white'
                : 'bg-white text-[#303632] border border-[#303632]/10 hover:border-[#183D32]/30'
            }`}
          >
            {cat.label} ({categoryCounts[cat.id] || 0})
          </button>
        ))}
      </div>

      {/* Subcategory / Type Selector */}
      {availableSubcategories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 pt-1">
          <span className="text-[11px] font-medium text-[#303632]/65 mr-1 whitespace-nowrap shrink-0">
            Tipos:
          </span>
          <button
            type="button"
            onClick={() => setSubcategoryFilter('all')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subcategoryFilter === 'all'
                ? 'bg-[#DDE8D8] text-[#183D32] font-semibold'
                : 'bg-white/70 text-[#303632]/75 border border-[#303632]/10 hover:border-[#183D32]/25'
            }`}
          >
            Todos los tipos
          </button>
          {availableSubcategories.map((sub) => (
            <button
              key={sub.name}
              type="button"
              onClick={() => setSubcategoryFilter(sub.name)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                subcategoryFilter === sub.name
                  ? 'bg-[#DDE8D8] text-[#183D32] font-semibold'
                  : 'bg-white/70 text-[#303632]/75 border border-[#303632]/10 hover:border-[#183D32]/25'
              }`}
            >
              {sub.name} ({sub.count})
            </button>
          ))}
        </div>
      )}

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-[#303632]/10 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Exposición solar
            </label>
            <select
              value={sunFilter}
              onChange={(e) => setSunFilter(e.target.value as 'all' | SunExposure)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Todas</option>
              <option value="sol_directo">Sol directo</option>
              <option value="semisombra">Semisombra</option>
              <option value="sombra">Sombra</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Necesidades de riego
            </label>
            <select
              value={waterFilter}
              onChange={(e) => setWaterFilter(e.target.value as 'all' | WaterNeeds)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Todas</option>
              <option value="bajo">Bajo consumo</option>
              <option value="medio">Consumo medio</option>
              <option value="alto">Consumo alto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Uso interior / exterior
            </label>
            <select
              value={useFilter}
              onChange={(e) => setUseFilter(e.target.value as 'all' | IndoorOutdoorUse)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Todos los usos</option>
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Disponibilidad
            </label>
            <select
              value={availFilter}
              onChange={(e) => setAvailFilter(e.target.value as 'all' | AvailabilityStatus)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Cualquiera</option>
              <option value="disponible">Disponible</option>
              <option value="bajo_pedido">Bajo pedido</option>
              <option value="agotado">Agotado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Color principal
            </label>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Todos los colores</option>
              {distinctColors.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1">
              Época de floración
            </label>
            <select
              value={bloomFilter}
              onChange={(e) => setBloomFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              <option value="all">Todas</option>
              <option value="primavera">Primavera</option>
              <option value="verano">Verano</option>
              <option value="otoño">Otoño</option>
              <option value="invierno">Invierno</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1 tabular-nums">
              Precio máximo: {formatEuro(maxPrice)}
            </label>
            <input
              type="range"
              min={5}
              max={7000}
              step={5}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#183D32]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#303632]/75 mb-1 tabular-nums">
              Altura máxima: {maxHeightCm} cm
            </label>
            <input
              type="range"
              min={10}
              max={600}
              step={10}
              value={maxHeightCm}
              onChange={(e) => setMaxHeightCm(Number(e.target.value))}
              className="w-full accent-[#183D32]"
            />
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-[#303632]/70 mb-4">
        <span className="tabular-nums">
          Mostrando {filteredProducts.length} de {companyProducts.length} referencias
        </span>
        {(search ||
          category !== 'all' ||
          subcategoryFilter !== 'all' ||
          sunFilter !== 'all' ||
          waterFilter !== 'all' ||
          sortOrder !== 'default') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setSubcategoryFilter('all');
              setSunFilter('all');
              setWaterFilter('all');
              setAvailFilter('all');
              setUseFilter('all');
              setColorFilter('all');
              setBloomFilter('all');
              setMaxPrice(7000);
              setMaxHeightCm(600);
              setSortOrder('default');
            }}
            className="text-[#183D32] font-semibold hover:underline cursor-pointer"
          >
            Restablecer filtros
          </button>
        )}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#303632]/10 rounded-xl p-12 text-center">
          <p className="font-display text-xl text-[#183D32] mb-2">
            No se han encontrado productos con esos filtros
          </p>
          <p className="text-sm text-[#303632]/75">
            Ajusta los criterios de búsqueda o añade nuevas referencias desde el Panel Profesional.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => {
            const isComparing = compareIds.includes(prod.id);
            return (
              <div
                key={prod.id}
                className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                  isComparing ? 'border-[#183D32] ring-1 ring-[#183D32]/30' : 'border-[#303632]/10 hover:border-[#183D32]/35'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedProduct(prod)}
                  className="aspect-[4/3] w-full overflow-hidden bg-[#F4F0E7] text-left cursor-pointer"
                >
                  <BotanicalImage
                    src={prod.imageUrl}
                    alt={prod.commercialName}
                    accentHex={prod.colorHex}
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-200"
                  />
                </button>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] text-[#303632]/65 mb-1">
                      {prod.subcategory} · {AVAILABILITY_LABELS[prod.availability]}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(prod)}
                      className="text-left font-display text-base font-semibold text-[#183D32] hover:underline leading-snug cursor-pointer"
                    >
                      {prod.commercialName}
                    </button>
                    {prod.botanicalName && (
                      <p className="text-xs italic text-[#303632]/65 mt-0.5">
                        {prod.botanicalName}
                      </p>
                    )}
                    <p className="text-xs text-[#303632]/75 mt-2 line-clamp-2">
                      {prod.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#303632]/10">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="font-mono text-base font-semibold text-[#183D32] tabular-nums">
                          {formatEuro(prod.price)}
                        </span>
                        <span className="text-xs text-[#303632]/65 ml-1">
                          / {prod.unit === 'm2' ? 'm²' : prod.unit === 'm3' ? 'm³' : prod.unit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(prod.id)}
                        className={`inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer ${
                          isComparing ? 'text-[#183D32] underline font-semibold' : 'text-[#303632]/70 hover:text-[#183D32]'
                        }`}
                      >
                        <Scale className="w-3 h-3" />
                        <span>{isComparing ? 'En comparador' : 'Comparar'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(prod)}
                        className="flex-1 py-2 px-3 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Ver ficha
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddToDesigner(prod)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Comparison Bar */}
      {compareProducts.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#183D32] text-white rounded-xl shadow-xl px-5 py-3 flex flex-wrap items-center gap-4 border border-white/15">
          <div className="text-xs">
            <span className="font-semibold font-mono tabular-nums">
              {compareProducts.length} / 3
            </span>{' '}
            especies seleccionadas:{' '}
            <span className="text-[#DDE8D8]">
              {compareProducts.map((p) => p.commercialName).join(' · ')}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-[#DDE8D8] hover:text-white underline cursor-pointer"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Comparar fichas</span>
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && compareProducts.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Comparador técnico de especies y materiales"
        >
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#303632]/15 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#303632]/10">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#183D32]">
                  Comparador técnico de catálogo
                </h2>
                <p className="text-xs text-[#303632]/70">
                  Compara precios, dimensiones, sol, riego y usos antes de añadir al diseño 3D.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                aria-label="Cerrar comparador"
                className="p-2 rounded-lg hover:bg-[#F4F0E7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#303632]/10">
                    <th className="py-3 pr-4 text-[#303632]/65 font-medium w-40">Parámetro</th>
                    {compareProducts.map((p) => (
                      <th key={p.id} className="py-3 px-3 min-w-[180px]">
                        <div className="aspect-[16/10] rounded-lg overflow-hidden bg-[#F4F0E7] mb-2">
                          <BotanicalImage
                            src={p.imageUrl}
                            alt={p.commercialName}
                            accentHex={p.colorHex}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="font-display text-sm font-semibold text-[#183D32]">
                          {p.commercialName}
                        </p>
                        {p.botanicalName && (
                          <p className="text-[11px] italic font-normal text-[#303632]/65">
                            {p.botanicalName}
                          </p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303632]/10">
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Precio unitario</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3 font-mono font-semibold text-[#183D32] tabular-nums">
                        {formatEuro(p.price)} / {p.unit}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Altura × Anchura</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3 font-mono tabular-nums">
                        {p.dimensions.heightCm} × {p.dimensions.widthCm} cm
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Exposición solar</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3">{SUN_LABELS[p.sunExposure]}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Necesidad de riego</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3">{WATER_LABELS[p.waterNeeds]}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Floración / interés</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3">{p.bloomingSeason}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[#303632]/70">Uso paisajístico</td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-2.5 px-3 text-[#303632]/85">
                        {p.landscapeUses.join(' · ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4"></td>
                    {compareProducts.map((p) => (
                      <td key={p.id} className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleAddToDesigner(p)}
                          className="w-full py-2 px-3 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Añadir al diseño
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Individual Product Detail Sheet Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Ficha de ${selectedProduct.commercialName}`}
        >
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-[#303632]/15">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-[4/3] md:aspect-auto bg-[#F4F0E7]">
                <BotanicalImage
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.commercialName}
                  accentHex={selectedProduct.colorHex}
                  className="w-full h-full object-cover min-h-[260px]"
                />
              </div>

              <div className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#303632]/65 mb-1">
                        {selectedProduct.category.toUpperCase()} · {selectedProduct.subcategory}
                      </p>
                      <h2 className="font-display text-2xl font-semibold text-[#183D32]">
                        {selectedProduct.commercialName}
                      </h2>
                      {selectedProduct.botanicalName && (
                        <p className="text-sm italic text-[#303632]/70 mt-0.5">
                          {selectedProduct.botanicalName}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      aria-label="Cerrar ficha"
                      className="p-2 rounded-lg hover:bg-[#F4F0E7] text-[#303632] cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-4 py-3 border-y border-[#303632]/10 flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-2xl font-semibold text-[#183D32] tabular-nums">
                        {formatEuro(selectedProduct.price)}
                      </span>
                      <span className="text-xs text-[#303632]/70 ml-1">
                        / {selectedProduct.unit === 'm2' ? 'm²' : selectedProduct.unit === 'm3' ? 'm³' : selectedProduct.unit}
                      </span>
                    </div>
                    <span className="text-xs text-[#303632]/70">
                      {AVAILABILITY_LABELS[selectedProduct.availability]}
                    </span>
                  </div>

                  {selectedProduct.isDemoData && (
                    <p className="mt-2 text-[11px] text-[#303632]/70 bg-[#F4F0E7] px-3 py-1.5 rounded-md">
                      Tarifa de demostración orientativa. Editable desde el Panel Profesional.
                    </p>
                  )}

                  <p className="text-sm text-[#303632]/85 leading-relaxed mt-4">
                    {selectedProduct.description}
                  </p>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <dt className="text-[#303632]/60">Formato / tamaño</dt>
                      <dd className="font-medium text-[#303632]">{selectedProduct.sizeFormat}</dd>
                    </div>
                    <div>
                      <dt className="text-[#303632]/60 flex items-center gap-1">
                        <Ruler className="w-3 h-3" /> Dimensiones aprox.
                      </dt>
                      <dd className="font-mono font-medium text-[#303632] tabular-nums">
                        Alt. {selectedProduct.dimensions.heightCm} cm × Anch. {selectedProduct.dimensions.widthCm} cm
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#303632]/60 flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Luz
                      </dt>
                      <dd className="font-medium text-[#303632]">{SUN_LABELS[selectedProduct.sunExposure]}</dd>
                    </div>
                    <div>
                      <dt className="text-[#303632]/60 flex items-center gap-1">
                        <Droplets className="w-3 h-3" /> Riego
                      </dt>
                      <dd className="font-medium text-[#303632]">{WATER_LABELS[selectedProduct.waterNeeds]}</dd>
                    </div>
                    <div>
                      <dt className="text-[#303632]/60">Floración / interés</dt>
                      <dd className="font-medium text-[#303632]">{selectedProduct.bloomingSeason}</dd>
                    </div>
                    <div>
                      <dt className="text-[#303632]/60">Resistencia climática</dt>
                      <dd className="font-medium text-[#303632]">
                        {selectedProduct.climateHardiness || 'No documentada en ficha base'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <p className="text-xs text-[#303632]/60 mb-1">Aplicaciones en paisajismo</p>
                    <p className="text-xs font-medium text-[#183D32]">
                      {selectedProduct.landscapeUses.join(' · ')}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#303632]/10 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAddToDesigner(selectedProduct)}
                    className="flex-1 py-3 px-5 bg-[#183D32] hover:bg-[#122e25] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Añadir al diseño
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
