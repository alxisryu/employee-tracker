import { StyleSheet } from 'react-native';
import { colors } from './colors';

// Space Grotesk weight aliases — matches useFonts keys in _layout.tsx
export const FONT = 'SpaceGrotesk-Regular';
export const FONT_LIGHT = 'SpaceGrotesk-Light';
export const FONT_EXTRALIGHT = 'SpaceGrotesk-Light'; // Space Grotesk has no ExtraLight
export const FONT_MEDIUM = 'SpaceGrotesk-Medium';
export const FONT_SEMIBOLD = 'SpaceGrotesk-SemiBold';
export const FONT_BOLD = 'SpaceGrotesk-Bold';

export const typography = StyleSheet.create({
  display: {
    fontSize: 48,
    fontFamily: FONT_BOLD,
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 54,
  },
  title: {
    fontSize: 32,
    fontFamily: FONT_BOLD,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 22,
    fontFamily: FONT_SEMIBOLD,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 17,
    fontFamily: FONT,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 17,
    fontFamily: FONT_MEDIUM,
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontFamily: FONT_MEDIUM,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 13,
    fontFamily: FONT,
    color: colors.textMuted,
  },
});
