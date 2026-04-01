import React, { useReducer, useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/src/theme';
import { kioskReducer, initialKioskState, KioskAction } from '@/src/state/kiosk-machine';
import { IdleScreen } from '@/src/screens/IdleScreen';
import { ProcessingScreen } from '@/src/screens/ProcessingScreen';
import { SuccessScreen } from '@/src/screens/SuccessScreen';
import { ErrorScreen } from '@/src/screens/ErrorScreen';
import { ManualScreen } from '@/src/screens/ManualScreen';
import { GuestScreen } from '@/src/screens/GuestScreen';

export default function KioskApp() {
  const [state, dispatch] = useReducer(kioskReducer, initialKioskState);
  // Prevent duplicate dispatches from concurrent events
  const isProcessing = useRef(false);

  const safeDispatch = useCallback((action: KioskAction) => {
    if (action.type === 'SCAN_DETECTED' || action.type === 'MANUAL_SUBMIT' || action.type === 'GUEST_SUBMIT') {
      if (isProcessing.current) return;
      isProcessing.current = true;
    }
    if (action.type === 'RESET') {
      isProcessing.current = false;
    }
    dispatch(action);
  }, []);

  const clearProcessing = useCallback(() => {
    isProcessing.current = false;
  }, []);

  const renderScreen = () => {
    switch (state.screen) {
      case 'idle':
        return <IdleScreen dispatch={safeDispatch} />;
      case 'processing':
        return <ProcessingScreen state={state} dispatch={safeDispatch} onComplete={clearProcessing} />;
      case 'success':
        return <SuccessScreen state={state} dispatch={safeDispatch} />;
      case 'error':
        return <ErrorScreen state={state} dispatch={safeDispatch} />;
      case 'manual':
        return <ManualScreen dispatch={safeDispatch} />;
      case 'guest':
        return <GuestScreen dispatch={safeDispatch} />;
    }
  };

  return (
    <View style={styles.root}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
