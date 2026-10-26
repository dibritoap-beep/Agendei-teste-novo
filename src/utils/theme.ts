/**
 * Sistema de Temas e Realce de Cores do AGENDEI
 * 4 temas:
 * 1. Original (Azul Marinho Executivo & Ouro Clássico)
 * 2. Bordô & Rosé (Vinho Marsala & Rosé Feminino Sofisticado)
 * 3. Amazônico (Verde Floresta & Esmeralda Imperial)
 * 4. Golden Imperial (Obsidiana Nobre & Ouro Reluzente)
 */

export type ThemeId = 'original' | 'bordo' | 'amazonico' | 'golden';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  badge: string;
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  surfaceColor: string;
  panelColor: string;
  borderColor: string;
  accentTextColor: string;
  previewColors: [string, string, string]; // [Fundo, Painel/Secundária, Destaque]
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'original',
    name: 'Original Executivo',
    tagline: 'Azul Marinho, Safira Real & Ouro Clássico',
    badge: 'Original',
    accentColor: '#FDD835',
    secondaryColor: '#0F52BA',
    bgColor: '#0A1931',
    surfaceColor: '#1A2B4C',
    panelColor: '#112240',
    borderColor: '#233559',
    accentTextColor: '#000000',
    previewColors: ['#0A1931', '#0F52BA', '#FDD835'],
  },
  {
    id: 'bordo',
    name: 'Bordô & Rosé',
    tagline: 'Vinho Marsala Nobre & Rosé Sofisticado',
    badge: 'Rosé / Vinho',
    accentColor: '#FB7185',
    secondaryColor: '#9F1239',
    bgColor: '#170A14',
    surfaceColor: '#2B1224',
    panelColor: '#3A1831',
    borderColor: '#542245',
    accentTextColor: '#000000',
    previewColors: ['#170A14', '#9F1239', '#FB7185'],
  },
  {
    id: 'amazonico',
    name: 'Amazônico',
    tagline: 'Verde Floresta & Esmeralda Imperial',
    badge: 'Verde / Menta',
    accentColor: '#34D399',
    secondaryColor: '#059669',
    bgColor: '#061D17',
    surfaceColor: '#0E2E25',
    panelColor: '#143D32',
    borderColor: '#1D5344',
    accentTextColor: '#000000',
    previewColors: ['#061D17', '#059669', '#34D399'],
  },
  {
    id: 'golden',
    name: 'Golden Imperial',
    tagline: 'Obsidiana Escura & Ouro Nobre Reluzente',
    badge: 'Ouro Luxo',
    accentColor: '#F59E0B',
    secondaryColor: '#B45309',
    bgColor: '#120F08',
    surfaceColor: '#251E11',
    panelColor: '#342918',
    borderColor: '#4D3C22',
    accentTextColor: '#000000',
    previewColors: ['#120F08', '#B45309', '#F59E0B'],
  },
];

const THEME_STORAGE_KEY = 'agendei_color_theme';

export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return 'original';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (saved && THEMES.some(t => t.id === saved)) {
    return saved;
  }
  return 'original';
}

export function applyTheme(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  // Atributo no HTML para seletores CSS
  root.setAttribute('data-theme', theme.id);

  // Variáveis CSS Globais
  root.style.setProperty('--theme-bg', theme.bgColor);
  root.style.setProperty('--theme-surface', theme.surfaceColor);
  root.style.setProperty('--theme-panel', theme.panelColor);
  root.style.setProperty('--theme-border', theme.borderColor);
  root.style.setProperty('--theme-accent', theme.accentColor);
  root.style.setProperty('--theme-accent-text', theme.accentTextColor);
  root.style.setProperty('--theme-secondary', theme.secondaryColor);

  // Atualiza meta theme-color do navegador móvel
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.bgColor);
  }

  // Persiste escolha
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch (e) {
    console.warn('Erro ao salvar tema:', e);
  }
}
