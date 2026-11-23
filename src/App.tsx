import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Flower2,
  Info,
  Leaf,
  Menu,
  User,
  X,
  AlertCircle,
} from 'lucide-react';
import { AccountView, SolutionsView } from './components/account/AccountAndSolutions';
import { CatalogView } from './components/catalog/CatalogView';
import { GardenDesigner } from './components/designer/GardenDesigner';
import { FloralStudio } from './components/floral/FloralStudio';
import { HomeView } from './components/home/HomeView';
import { ProPanelView } from './components/pro/ProPanelView';
import { ProjectsView } from './components/projects/ProjectsView';
import { SharedProjectView } from './components/projects/SharedProjectView';
import { QuotesView } from './components/quotes/QuotesView';
import { initFirestoreAuthAndSync } from './lib/firestoreSync';
import { useViverdeStore } from './store/useViverdeStore';
import { NavSection } from './types/viverde';

const PRIMARY_NAV: { id: NavSection; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'disenador', label: 'Diseñador 3D' },
  { id: 'floristeria', label: 'Floristería' },
  { id: 'proyectos', label: 'Mis proyectos' },
  { id: 'presupuestos', label: 'Presupuestos' },
  { id: 'soluciones', label: 'Soluciones profesionales' },
];

export default function App() {
  const {
    activeNav,
    setActiveNav,
    activeCompanyId,
    companies,
    toast,
    clearToast,
    auth: authState,
  } = useViverdeStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });

  const activeCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  useEffect(() => {
    const unsub = initFirestoreAuthAndSync();
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(), 4200);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  const handleNavigate = (nav: NavSection) => {
    setActiveNav(nav);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (shareToken) {
    return (
      <SharedProjectView
        shareToken={shareToken}
        onExitShare={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('share');
          window.history.replaceState({}, '', url.pathname);
          setShareToken(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F0E7] text-[#303632]">
      {/* Sticky Single-Row 3-Zone Header */}
      <header className="sticky top-0 z-40 h-16 bg-white/95 border-b border-[#303632]/10">
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('inicio')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 rounded-lg bg-[#183D32] text-white flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-base sm:text-lg font-semibold text-[#183D32] tracking-tight">
                VIVERDE STUDIO
              </span>
              <span className="text-[10px] text-[#303632]/65 hidden sm:block">
                {activeCompany.name}
              </span>
            </span>
          </button>

          {/* Center: Single-Line Navigation */}
          <nav
            aria-label="Navegación principal"
            className="hidden xl:flex items-center gap-4 2xl:gap-5"
          >
            {PRIMARY_NAV.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`py-1.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
                    active
                      ? 'text-[#183D32] font-semibold border-[#183D32]'
                      : 'text-[#303632]/80 border-transparent hover:text-[#183D32]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Pro Panel & Account + Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('panel_pro')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeNav === 'panel_pro'
                  ? 'bg-[#183D32] text-white'
                  : 'bg-[#DDE8D8] hover:bg-[#c8dac1] text-[#183D32]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Panel Pro</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('cuenta')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                activeNav === 'cuenta'
                  ? 'bg-[#183D32] text-white border-[#183D32]'
                  : 'bg-white text-[#303632] border-[#303632]/15 hover:bg-[#F4F0E7]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{authState.isAuthenticated ? authState.displayName.split(' ')[0] : 'Mi cuenta'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="xl:hidden p-2 rounded-lg bg-[#F4F0E7] text-[#183D32] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white border-b border-[#303632]/15 px-4 py-4 space-y-1.5 shadow-md">
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  activeNav === item.id
                    ? 'bg-[#183D32] text-white font-semibold'
                    : 'text-[#303632] hover:bg-[#F4F0E7]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-[#303632]/10 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('panel_pro')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Panel Pro</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('cuenta')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#F4F0E7] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>Mi cuenta</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Toast Feedback Banner */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg border flex items-center gap-2.5 text-xs font-medium ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200'
              : toast.type === 'info'
                ? 'bg-white text-[#183D32] border-[#183D32]/20'
                : 'bg-[#183D32] text-white border-[#183D32]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            aria-label="Cerrar aviso"
            className="opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Active Workspace */}
      <div className="flex-1">
        {activeNav === 'inicio' && <HomeView />}
        {activeNav === 'catalogo' && <CatalogView />}
        {activeNav === 'disenador' && <GardenDesigner />}
        {activeNav === 'floristeria' && <FloralStudio />}
        {activeNav === 'proyectos' && <ProjectsView />}
        {activeNav === 'presupuestos' && <QuotesView />}
        {activeNav === 'soluciones' && <SolutionsView />}
        {activeNav === 'panel_pro' && <ProPanelView />}
        {activeNav === 'cuenta' && <AccountView />}
      </div>

      {/* Quiet Editorial Footer (hidden in full-bleed 3D Designer) */}
      {activeNav !== 'disenador' && (
        <footer className="bg-white border-t border-[#303632]/10 py-10 mt-12">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[#183D32]">
                <Leaf className="w-4 h-4" />
                <span className="font-display text-base font-semibold">VIVERDE STUDIO</span>
              </div>
              <p className="text-xs text-[#303632]/70 mt-1">
                Tu espacio verde empieza aquí. Plataforma de diseño 2D/3D y presupuestos para viveros, floristerías y paisajismo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-[#303632]/80">
              <button type="button" onClick={() => handleNavigate('catalogo')} className="hover:text-[#183D32] cursor-pointer">
                Catálogo
              </button>
              <button type="button" onClick={() => handleNavigate('disenador')} className="hover:text-[#183D32] cursor-pointer">
                Diseñador 3D
              </button>
              <button type="button" onClick={() => handleNavigate('floristeria')} className="inline-flex items-center gap-1 hover:text-[#183D32] cursor-pointer">
                <Flower2 className="w-3.5 h-3.5" /> Floristería
              </button>
              <button type="button" onClick={() => handleNavigate('presupuestos')} className="hover:text-[#183D32] cursor-pointer">
                Presupuestos
              </button>
              <button type="button" onClick={() => handleNavigate('soluciones')} className="hover:text-[#183D32] cursor-pointer">
                Soluciones profesionales
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
