import React, { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Plus,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  publishSharedProjectToCloud,
  unpublishSharedProjectFromCloud,
} from '../../lib/firestoreSync';
import { useViverdeStore } from '../../store/useViverdeStore';
import { Project, ProjectStatus } from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  borrador: 'Borrador',
  propuesta: 'Propuesta enviada',
  aprobado: 'Aprobado',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
};

export const ProjectsView: React.FC = () => {
  const {
    projects,
    activeCompanyId,
    companies,
    openProjectInDesigner,
    duplicateProject,
    deleteProject,
    updateProjectStatus,
    toggleShareProject,
    generateQuoteFromProject,
    importProjectJson,
    setShowProjectWizard,
    setActiveNav,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyProjects = useMemo(
    () => projects.filter((p) => p.companyId === activeCompanyId),
    [projects, activeCompanyId],
  );

  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [sharedPreviewId, setSharedPreviewId] = useState<string | null>(null);

  const visibleProjects = useMemo(
    () =>
      statusFilter === 'all'
        ? companyProjects
        : companyProjects.filter((p) => p.status === statusFilter),
    [companyProjects, statusFilter],
  );

  const handleDownloadJson = (projectId: string) => {
    const p = companyProjects.find((x) => x.id === projectId);
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Diseño descargado en formato JSON.', 'success');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<Project>;
      if (
        !parsed ||
        typeof parsed.widthM !== 'number' ||
        typeof parsed.lengthM !== 'number' ||
        !Array.isArray(parsed.elements) ||
        !Array.isArray(parsed.surfaces)
      ) {
        showToast('El archivo JSON no corresponde a un proyecto válido de VIVERDE STUDIO.', 'error');
        return;
      }
      importProjectJson(parsed as Project);
    } catch {
      showToast('No se pudo leer el archivo JSON seleccionado.', 'error');
    }
  };

  const handleShare = (projectId: string) => {
    const prevProj = companyProjects.find((p) => p.id === projectId);
    const token = toggleShareProject(projectId);
    if (token && prevProj) {
      const shareUrl = `${window.location.origin}/?share=${token}`;
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
      setSharedPreviewId(projectId);
      void publishSharedProjectToCloud({ ...prevProj, shareToken: token, shareEnabled: true }, company.name).catch(() => {});
    } else if (prevProj?.shareToken) {
      void unpublishSharedProjectFromCloud(prevProj.shareToken).catch(() => {});
    }
  };

  const sharedProj = companyProjects.find((p) => p.id === sharedPreviewId) || null;

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#303632]/10">
        <div>
          <p className="text-xs font-medium text-[#183D32]/80 mb-1">
            Archivo técnico · {company.name}
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#183D32]">
            Mis proyectos de paisajismo
          </h1>
          <p className="text-sm text-[#303632]/75 mt-1">
            Todos los diseños conservan sus posiciones 2D/3D, superficies, cantidades y configuración comercial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#303632]/15 hover:bg-[#DDE8D8]/40 text-[#183D32] text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Importar JSON</span>
            <input type="file" accept=".json,application/json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            type="button"
            onClick={() => {
              setShowProjectWizard(true);
              setActiveNav('disenador');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo proyecto 3D</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      {companyProjects.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-4">
          {(
            [
              ['all', `Todos (${companyProjects.length})`],
              ['borrador', 'Borrador'],
              ['propuesta', 'Propuesta enviada'],
              ['aprobado', 'Aprobado'],
              ['en_ejecucion', 'En ejecución'],
              ['completado', 'Completado'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                statusFilter === id
                  ? 'bg-[#183D32] text-white'
                  : 'bg-white text-[#303632] border border-[#303632]/10 hover:border-[#183D32]/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {visibleProjects.length === 0 ? (
        <div className="mt-4 bg-white border border-[#303632]/10 rounded-xl p-12 text-center">
          <p className="font-display text-xl text-[#183D32] mb-2">
            {companyProjects.length === 0
              ? `No hay proyectos guardados en ${company.name}`
              : 'No hay proyectos con el estado seleccionado'}
          </p>
          <p className="text-sm text-[#303632]/75 mb-6">
            Crea un jardín en el diseñador 2D/3D, carga una plantilla de estilo o importa un archivo JSON para comenzar.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowProjectWizard(true);
              setActiveNav('disenador');
            }}
            className="px-5 py-2.5 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Crear primer proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {visibleProjects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white border border-[#303632]/10 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="aspect-[16/9] bg-[#E9ECE5] relative overflow-hidden border-b border-[#303632]/10">
                  {proj.previewDataUrl ? (
                    <img
                      src={proj.previewDataUrl}
                      alt={`Vista previa de ${proj.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-[#183D32]">
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {proj.widthM} × {proj.lengthM} m ({proj.areaM2} m²)
                      </span>
                      <span className="text-xs text-[#303632]/70 mt-1 tabular-nums">
                        {proj.elements.length} elementos · {proj.surfaces.length} superficies
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-[11px] text-[#303632]/65 mb-1 tabular-nums">
                    {proj.spaceType} · {new Date(proj.createdAt).toLocaleDateString('es-ES')} · {proj.elements.length} elem.
                  </p>
                  <h2 className="font-display text-lg font-semibold text-[#183D32]">
                    {proj.name}
                  </h2>
                  {proj.clientName && (
                    <p className="text-xs text-[#303632]/75 mt-0.5">Cliente: {proj.clientName}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-[#303632]/10 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#303632]/60">Estimación base: </span>
                      <span className="font-mono font-semibold text-[#183D32] tabular-nums">
                        {formatEuro(proj.estimatedTotal)}
                      </span>
                    </div>
                    <select
                      value={proj.status}
                      onChange={(e) => updateProjectStatus(proj.id, e.target.value as ProjectStatus)}
                      aria-label={`Estado de ${proj.name}`}
                      className="px-2 py-1 bg-[#F4F0E7] border border-[#303632]/15 rounded text-[11px] font-medium"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
                        <option key={k} value={k}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openProjectInDesigner(proj.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Abrir / Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateQuoteFromProject(proj.id)}
                  className="inline-flex items-center gap-1 py-2 px-3 bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Presupuestar</span>
                </button>
                <button
                  type="button"
                  onClick={() => duplicateProject(proj.id)}
                  aria-label="Duplicar proyecto"
                  title="Duplicar"
                  className="p-2 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] rounded-lg cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(proj.id)}
                  aria-label="Compartir enlace"
                  title="Compartir enlace"
                  className="p-2 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] rounded-lg cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadJson(proj.id)}
                  aria-label="Descargar diseño"
                  title="Descargar JSON"
                  className="p-2 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteProject(proj.id)}
                  aria-label="Eliminar proyecto"
                  title="Eliminar"
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share Link Modal */}
      {sharedProj && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-[#303632]/15 space-y-4">
            <h3 className="font-display text-xl font-semibold text-[#183D32]">
              Enlace compartible de solo lectura
            </h3>
            <p className="text-xs text-[#303632]/80">
              Este enlace muestra únicamente el diseño y la estimación técnica de <strong>{sharedProj.name}</strong> sin exponer datos privados del cliente.
            </p>
            <div className="p-3 bg-[#F4F0E7] rounded-lg font-mono text-xs break-all text-[#183D32]">
              {`${window.location.origin}/?share=${sharedProj.shareToken}`}
            </div>
            <div className="flex justify-end gap-2">
              <a
                href={`/?share=${sharedProj.shareToken}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Previsualizar</span>
              </a>
              <button
                type="button"
                onClick={() => setSharedPreviewId(null)}
                className="px-4 py-2 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
