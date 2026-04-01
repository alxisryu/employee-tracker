import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ErrorNotice } from '@/src/components/ErrorNotice';
import { KioskButton } from '@/src/components/KioskButton';
import { config } from '@/constants/config';
import type { KioskState, KioskAction } from '@/src/state/kiosk-machine';

interface ErrorScreenProps {
  state: KioskState;
  dispatch: (action: KioskAction) => void;
}

export function ErrorScreen({ state, dispatch }: ErrorScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: 'RESET' });
    }, config.errorResetMs);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <ErrorNotice errorType={state.errorType} message={state.errorMessage} />

        <View style={styles.actions}>
          <KioskButton
            label="Scan again"
            variant="primary"
            size="md"
            onPress={() => dispatch({ type: 'RESET' })}
          />
          <KioskButton
            label="Sign in manually"
            variant="secondary"
            size="md"
            onPress={() => dispatch({ type: 'SHOW_MANUAL' })}
          />
          <KioskButton
            label="Back to home"
            variant="ghost"
            size="sm"
            onPress={() => dispatch({ type: 'RESET' })}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    padding: 40,
  },
  actions: {
    gap: 14,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
});
