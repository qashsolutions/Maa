export const Colors = {
  // Primary
  gold: '#DAA520',
  goldDark: '#B8860B',
  goldLight: '#F0D060',

  // Background - Dark theme
  bgPrimary: '#0D0A0E',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.06)',
  bgGoldSubtle: 'rgba(184,134,11,0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.65)',
  textTertiary: 'rgba(255,255,255,0.4)',
  textMuted: 'rgba(255,255,255,0.2)',

  // Borders
  borderDefault: 'rgba(255,255,255,0.06)',
  borderGold: 'rgba(184,134,11,0.2)',
  borderSubtle: 'rgba(255,255,255,0.04)',

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

export type ColorKey = keyof typeof Colors;
