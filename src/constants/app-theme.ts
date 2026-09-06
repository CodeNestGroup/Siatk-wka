export const brand = {
  primary: '#2C4BFF',
  primaryPressed: '#2340E0',
  accent: '#FBBF24',       // złote pastylki, kropki nowości, akcenty biletu
  success: '#10B981',
  danger: '#FF5A5F',
  ticketFrom: '#16224A',   // bilet jest granatowy w OBU motywach
  ticketTo: '#0D1633',
  ticketBase: '#0D1633',   // kolor tła pod teksturą siatki
  ticketInk: '#FFFFFF',
  ticketInk2: '#93A9E8',
  ticketLabel: '#7C93FF',
  ticketMuted: '#5D7099',
  // Gradient i akcenty biletu dopasowane 1:1 do strony esco-volleymanager.vercel.app
  // (linear-gradient 135deg + poświata niebieska/złota w rogach biletu, jako gradient radialny SVG).
  ticketGradient: ['#0B1120', '#121B33', '#16204A'] as const,
  ticketAccent: '#FFD23F',   // złote ikony godziny/lokalizacji na bilecie (jak na stronie WWW)
  ticketPrice: '#00E0A2',    // zielona stawka za mecz (jak na stronie WWW)
};

export const dark = {
  bg: '#0B1120', bg2: '#0F172A', card: '#131C31', card2: '#0F172A',
  ink: '#F8FAFC', ink2: '#94A3B8', ink3: '#6B7C99',
  line: 'rgba(255,255,255,0.09)',
  priInk: '#7C93FF', amberInk: '#FBBF24', greenInk: '#34D399', redInk: '#FF7A7E',
  tintB: 'rgba(44,75,255,0.18)', tintA: 'rgba(251,191,36,0.14)',
  tintG: 'rgba(16,185,129,0.15)', tintR: 'rgba(255,90,95,0.15)',
  chip: '#16213A',
};

export const light = {
  bg: '#F4F6FB', bg2: '#EDF1F8', card: '#FFFFFF', card2: '#F8FAFC',
  ink: '#0F172A', ink2: '#64748B', ink3: '#94A3B8',
  line: '#E4E9F2',
  priInk: '#2C4BFF', amberInk: '#B45309', greenInk: '#047857', redInk: '#B91C1C',
  tintB: '#EEF2FF', tintA: '#FEF5E1', tintG: '#E7F8F1', tintR: '#FEF1F1',
  chip: '#FFFFFF',
};

export const radius = { pill: 999, xs: 9, sm: 12, md: 14, lg: 16, xl: 20, ticket: 22 };
export const space  = { screen: 18, gap: 11, cardPad: 16, rowPad: 12 };

export const shadow = (isDark: boolean) => ({
  card:    { shadowColor: '#000', shadowOffset: { width: 0, height: 8 },  shadowOpacity: isDark ? 0.42 : 0.09, shadowRadius: 18, elevation: 4 },
  ticket:  { shadowColor: '#060C1C', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.5, shadowRadius: 28, elevation: 8 },
  primary: { shadowColor: brand.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.42, shadowRadius: 20, elevation: 6 },
});

export type Palette = typeof dark;
export const paletteFor = (isDark: boolean): Palette => (isDark ? dark : light);
