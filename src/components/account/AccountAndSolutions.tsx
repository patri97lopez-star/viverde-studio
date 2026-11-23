import React from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { ArrowRight, Building2, Check, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../../lib/firebase';
import { useViverdeStore } from '../../store/useViverdeStore';
import { UserRole } from '../../types/viverde';

export const SolutionsView: React.FC = () => {
  const { setActiveNav } = useViverdeStore();

  const segments = [
    {
      title: 'Viveros y Centros de Jardinería',
      summary:
        'Digitaliza tu catálogo real con tarifas propias y permite que cada cliente diseñe su jardín en 3D con tu stock antes de pasar por caja.',
      bullets: [
        'Catálogo propio editable con fotos, filtros y modelos 3D GLB/GLTF',
        'Conversión directa de diseños en presupuestos PDF y lista de picking',
        'Aislamiento multiempresa: tus tarifas nunca son visibles para otros viveros',
      ],
      cta: 'Abrir Panel Profesional',
      nav: 'panel_pro' as const,
    },
    {
      title: 'Floristerías y Eventos',
      summary:
        'Calcula ramos de novia, centros de mesa y decoración floral con desglose por tallos, envoltorios, jarrones y margen comercial.',
      bullets: [
        'Estudio visual de composiciones florales en tiempo real',
        'Control de costes por tallo y margen comercial configurable',
        'Generación instantánea de presupuestos para bodas y eventos',
      ],
      cta: 'Abrir Estudio Floral',
      nav: 'floristeria' as const,
    },
    {
      title: 'Estudios de Paisajismo',
      summary:
        'Alterna sin fricción entre plano 2D acotado con cálculo de áreas poligonales y visualización tridimensional interactiva Three.js.',
      bullets: [
        'Simulación solar mañana-noche y crecimiento botánico a +3 y +5 años',
        'Balance hídrico estival y medición automática de superficies en m²',
        'Enlaces compartibles de solo lectura para aprobación del cliente',
      ],
      cta: 'Abrir Diseñador 3D',
      nav: 'disenador' as const,
    },
  ];

  const capabilityRows = [
    ['Catálogo privado y tarifas editables', 'Sí (por empresa)', 'Sí (por tallo/material)', 'Sí (catálogo completo)'],
    ['Diseñador espacial 2D + 3D Three.js', 'Incluido', 'Estudio floral visual', 'Incluido + .GLB/.GLTF'],
    ['Simulación solar y crecimiento +5 años', 'Incluido', '—', 'Incluido'],
    ['Presupuestos PDF con logotipo propio', 'Incluido', 'Incluido', 'Incluido'],
    ['Orden de picking y carga para almacén', 'Incluido', 'Lista de tallos', 'Incluido'],
    ['Importación/exportación JSON de proyectos', 'Incluido', '—', 'Incluido'],
  ];

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-10 space-y-10">
      <div className="max-w-3xl pb-8 border-b border-[#303632]/10">
        <p className="text-xs font-medium text-[#183D32]/80 mb-2">
          Soluciones profesionales B2B · Arquitectura SaaS comercializable
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#183D32] leading-tight">
          Software especializado para viveros, floristerías y paisajistas
        </h1>
        <p className="text-sm sm:text-base text-[#303632]/80 mt-3 leading-relaxed">
          VIVERDE STUDIO unifica catálogo botánico, diseño espacial 2D/3D sincronizado, estudio floral, cálculo automático de materiales y presupuestos comerciales en una plataforma multiempresa lista para operar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {segments.map((seg) => (
          <div
            key={seg.title}
            className="bg-white border border-[#303632]/10 rounded-xl p-6 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-display text-xl font-semibold text-[#183D32] mb-2">
                {seg.title}
              </h2>
              <p className="text-sm text-[#303632]/80 leading-relaxed mb-5">
                {seg.summary}
              </p>
              <ul className="space-y-2.5 text-xs text-[#303632] mb-6">
                {seg.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#183D32] shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setActiveNav(seg.nav)}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <span>{seg.cta}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Capability Comparison Matrix */}
      <div className="bg-white border border-[#303632]/10 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#303632]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#183D32]">
              Matriz de capacidades por perfil operativo
            </h2>
            <p className="text-xs text-[#303632]/75">
              Todas las herramientas conviven en un mismo entorno con control de acceso por empresa y rol.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('inicio')}
            className="text-xs font-semibold text-[#183D32] hover:underline cursor-pointer"
          >
            Solicitar demo personalizada →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F4F0E7] text-[#183D32]">
              <tr>
                <th className="py-3 px-6 font-semibold">Funcionalidad</th>
                <th className="py-3 px-4 font-semibold">Viveros</th>
                <th className="py-3 px-4 font-semibold">Floristerías</th>
                <th className="py-3 px-4 font-semibold">Paisajistas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303632]/10">
              {capabilityRows.map(([feat, viv, flor, pais]) => (
                <tr key={feat} className="hover:bg-[#F4F0E7]/35">
                  <td className="py-3 px-6 font-medium text-[#303632]">{feat}</td>
                  <td className="py-3 px-4 text-[#183D32] font-medium">{viv}</td>
                  <td className="py-3 px-4 text-[#303632]/80">{flor}</td>
                  <td className="py-3 px-4 text-[#183D32] font-medium">{pais}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const AccountView: React.FC = () => {
  const {
    auth: authState,
    companies,
    activeCompanyId,
    activeRole,
    switchCompany,
    setActiveRole,
    setActiveNav,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Sesión de Google conectada con Firebase.', 'success');
    } catch (err) {
      showToast(
        `No se pudo completar el inicio de sesión: ${err instanceof Error ? err.message : 'Error'}`,
        'error',
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada correctamente.', 'info');
    } catch (err) {
      showToast(
        `Error al cerrar sesión: ${err instanceof Error ? err.message : 'Error'}`,
        'error',
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-6">
      <div className="pb-4 border-b border-[#303632]/10">
        <p className="text-xs font-medium text-[#183D32]/80 mb-1">
          Mi cuenta y espacio multiempresa
        </p>
        <h1 className="font-display text-3xl font-semibold text-[#183D32]">
          Acceso, roles y sincronización en la nube
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Auth Card */}
        <div className="bg-white border border-[#303632]/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#183D32]">
            <ShieldCheck className="w-5 h-5" />
            <h2 className="font-display text-lg font-semibold">Autenticación Firebase</h2>
          </div>

          {authState.isAuthenticated ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#DDE8D8]/45 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-[#183D32]">{authState.displayName}</p>
                <p className="text-[#303632]/80">{authState.email}</p>
                <p className="text-[#183D32] font-medium">
                  {authState.cloudSynced
                    ? 'Sincronización activa con Cloud Firestore'
                    : 'Conectado a Firebase Auth'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F4F0E7] hover:bg-red-50 text-[#303632] hover:text-red-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[#303632]/80 leading-relaxed">
                Actualmente estás operando en modo de demostración con persistencia local automática. Conecta tu cuenta de Google para sincronizar empresas, proyectos y presupuestos en Firestore.
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Conectar con Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Multi-Tenant Workspace & Role Card */}
        <div className="bg-white border border-[#303632]/10 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#183D32]">
            <Building2 className="w-5 h-5" />
            <h2 className="font-display text-lg font-semibold">Empresa activa y rol</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Entorno de empresa aislado</label>
              <select
                value={activeCompanyId}
                onChange={(e) => switchCompany(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-medium text-[#183D32]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Rol de usuario en {company.name}</label>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-medium"
              >
                <option value="super_admin">Administrador general</option>
                <option value="company_admin">Administrador del negocio</option>
                <option value="employee">Empleado</option>
                <option value="client">Cliente</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setActiveNav('panel_pro')}
              className="w-full py-2.5 bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32] font-semibold rounded-lg cursor-pointer"
            >
              Gestionar empresa en Panel Profesional
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
