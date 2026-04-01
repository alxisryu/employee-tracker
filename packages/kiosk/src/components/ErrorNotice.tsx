import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/src/theme';
import type { ErrorType } from '@/src/state/kiosk-machine';

interface ErrorNoticeProps {
  errorType: ErrorType | null;
  message: string | null;
}

const errorConfig: Record<ErrorType, { icon: string; title: string }> = {
  scan: { icon: 'qr-code-outline', title: "Couldn't read code" },
  network: { icon: 'wifi-outline', title: 'Network issue' },
  backend: { icon: 'alert-circle-outline', title: 'Sign-in failed' },
  unknown: { icon: 'help-circle-outline', title: 'Something went wrong' },
};

export function ErrorNotice({ errorType, message }: ErrorNoticeProps) {
  const cfg = errorConfig[errorType ?? 'unknown'];

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={cfg.icon as never} size={36} color={colors.error} />
      </View>
      <Text style={[typography.heading, styles.title]}>{cfg.title}</Text>
      {message && (
        <Text style={[typography.body, styles.message]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: colors.errorDim,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.error,
    maxWidth: 400,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    color: colors.textPrimary,
  },
  message: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 15,
  },
});
