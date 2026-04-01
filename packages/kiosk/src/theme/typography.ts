import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  display: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 54,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
