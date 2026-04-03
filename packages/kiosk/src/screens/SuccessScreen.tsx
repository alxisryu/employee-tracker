import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { AnimatedCheckmark } from '@/src/components/AnimatedCheckmark';
import { KioskButton } from '@/src/components/KioskButton';
import { NeuCard } from '@/src/components/NeuCard';
import { colors, typography } from '@/src/theme';
import { config } from '@/constants/config';
import type { KioskState, KioskAction } from '@/src/state/kiosk-machine';

interface SuccessScreenProps {
  state: KioskState;
  dispatch: (action: KioskAction) => void;
}

export function SuccessScreen({ state, dispatch }: SuccessScreenProps) {
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(() => {
      dispatch({ type: 'RESET' });
    }, config.successResetMs);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <NeuCard style={styles.card} radius={28}>
          <AnimatedCheckmark size={88} />
          <View style={styles.text}>
            <Text style={[typography.title, styles.headline]}>
              {state.employeeName ? `Welcome, ${state.employeeName}` : 'Checked in'}
            </Text>
            <Text style={[typography.body, styles.sub]}>
              {state.successMessage ?? 'Your sign-in was successful'}
            </Text>
          </View>
          <KioskButton
            label="Done"
            variant="secondary"
            size="md"
            onPress={() => dispatch({ type: 'RESET' })}
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
  },
  card: {
    padding: 52,
    alignItems: 'center',
    gap: 28,
    minWidth: 340,
  },
  text: {
    alignItems: 'center',
    gap: 10,
  },
  headline: {
    textAlign: 'center',
    color: colors.textPrimary,
  },
  sub: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
