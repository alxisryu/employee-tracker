import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { config } from '@/constants/config';

/** Returns a stable device identifier for the current device. */
export function getDeviceId(): string {
  // Use configured device ID first (preferred for kiosk setup)
  if (config.deviceId) return config.deviceId;

  // Fallback to Expo application ID
  const appId = Application.applicationId;
  if (appId) return appId;

  return `kiosk_${Platform.OS}_unknown`;
}
