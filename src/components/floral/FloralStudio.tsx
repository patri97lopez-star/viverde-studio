import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import {
  buildFloralItemsFromPreset,
  FLORAL_SHOWCASE_PRESETS,
  FloralShowcasePreset,
} from '../../data/floralPresets';
import { useViverdeStore } from '../../store/useViverdeStore';
import { FloralCompositionType, FloralItem, Quote } from '../../types/viverde';
import { calculateQuoteTotals, formatEuro } from '../../utils/calculations';
import { exportQuoteToPdf } from '../../utils/pdfGenerator';
import { BotanicalImage } from '../ui/BotanicalImage';

const COMPOSITION_TYPES: FloralCompositionType[] = [
  'Ramo de novia',
  'Ramo de regalo',
  'Decoración de bodas',
  'Centro de mesa',
  'Decoración de eventos',
  'Composición de Navidad',
  'Composición funeraria',
  'Decoración floral de establecimientos',
];

const WRAPPERS = [
  { label: 'Lino natural lavado', cost: 8, color: '#D9D0BE' },
  { label: 'Papel kraft artesanal', cost: 4, color: '#B79B78' },
  { label: 'Seda orgánica teñida', cost: 14, color: '#E8E3DC' },
  { label: 'Sin envoltorio', cost: 0, color: 'transparent' },
];

const VASES = [
  { label: 'Solo ramo atado en cinta', cost: 0, shape: 'ribbon' },
  { label: 'Jarrón cerámica travertino', cost: 24, shape: 'ceramic' },
  { label: 'Cilindro cristal transparente', cost: 16, shape: 'glass' },
  { label: 'Cuenco terracota artesanal', cost: 18, shape: 'bowl' },
];

const FLOWER_COLORS = [
  { name: 'Marfil', hex: '#F3EFE6' },
  { name: 'Rosa empolvado', hex: '#E08FA3' },
  { name: 'Coral', hex: '#E07A68' },
  { name: 'Amarillo dorado', hex: '#F2C438' },
  { name: 'Naranja tropical', hex: '#E56B24' },
  { name: 'Violeta lavanda', hex: '#7A68A6' },
  { name: 'Azul hortensia', hex: '#84A8D8' },
  { name: 'Rojo carmesí', hex: '#B93C46' },
  { name: 'Burdeos vino', hex: '#9C2D49' },
  { name: 'Verde eucalipto', hex: '#7A9687' },
];

