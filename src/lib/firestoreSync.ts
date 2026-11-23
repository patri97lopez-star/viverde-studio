import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  Client,
  Company,
  CompanyMember,
  FloralDesign,
  Product,
  Project,
  Quote,
  SharedProjectSnapshot,
} from '../types/viverde';
import { useViverdeStore } from '../store/useViverdeStore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function truncateDataUrl(dataUrl?: string): string | undefined {
  if (!dataUrl) return undefined;
  if (dataUrl.length > 340000) return undefined;
  return dataUrl;
}

export function mapCompanyToFirestore(company: Company, ownerUid: string, isCreate: boolean) {
  return stripUndefined({
    id: company.id,
    name: company.name.slice(0, 120),
    logoUrl: (company.logoUrl || '').slice(0, 2000),
    address: (company.address || '').slice(0, 250),
    phone: (company.phone || '').slice(0, 40),
    email: (company.email || '').slice(0, 120),
    ownerUid,
    memberUids: company.memberUids.length > 0 ? company.memberUids : [ownerUid],
    vatRate: Number(company.settings.vatRate ?? 21),
    defaultMarginPercent: Number(company.settings.defaultMarginPercent ?? 35),
    transportFlatFee: Number(company.settings.transportFlatFee ?? 60),
    laborRatePerHour: Number(company.settings.laborRatePerHour ?? 35),
    commercialTerms: (company.settings.commercialTerms || '').slice(0, 2000),
    ...(isCreate ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export function mapProductToFirestore(
  product: Product,
  companyId: string,
  ownerUid: string,
  memberUids: string[],
) {
  return stripUndefined({
    id: product.id,
    companyId,
    ownerUid,
    memberUids,
    category: product.category,
    subcategory: product.subcategory,
    commercialName: product.commercialName.slice(0, 140),
    botanicalName: product.botanicalName ? product.botanicalName.slice(0, 140) : undefined,
    description: product.description.slice(0, 1500),
    price: Number(product.price),
    unit: product.unit,
    dimensions: product.dimensions,
    sunExposure: product.sunExposure,
    waterNeeds: product.waterNeeds,
    bloomingSeason: product.bloomingSeason,
    climateHardiness: product.climateHardiness,
    availability: product.availability,
    landscapeUses: product.landscapeUses,
    colorHex: product.colorHex,
    indoorOutdoor: product.indoorOutdoor,
    imageUrl: product.imageUrl ? product.imageUrl.slice(0, 2000) : undefined,
    model3dUrl: product.model3dUrl ? product.model3dUrl.slice(0, 2000) : undefined,
    modelPreset: product.modelPreset,
    isDemoData: Boolean(product.isDemoData),
    updatedAt: serverTimestamp(),
  });
}

export function mapProjectToFirestore(
  project: Project,
  companyId: string,
  ownerUid: string,
  memberUids: string[],
  isCreate: boolean,
) {
  return stripUndefined({
    id: project.id,
    companyId,
    ownerUid,
    memberUids,
    clientId: project.clientId,
    clientName: project.clientName,
    name: project.name.slice(0, 140),
    spaceType: project.spaceType,
    terrainShape: project.terrainShape,
    widthM: Number(project.widthM),
    lengthM: Number(project.lengthM),
    areaM2: Number(project.areaM2),
    designStyle: project.designStyle,
    targetBudget: project.targetBudget,
    status: project.status,
    elements: project.elements.slice(0, 300),
    surfaces: project.surfaces.slice(0, 100),
    assumptions: project.assumptions,
    estimatedTotal: Number(project.estimatedTotal),
    previewDataUrl: truncateDataUrl(project.previewDataUrl),
    shareEnabled: Boolean(project.shareEnabled),
    shareToken: project.shareToken,
    ...(isCreate ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export function mapQuoteToFirestore(
  quote: Quote,
  companyId: string,
  ownerUid: string,
  memberUids: string[],
  isCreate: boolean,
) {
  return stripUndefined({
    id: quote.id,
    companyId,
    ownerUid,
    memberUids,
    projectId: quote.projectId,
    projectName: quote.projectName,
    clientId: quote.clientId,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    clientPhone: quote.clientPhone,
    clientAddress: quote.clientAddress,
    quoteNumber: quote.quoteNumber.slice(0, 40),
    items: quote.items.slice(0, 300),
    surfacesSummary: quote.surfacesSummary,
    subtotal: Number(quote.subtotal),
    discountPercent: Number(quote.discountPercent),
    discountAmount: Number(quote.discountAmount),
    transportCost: Number(quote.transportCost),
    laborCost: Number(quote.laborCost),
    installationCost: Number(quote.installationCost),
    vatRate: Number(quote.vatRate),
    vatAmount: Number(quote.vatAmount),
    total: Number(quote.total),
    validUntil: quote.validUntil,
    notes: (quote.notes || '').slice(0, 2000),
    status: quote.status,
    previewDataUrl: truncateDataUrl(quote.previewDataUrl),
    ...(isCreate ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function syncProjectToCloud(project: Project): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = `companies/${project.companyId}/projects/${project.id}`;
  try {
    const ref = doc(db, 'companies', project.companyId, 'projects', project.id);
    const snap = await getDoc(ref);
    const state = useViverdeStore.getState();
    const company = state.companies.find((c) => c.id === project.companyId);
    const memberUids = company?.memberUids.includes(user.uid)
      ? company.memberUids
      : [...(company?.memberUids || []), user.uid];

    if (!snap.exists()) {
      await setDoc(ref, mapProjectToFirestore(project, project.companyId, user.uid, memberUids, true));
    } else {
      const existingData = snap.data();
      await setDoc(
        ref,
        {
          ...mapProjectToFirestore(project, project.companyId, existingData.ownerUid || user.uid, memberUids, false),
          createdAt: existingData.createdAt || serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncQuoteToCloud(quote: Quote, project?: Project): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = `companies/${quote.companyId}/quotes/${quote.id}`;
  try {
    if (project) {
      await syncProjectToCloud(project);
    }
    const ref = doc(db, 'companies', quote.companyId, 'quotes', quote.id);
    const snap = await getDoc(ref);
    const state = useViverdeStore.getState();
    const company = state.companies.find((c) => c.id === quote.companyId);
    const memberUids = company?.memberUids.includes(user.uid)
      ? company.memberUids
      : [...(company?.memberUids || []), user.uid];

    if (!snap.exists()) {
      await setDoc(ref, mapQuoteToFirestore(quote, quote.companyId, user.uid, memberUids, true));
    } else {
      const existingData = snap.data();
      await setDoc(
        ref,
        {
          ...mapQuoteToFirestore(quote, quote.companyId, existingData.ownerUid || user.uid, memberUids, false),
          createdAt: existingData.createdAt || serverTimestamp(),
        },
        { merge: true },
      );
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function syncProductToCloud(product: Product): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const path = `companies/${product.companyId}/products/${product.id}`;
  try {
    const ref = doc(db, 'companies', product.companyId, 'products', product.id);
    const state = useViverdeStore.getState();
    const company = state.companies.find((c) => c.id === product.companyId);
    const memberUids = company?.memberUids.includes(user.uid)
      ? company.memberUids
      : [...(company?.memberUids || []), user.uid];
    const snap = await getDoc(ref);
    const ownerUid = snap.exists() ? snap.data().ownerUid || user.uid : user.uid;
    await setDoc(ref, mapProductToFirestore(product, product.companyId, ownerUid, memberUids), {
      merge: true,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function publishSharedProjectToCloud(
  project: Project,
  companyName: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !project.shareToken) return;
  const path = `sharedProjects/${project.shareToken}`;
  try {
    const ref = doc(db, 'sharedProjects', project.shareToken);
    const snap = await getDoc(ref);
    const payload = stripUndefined({
      shareToken: project.shareToken,
      projectName: project.name.slice(0, 140),
      companyName: companyName.slice(0, 120),
      spaceType: project.spaceType,
      widthM: Number(project.widthM),
      lengthM: Number(project.lengthM),
      areaM2: Number(project.areaM2),
      elements: project.elements.slice(0, 300),
      surfaces: project.surfaces.slice(0, 100),
      estimatedTotal: Number(project.estimatedTotal),
      previewDataUrl: truncateDataUrl(project.previewDataUrl),
      ownerUid: snap.exists() ? snap.data().ownerUid || user.uid : user.uid,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
    });
    await setDoc(ref, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function unpublishSharedProjectFromCloud(shareToken: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !shareToken) return;
  const path = `sharedProjects/${shareToken}`;
  try {
    await deleteDoc(doc(db, 'sharedProjects', shareToken));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchSharedProject(shareToken: string): Promise<SharedProjectSnapshot | null> {
  const path = `sharedProjects/${shareToken}`;
  try {
    const snap = await getDoc(doc(db, 'sharedProjects', shareToken));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      shareToken: d.shareToken,
      projectName: d.projectName,
      companyName: d.companyName,
      spaceType: d.spaceType || 'Jardín particular',
      widthM: d.widthM,
      lengthM: d.lengthM,
      areaM2: d.areaM2,
      elements: d.elements || [],
      surfaces: d.surfaces || [],
      estimatedTotal: d.estimatedTotal || 0,
      previewDataUrl: d.previewDataUrl,
      createdAt: toIsoString(d.createdAt),
    };
  } catch (err) {
    console.warn(`No se pudo consultar ${path} en Firestore:`, err);
    return null;
  }
}

async function ensureUserWorkspaceInFirestore(user: User): Promise<void> {
  if (!user.emailVerified) return;
  const state = useViverdeStore.getState();
  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const activeCompany =
      state.companies.find((c) => c.id === state.activeCompanyId) || state.companies[0];

    await setDoc(
      userRef,
      stripUndefined({
        uid: user.uid,
        name: (user.displayName || user.email || 'Usuario').slice(0, 120),
        email: user.email ? user.email.slice(0, 120) : undefined,
        activeCompanyId: activeCompany?.id,
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );

    if (activeCompany) {
      const companyRef = doc(db, 'companies', activeCompany.id);
      const compSnap = await getDoc(companyRef);
      if (!compSnap.exists()) {
        const companyWithOwner: Company = {
          ...activeCompany,
          ownerUid: user.uid,
          memberUids: [user.uid],
        };
        await setDoc(companyRef, mapCompanyToFirestore(companyWithOwner, user.uid, true));

        const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);
        await setDoc(
          memberRef,
          stripUndefined({
            uid: user.uid,
            companyId: activeCompany.id,
            ownerUid: user.uid,
            name: (user.displayName || 'Administrador').slice(0, 120),
            email: user.email ? user.email.slice(0, 120) : undefined,
            role: 'company_admin',
            createdAt: serverTimestamp(),
          }),
        );

        // Seed initial products & projects for this tenant on first cloud creation
        const companyProducts = state.products.filter((p) => p.companyId === activeCompany.id);
        for (const prod of companyProducts.slice(0, 12)) {
          await setDoc(
            doc(db, 'companies', activeCompany.id, 'products', prod.id),
            mapProductToFirestore(prod, activeCompany.id, user.uid, [user.uid]),
          );
        }
      } else if (!userSnap.exists()) {
        // Ensure member record if owner matches
        const compData = compSnap.data();
        if (compData.ownerUid === user.uid) {
          const memberRef = doc(db, 'companies', activeCompany.id, 'members', user.uid);
          const mSnap = await getDoc(memberRef);
          if (!mSnap.exists()) {
            await setDoc(
              memberRef,
              stripUndefined({
                uid: user.uid,
                companyId: activeCompany.id,
                ownerUid: user.uid,
                name: (user.displayName || 'Administrador').slice(0, 120),
                email: user.email ? user.email.slice(0, 120) : undefined,
                role: 'company_admin',
                createdAt: serverTimestamp(),
              }),
            );
          }
        }
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export function initFirestoreAuthAndSync(): () => void {
  let unsubProjects: (() => void) | null = null;
  let unsubQuotes: (() => void) | null = null;

  const cleanupListeners = () => {
    if (unsubProjects) {
      unsubProjects();
      unsubProjects = null;
    }
    if (unsubQuotes) {
      unsubQuotes();
      unsubQuotes = null;
    }
  };

  const unsubAuth = onAuthStateChanged(auth, async (user) => {
    cleanupListeners();
    const store = useViverdeStore.getState();

    if (!user) {
      store.setAuthSession({
        uid: null,
        displayName: 'Sesión de demostración',
        email: null,
        photoURL: null,
        isAuthenticated: false,
        cloudSynced: false,
      });
      return;
    }

    store.setAuthSession({
      uid: user.uid,
      displayName: user.displayName || user.email || 'Usuario VIVERDE',
      email: user.email,
      photoURL: user.photoURL,
      isAuthenticated: true,
      cloudSynced: false,
    });

    try {
      await ensureUserWorkspaceInFirestore(user);
      const companyId = useViverdeStore.getState().activeCompanyId;

      const projQ = query(
        collection(db, 'companies', companyId, 'projects'),
        where('memberUids', 'array-contains', user.uid),
      );
      unsubProjects = onSnapshot(
        projQ,
        (snap) => {
          if (!snap.empty) {
            const cloudProjects: Project[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                ...(data as unknown as Project),
                id: d.id,
                createdAt: toIsoString(data.createdAt),
                updatedAt: toIsoString(data.updatedAt),
              };
            });
            const curr = useViverdeStore.getState().projects;
            const otherTenants = curr.filter((p) => p.companyId !== companyId);
            const mergedIds = new Set(cloudProjects.map((p) => p.id));
            const localOnly = curr.filter((p) => p.companyId === companyId && !mergedIds.has(p.id));
            useViverdeStore.getState().hydrateFromCloud({
              projects: [...cloudProjects, ...localOnly, ...otherTenants],
            });
          }
          useViverdeStore.getState().setAuthSession({ cloudSynced: true });
        },
        (error) => {
          console.warn('Firestore projects snapshot notice:', error.message);
        },
      );

      const quoteQ = query(
        collection(db, 'companies', companyId, 'quotes'),
        where('memberUids', 'array-contains', user.uid),
      );
      unsubQuotes = onSnapshot(
        quoteQ,
        (snap) => {
          if (!snap.empty) {
            const cloudQuotes: Quote[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                ...(data as unknown as Quote),
                id: d.id,
                createdAt: toIsoString(data.createdAt),
                updatedAt: toIsoString(data.updatedAt),
              };
            });
            const curr = useViverdeStore.getState().quotes;
            const otherTenants = curr.filter((q) => q.companyId !== companyId);
            const mergedIds = new Set(cloudQuotes.map((q) => q.id));
            const localOnly = curr.filter((q) => q.companyId === companyId && !mergedIds.has(q.id));
            useViverdeStore.getState().hydrateFromCloud({
              quotes: [...cloudQuotes, ...localOnly, ...otherTenants],
            });
          }
        },
        (error) => {
          console.warn('Firestore quotes snapshot notice:', error.message);
        },
      );
    } catch (err) {
      console.warn('Error inicializando sincronización Firestore:', err);
    }
  });

  return () => {
    cleanupListeners();
    unsubAuth();
  };
}

// Re-export unused types to keep module contract complete for future sync expansions
export type { Client, CompanyMember, FloralDesign };
