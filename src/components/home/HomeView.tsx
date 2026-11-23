import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Box,
  Calculator,
  CheckCircle2,
  Droplets,
  Flower2,
  FolderKanban,
  Layers,
  Send,
  Sprout,
  Sun,
} from 'lucide-react';
import { IMAGES } from '../../data/demoCatalog';
import { FLORAL_SHOWCASE_PRESETS } from '../../data/floralPresets';
import { GARDEN_STYLE_TEMPLATES, GardenTemplateId } from '../../data/gardenTemplates';
import { useViverdeStore } from '../../store/useViverdeStore';
import { Product, SunExposure, WaterNeeds } from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';
import { BotanicalImage } from '../ui/BotanicalImage';

const TEMPLATE_IMAGE_MAP: Record<GardenTemplateId, string> = {
  mediterraneo: IMAGES.authenticMediterranean,
  moderno: IMAGES.ultraModernSquare,
  tropical: IMAGES.brazilianTropical,
  minimalista: IMAGES.smallMinimalist,
  rustico: IMAGES.rusticMountainFireplace,
  bajo_mantenimiento: IMAGES.lowMaintenanceXeriscape,
  piscina_balinesa: IMAGES.balinesePool,
  terraza: IMAGES.smallUrbanTerrace,
};

type QuickSpaceChoice = 'jardin' | 'terraza' | 'piscina';