export const FloralStudio: React.FC = () => {
  const {
    products,
    activeCompanyId,
    companies,
    floralDesigns,
    pendingFloralPresetId,
    clearPendingFloralPreset,
    saveFloralDesign,
    deleteFloralDesign,
    saveCustomQuote,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const floralCatalog = useMemo(
    () =>
      products.filter(
        (p) =>
          p.companyId === activeCompanyId &&
          (p.category === 'flores' || p.subcategory === 'Lavanda' || p.subcategory === 'Hortensias' || p.subcategory === 'Rosales'),
      ),
    [products, activeCompanyId],
  );
  const companyDesigns = floralDesigns.filter((d) => d.companyId === activeCompanyId);

  const [name, setName] = useState('Composición Floral Atelier');
  const [compositionType, setCompositionType] = useState<FloralCompositionType>('Ramo de novia');
  const [wrapperIdx, setWrapperIdx] = useState(0);
  const [vaseIdx, setVaseIdx] = useState(0);
  const [marginPercent, setMarginPercent] = useState<number>(company.settings.defaultMarginPercent || 45);
  const [items, setItems] = useState<FloralItem[]>(() => {
    const firstRose = floralCatalog.find((p) => p.commercialName.toLowerCase().includes('rosa'));
    const euc = floralCatalog.find((p) => p.commercialName.toLowerCase().includes('eucalipto'));
    const seed: FloralItem[] = [];
    if (firstRose) {
      seed.push({
        id: 'fi-init-1',
        productId: firstRose.id,
        name: firstRose.commercialName,
        colorHex: '#F3EFE6',
        stems: 9,
        unitCost: firstRose.price,
      });
    }
    if (euc) {
      seed.push({
        id: 'fi-init-2',
        productId: euc.id,
        name: euc.commercialName,
        colorHex: '#7A9687',
        stems: 3,
        unitCost: euc.price,
      });
    }
    return seed;
  });

  const [activePresetImage, setActivePresetImage] = useState<string | null>(
    FLORAL_SHOWCASE_PRESETS[0].imageUrl,
  );

  const applyShowcasePreset = (preset: FloralShowcasePreset, notify = true) => {
    setName(preset.title);
    setCompositionType(preset.compositionType);
    setWrapperIdx(preset.wrapperIdx);
    setVaseIdx(preset.vaseIdx);
    setMarginPercent(preset.marginPercent);
    setItems(buildFloralItemsFromPreset(preset, floralCatalog));
    setActivePresetImage(preset.imageUrl);
    if (notify) {
      showToast(`Composición "${preset.title}" cargada en el taller floral.`, 'success');
    }
  };

  useEffect(() => {
    if (!pendingFloralPresetId) return;
    const preset = FLORAL_SHOWCASE_PRESETS.find((p) => p.id === pendingFloralPresetId);
    if (preset) {
      applyShowcasePreset(preset, false);
    }
    clearPendingFloralPreset();
  }, [pendingFloralPresetId]);

  const wrapper = WRAPPERS[wrapperIdx];
  const vase = VASES[vaseIdx];

  const stemsCost = items.reduce((acc, it) => acc + it.stems * it.unitCost, 0);
  const materialsCost = Number((stemsCost + wrapper.cost + vase.cost).toFixed(2));
  const retailPrice = Number((materialsCost * (1 + marginPercent / 100)).toFixed(2));

  const handleAddFlower = (prodId: string) => {
    const prod = floralCatalog.find((p) => p.id === prodId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        id: `fi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: prod.id,
        name: prod.commercialName,
        colorHex: prod.colorHex || '#E08FA3',
        stems: 3,
        unitCost: prod.price,
      },
    ]);
  };

  const handleSaveComposition = () => {
    if (!name.trim() || items.length === 0) {
      showToast('Añade un nombre y al menos una flor a la composición.', 'error');
      return;
    }
    saveFloralDesign({
      name: name.trim(),
      compositionType,
      wrapperStyle: wrapper.label,
      wrapperCost: wrapper.cost,
      vaseStyle: vase.label,
      vaseCost: vase.cost,
      marginPercent,
      items,
      materialsCost,
      retailPrice,
    });
  };

  const buildFloralQuote = (): Quote => {
    const quoteItems = [
      ...items.map((it) => ({
        id: it.id,
        productId: it.productId,
        name: `${it.name} (tallo/unidad)`,
        categoryGroup: 'flores' as const,
        quantity: it.stems,
        unit: 'unidad' as const,
        unitPrice: Number((it.unitCost * (1 + marginPercent / 100)).toFixed(2)),
        total: Number((it.stems * it.unitCost * (1 + marginPercent / 100)).toFixed(2)),
      })),
    ];
    if (wrapper.cost > 0) {
      quoteItems.push({
        id: 'wrap',
        productId: 'wrap',
        name: `Envoltorio: ${wrapper.label}`,
        categoryGroup: 'flores' as const,
        quantity: 1,
        unit: 'unidad',
        unitPrice: Number((wrapper.cost * (1 + marginPercent / 100)).toFixed(2)),
        total: Number((wrapper.cost * (1 + marginPercent / 100)).toFixed(2)),
      });
    }
    if (vase.cost > 0) {
      quoteItems.push({
        id: 'vase',
        productId: 'vase',
        name: `Recipiente: ${vase.label}`,
        categoryGroup: 'flores' as const,
        quantity: 1,
        unit: 'unidad',
        unitPrice: Number((vase.cost * (1 + marginPercent / 100)).toFixed(2)),
        total: Number((vase.cost * (1 + marginPercent / 100)).toFixed(2)),
      });
    }

    const totals = calculateQuoteTotals({
      items: quoteItems,
      discountPercent: 0,
      transportCost: 0,
      laborCost: 0,
      installationCost: 0,
      vatRate: company.settings.vatRate,
    });

    return {
      id: `q-flor-${Date.now()}`,
      companyId: company.id,
      ownerUid: 'floral-studio',
      projectId: 'floral',
      projectName: `${compositionType} — ${name}`,
      clientName: 'Cliente de Floristería',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      quoteNumber: `FLR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`,
      items: quoteItems,
      surfacesSummary: [],
      subtotal: totals.subtotal,
      discountPercent: 0,
      discountAmount: 0,
      transportCost: 0,
      laborCost: 0,
      installationCost: 0,
      vatRate: company.settings.vatRate,
      vatAmount: totals.vatAmount,
      total: totals.total,
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      notes: `Composición floral personalizada (${compositionType}). Margen aplicado: ${marginPercent}%. Precios demo editables.`,
      status: 'borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleExportFloralQuotePdf = () => {
    const floralQuote = buildFloralQuote();
    exportQuoteToPdf(floralQuote, company);
    showToast('Presupuesto floral descargado en PDF.', 'success');
  };

  const handleSaveFloralQuoteToQuotes = () => {
    const floralQuote = buildFloralQuote();
    saveCustomQuote(floralQuote);
  };

  // Build deterministic flower positions for visual SVG bouquet preview
  const renderedBlooms = useMemo(() => {
    const nodes: { x: number; y: number; r: number; color: string; isLeaf: boolean }[] = [];
    let idx = 0;
    items.forEach((it) => {
      const cap = Math.min(it.stems, 12);
      for (let i = 0; i < cap; i++) {
        const goldenAngle = idx * 2.39996;
        const rad = 14 + Math.sqrt(idx) * 16;
        const cx = 160 + Math.cos(goldenAngle) * rad;
        const cy = 135 + Math.sin(goldenAngle) * (rad * 0.78);
        const isLeaf = it.name.toLowerCase().includes('eucalipto');
        nodes.push({
          x: cx,
          y: cy,
          r: isLeaf ? 14 : 16 + (idx % 3) * 3,
          color: it.colorHex,
          isLeaf,
        });
        idx++;
      }
    });
    return nodes;
  }, [items]);

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#303632]/10">
        <div>
          <p className="text-xs font-medium text-[#183D32]/80 mb-1">
            Módulo de floristería · {company.name}
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#183D32]">
            Diseñador de composiciones florales
          </h1>
          <p className="text-sm text-[#303632]/75 mt-1">
            Combina flores del catálogo, selecciona tonos, envoltorios, jarrones y calcula margen comercial y presupuesto.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveComposition}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar composición</span>
          </button>
          <button
            type="button"
            onClick={handleSaveFloralQuoteToQuotes}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#303632]/15 hover:bg-[#F4F0E7] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Enviar a Presupuestos</span>
          </button>
          <button
            type="button"
            onClick={handleExportFloralQuotePdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar PDF</span>
          </button>
        </div>
      </div>

      {/* Visual Floral Inspirations: Ramos, Bodas, Eventos, Navidad */}
      <section className="mt-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#183D32]">
              Colecciones florales: ramos, bodas, eventos y Navidad
            </h2>
            <p className="text-xs text-[#303632]/70">
              Selecciona cualquier colección para cargar sus flores, envoltorios y presupuesto orientativo en el estudio.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FLORAL_SHOWCASE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="group bg-white border border-[#303632]/10 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[4/3] overflow-hidden bg-[#F4F0E7]">
                  <BotanicalImage
                    src={preset.imageUrl}
                    alt={preset.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-[#303632]/65 font-mono tabular-nums mb-0.5">
                    {preset.categoryLabel} · {preset.referencePriceRange}
                  </p>
                  <h3 className="font-display text-base font-semibold text-[#183D32] mb-1">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-[#303632]/75 leading-relaxed">
                    {preset.summary}
                  </p>
                </div>
              </div>
              <div className="px-4 pb-4">
                <button
                  type="button"
                  onClick={() => applyShowcasePreset(preset)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#DDE8D8]/70 hover:bg-[#183D32] text-[#183D32] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cargar en el estudio</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left: Flower Catalog Selector */}
        <div className="lg:col-span-4 bg-white border border-[#303632]/10 rounded-xl p-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#303632] mb-1">
              Nombre de la composición
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#303632] mb-1">
              Tipo de composición
            </label>
            <select
              value={compositionType}
              onChange={(e) => setCompositionType(e.target.value as FloralCompositionType)}
              className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-sm"
            >
              {COMPOSITION_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-[#183D32] mb-2">
              Añadir flores y verdes del catálogo
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {floralCatalog.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-[#F4F0E7]/50 rounded-lg border border-[#303632]/10"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#183D32] truncate">{prod.commercialName}</p>
                    <p className="text-[11px] font-mono text-[#303632]/70 tabular-nums">
                      {formatEuro(prod.price)} / {prod.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFlower(prod.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#183D32] text-white text-xs font-semibold rounded-md cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-[#303632]/10">
            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">Envoltorio</label>
              <select
                value={wrapperIdx}
                onChange={(e) => setWrapperIdx(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              >
                {WRAPPERS.map((w, i) => (
                  <option key={w.label} value={i}>
                    {w.label} (+{formatEuro(w.cost)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">Jarrón o base</label>
              <select
                value={vaseIdx}
                onChange={(e) => setVaseIdx(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              >
                {VASES.map((v, i) => (
                  <option key={v.label} value={i}>
                    {v.label} (+{formatEuro(v.cost)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center: Live Visual Composition Preview */}
        <div className="lg:col-span-4 bg-white border border-[#303632]/10 rounded-xl p-6 flex flex-col items-center justify-between space-y-4">
          <div className="w-full text-center">
            <p className="text-xs text-[#303632]/65">{compositionType}</p>
            <h2 className="font-display text-xl font-semibold text-[#183D32]">{name}</h2>
          </div>

          {activePresetImage && (
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#303632]/10 bg-[#F4F0E7]">
              <BotanicalImage
                src={activePresetImage}
                alt={`Referencia visual de ${name}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <svg viewBox="0 0 320 320" className="w-full max-w-[240px]">
            <rect width="320" height="320" rx="16" fill="#F4F0E7" />

            {/* Stems bundle */}
            <g stroke="#4E6E4A" strokeWidth="4" strokeLinecap="round">
              <line x1="160" y1="150" x2="145" y2="275" />
              <line x1="160" y1="150" x2="160" y2="280" />
              <line x1="160" y1="150" x2="175" y2="275" />
            </g>

            {/* Wrapper Cone */}
            {wrapper.cost > 0 && (
              <polygon
                points="95,150 225,150 175,260 145,260"
                fill={wrapper.color}
                stroke="#303632"
                strokeOpacity={0.2}
                strokeWidth="1.5"
              />
            )}

            {/* Vase */}
            {vase.shape === 'ceramic' && (
              <path
                d="M128,175 Q120,235 135,280 L185,280 Q200,235 192,175 Z"
                fill="#E3DCD0"
                stroke="#303632"
                strokeOpacity={0.25}
              />
            )}
            {vase.shape === 'glass' && (
              <rect
                x="130"
                y="175"
                width="60"
                height="105"
                rx="6"
                fill="#D4E8EC"
                fillOpacity={0.65}
                stroke="#4697A6"
                strokeOpacity={0.5}
              />
            )}
            {vase.shape === 'bowl' && (
              <path
                d="M110,185 Q115,245 160,248 Q205,245 210,185 Z"
                fill="#B86B4B"
                stroke="#7A3E27"
              />
            )}
            {vase.shape === 'ribbon' && (
              <rect x="142" y="210" width="36" height="14" rx="3" fill="#183D32" />
            )}

            {/* Foliage + Blooms */}
            {renderedBlooms.map((b, idx) =>
              b.isLeaf ? (
                <ellipse
                  key={idx}
                  cx={b.x}
                  cy={b.y}
                  rx={b.r}
                  ry={b.r * 0.55}
                  transform={`rotate(${(idx * 35) % 180} ${b.x} ${b.y})`}
                  fill={b.color}
                  stroke="#2C4A34"
                  strokeWidth="1"
                />
              ) : (
                <g key={idx}>
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill={b.color}
                    stroke="#303632"
                    strokeOpacity={0.22}
                    strokeWidth="1"
                  />
                  <circle cx={b.x} cy={b.y} r={b.r * 0.42} fill="#FFFFFF" fillOpacity={0.35} />
                </g>
              ),
            )}
          </svg>

          <div className="w-full text-center text-xs text-[#303632]/70">
            {items.reduce((a, b) => a + b.stems, 0)} tallos / unidades · {wrapper.label} · {vase.label}
          </div>
        </div>

        {/* Right: Costing, Colors, Margin & Saved Designs */}
        <div className="lg:col-span-4 bg-white border border-[#303632]/10 rounded-xl p-5 flex flex-col justify-between space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#183D32] mb-3">
              Desglose de flores y margen
            </h2>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="p-2.5 bg-[#F4F0E7]/50 rounded-lg border border-[#303632]/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#183D32] truncate">{it.name}</span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                      aria-label="Quitar flor"
                      className="text-red-700 hover:text-red-900 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      {FLOWER_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          title={c.name}
                          onClick={() =>
                            setItems((prev) =>
                              prev.map((x) => (x.id === it.id ? { ...x, colorHex: c.hex } : x)),
                            )
                          }
                          className={`w-4 h-4 rounded-full border cursor-pointer ${
                            it.colorHex === c.hex ? 'border-[#183D32] scale-110' : 'border-[#303632]/25'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={it.stems}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id ? { ...x, stems: Math.max(1, Number(e.target.value)) } : x,
                            ),
                          )
                        }
                        className="w-12 px-1.5 py-0.5 bg-white border border-[#303632]/15 rounded text-right"
                      />
                      <span className="text-[#303632]/70">× {formatEuro(it.unitCost)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#303632]/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#303632]">Margen comercial ({marginPercent}%)</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(Number(e.target.value))}
                  className="w-32 accent-[#183D32]"
                />
              </div>
              <div className="flex justify-between text-[#303632]/75">
                <span>Coste base flores y materiales</span>
                <span className="font-mono tabular-nums">{formatEuro(materialsCost)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#183D32]">
                <span>PVP recomendado (sin IVA)</span>
                <span className="font-mono tabular-nums">{formatEuro(retailPrice)}</span>
              </div>
            </div>
          </div>

          {/* Saved compositions */}
          {companyDesigns.length > 0 && (
            <div className="pt-4 border-t border-[#303632]/10">
              <h3 className="text-xs font-semibold text-[#183D32] mb-2">
                Composiciones guardadas ({companyDesigns.length})
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {companyDesigns.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between text-xs p-2 bg-[#F4F0E7]/60 rounded"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setName(d.name);
                        setCompositionType(d.compositionType);
                        setMarginPercent(d.marginPercent);
                        setItems(d.items);
                      }}
                      className="text-left font-medium text-[#183D32] hover:underline truncate cursor-pointer"
                    >
                      {d.name} · <span className="font-mono">{formatEuro(d.retailPrice)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFloralDesign(d.id)}
                      className="text-red-700 ml-2 cursor-pointer"
                      aria-label="Eliminar composición"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
