import { FloralCompositionType, FloralItem, Product } from '../types/viverde';
import { IMAGES } from './demoCatalog';

export type FloralPresetId = 'ramos' | 'bodas' | 'eventos' | 'navidad';

export interface FloralShowcasePreset {
  id: FloralPresetId;
  categoryLabel: string;
  title: string;
  compositionType: FloralCompositionType;
  summary: string;
  referencePriceRange: string;
  imageUrl: string;
  wrapperIdx: number;
  vaseIdx: number;
  marginPercent: number;
  recipe: {
    matchTerms: string[];
    fallbackName: string;
    fallbackPrice: number;
    colorHex: string;
    stems: number;
  }[];
}

export const FLORAL_SHOWCASE_PRESETS: FloralShowcasePreset[] = [
  {
    id: 'ramos',
    categoryLabel: 'Ramos de autor',
    title: 'Ramo Silvestre & Rosa Inglesa',
    compositionType: 'Ramo de regalo',
    summary: 'Rosas jardín marfil y rosa, ranúnculos coral, delphinium violeta, eucalipto cinerea y cinta de seda.',
    referencePriceRange: '55 € – 85 €',
    imageUrl: IMAGES.floralBouquetAtelier,
    wrapperIdx: 1,
    vaseIdx: 0,
    marginPercent: 45,
    recipe: [
      { matchTerms: ['rosa', 'rosal'], fallbackName: 'Rosa jardín inglesa', fallbackPrice: 3.4, colorHex: '#E08FA3', stems: 9 },
      { matchTerms: ['tulipan', 'ranunculo', 'peonia'], fallbackName: 'Tulipán / Ranúnculo coral', fallbackPrice: 2.2, colorHex: '#E07A68', stems: 5 },
      { matchTerms: ['lavanda'], fallbackName: 'Lavanda / Delphinium violeta', fallbackPrice: 2.8, colorHex: '#7A68A6', stems: 4 },
      { matchTerms: ['eucalipto'], fallbackName: 'Eucalipto Cinerea (manojo)', fallbackPrice: 4.9, colorHex: '#7A9687', stems: 3 },
    ],
  },
  {
    id: 'bodas',
    categoryLabel: 'Bodas y ceremonias',
    title: 'Arco Floral & Pasillo Nupcial',
    compositionType: 'Decoración de bodas',
    summary: 'Rosas blancas inglesas, hortensias marfil, peonías suaves, ramas de olivo mediterráneo y eucalipto.',
    referencePriceRange: '680 € – 1.250 €',
    imageUrl: IMAGES.floralWeddingDecor,
    wrapperIdx: 3,
    vaseIdx: 1,
    marginPercent: 50,
    recipe: [
      { matchTerms: ['rosa'], fallbackName: 'Rosa jardín blanca nupcial', fallbackPrice: 3.4, colorHex: '#F3EFE6', stems: 60 },
      { matchTerms: ['hortensia'], fallbackName: 'Hortensia marfil ceremonial', fallbackPrice: 8.5, colorHex: '#E8E3DC', stems: 18 },
      { matchTerms: ['clavel', 'peonia', 'cala'], fallbackName: 'Cala / Peonía blanco seda', fallbackPrice: 3.9, colorHex: '#E08FA3', stems: 24 },
      { matchTerms: ['eucalipto', 'olivo'], fallbackName: 'Verde olivo y eucalipto (manojo)', fallbackPrice: 4.9, colorHex: '#7A9687', stems: 20 },
    ],
  },
  {
    id: 'eventos',
    categoryLabel: 'Eventos y banquetes',
    title: 'Centro Camino Imperial de Gala',
    compositionType: 'Decoración de eventos',
    summary: 'Orquídeas Phalaenopsis blancas, rosas coral y crema, hortensias, hojas tropicales y portavelas.',
    referencePriceRange: '185 € – 320 €',
    imageUrl: IMAGES.floralEventsDecor,
    wrapperIdx: 3,
    vaseIdx: 2,
    marginPercent: 45,
    recipe: [
      { matchTerms: ['orquidea'], fallbackName: 'Vara Orquídea Phalaenopsis blanca', fallbackPrice: 7.5, colorHex: '#F3EFE6', stems: 8 },
      { matchTerms: ['rosa'], fallbackName: 'Rosa coral & crema evento', fallbackPrice: 3.2, colorHex: '#E07A68', stems: 18 },
      { matchTerms: ['hortensia'], fallbackName: 'Hortensia blanca volumen', fallbackPrice: 7.9, colorHex: '#EAE5D8', stems: 6 },
      { matchTerms: ['eucalipto', 'monstera'], fallbackName: 'Follaje verde tropical y eucalipto', fallbackPrice: 4.9, colorHex: '#7A9687', stems: 6 },
    ],
  },
  {
    id: 'navidad',
    categoryLabel: 'Especial Navidad',
    title: 'Centro Festivo Flor de Pascua & Abeto',
    compositionType: 'Composición de Navidad',
    summary: 'Poinsettias rojo carmesí, amaryllis, ramas frescas de abeto nobilis, acebo, piñas, naranja seca y velas.',
    referencePriceRange: '75 € – 130 €',
    imageUrl: IMAGES.floralChristmasDecor,
    wrapperIdx: 3,
    vaseIdx: 3,
    marginPercent: 45,
    recipe: [
      { matchTerms: ['poinsettia', 'pascua', 'rosa', 'clavel'], fallbackName: 'Flor de Pascua roja (Poinsettia)', fallbackPrice: 8.9, colorHex: '#B92C38', stems: 5 },
      { matchTerms: ['begonia', 'geranio'], fallbackName: 'Ilex y bayas rojas de invierno', fallbackPrice: 3.4, colorHex: '#9C2D49', stems: 6 },
      { matchTerms: ['eucalipto', 'pino'], fallbackName: 'Rama abeto Nobilis y eucalipto', fallbackPrice: 4.8, colorHex: '#2F523B', stems: 6 },
    ],
  },
];

export function buildFloralItemsFromPreset(
  preset: FloralShowcasePreset,
  floralCatalog: Product[],
): FloralItem[] {
  return preset.recipe.map((step, index) => {
    const matched = floralCatalog.find((p) => {
      const hay = `${p.commercialName} ${p.subcategory}`.toLowerCase();
      return step.matchTerms.some((term) => hay.includes(term));
    });
    return {
      id: `fi-preset-${preset.id}-${index}-${Date.now()}`,
      productId: matched?.id || `preset-${preset.id}-${index}`,
      name: matched?.commercialName || step.fallbackName,
      colorHex: step.colorHex,
      stems: step.stems,
      unitCost: matched?.price ?? step.fallbackPrice,
    };
  });
}
