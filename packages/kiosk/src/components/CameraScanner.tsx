import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { KioskButton } from './KioskButton';
import { colors, typography } from '@/src/theme';
import { parseQrCode } from '@/src/utils/qr-parser';
import { config } from '@/constants/config';

const DOUBLE_TAP_MS = 300;

interface CameraScannerProps {
  onScan: (employeeId: string) => void;
  active?: boolean;
}

export function CameraScanner({ onScan, active = true }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const lastScanTime = useRef(0);
  const lastScanValue = useRef('');
  const lastTapTime = useRef(0);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (!active) return;

    const now = Date.now();
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

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTime.current < DOUBLE_TAP_MS) {
      setFacing(f => f === 'front' ? 'back' : 'front');
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  }, []);

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
    <TouchableOpacity
      style={StyleSheet.absoluteFillObject}
      activeOpacity={1}
      onPress={handleTap}
    >
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        zoom={0.02}
        onBarcodeScanned={active ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />
    </TouchableOpacity>
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
