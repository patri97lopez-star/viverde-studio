import React, { useEffect, useState } from 'react';
import { ArrowLeft, Layers, Ruler } from 'lucide-react';
import { fetchSharedProject } from '../../lib/firestoreSync';
import { useViverdeStore } from '../../store/useViverdeStore';
import { SharedProjectSnapshot } from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';

interface SharedProjectViewProps {
  shareToken: string;
  onExitShare: () => void;
}

export const SharedProjectView: React.FC<SharedProjectViewProps> = ({
  shareToken,
  onExitShare,
}) => {
  const { projects, companies } = useViverdeStore();
  const [snapshot, setSnapshot] = useState<SharedProjectSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const cloud = await fetchSharedProject(shareToken);
      if (!cancelled && cloud) {
        setSnapshot(cloud);
        setLoading(false);
        return;
      }
      // Local fallback if previewed in same browser before cloud auth
      const localProj = projects.find(
        (p) => p.shareToken === shareToken && p.shareEnabled,
      );
      if (!cancelled && localProj) {
        const comp = companies.find((c) => c.id === localProj.companyId);
        setSnapshot({
          shareToken,
          projectName: localProj.name,
          companyName: comp?.name || 'VIVERDE STUDIO',
          spaceType: localProj.spaceType,
          widthM: localProj.widthM,
          lengthM: localProj.lengthM,
          areaM2: localProj.areaM2,
          elements: localProj.elements,
          surfaces: localProj.surfaces,
          estimatedTotal: localProj.estimatedTotal,
          previewDataUrl: localProj.previewDataUrl,
          createdAt: localProj.updatedAt,
        });
      }
      if (!cancelled) setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [shareToken, projects, companies]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F0E7] flex items-center justify-center p-6">
        <div className="bg-white border border-[#303632]/15 rounded-xl p-8 text-center">
          <p className="font-display text-xl text-[#183D32]">Cargando propuesta compartida...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-[#F4F0E7] flex items-center justify-center p-6">
        <div className="bg-white border border-[#303632]/15 rounded-xl p-8 max-w-md w-full text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold text-[#183D32]">
            Enlace no disponible
          </h1>
          <p className="text-sm text-[#303632]/75">
            Esta propuesta compartida ha sido desactivada o el enlace no corresponde a ningún diseño activo.
          </p>
          <button
            type="button"
            onClick={onExitShare}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ir a VIVERDE STUDIO</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F0E7] text-[#303632]">
      <header className="bg-white border-b border-[#303632]/15 px-6 py-4 flex items-center justify-between">
        <div>
          <span className="font-display text-lg font-semibold text-[#183D32] tracking-tight">
            VIVERDE STUDIO
          </span>
          <span className="text-xs text-[#303632]/65 ml-3">
            Vista compartida de solo lectura · {snapshot.companyName}
          </span>
        </div>
        <button
          type="button"
          onClick={onExitShare}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Abrir plataforma</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="bg-white border border-[#303632]/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#303632]/10">
            <div>
              <p className="text-xs text-[#303632]/65 mb-1">
                {snapshot.spaceType} · Propuesta preparada por {snapshot.companyName}
              </p>
              <h1 className="font-display text-3xl font-semibold text-[#183D32]">
                {snapshot.projectName}
              </h1>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs text-[#303632]/65">Estimación base de materiales y plantas (sin IVA)</p>
              <p className="font-mono text-2xl font-semibold text-[#183D32] tabular-nums">
                {formatEuro(snapshot.estimatedTotal)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#F4F0E7]/65 rounded-xl flex items-center gap-3">
              <Ruler className="w-5 h-5 text-[#183D32]" />
              <div>
                <p className="text-[#303632]/65">Dimensiones del espacio</p>
                <p className="font-mono font-semibold text-[#183D32] tabular-nums">
                  {snapshot.widthM} × {snapshot.lengthM} m ({snapshot.areaM2} m²)
                </p>
              </div>
            </div>
            <div className="p-4 bg-[#F4F0E7]/65 rounded-xl flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#183D32]" />
              <div>
                <p className="text-[#303632]/65">Elementos y superficies</p>
                <p className="font-mono font-semibold text-[#183D32] tabular-nums">
                  {snapshot.elements.reduce((a, b) => a + b.quantity, 0)} uds · {snapshot.surfaces.length} zonas
                </p>
              </div>
            </div>
            <div className="p-4 bg-[#DDE8D8]/45 rounded-xl">
              <p className="text-[#303632]/65">Privacidad de propuesta</p>
              <p className="font-medium text-[#183D32]">
                Enlace público de solo lectura (sin datos personales)
              </p>
            </div>
          </div>

          {snapshot.previewDataUrl && (
            <div className="rounded-xl overflow-hidden border border-[#303632]/10 bg-[#ECE8DD]">
              <img
                src={snapshot.previewDataUrl}
                alt={`Vista del diseño ${snapshot.projectName}`}
                className="w-full max-h-[420px] object-contain mx-auto"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#183D32] mb-3">
                Especies y elementos incluidos
              </h2>
              {snapshot.elements.length === 0 ? (
                <p className="text-xs text-[#303632]/70">Sin elementos individuales.</p>
              ) : (
                <ul className="divide-y divide-[#303632]/10 text-xs">
                  {snapshot.elements.map((el) => (
                    <li key={el.id} className="py-2 flex justify-between gap-2">
                      <span>{el.name}</span>
                      <span className="font-mono font-semibold text-[#183D32] tabular-nums">
                        {el.quantity} ud · {formatEuro(el.quantity * el.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-[#183D32] mb-3">
                Superficies y acabados
              </h2>
              {snapshot.surfaces.length === 0 ? (
                <p className="text-xs text-[#303632]/70">Sin superficies delimitadas.</p>
              ) : (
                <ul className="divide-y divide-[#303632]/10 text-xs">
                  {snapshot.surfaces.map((sf) => (
                    <li key={sf.id} className="py-2 flex justify-between gap-2">
                      <span>{sf.name}</span>
                      <span className="font-mono font-semibold text-[#183D32] tabular-nums">
                        {sf.areaM2} m² · {formatEuro(sf.areaM2 * sf.unitPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
