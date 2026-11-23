import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Plus,
  Share2,
  Square,
  Trash2,
} from 'lucide-react';
import { useViverdeStore } from '../../store/useViverdeStore';
import { QuoteLineItem, QuoteStatus } from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';
import { exportQuoteToPdf } from '../../utils/pdfGenerator';

const GROUP_LABELS: Record<QuoteLineItem['categoryGroup'], string> = {
  plantas_arboles: 'Árboles, arbustos y plantas de vivero',
  flores: 'Flores y composiciones florales',
  cesped: 'Césped, gravas y cubresuelos',
  materiales: 'Tierras, borduras y materiales',
  decorativos: 'Elementos decorativos y mobiliario',
  riego: 'Sistemas de riego y drenaje',
  servicios: 'Mano de obra, instalación y servicios',
};

export const QuotesView: React.FC = () => {
  const {
    quotes,
    projects,
    products,
    activeCompanyId,
    companies,
    selectedQuoteId,
    selectQuote,
    generateQuoteFromProject,
    updateQuote,
    duplicateQuote,
    deleteQuote,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyQuotes = quotes.filter((q) => q.companyId === activeCompanyId);
  const companyProjects = projects.filter((p) => p.companyId === activeCompanyId);
  const companyProducts = products.filter((p) => p.companyId === activeCompanyId);

  const activeQuote = useMemo(
    () => companyQuotes.find((q) => q.id === selectedQuoteId) || companyQuotes[0] || null,
    [companyQuotes, selectedQuoteId],
  );

  const [sourceProjectId, setSourceProjectId] = useState<string>(companyProjects[0]?.id || '');
  const [quoteSubView, setQuoteSubView] = useState<'documento' | 'picking'>('documento');
  const [pickedLines, setPickedLines] = useState<Record<string, boolean>>({});

  const groupedPickingItems = useMemo(() => {
    if (!activeQuote) return [];
    const groups = new Map<QuoteLineItem['categoryGroup'], QuoteLineItem[]>();
    for (const item of activeQuote.items) {
      const arr = groups.get(item.categoryGroup) || [];
      arr.push(item);
      groups.set(item.categoryGroup, arr);
    }
    return Array.from(groups.entries());
  }, [activeQuote]);

  const pickedCount = useMemo(() => {
    if (!activeQuote) return 0;
    return activeQuote.items.filter((it) => pickedLines[it.id]).length;
  }, [activeQuote, pickedLines]);

  const handleTogglePick = (lineId: string) => {
    setPickedLines((prev) => ({ ...prev, [lineId]: !prev[lineId] }));
  };

  const handleCopyPickingList = () => {
    if (!activeQuote) return;
    const linesText = groupedPickingItems
      .map(([group, items]) => {
        const header = `[${GROUP_LABELS[group]}]`;
        const rows = items.map(
          (it) => `- ${pickedLines[it.id] ? '[OK]' : '[  ]'} ${it.quantity} ${it.unit} × ${it.name}`,
        );
        return `${header}\n${rows.join('\n')}`;
      })
      .join('\n\n');
    const fullText = `LISTA DE PREPARACIÓN / PICKING VIVERO — ${activeQuote.quoteNumber}\nProyecto: ${activeQuote.projectName}\nCliente: ${activeQuote.clientName}\n\n${linesText}`;
    navigator.clipboard?.writeText(fullText).catch(() => {});
    showToast('Lista de preparación de pedido copiada al portapapeles.', 'success');
  };

  const handleUpdateLine = (lineId: string, patch: Partial<QuoteLineItem>) => {
    if (!activeQuote) return;
    const nextItems = activeQuote.items.map((it) => {
      if (it.id !== lineId) return it;
      const merged = { ...it, ...patch };
      merged.total = Number((merged.quantity * merged.unitPrice).toFixed(2));
      return merged;
    });
    updateQuote(activeQuote.id, { items: nextItems });
  };

  const handleDeleteLine = (lineId: string) => {
    if (!activeQuote) return;
    updateQuote(activeQuote.id, {
      items: activeQuote.items.filter((it) => it.id !== lineId),
    });
  };

  const handleAddProductLine = (productId: string) => {
    if (!activeQuote) return;
    const prod = companyProducts.find((p) => p.id === productId);
    if (!prod) return;
    const categoryGroup: QuoteLineItem['categoryGroup'] =
      prod.category === 'flores'
        ? 'flores'
        : prod.category === 'cesped'
          ? 'cesped'
          : prod.category === 'materiales'
            ? 'materiales'
            : 'plantas_arboles';
    const newLine: QuoteLineItem = {
      id: `ql-${Date.now()}`,
      productId: prod.id,
      name: prod.commercialName,
      categoryGroup,
      quantity: 1,
      unit: prod.unit,
      unitPrice: prod.price,
      total: prod.price,
    };
    updateQuote(activeQuote.id, { items: [...activeQuote.items, newLine] });
  };

  const handleShareQuote = () => {
    if (!activeQuote) return;
    const summary = `Presupuesto ${activeQuote.quoteNumber} (${company.name}) — ${activeQuote.projectName} — Total: ${formatEuro(activeQuote.total)} (IVA incl.)`;
    navigator.clipboard?.writeText(summary).catch(() => {});
    showToast('Resumen del presupuesto copiado para compartir con el cliente.', 'success');
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#303632]/10">
        <div>
          <p className="text-xs font-medium text-[#183D32]/80 mb-1">
            Facturación y propuestas · {company.name}
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#183D32]">
            Generador de presupuestos y picking de vivero
          </h1>
          <p className="text-sm text-[#303632]/75 mt-1">
            Edita partidas, aplica descuentos, configura transporte, mano de obra e IVA, prepara pedidos de almacén y exporta en PDF.
          </p>
        </div>

        {companyProjects.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={sourceProjectId || companyProjects[0]?.id}
              onChange={(e) => setSourceProjectId(e.target.value)}
              className="px-3 py-2 bg-white border border-[#303632]/15 rounded-lg text-xs"
            >
              {companyProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => generateQuoteFromProject(sourceProjectId || companyProjects[0].id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo presupuesto</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left List of Quotes */}
        <aside className="lg:col-span-3 space-y-2.5">
          <h2 className="text-xs font-semibold text-[#303632]/75 mb-2">
            Presupuestos de la empresa ({companyQuotes.length})
          </h2>
          {companyQuotes.length === 0 ? (
            <div className="bg-white border border-[#303632]/10 rounded-xl p-6 text-xs text-[#303632]/75">
              Aún no hay presupuestos generados. Diseña un jardín o selecciona un proyecto para crear uno.
            </div>
          ) : (
            companyQuotes.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => selectQuote(q.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  activeQuote?.id === q.id
                    ? 'bg-[#183D32] text-white border-[#183D32]'
                    : 'bg-white text-[#303632] border-[#303632]/10 hover:border-[#183D32]/35'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>{q.quoteNumber}</span>
                  <span className="tabular-nums font-semibold">{formatEuro(q.total)}</span>
                </div>
                <p className="text-sm font-semibold mt-1 truncate">{q.projectName}</p>
                <p className={`text-[11px] mt-0.5 ${activeQuote?.id === q.id ? 'text-[#DDE8D8]' : 'text-[#303632]/65'}`}>
                  {q.clientName} · {q.status}
                </p>
              </button>
            ))
          )}
        </aside>

        {/* Main Professional Quote Document & Nursery Picking List */}
        {activeQuote && (
          <div className="lg:col-span-9 bg-white border border-[#303632]/10 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-4 bg-[#F4F0E7]/70 border-b border-[#303632]/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold text-[#183D32]">
                  {activeQuote.quoteNumber}
                </span>
                <select
                  value={activeQuote.status}
                  onChange={(e) => updateQuote(activeQuote.id, { status: e.target.value as QuoteStatus })}
                  className="px-2.5 py-1 bg-white border border-[#303632]/15 rounded text-xs font-medium"
                >
                  <option value="borrador">Borrador</option>
                  <option value="enviado">Enviado</option>
                  <option value="aceptado">Aceptado</option>
                  <option value="rechazado">Rechazado</option>
                </select>

                <div className="inline-flex items-center bg-white border border-[#303632]/15 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQuoteSubView('documento')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      quoteSubView === 'documento' ? 'bg-[#183D32] text-white' : 'text-[#303632]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Presupuesto Cliente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteSubView('picking')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      quoteSubView === 'picking' ? 'bg-[#183D32] text-white' : 'text-[#303632]'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Picking Vivero</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareQuote}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#303632]/15 hover:bg-[#DDE8D8]/40 text-xs font-semibold text-[#183D32] rounded-lg cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir</span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateQuote(activeQuote.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#303632]/15 hover:bg-[#DDE8D8]/40 text-xs font-semibold text-[#183D32] rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteQuote(activeQuote.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportQuoteToPdf(activeQuote, company);
                    showToast(`PDF de ${activeQuote.quoteNumber} descargado.`, 'success');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            {quoteSubView === 'picking' ? (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#303632]/10">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#183D32]">
                      Orden de preparación y carga de vivero
                    </h3>
                    <p className="text-xs text-[#303632]/75 mt-0.5 tabular-nums">
                      Proyecto: {activeQuote.projectName} · Preparadas {pickedCount} de {activeQuote.items.length} líneas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPickingList}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar lista para almacén</span>
                  </button>
                </div>

                <div className="space-y-5">
                  {groupedPickingItems.map(([group, items]) => (
                    <div key={group} className="border border-[#303632]/10 rounded-xl overflow-hidden">
                      <div className="bg-[#F4F0E7] px-4 py-2.5 text-xs font-semibold text-[#183D32]">
                        {GROUP_LABELS[group]} ({items.length})
                      </div>
                      <div className="divide-y divide-[#303632]/10">
                        {items.map((it) => {
                          const checked = Boolean(pickedLines[it.id]);
                          return (
                            <button
                              key={it.id}
                              type="button"
                              onClick={() => handleTogglePick(it.id)}
                              className={`w-full px-4 py-3 flex items-center justify-between gap-4 text-left text-xs transition-colors cursor-pointer ${
                                checked ? 'bg-[#DDE8D8]/35 text-[#303632]/65' : 'hover:bg-[#F4F0E7]/35'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {checked ? (
                                  <CheckSquare className="w-4 h-4 text-[#183D32] shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#303632]/40 shrink-0" />
                                )}
                                <span className={`font-medium truncate ${checked ? 'line-through' : 'text-[#183D32]'}`}>
                                  {it.name}
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-[#183D32] tabular-nums shrink-0">
                                {it.quantity} {it.unit === 'm2' ? 'm²' : it.unit === 'm3' ? 'm³' : it.unit}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Company & Client Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#303632]/10">
                  <div className="flex items-start gap-4">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="w-14 h-14 object-contain rounded-lg border border-[#303632]/10 p-1"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-[#183D32] text-white font-display font-semibold text-xl flex items-center justify-center shrink-0">
                        {company.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#183D32]">
                        {company.name}
                      </h3>
                      <p className="text-xs text-[#303632]/75">{company.address}</p>
                      <p className="text-xs text-[#303632]/75">
                        {company.phone} · {company.email}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] text-[#303632]/65">Cliente</label>
                      <input
                        type="text"
                        value={activeQuote.clientName}
                        onChange={(e) => updateQuote(activeQuote.id, { clientName: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#303632]/65">Validez hasta</label>
                      <input
                        type="date"
                        value={activeQuote.validUntil}
                        onChange={(e) => updateQuote(activeQuote.id, { validUntil: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#303632]/65">Email cliente</label>
                      <input
                        type="email"
                        value={activeQuote.clientEmail}
                        onChange={(e) => updateQuote(activeQuote.id, { clientEmail: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#303632]/65">Teléfono</label>
                      <input
                        type="text"
                        value={activeQuote.clientPhone}
                        onChange={(e) => updateQuote(activeQuote.id, { clientPhone: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Embedded Preview if available */}
                {activeQuote.previewDataUrl && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-[#F4F0E7]/50 rounded-xl border border-[#303632]/10">
                    <img
                      src={activeQuote.previewDataUrl}
                      alt="Vista previa del diseño"
                      className="w-full h-36 object-cover rounded-lg border border-[#303632]/10"
                    />
                    <div className="md:col-span-2 text-xs space-y-1">
                      <p className="font-semibold text-[#183D32]">
                        Proyecto: {activeQuote.projectName}
                      </p>
                      {activeQuote.surfacesSummary.length > 0 && (
                        <div className="text-[#303632]/80">
                          Superficies medidas:{' '}
                          {activeQuote.surfacesSummary
                            .map((s) => `${s.name} (${s.areaM2} m²)`)
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Editable Line Items Table */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="font-display text-base font-semibold text-[#183D32]">
                      Desglose de partidas
                    </h4>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddProductLine(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="px-3 py-1.5 bg-[#DDE8D8]/60 border border-[#183D32]/25 rounded-lg text-xs font-medium text-[#183D32]"
                    >
                      <option value="">+ Añadir producto del catálogo...</option>
                      {companyProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.commercialName} ({formatEuro(p.price)}/{p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto border border-[#303632]/10 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#183D32] text-white">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">Concepto</th>
                          <th className="py-2.5 px-3 font-medium text-right">Cantidad</th>
                          <th className="py-2.5 px-3 font-medium">Unidad</th>
                          <th className="py-2.5 px-3 font-medium text-right">Precio Unit.</th>
                          <th className="py-2.5 px-3 font-medium text-right">Importe</th>
                          <th className="py-2.5 px-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#303632]/10">
                        {activeQuote.items.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F4F0E7]/40">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateLine(item.id, { name: e.target.value })}
                                className="w-full bg-transparent font-medium text-[#303632] focus:outline-none focus:underline"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0.1}
                                step={item.unit === 'm2' ? 0.5 : 1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, {
                                    quantity: Math.max(0.1, Number(e.target.value)),
                                  })
                                }
                                className="w-20 text-right font-mono tabular-nums px-2 py-1 bg-[#F4F0E7]/70 rounded border border-[#303632]/15"
                              />
                            </td>
                            <td className="py-2 px-3 text-[#303632]/75">
                              {item.unit === 'm2' ? 'm²' : item.unit === 'm3' ? 'm³' : item.unit}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateLine(item.id, {
                                    unitPrice: Math.max(0, Number(e.target.value)),
                                  })
                                }
                                className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-[#F4F0E7]/70 rounded border border-[#303632]/15"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-[#183D32] tabular-nums">
                              {formatEuro(item.total)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteLine(item.id)}
                                aria-label="Eliminar partida"
                                className="text-red-700 hover:text-red-900 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Adjustments, Taxes & Final Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#183D32] mb-1.5">
                      Observaciones y condiciones del presupuesto
                    </label>
                    <textarea
                      rows={5}
                      value={activeQuote.notes}
                      onChange={(e) => updateQuote(activeQuote.id, { notes: e.target.value })}
                      className="w-full p-3 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-xl text-xs"
                    />
                  </div>

                  <div className="bg-[#DDE8D8]/45 border border-[#183D32]/15 rounded-xl p-5 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#303632]/80">Subtotal partidas</span>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatEuro(activeQuote.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#303632]/80">Descuento (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={activeQuote.discountPercent}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, {
                            discountPercent: Math.max(0, Math.min(90, Number(e.target.value))),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-white border border-[#303632]/15 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#303632]/80">Transporte (€)</span>
                      <input
                        type="number"
                        min={0}
                        value={activeQuote.transportCost}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, {
                            transportCost: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-white border border-[#303632]/15 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#303632]/80">Mano de obra (€)</span>
                      <input
                        type="number"
                        min={0}
                        value={activeQuote.laborCost}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, {
                            laborCost: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-white border border-[#303632]/15 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#303632]/80">Instalación opcional (€)</span>
                      <input
                        type="number"
                        min={0}
                        value={activeQuote.installationCost}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, {
                            installationCost: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-white border border-[#303632]/15 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#303632]/80">IVA configurable (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={activeQuote.vatRate}
                        onChange={(e) =>
                          updateQuote(activeQuote.id, {
                            vatRate: Math.max(0, Math.min(30, Number(e.target.value))),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 bg-white border border-[#303632]/15 rounded"
                      />
                    </div>

                    <div className="flex justify-between pt-1 border-t border-[#183D32]/15 text-[#303632]/80">
                      <span>Cuota IVA</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeQuote.vatAmount)}</span>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-[#183D32]/25 text-lg font-bold text-[#183D32]">
                      <span>TOTAL FINAL</span>
                      <span className="font-mono tabular-nums">{formatEuro(activeQuote.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
