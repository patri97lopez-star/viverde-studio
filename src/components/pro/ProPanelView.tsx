import React, { useState } from 'react';
import {
  Building2,
  Edit3,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { IMAGES } from '../../data/demoCatalog';
import { useViverdeStore } from '../../store/useViverdeStore';
import {
  AvailabilityStatus,
  ModelPreset,
  Product,
  ProductCategory,
  ProjectStatus,
  UnitOfMeasure,
  UserRole,
} from '../../types/viverde';
import { formatEuro } from '../../utils/calculations';

type AdminTab = 'catalogo' | 'clientes' | 'proyectos' | 'empresa';

export const ProPanelView: React.FC = () => {
  const {
    companies,
    activeCompanyId,
    activeRole,
    products,
    clients,
    projects,
    quotes,
    members,
    switchCompany,
    createCompanyTenant,
    updateActiveCompany,
    addProduct,
    updateProduct,
    deleteProduct,
    addClient,
    updateProjectStatus,
    openProjectInDesigner,
    addCompanyMember,
    updateMemberRole,
    showToast,
  } = useViverdeStore();

  const company = companies.find((c) => c.id === activeCompanyId) || companies[0];
  const companyProducts = products.filter((p) => p.companyId === activeCompanyId);
  const companyClients = clients.filter((c) => c.companyId === activeCompanyId);
  const companyProjects = projects.filter((p) => p.companyId === activeCompanyId);
  const companyQuotes = quotes.filter((q) => q.companyId === activeCompanyId);
  const companyMembers = members.filter((m) => m.companyId === activeCompanyId);

  const [tab, setTab] = useState<AdminTab>('catalogo');

  // Product Form State
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBotanical, setProdBotanical] = useState('');
  const [prodCat, setProdCat] = useState<ProductCategory>('arboles');
  const [prodSubcat, setProdSubcat] = useState('Olivo');
  const [prodPrice, setProdPrice] = useState<number>(45);
  const [prodUnit, setProdUnit] = useState<UnitOfMeasure>('unidad');
  const [prodAvail, setProdAvail] = useState<AvailabilityStatus>('disponible');
  const [prodPreset, setProdPreset] = useState<ModelPreset>('olive_tree');
  const [prodImageUrl, setProdImageUrl] = useState(IMAGES.olivo);
  const [prodModel3dUrl, setProdModel3dUrl] = useState('');

  // Client Form State
  const [cliName, setCliName] = useState('');
  const [cliPhone, setCliPhone] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliAddr, setCliAddr] = useState('');

  // New Company Tenant State
  const [newCompName, setNewCompName] = useState('');
  const [newCompEmail, setNewCompEmail] = useState('');
  const [newCompPhone, setNewCompPhone] = useState('');
  const [newCompAddr, setNewCompAddr] = useState('');

  // Member State
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memRole, setMemRole] = useState<UserRole>('employee');

  const handleLoadProductForEdit = (p: Product) => {
    setEditingProdId(p.id);
    setProdName(p.commercialName);
    setProdBotanical(p.botanicalName || '');
    setProdCat(p.category);
    setProdSubcat(p.subcategory);
    setProdPrice(p.price);
    setProdUnit(p.unit);
    setProdAvail(p.availability);
    setProdPreset(p.modelPreset);
    setProdImageUrl(p.imageUrl);
    setProdModel3dUrl(p.model3dUrl || '');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('Introduce el nombre comercial del producto.', 'error');
      return;
    }
    if (editingProdId) {
      updateProduct(editingProdId, {
        commercialName: prodName.trim(),
        botanicalName: prodBotanical.trim() || undefined,
        category: prodCat,
        subcategory: prodSubcat.trim() || 'General',
        price: Math.max(0, prodPrice),
        unit: prodUnit,
        availability: prodAvail,
        modelPreset: prodPreset,
        imageUrl: prodImageUrl,
        model3dUrl: prodModel3dUrl || undefined,
        isDemoData: false,
      });
      setEditingProdId(null);
    } else {
      addProduct({
        category: prodCat,
        subcategory: prodSubcat.trim() || 'General',
        commercialName: prodName.trim(),
        botanicalName: prodBotanical.trim() || undefined,
        description: 'Producto incorporado desde el Panel Profesional del vivero.',
        price: Math.max(0, prodPrice),
        unit: prodUnit,
        sizeFormat: prodUnit === 'm2' ? 'Suministro por m²' : 'Unidad estándar',
        dimensions: { heightCm: 90, widthCm: 60 },
        sunExposure: 'sol_directo',
        waterNeeds: 'medio',
        bloomingSeason: 'Según temporada',
        availability: prodAvail,
        landscapeUses: ['Paisajismo residencial'],
        colorName: 'Verde',
        colorHex: '#4E7D44',
        indoorOutdoor: 'exterior',
        imageUrl: prodImageUrl,
        model3dUrl: prodModel3dUrl || undefined,
        modelPreset: prodPreset,
        isDemoData: false,
      });
    }
    setProdName('');
    setProdBotanical('');
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (target === 'product') setProdImageUrl(dataUrl);
      else updateActiveCompany({ logoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadGlbForProduct = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProdModel3dUrl(URL.createObjectURL(file));
    showToast(`Modelo 3D "${file.name}" cargado en la ficha.`, 'success');
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliName.trim()) {
      showToast('El nombre del cliente es obligatorio.', 'error');
      return;
    }
    addClient({
      name: cliName.trim(),
      phone: cliPhone.trim(),
      email: cliEmail.trim(),
      address: cliAddr.trim(),
    });
    setCliName('');
    setCliPhone('');
    setCliEmail('');
    setCliAddr('');
  };

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;
    createCompanyTenant({
      name: newCompName,
      email: newCompEmail || 'contacto@empresa.demo',
      phone: newCompPhone || '+34 600 000 000',
      address: newCompAddr || 'España',
    });
    setNewCompName('');
    setNewCompEmail('');
    setNewCompPhone('');
    setNewCompAddr('');
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 sm:px-8 py-8">
      {/* Header + Multi-Tenant Isolation Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#303632]/10">
        <div>
          <p className="text-xs font-medium text-[#183D32]/80 mb-1">
            Panel de administración B2B · Rol activo: {activeRole}
          </p>
          <h1 className="font-display text-3xl font-semibold text-[#183D32]">
            {company.name}
          </h1>
          <p className="text-xs text-[#303632]/75 mt-1">
            Aislamiento multiempresa activo: los datos, tarifas, clientes y presupuestos de cada empresa nunca son visibles para otra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white border border-[#303632]/15 rounded-xl p-2">
          <Building2 className="w-4 h-4 text-[#183D32] ml-2" />
          <span className="text-xs font-medium text-[#303632]/75">Empresa activa:</span>
          <select
            value={activeCompanyId}
            onChange={(e) => switchCompany(e.target.value)}
            aria-label="Cambiar empresa activa"
            className="px-3 py-1.5 bg-[#F4F0E7] rounded-lg text-xs font-semibold text-[#183D32]"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-4">
        {(
          [
            ['catalogo', `Catálogo (${companyProducts.length})`],
            ['clientes', `Clientes (${companyClients.length})`],
            ['proyectos', `Proyectos (${companyProjects.length})`],
            ['empresa', 'Configuración y Multiempresa'],
          ] as [AdminTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
              tab === id
                ? 'bg-[#183D32] text-white'
                : 'bg-white text-[#303632] border border-[#303632]/10 hover:border-[#183D32]/30'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: CATÁLOGO */}
      {tab === 'catalogo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-4 bg-white border border-[#303632]/10 rounded-xl p-5 space-y-3 h-fit"
          >
            <h2 className="font-display text-lg font-semibold text-[#183D32]">
              {editingProdId ? 'Editar producto' : 'Añadir nuevo producto'}
            </h2>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre comercial</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="Ej. Olivo Centenario"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre botánico (opcional)</label>
              <input
                type="text"
                value={prodBotanical}
                onChange={(e) => setProdBotanical(e.target.value)}
                placeholder="Ej. Olea europaea"
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Categoría</label>
                <select
                  value={prodCat}
                  onChange={(e) => setProdCat(e.target.value as ProductCategory)}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
                >
                  <option value="arboles">Árboles</option>
                  <option value="arbustos">Arbustos</option>
                  <option value="plantas">Plantas</option>
                  <option value="flores">Flores</option>
                  <option value="cesped">Césped y cubresuelos</option>
                  <option value="materiales">Materiales</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Subcategoría</label>
                <input
                  type="text"
                  value={prodSubcat}
                  onChange={(e) => setProdSubcat(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Precio (€)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Unidad</label>
                <select
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value as UnitOfMeasure)}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
                >
                  <option value="unidad">unidad</option>
                  <option value="m2">m²</option>
                  <option value="m3">m³</option>
                  <option value="ml">metro lineal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Disponibilidad</label>
                <select
                  value={prodAvail}
                  onChange={(e) => setProdAvail(e.target.value as AvailabilityStatus)}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
                >
                  <option value="disponible">Disponible</option>
                  <option value="bajo_pedido">Bajo pedido</option>
                  <option value="agotado">Agotado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Modelo 3D base</label>
                <select
                  value={prodPreset}
                  onChange={(e) => setProdPreset(e.target.value as ModelPreset)}
                  className="w-full px-2.5 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
                >
                  <optgroup label="Árboles">
                    <option value="olive_tree">Olivo mediterráneo 3D</option>
                    <option value="olive_bonsai_tree">Olivo topiario nube 3D</option>
                    <option value="cypress_tree">Ciprés Toscana 3D</option>
                    <option value="pine_tree">Pino piñonero 3D</option>
                    <option value="maple_tree">Arce japonés 3D</option>
                    <option value="sakura_tree">Cerezo Sakura 3D</option>
                    <option value="willow_tree">Sauce llorón 3D</option>
                    <option value="birch_tree">Abedul multitronco 3D</option>
                    <option value="jacaranda_tree">Jacaranda violeta 3D</option>
                    <option value="citrus_tree">Naranjo / Limonero 3D</option>
                    <option value="magnolia_tree">Magnolio 3D</option>
                    <option value="palm_tree">Palmera Washingtonia 3D</option>
                    <option value="date_palm_tree">Palmera Canaria 3D</option>
                  </optgroup>
                  <optgroup label="Flores">
                    <option value="flower_rose">Rosa / Peonía / Dalia 3D</option>
                    <option value="flower_tulip">Tulipán 3D</option>
                    <option value="flower_daisy">Margarita / Silvestre 3D</option>
                    <option value="flower_sunflower">Girasol campestre 3D</option>
                    <option value="flower_lily">Lirio / Cala minimalista 3D</option>
                    <option value="flower_orchid">Orquídea Phalaenopsis 3D</option>
                    <option value="flower_tropical">Strelitzia / Exótica 3D</option>
                    <option value="flower_hanging">Colgante (Petunia/Begonia) 3D</option>
                    <option value="flower_cluster">Macizo floral clásico 3D</option>
                  </optgroup>
                  <optgroup label="Arbustos y Plantas">
                    <option value="lavender_shrub">Lavanda 3D</option>
                    <option value="hydrangea_shrub">Hortensia 3D</option>
                    <option value="rose_bush">Rosal arbustivo 3D</option>
                    <option value="boxwood_shrub">Boj esférico 3D</option>
                    <option value="aromatic_shrub">Aromática / Seto / Eucalipto 3D</option>
                    <option value="monstera_plant">Monstera 3D</option>
                    <option value="fern_plant">Helecho 3D</option>
                    <option value="succulent_plant">Suculenta 3D</option>
                  </optgroup>
                  <optgroup label="Superficies y Arquitectura">
                    <option value="surface_grass">Superficie Césped</option>
                    <option value="surface_gravel">Superficie Grava</option>
                    <option value="surface_bark">Superficie Corteza</option>
                    <option value="surface_path">Camino Pavimento</option>
                    <option value="pergola">Pérgola 3D</option>
                    <option value="pool">Piscina Minimalista 3D</option>
                    <option value="balinese_pool">Piscina Balinesa 3D</option>
                    <option value="terracotta_pot">Maceta Terracota 3D</option>
                    <option value="architectural_planter">Jardinera Arquitectónica 3D</option>
                    <option value="garden_bench">Banco Madera 3D</option>
                    <option value="garden_light">Baliza LED 3D</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F4F0E7] rounded-lg text-xs font-medium text-[#183D32] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadImage(e, 'product')}
                  className="hidden"
                />
              </label>
              <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#F4F0E7] rounded-lg text-xs font-medium text-[#183D32] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Subir .GLB/.GLTF</span>
                <input
                  type="file"
                  accept=".glb,.gltf"
                  onChange={handleUploadGlbForProduct}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-[#183D32] hover:bg-[#122e25] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {editingProdId ? 'Guardar cambios' : 'Añadir al catálogo'}
              </button>
              {editingProdId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProdId(null);
                    setProdName('');
                  }}
                  className="px-3 py-2.5 bg-[#F4F0E7] text-xs rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 bg-white border border-[#303632]/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#183D32] text-white">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">Precio</th>
                    <th className="py-3 px-4">Disponibilidad</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303632]/10">
                  {companyProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F4F0E7]/45">
                      <td className="py-2.5 px-4">
                        <p className="font-semibold text-[#183D32]">{p.commercialName}</p>
                        {p.botanicalName && (
                          <p className="text-[11px] italic text-[#303632]/65">{p.botanicalName}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-[#303632]/80">
                        {p.category} · {p.subcategory}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatEuro(p.price)} / {p.unit}
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={p.availability}
                          onChange={(e) =>
                            updateProduct(p.id, {
                              availability: e.target.value as AvailabilityStatus,
                            })
                          }
                          className="px-2 py-1 bg-[#F4F0E7] rounded text-[11px]"
                        >
                          <option value="disponible">Disponible</option>
                          <option value="bajo_pedido">Bajo pedido</option>
                          <option value="agotado">Agotado</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleLoadProductForEdit(p)}
                          aria-label={`Editar ${p.commercialName}`}
                          className="p-1.5 bg-[#F4F0E7] hover:bg-[#DDE8D8] rounded text-[#183D32] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(p.id)}
                          aria-label={`Eliminar ${p.commercialName}`}
                          className="p-1.5 bg-red-50 hover:bg-red-100 rounded text-red-700 cursor-pointer"
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
        </div>
      )}

      {/* TAB 2: CLIENTES */}
      {tab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddClient}
            className="lg:col-span-4 bg-white border border-[#303632]/10 rounded-xl p-5 space-y-3 h-fit"
          >
            <h2 className="font-display text-lg font-semibold text-[#183D32]">
              Registrar cliente
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1">Nombre o razón social</label>
              <input
                type="text"
                required
                value={cliName}
                onChange={(e) => setCliName(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Teléfono</label>
              <input
                type="text"
                value={cliPhone}
                onChange={(e) => setCliPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Correo electrónico</label>
              <input
                type="email"
                value={cliEmail}
                onChange={(e) => setCliEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Dirección del proyecto</label>
              <input
                type="text"
                value={cliAddr}
                onChange={(e) => setCliAddr(e.target.value)}
                className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Guardar cliente
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-[#303632]/10 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-lg font-semibold text-[#183D32]">
              Cartera comercial ({companyClients.length})
            </h2>
            <div className="divide-y divide-[#303632]/10">
              {companyClients.map((c) => {
                const cProjects = companyProjects.filter((p) => p.clientId === c.id);
                const cQuotes = companyQuotes.filter((q) => q.clientId === c.id);
                return (
                  <div key={c.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#183D32]">{c.name}</p>
                      <p className="text-xs text-[#303632]/75">
                        {c.email} · {c.phone} · {c.address}
                      </p>
                    </div>
                    <div className="text-xs font-mono text-[#183D32] tabular-nums">
                      {cProjects.length} proyectos · {cQuotes.length} presupuestos
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROYECTOS */}
      {tab === 'proyectos' && (
        <div className="bg-white border border-[#303632]/10 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#183D32] text-white">
              <tr>
                <th className="py-3 px-4">Proyecto</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Superficie</th>
                <th className="py-3 px-4 text-right">Estimación</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303632]/10">
              {companyProjects.map((p) => (
                <tr key={p.id} className="hover:bg-[#F4F0E7]/45">
                  <td className="py-3 px-4 font-semibold text-[#183D32]">{p.name}</td>
                  <td className="py-3 px-4">{p.clientName || 'Particular'}</td>
                  <td className="py-3 px-4 font-mono tabular-nums">{p.areaM2} m²</td>
                  <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                    {formatEuro(p.estimatedTotal)}
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={p.status}
                      onChange={(e) => updateProjectStatus(p.id, e.target.value as ProjectStatus)}
                      className="px-2 py-1 bg-[#F4F0E7] rounded"
                    >
                      <option value="borrador">Borrador</option>
                      <option value="propuesta">Propuesta</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="en_ejecucion">En ejecución</option>
                      <option value="completado">Completado</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openProjectInDesigner(p.id)}
                      className="px-3 py-1.5 bg-[#DDE8D8] text-[#183D32] font-semibold rounded cursor-pointer"
                    >
                      Revisar diseño
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: CONFIGURACIÓN Y MULTIEMPRESA */}
      {tab === 'empresa' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-[#303632]/10 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-[#183D32]">
              Datos y tarifas de {company.name}
            </h2>

            <div className="flex items-center gap-4">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-16 h-16 object-contain border border-[#303632]/15 rounded-lg p-1"
                />
              ) : (
                <div className="w-16 h-16 bg-[#183D32] text-white font-display font-semibold text-xl rounded-lg flex items-center justify-center">
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#F4F0E7] hover:bg-[#DDE8D8] text-[#183D32] text-xs font-semibold rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Subir logotipo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadImage(e, 'logo')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Nombre comercial</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => updateActiveCompany({ name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={(e) => updateActiveCompany({ phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={company.email}
                  onChange={(e) => updateActiveCompany({ email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Dirección</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => updateActiveCompany({ address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">IVA por defecto (%)</label>
                <input
                  type="number"
                  value={company.settings.vatRate}
                  onChange={(e) =>
                    updateActiveCompany({ settingsPatch: { vatRate: Number(e.target.value) } })
                  }
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Margen comercial (%)</label>
                <input
                  type="number"
                  value={company.settings.defaultMarginPercent}
                  onChange={(e) =>
                    updateActiveCompany({
                      settingsPatch: { defaultMarginPercent: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Tarifa base transporte (€)</label>
                <input
                  type="number"
                  value={company.settings.transportFlatFee}
                  onChange={(e) =>
                    updateActiveCompany({
                      settingsPatch: { transportFlatFee: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mano de obra (€/h)</label>
                <input
                  type="number"
                  value={company.settings.laborRatePerHour}
                  onChange={(e) =>
                    updateActiveCompany({
                      settingsPatch: { laborRatePerHour: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg font-mono tabular-nums"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Condiciones comerciales</label>
                <textarea
                  rows={3}
                  value={company.settings.commercialTerms}
                  onChange={(e) =>
                    updateActiveCompany({ settingsPatch: { commercialTerms: e.target.value } })
                  }
                  className="w-full px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            {/* Team & RBAC */}
            <div className="bg-white border border-[#303632]/10 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#183D32]" />
                <h2 className="font-display text-lg font-semibold text-[#183D32]">
                  Equipo y roles de acceso
                </h2>
              </div>

              <div className="space-y-2">
                {companyMembers.map((m) => (
                  <div
                    key={m.uid}
                    className="flex items-center justify-between gap-2 p-2.5 bg-[#F4F0E7]/50 rounded-lg text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#183D32]">{m.name}</p>
                      <p className="text-[11px] text-[#303632]/70">{m.email}</p>
                    </div>
                    <select
                      value={m.role}
                      onChange={(e) => updateMemberRole(m.uid, e.target.value as UserRole)}
                      className="px-2 py-1 bg-white border border-[#303632]/15 rounded"
                    >
                      <option value="super_admin">Administrador general</option>
                      <option value="company_admin">Administrador del negocio</option>
                      <option value="employee">Empleado</option>
                      <option value="client">Cliente</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#303632]/10 text-xs">
                <input
                  type="text"
                  placeholder="Nombre trabajador"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={memEmail}
                  onChange={(e) => setMemEmail(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!memName.trim()) return;
                    addCompanyMember({
                      uid: `usr-${Date.now()}`,
                      name: memName.trim(),
                      email: memEmail.trim(),
                      role: memRole,
                    });
                    setMemName('');
                    setMemEmail('');
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#183D32] text-white font-semibold rounded cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Create New Isolated Tenant Company */}
            <form
              onSubmit={handleCreateCompany}
              className="bg-white border border-[#303632]/10 rounded-xl p-6 space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-[#183D32]">
                Dar de alta nuevo vivero o floristería
              </h2>
              <p className="text-xs text-[#303632]/75">
                Cada empresa dispone de su propio espacio aislado con catálogo, clientes y presupuestos independientes.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Nombre del vivero o estudio"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Correo comercial"
                  value={newCompEmail}
                  onChange={(e) => setNewCompEmail(e.target.value)}
                  className="px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={newCompPhone}
                  onChange={(e) => setNewCompPhone(e.target.value)}
                  className="px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Dirección"
                  value={newCompAddr}
                  onChange={(e) => setNewCompAddr(e.target.value)}
                  className="px-3 py-2 bg-[#F4F0E7]/60 border border-[#303632]/15 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#183D32] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Crear entorno multiempresa aislado
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
