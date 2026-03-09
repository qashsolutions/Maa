// Shared across both themes
const shared = {
  // Primary accent
  gold: '#DAA520',
  goldDark: '#B8860B',
  goldLight: '#F0D060',

  // Domain colors (health pillars)
  period: '#C4556E',
  ovulation: '#DAA520',
  mood: '#7B68EE',
  sleep: '#6BA3D6',
  energy: '#3CB371',
  streak: '#DAA520',

  // Utility
  error: '#E53935',
  success: '#3CB371',
  warning: '#F0D060',
} as const;

export const DarkTheme = {
  ...shared,
  bgPrimary: '#0D0A0E',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.06)',
  bgGoldSubtle: 'rgba(184,134,11,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textMuted: 'rgba(255,255,255,0.2)',
  borderDefault: 'rgba(255,255,255,0.06)',
  borderGold: 'rgba(184,134,11,0.2)',
  borderSubtle: 'rgba(255,255,255,0.04)',
} as const;

export const LightTheme = {
  ...shared,
  bgPrimary: '#FAFAF8',
  bgCard: 'rgba(0,0,0,0.03)',
  bgCardHover: 'rgba(0,0,0,0.05)',
  bgGoldSubtle: 'rgba(184,134,11,0.06)',
  textPrimary: '#1A1A1A',
  textSecondary: 'rgba(0,0,0,0.6)',
  textTertiary: 'rgba(0,0,0,0.4)',
  textMuted: 'rgba(0,0,0,0.2)',
  borderDefault: 'rgba(0,0,0,0.08)',
  borderGold: 'rgba(184,134,11,0.25)',
  borderSubtle: 'rgba(0,0,0,0.04)',
} as const;

// Use Record<string, string> shape so both themes are assignable
export type ThemeColors = { [K in keyof typeof DarkTheme]: string };
export type ThemeMode = 'dark' | 'light';

// Default export for backward compatibility (dark is default)
export const Colors = DarkTheme;