export const HomeView: React.FC = () => {
  const {
    products,
    activeCompanyId,
    setActiveNav,
    setShowProjectWizard,
    loadPopulatedTemplate,
    openFloralPreset,
    addElementToDesign,
    setPendingPlacementProduct,
    submitCommercialLead,
    showToast,
  } = useViverdeStore();

  const companyProducts = useMemo(
    () => products.filter((p) => p.companyId === activeCompanyId),
    [products, activeCompanyId],
  );

  // Interactive Quick Recommender & Garden Estimator state
  const [spaceChoice, setSpaceChoice] = useState<QuickSpaceChoice>('jardin');
  const [sunChoice, setSunChoice] = useState<SunExposure>('sol_directo');
  const [waterChoice, setWaterChoice] = useState<WaterNeeds>('bajo');
  const [areaM2, setAreaM2] = useState<number>(80);

  // Commercial Demo Lead Form state
  const [leadName, setLeadName] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadSegment, setLeadSegment] = useState('Vivero o centro de jardinería');
  const [leadMessage, setLeadMessage] = useState('');
  const [leadSent, setLeadSent] = useState(false);

  const recommendedTemplateId: GardenTemplateId = useMemo(() => {
    if (spaceChoice === 'piscina') return 'piscina_balinesa';
    if (spaceChoice === 'terraza') return 'terraza';
    if (waterChoice === 'bajo') return sunChoice === 'sol_directo' ? 'mediterraneo' : 'bajo_mantenimiento';
    if (waterChoice === 'alto') return 'tropical';
    return sunChoice === 'sombra' ? 'rustico' : 'moderno';
  }, [spaceChoice, sunChoice, waterChoice]);

  const recommendedTemplate = useMemo(
    () =>
      GARDEN_STYLE_TEMPLATES.find((t) => t.id === recommendedTemplateId) ||
      GARDEN_STYLE_TEMPLATES[0],
    [recommendedTemplateId],
  );

  const recommendedSpecies = useMemo(() => {
    const botanical = companyProducts.filter(
      (p) =>
        (p.category === 'arboles' ||
          p.category === 'arbustos' ||
          p.category === 'plantas' ||
          p.category === 'flores') &&
        p.availability !== 'agotado',
    );
    const scored = botanical
      .map((p) => {
        let score = 0;
        if (p.sunExposure === sunChoice) score += 3;
        else if (p.sunExposure === 'semisombra') score += 1;
        if (p.waterNeeds === waterChoice) score += 3;
        if (spaceChoice === 'terraza' && p.dimensions.heightCm <= 220) score += 2;
        if (spaceChoice === 'piscina' && (p.waterNeeds !== 'bajo' || p.category === 'arboles')) score += 1;
        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.product);
  }, [companyProducts, sunChoice, waterChoice, spaceChoice]);

  const estimateSummary = useMemo(() => {
    const surfaceRate =
      waterChoice === 'bajo'
        ? 14
        : spaceChoice === 'terraza'
          ? 24
          : 19;
    const structuralBase = spaceChoice === 'piscina' ? 5200 : spaceChoice === 'terraza' ? 320 : 680;
    const minTotal = Math.round(structuralBase + areaM2 * surfaceRate * 0.85);
    const maxTotal = Math.round(structuralBase + areaM2 * (surfaceRate + 14));
    const litersWeek =
      waterChoice === 'bajo'
        ? Math.round(areaM2 * 2.2)
        : waterChoice === 'medio'
          ? Math.round(areaM2 * 6.5)
          : Math.round(areaM2 * 14);
    return { minTotal, maxTotal, litersWeek };
  }, [areaM2, spaceChoice, waterChoice]);

  const handleQuickAddSpecies = (prod: Product) => {
    addElementToDesign(prod, { x: 0, z: 0 }, 1);
    setPendingPlacementProduct(prod.id);
    setActiveNav('disenador');
    showToast(`"${prod.commercialName}" añadido al escenario 3D.`, 'success');
  };

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadEmail.trim()) {
      showToast('Introduce al menos tu nombre y un correo electrónico válido.', 'error');
      return;
    }
    submitCommercialLead({
      name: leadName.trim(),
      company: leadCompany.trim() || 'Particular / Independiente',
      email: leadEmail.trim(),
      phone: leadPhone.trim(),
      segment: leadSegment,
      message: leadMessage.trim(),
    });
    setLeadSent(true);
    setLeadName('');
    setLeadCompany('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadMessage('');
  };

  return (
    <div className="bg-[#F4F0E7]">
      {/* Hero Section */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 pt-8 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center py-4 lg:py-6">
            <p className="text-xs font-medium tracking-wider text-[#183D32]/80 mb-3">
              VIVERDE STUDIO · Tu espacio verde empieza aquí
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#183D32] leading-[1.08] tracking-tight mb-5 [text-wrap:balance]">
              Imagina tu jardín. Diseña cada detalle. Hazlo realidad.
            </h1>
            <p className="text-base sm:text-lg text-[#303632]/85 leading-relaxed mb-8 max-w-xl">
              Descubre miles de posibilidades para transformar jardines, terrazas y espacios exteriores. Diseña en 3D, simula luz solar y crecimiento a 5 años y calcula tu presupuesto en tiempo real.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setShowProjectWizard(true);
                  setActiveNav('disenador');
                }}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#183D32] text-white text-sm font-semibold rounded-lg hover:bg-[#122f26] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Crear mi jardín en 3D</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('catalogo')}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#183D32] border border-[#183D32]/25 text-sm font-semibold rounded-lg hover:bg-[#DDE8D8]/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explorar catálogo
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#303632]/10 grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-mono text-lg font-semibold text-[#183D32] tabular-nums">
                  {companyProducts.length}
                </p>
                <p className="text-[#303632]/70">Referencias botánicas</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-[#183D32] tabular-nums">
                  2D / 3D
                </p>
                <p className="text-[#303632]/70">Luz solar y +5 años</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-[#183D32] tabular-nums">
                  PDF + Picking
                </p>
                <p className="text-[#303632]/70">Presupuesto al instante</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative flex-1 min-h-[340px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-[#303632]/10 bg-white">
              <BotanicalImage
                src={IMAGES.dreamHeroGarden}
                alt="Jardín mediterráneo de ensueño con olivos escultóricos, limoneros, naranjos, lavandas, hortensias, rosales y pérgola florida"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#DDE8D8] mb-1">
                    Entorno interactivo 2D / 3D para viveros, floristerías y paisajistas
                  </p>
                  <p className="text-sm sm:text-base font-medium max-w-md">
                    Abre una plantilla amueblada en 3D o traza parcelas a medida con presupuesto automático.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadPopulatedTemplate('piscina_balinesa', '3d')}
                    className="px-3.5 py-2 bg-white/95 hover:bg-white text-[#183D32] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ver piscina balinesa 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPopulatedTemplate('mediterraneo', '3d')}
                    className="px-3.5 py-2 bg-[#183D32] hover:bg-[#122f26] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Ver jardín mediterráneo 3D
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Four Core Feature Blocks */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-12 border-t border-[#303632]/10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            type="button"
            onClick={() => setActiveNav('catalogo')}
            className="text-left bg-white border border-[#303632]/10 rounded-xl p-6 hover:border-[#183D32]/40 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[#DDE8D8] text-[#183D32] flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#183D32] mb-2">
              01. Catálogo Inteligente
            </h2>
            <p className="text-sm text-[#303632]/80 leading-relaxed">
              Árboles, flores de múltiples estilos, arbustos y pavimentos con comparador técnico y precios editables por unidad o m².
            </p>
          </button>

          <button
            type="button"
            onClick={() => loadPopulatedTemplate('mediterraneo', '3d')}
            className="text-left bg-white border border-[#303632]/10 rounded-xl p-6 hover:border-[#183D32]/40 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[#DDE8D8] text-[#183D32] flex items-center justify-center mb-4">
              <Box className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#183D32] mb-2">
              02. Diseñador 3D Realista
            </h2>
            <p className="text-sm text-[#303632]/80 leading-relaxed">
              Plano 2D acotado y escena 3D con iluminación solar mañana-noche, luminarias nocturnas y crecimiento botánico a +3 y +5 años.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('presupuestos')}
            className="text-left bg-white border border-[#303632]/10 rounded-xl p-6 hover:border-[#183D32]/40 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[#DDE8D8] text-[#183D32] flex items-center justify-center mb-4">
              <Calculator className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#183D32] mb-2">
              03. Presupuesto Automático
            </h2>
            <p className="text-sm text-[#303632]/80 leading-relaxed">
              Calcula m² de césped, volumen de grava o tierra vegetal, borduras, transporte e IVA, con PDF profesional y lista de picking.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveNav('proyectos')}
            className="text-left bg-white border border-[#303632]/10 rounded-xl p-6 hover:border-[#183D32]/40 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-[#DDE8D8] text-[#183D32] flex items-center justify-center mb-4">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h2 className="font-display text-lg font-semibold text-[#183D32] mb-2">
              04. Proyectos Personalizados
            </h2>
            <p className="text-sm text-[#303632]/80 leading-relaxed">
              Guarda propuestas, importa o exporta planos JSON, controla estados de obra y comparte enlaces de solo lectura con tus clientes.
            </p>
          </button>
        </div>
      </section>

      {/* Interactive Quick Species Recommender & Cost Estimator */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 border-t border-[#303632]/10">
        <div className="bg-white border border-[#303632]/10 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#303632]/10">
            <div>
              <p className="text-xs font-medium text-[#183D32]/80 mb-1">
                Asistente botánico y estimador rápido
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#183D32]">
                Calcula especies compatibles y presupuesto orientativo en 10 segundos
              </h2>
            </div>
            <button
              type="button"
              onClick={() => loadPopulatedTemplate(recommendedTemplate.id, '3d')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Abrir {recommendedTemplate.title} en 3D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
            {/* Controls */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-[#183D32] mb-2">1. Tipo de espacio exterior</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['jardin', 'Jardín'],
                      ['terraza', 'Terraza / Ático'],
                      ['piscina', 'Con piscina'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSpaceChoice(id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        spaceChoice === id
                          ? 'bg-[#183D32] text-white border-[#183D32]'
                          : 'bg-[#F4F0E7]/60 text-[#303632] border-[#303632]/10 hover:border-[#183D32]/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#183D32] mb-2 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" /> 2. Exposición solar predominante
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['sol_directo', 'Sol directo'],
                      ['semisombra', 'Semisombra'],
                      ['sombra', 'Sombra'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSunChoice(id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        sunChoice === id
                          ? 'bg-[#183D32] text-white border-[#183D32]'
                          : 'bg-[#F4F0E7]/60 text-[#303632] border-[#303632]/10 hover:border-[#183D32]/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#183D32] mb-2 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" /> 3. Objetivo de riego y mantenimiento
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['bajo', 'Bajo consumo'],
                      ['medio', 'Equilibrado'],
                      ['alto', 'Exuberante'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWaterChoice(id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        waterChoice === id
                          ? 'bg-[#183D32] text-white border-[#183D32]'
                          : 'bg-[#F4F0E7]/60 text-[#303632] border-[#303632]/10 hover:border-[#183D32]/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#183D32]">4. Superficie estimada</span>
                  <span className="font-mono font-semibold text-[#183D32] tabular-nums">
                    {areaM2} m²
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={250}
                  step={5}
                  value={areaM2}
                  onChange={(e) => setAreaM2(Number(e.target.value))}
                  aria-label="Superficie estimada en metros cuadrados"
                  className="w-full accent-[#183D32]"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#DDE8D8]/45 border border-[#183D32]/15 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[#303632]/70">Inversión estimada</p>
                  <p className="font-mono text-base font-semibold text-[#183D32] tabular-nums mt-0.5">
                    {formatEuro(estimateSummary.minTotal)} – {formatEuro(estimateSummary.maxTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[#303632]/70">Consumo estival est.</p>
                  <p className="font-mono text-base font-semibold text-[#183D32] tabular-nums mt-0.5">
                    {estimateSummary.litersWeek} L / semana
                  </p>
                </div>
              </div>
            </div>

            {/* Live Recommended Species Cards */}
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-[#183D32]">
                  Especies recomendadas de tu catálogo ({recommendedSpecies.length})
                </span>
                <span className="text-[#303632]/70">
                  Estilo sugerido: <strong className="text-[#183D32]">{recommendedTemplate.title}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedSpecies.map((prod) => (
                  <div
                    key={prod.id}
                    className="border border-[#303632]/10 rounded-xl p-3.5 bg-[#F4F0E7]/35 flex gap-3.5 items-center"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#DDE8D8]/40">
                      <BotanicalImage
                        src={prod.imageUrl}
                        alt={prod.commercialName}
                        accentHex={prod.colorHex}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-[#303632]/65 truncate">
                        {prod.subcategory} · {prod.dimensions.heightCm} cm
                      </p>
                      <h3 className="font-display text-sm font-semibold text-[#183D32] truncate">
                        {prod.commercialName}
                      </h3>
                      <p className="font-mono text-xs font-semibold text-[#183D32] tabular-nums mt-1">
                        {formatEuro(prod.price)} / {prod.unit}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleQuickAddSpecies(prod)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#183D32] hover:underline cursor-pointer"
                      >
                        <span>Añadir al diseño 3D</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Populated Inspiration Styles */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 border-t border-[#303632]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-[#183D32]/80 mb-1">
              Plantillas 3D amuebladas y listas para personalizar
            </p>
            <h2 className="font-display text-3xl font-semibold text-[#183D32]">
              Estilos de jardín listos para diseñar en 3D
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('floristeria')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#183D32] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flower2 className="w-4 h-4" />
            <span>Ir al estudio de composiciones florales →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GARDEN_STYLE_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="group bg-white border border-[#303632]/10 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#DDE8D8]/40">
                <BotanicalImage
                  src={TEMPLATE_IMAGE_MAP[tpl.id]}
                  alt={tpl.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] text-[#303632]/65 font-mono tabular-nums mb-1">
                    {tpl.spaceType} · {tpl.widthM} × {tpl.lengthM} m · {tpl.referenceBudgetRange}
                  </p>
                  <h3 className="font-display text-lg font-semibold text-[#183D32] mb-2">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-[#303632]/80 leading-relaxed mb-4">
                    {tpl.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadPopulatedTemplate(tpl.id, '3d')}
                  className="w-full py-2 px-4 bg-[#DDE8D8]/70 hover:bg-[#183D32] text-[#183D32] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Abrir plantilla en 3D
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floral Compositions Showcase: Ramos, Bodas, Eventos & Navidad */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 border-t border-[#303632]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-medium text-[#183D32]/80 mb-1">
              Arte floral para floristerías, bodas y ocasiones especiales
            </p>
            <h2 className="font-display text-3xl font-semibold text-[#183D32]">
              Composiciones florales: ramos, bodas, eventos y Navidad
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('floristeria')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#183D32] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flower2 className="w-4 h-4" />
            <span>Abrir diseñador floral completo →</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FLORAL_SHOWCASE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="group bg-white border border-[#303632]/10 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#DDE8D8]/40">
                <BotanicalImage
                  src={preset.imageUrl}
                  alt={preset.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] text-[#303632]/65 font-mono tabular-nums mb-1">
                    {preset.categoryLabel} · {preset.referencePriceRange}
                  </p>
                  <h3 className="font-display text-lg font-semibold text-[#183D32] mb-2">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-[#303632]/80 leading-relaxed mb-4">
                    {preset.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openFloralPreset(preset.id)}
                  className="w-full py-2 px-4 bg-[#DDE8D8]/70 hover:bg-[#183D32] text-[#183D32] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Diseñar composición
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Workflow & B2B Sector Strip */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 border-t border-[#303632]/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-medium text-[#183D32]/80">
              Para viveros, floristerías, paisajistas y particulares
            </p>
            <h2 className="font-display text-3xl font-semibold text-[#183D32] leading-tight">
              Del primer boceto al presupuesto aprobado sin hojas de cálculo
            </h2>
            <p className="text-sm text-[#303632]/80 leading-relaxed">
              VIVERDE STUDIO conecta el catálogo real de cada vivero con un motor espacial 2D/3D, un estudio floral por tallos y un módulo de presupuestos con lista de preparación de pedidos.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveNav('floristeria')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#303632]/15 hover:border-[#183D32] text-xs font-semibold text-[#183D32] rounded-lg cursor-pointer"
              >
                <Flower2 className="w-4 h-4" />
                <span>Estudio de Floristería</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('panel_pro')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Sprout className="w-4 h-4" />
                <span>Panel Profesional B2B</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#303632]/10 rounded-xl p-5">
              <p className="font-mono text-xs text-[#183D32]/70 mb-2">PASO 01</p>
              <h3 className="font-display text-base font-semibold text-[#183D32] mb-1.5">
                Plano 2D y Terreno
              </h3>
              <p className="text-xs text-[#303632]/75 leading-relaxed">
                Define metros exactos o abre una de las 8 plantillas de estilo. Dibuja zonas de césped, grava o tarima y calcula perímetros en m².
              </p>
            </div>
            <div className="bg-white border border-[#303632]/10 rounded-xl p-5">
              <p className="font-mono text-xs text-[#183D32]/70 mb-2">PASO 02</p>
              <h3 className="font-display text-base font-semibold text-[#183D32] mb-1.5">
                Simulador Solar y +5 Años
              </h3>
              <p className="text-xs text-[#303632]/75 leading-relaxed">
                Comprueba el jardín de mañana a noche con iluminación LED encendida y observa cómo crecerán árboles y arbustos en 3 y 5 años.
              </p>
            </div>
            <div className="bg-white border border-[#303632]/10 rounded-xl p-5">
              <p className="font-mono text-xs text-[#183D32]/70 mb-2">PASO 03</p>
              <h3 className="font-display text-base font-semibold text-[#183D32] mb-1.5">
                PDF y Picking Vivero
              </h3>
              <p className="text-xs text-[#303632]/75 leading-relaxed">
                Genera automáticamente el presupuesto PDF con logotipo de empresa y la hoja de pedido agrupada por zonas para el vivero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Commercial Contact & Demo Request Section */}
      <section className="max-w-[1380px] mx-auto px-4 sm:px-8 py-14 border-t border-[#303632]/10">
        <div className="bg-[#183D32] text-white rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-medium text-[#DDE8D8]">
              Implantación para viveros, floristerías y estudios
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight">
              Solicita una demostración con tu propio catálogo
            </h2>
            <p className="text-sm text-[#DDE8D8]/90 leading-relaxed">
              Configuramos tu espacio multiempresa con tus tarifas, especies en stock, margen comercial de floristería y logotipo corporativo en los presupuestos PDF.
            </p>
            <div className="pt-2 space-y-2 text-xs text-[#DDE8D8]">
              <p>· Catálogo privado por empresa con importación CSV / panel visual</p>
              <p>· Enlaces compartibles de solo lectura para tus clientes</p>
              <p>· Gestión de clientes, proyectos, floristería y picking</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmitLead}
            className="lg:col-span-7 bg-white text-[#303632] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
          >
            {leadSent && (
              <div className="sm:col-span-2 p-3 bg-[#DDE8D8]/60 border border-[#183D32]/20 rounded-lg flex items-center gap-2 text-[#183D32] font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Solicitud registrada correctamente. Te contactaremos en menos de 24 h laborables.</span>
              </div>
            )}

            <div>
              <label className="block font-medium mb-1">Nombre completo *</label>
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Ej. Laura Navarro"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Vivero / Estudio / Empresa</label>
              <input
                type="text"
                value={leadCompany}
                onChange={(e) => setLeadCompany(e.target.value)}
                placeholder="Ej. Viveros del Sur"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Correo electrónico *</label>
              <input
                type="email"
                required
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="nombre@empresa.es"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium mb-1">Actividad principal</label>
              <select
                value={leadSegment}
                onChange={(e) => setLeadSegment(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              >
                <option value="Vivero o centro de jardinería">Vivero o centro de jardinería</option>
                <option value="Floristería o eventos">Floristería o eventos</option>
                <option value="Estudio de paisajismo / arquitectura">Estudio de paisajismo / arquitectura</option>
                <option value="Constructor / Promotor / Particular">Constructor / Promotor / Particular</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium mb-1">¿Qué necesitas diseñar o digitalizar?</label>
              <textarea
                rows={2}
                value={leadMessage}
                onChange={(e) => setLeadMessage(e.target.value)}
                placeholder="Número aproximado de referencias, necesidades 3D o volumen de presupuestos..."
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183D32] hover:bg-[#122f26] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Solicitar información y demo</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};
