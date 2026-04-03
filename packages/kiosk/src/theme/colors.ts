export const colors = {
  // Neumorphic base
  bg: '#F0F5F3',
  bgDeep: '#E5EDE9',
  bgCard: '#F0F5F3',
  bgCardHover: '#E5EDE9',
  bgOverlay: 'rgba(240, 245, 243, 0.94)',

  // Borders
  border: 'rgba(163, 177, 198, 0.40)',
  borderStrong: 'rgba(163, 177, 198, 0.60)',

  // Neumorphic shadows (for reference in component styles)
  neuShadowDark: '#A3B1C6',
  neuShadowLight: '#FFFFFF',

  // Accent — blue/purple gradient palette
  accent: '#5B7EF5',
  accentSecondary: '#8B5CF6',
  accentLight: 'rgba(91, 126, 245, 0.16)',
  accentDim: 'rgba(91, 126, 245, 0.10)',

  // Status
  success: '#22C55E',
  successDim: 'rgba(34, 197, 94, 0.12)',
  error: '#EF4444',
  errorDim: 'rgba(239, 68, 68, 0.10)',
  warning: '#F59E0B',

  // Text (dark on light)
  textPrimary: '#1A2332',
  textSecondary: '#4A5568',
  textMuted: '#8A94A6',
  textAccent: '#5B7EF5',

  // Scan frame
  scanFrame: '#5B7EF5',
  scanFrameGlow: 'rgba(91, 126, 245, 0.22)',

  // Input
  inputBg: 'rgba(163, 177, 198, 0.18)',
  inputBorder: 'rgba(163, 177, 198, 0.45)',
  inputBorderFocus: '#5B7EF5',
  inputText: '#1A2332',
  inputPlaceholder: '#9AA5B4',
} as const;
