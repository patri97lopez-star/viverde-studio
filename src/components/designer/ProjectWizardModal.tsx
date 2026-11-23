import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useViverdeStore } from '../../store/useViverdeStore';
import { DesignStyle, SpaceType, TerrainShape } from '../../types/viverde';

const SPACE_TYPES: SpaceType[] = [
  'Jardín particular',
  'Terraza',
  'Patio',
  'Jardín comunitario',
  'Zona verde pública',
  'Espacio comercial',
  'Proyecto de paisajismo',
];

const DESIGN_STYLES: DesignStyle[] = [
  'Mediterráneo',
  'Moderno',
  'Tropical',
  'Minimalista',
  'Rústico',
  'Bajo mantenimiento',
];

export const ProjectWizardModal: React.FC = () => {
  const {
    showProjectWizard,
    setShowProjectWizard,
    startNewProjectFromWizard,
    clients,
    activeCompanyId,
  } = useViverdeStore();

  const companyClients = clients.filter((c) => c.companyId === activeCompanyId);

  const [name, setName] = useState('Jardín Mediterráneo 100 m²');
  const [spaceType, setSpaceType] = useState<SpaceType>('Jardín particular');
  const [widthM, setWidthM] = useState<number>(10);
  const [lengthM, setLengthM] = useState<number>(10);
  const [terrainShape, setTerrainShape] = useState<TerrainShape>('rectangular');
  const [designStyle, setDesignStyle] = useState<DesignStyle>('Mediterráneo');
  const [targetBudget, setTargetBudget] = useState<number>(3000);
  const [clientId, setClientId] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!showProjectWizard) return null;

  const areaM2 = Number((widthM * lengthM).toFixed(2));

  const handleAreaChange = (newArea: number) => {
    if (newArea <= 0) return;
    const ratio = widthM / Math.max(1, lengthM);
    const nextW = Number(Math.sqrt(newArea * ratio).toFixed(1));
    const nextL = Number((newArea / Math.max(0.5, nextW)).toFixed(1));
    setWidthM(nextW);
    setLengthM(nextL);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Introduce un nombre para el proyecto.');
      return;
    }
    if (widthM < 2 || lengthM < 2 || widthM > 200 || lengthM > 200) {
      setError('Las dimensiones deben estar entre 2 m y 200 m.');
      return;
    }
    const client = companyClients.find((c) => c.id === clientId);
    startNewProjectFromWizard({
      name: name.trim(),
      spaceType,
      widthM,
      lengthM,
      areaM2,
      terrainShape,
      designStyle,
      targetBudget: targetBudget > 0 ? targetBudget : undefined,
      clientId: client?.id,
      clientName: client?.name,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Asistente de creación de proyecto"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-[#303632]/15 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-5 bg-[#183D32] text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-[#DDE8D8]">Asistente de nuevo espacio</p>
            <h2 className="font-display text-2xl font-semibold">
              Configurar terreno y proyecto
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowProjectWizard(false)}
            aria-label="Cerrar asistente"
            className="p-2 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Nombre del proyecto
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                required
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm focus:outline-none focus:border-[#183D32]"
                placeholder="Ej. Jardín Residencial Mirador"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Tipo de espacio
              </label>
              <select
                value={spaceType}
                onChange={(e) => setSpaceType(e.target.value as SpaceType)}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm"
              >
                {SPACE_TYPES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Estilo de diseño deseado
              </label>
              <select
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value as DesignStyle)}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm"
              >
                {DESIGN_STYLES.map((ds) => (
                  <option key={ds} value={ds}>
                    {ds}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Ancho aproximado (m)
              </label>
              <input
                type="number"
                min={2}
                max={200}
                step={0.5}
                value={widthM}
                onChange={(e) => setWidthM(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Largo aproximado (m)
              </label>
              <input
                type="number"
                min={2}
                max={200}
                step={0.5}
                value={lengthM}
                onChange={(e) => setLengthM(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Superficie total (m²)
              </label>
              <input
                type="number"
                min={4}
                max={40000}
                step={1}
                value={areaM2}
                onChange={(e) => handleAreaChange(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#DDE8D8]/40 border border-[#183D32]/25 rounded-lg text-sm font-mono font-semibold text-[#183D32] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Forma del terreno
              </label>
              <select
                value={terrainShape}
                onChange={(e) => setTerrainShape(e.target.value as TerrainShape)}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm"
              >
                <option value="rectangular">Rectangular</option>
                <option value="l_shape">En L</option>
                <option value="irregular">Irregular / Poligonal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Presupuesto orientativo (€)
              </label>
              <input
                type="number"
                min={0}
                step={100}
                value={targetBudget}
                onChange={(e) => setTargetBudget(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#303632] mb-1">
                Cliente asociado (opcional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F4F0E7]/50 border border-[#303632]/15 rounded-lg text-sm"
              >
                <option value="">Sin cliente asignado</option>
                {companyClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-[#303632]/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowProjectWizard(false)}
              className="px-4 py-2.5 text-sm font-medium text-[#303632] hover:bg-[#F4F0E7] rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Crear terreno y abrir editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
