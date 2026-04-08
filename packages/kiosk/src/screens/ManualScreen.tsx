import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ManualSignInForm } from '@/src/components/ManualSignInForm';
import { NeuCard } from '@/src/components/NeuCard';
import { colors, typography } from '@/src/theme';
import { config } from '@/constants/config';
import type { KioskAction } from '@/src/state/kiosk-machine';

interface ManualScreenProps {
  dispatch: (action: KioskAction) => void;
}

export function ManualScreen({ dispatch }: ManualScreenProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'RESET' });
    }, config.inactivityResetMs);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <NeuCard style={styles.card} radius={28}>
          <Text style={[typography.title, styles.title]}>Manual sign-in</Text>
          <Text style={[typography.body, styles.sub]}>
            Enter your email address or employee ID
          </Text>
          <ManualSignInForm
            onSubmit={(identifier) => dispatch({ type: 'MANUAL_SUBMIT', payload: { identifier } })}
            onCancel={() => dispatch({ type: 'RESET' })}
          />
        </NeuCard>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  card: {
    padding: 40,
    width: '100%',
    maxWidth: 520,
    gap: 20,
  },
  title: {
    color: colors.textPrimary,
  },
  sub: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
