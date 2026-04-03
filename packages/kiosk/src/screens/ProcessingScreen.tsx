import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { NeuCard } from '@/src/components/NeuCard';
import { colors, typography } from '@/src/theme';
import { submitEmployeeScan, submitGuestSignIn, ApiError } from '@/src/services/api';
import type { KioskState, KioskAction, ErrorType } from '@/src/state/kiosk-machine';

interface ProcessingScreenProps {
  state: KioskState;
  dispatch: (action: KioskAction) => void;
  onComplete: () => void;
}

export function ProcessingScreen({ state, dispatch, onComplete }: ProcessingScreenProps) {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (state.pendingGuestData) {
          const res = await submitGuestSignIn(state.pendingGuestData);
          if (!cancelled) {
            dispatch({ type: 'SUBMIT_SUCCESS', payload: { message: res.message } });
          }
        } else {
          const identifier = state.pendingEmployeeId ?? state.pendingIdentifier ?? '';
          const source = state.pendingEmployeeId ? 'qr' : 'manual';
          const res = await submitEmployeeScan(identifier, source);
          if (!cancelled) {
            dispatch({
              type: 'SUBMIT_SUCCESS',
              payload: { employeeName: res.employeeName, message: res.message },
            });
          }
        }
      } catch (err) {
        if (cancelled) return;
        let errorType: ErrorType = 'unknown';
        let message = 'An unexpected error occurred.';

        if (err instanceof ApiError) {
          if (err.isNetworkError()) {
            errorType = 'network';
            message = 'Could not reach the server. Check your network connection.';
          } else if (err.status === 401 || err.status === 403) {
            errorType = 'backend';
            message = 'Device not authorised. Contact your administrator.';
          } else {
            errorType = 'backend';
            message = err.message;
          }
        } else if (err instanceof TypeError && String(err).includes('fetch')) {
          errorType = 'network';
          message = 'Network unavailable. Please try again.';
        }

        onComplete();
        dispatch({ type: 'SUBMIT_ERROR', payload: { errorType, message } });
      }
    }

    void run();
    return () => { cancelled = true; };
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <NeuCard style={styles.card} radius={28}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[typography.heading, styles.label]}>Processing…</Text>
          <Text style={[typography.body, styles.sub]}>Just a moment</Text>
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
    gap: 20,
    minWidth: 280,
  },
  label: {
    color: colors.textPrimary,
  },
  sub: {
    color: colors.textMuted,
  },
});
