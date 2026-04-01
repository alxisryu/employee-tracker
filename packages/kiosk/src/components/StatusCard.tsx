import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/src/theme';

interface StatusCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
}

export function StatusCard({ children, variant = 'default' }: StatusCardProps) {
  return (
    <View style={[styles.card, styles[variant]]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    alignItems: 'center',
  },
  default: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
  },
  success: {
    backgroundColor: colors.successDim,
    borderColor: colors.success,
  },
  error: {
    backgroundColor: colors.errorDim,
    borderColor: colors.error,
  },
});
