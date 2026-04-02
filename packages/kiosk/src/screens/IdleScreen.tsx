import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ScanFrame } from '@/src/components/ScanFrame';
import { CameraScanner } from '@/src/components/CameraScanner';
import { KioskButton } from '@/src/components/KioskButton';
import { colors, typography } from '@/src/theme';
import type { KioskAction } from '@/src/state/kiosk-machine';

const { width, height } = Dimensions.get('window');

interface IdleScreenProps {
  dispatch: (action: KioskAction) => void;
}

export function IdleScreen({ dispatch }: IdleScreenProps) {
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(12);
  const subtitleOpacity = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 500 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.bezier(0.33, 1, 0.68, 1) });
    subtitleOpacity.value = withTiming(1, { duration: 700 });
    actionsOpacity.value = withTiming(1, { duration: 900 });
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const actionsStyle = useAnimatedStyle(() => ({ opacity: actionsOpacity.value }));

  const handleScan = (employeeId: string) => {
    dispatch({ type: 'SCAN_DETECTED', payload: { employeeUuid: employeeId, rawValue: employeeId, format: 'raw_cuid', isValid: true } });
  };

  return (
    <ScreenContainer>
      <View style={styles.root}>
        {/* Left: Text content */}
        <View style={styles.left}>
          {/* Logo placeholder */}
          <View style={styles.logo}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>Lyra</Text>
          </View>

          <Animated.View style={[styles.textBlock, titleStyle]}>
            <Text style={[typography.display, styles.headline]}>Scan your{'\n'}pass</Text>
          </Animated.View>

          <Animated.View style={subtitleStyle}>
            <Text style={[typography.body, styles.subtext]}>
              Hold your Apple Wallet QR code{'\n'}in front of the camera
            </Text>
          </Animated.View>

          <Animated.View style={[styles.secondaryActions, actionsStyle]}>
            <KioskButton
              label="Sign in manually"
              variant="secondary"
              size="sm"
              onPress={() => dispatch({ type: 'SHOW_MANUAL' })}
            />
            <KioskButton
              label="Guest sign-in"
              variant="ghost"
              size="sm"
              onPress={() => dispatch({ type: 'SHOW_GUEST' })}
            />
          </Animated.View>
        </View>

        {/* Right: Camera */}
        <View style={styles.right}>
          <ScanFrame active>
            <CameraScanner onScan={handleScan} active />
          </ScanFrame>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 56,
    gap: 64,
  },
  left: {
    flex: 1,
    gap: 28,
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  textBlock: {
    gap: 8,
  },
  headline: {
    color: colors.textPrimary,
  },
  subtext: {
    color: colors.textSecondary,
    lineHeight: 28,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
});
