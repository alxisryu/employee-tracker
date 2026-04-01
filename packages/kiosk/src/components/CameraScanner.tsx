import React, { useCallback, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { KioskButton } from './KioskButton';
import { colors, typography } from '@/src/theme';
import { parseQrCode } from '@/src/utils/qr-parser';
import { config } from '@/constants/config';

interface CameraScannerProps {
  onScan: (employeeId: string) => void;
  active?: boolean;
}

export function CameraScanner({ onScan, active = true }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanTime = useRef(0);
  const lastScanValue = useRef('');

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (!active) return;

    const now = Date.now();
    // Debounce: ignore same value scanned within debounce window
    if (
      data === lastScanValue.current &&
      now - lastScanTime.current < config.scanDebounceMs
    ) {
      return;
    }
    lastScanTime.current = now;
    lastScanValue.current = data;

    const result = parseQrCode(data);
    if (result.isValid && result.employeeUuid) {
      onScan(result.employeeUuid);
    }
  }, [active, onScan]);

  if (!permission) {
    return <View style={styles.placeholder} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={[typography.body, styles.permText]}>Camera access required to scan QR codes.</Text>
        <KioskButton label="Grant Access" onPress={requestPermission} size="sm" />
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      facing="back"
      onBarcodeScanned={active ? handleBarCodeScanned : undefined}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
  },
  permissionContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  permText: {
    textAlign: 'center',
  },
});
