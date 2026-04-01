import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/src/theme';

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;
const FRAME_RADIUS = 20;

interface ScanFrameProps {
  children?: React.ReactNode;
  size?: number;
  active?: boolean;
}

export function ScanFrame({ children, size, active = true }: ScanFrameProps) {
  const { width } = Dimensions.get('window');
  const frameSize = size ?? Math.min(width * 0.42, 420);

  const glowOpacity = useSharedValue(0.4);
  const cornerOpacity = useSharedValue(0.7);

  useEffect(() => {
    if (active) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
          withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.sine) }),
        ),
        -1,
        false,
      );
      cornerOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
          withTiming(0.55, { duration: 1800, easing: Easing.inOut(Easing.sine) }),
        ),
        -1,
        false,
      );
    } else {
      glowOpacity.value = withTiming(0.2);
      cornerOpacity.value = withTiming(0.3);
    }
  }, [active, glowOpacity, cornerOpacity]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const cornerStyle = useAnimatedStyle(() => ({ opacity: cornerOpacity.value }));

  return (
    <View style={[styles.wrapper, { width: frameSize, height: frameSize }]}>
      {/* Glow behind the frame */}
      <Animated.View
        style={[
          styles.glow,
          { borderRadius: FRAME_RADIUS + 8, width: frameSize + 16, height: frameSize + 16, left: -8, top: -8 },
          glowStyle,
        ]}
      />

      {/* Animated corner brackets */}
      <Animated.View style={cornerStyle}>
        {/* Top-left */}
        <View style={[styles.corner, styles.topLeft]}>
          <View style={[styles.cornerH, { backgroundColor: colors.scanFrame }]} />
          <View style={[styles.cornerV, { backgroundColor: colors.scanFrame }]} />
        </View>
        {/* Top-right */}
        <View style={[styles.corner, styles.topRight]}>
          <View style={[styles.cornerH, styles.cornerHRight, { backgroundColor: colors.scanFrame }]} />
          <View style={[styles.cornerV, { backgroundColor: colors.scanFrame }]} />
        </View>
        {/* Bottom-left */}
        <View style={[styles.corner, styles.bottomLeft]}>
          <View style={[styles.cornerH, { backgroundColor: colors.scanFrame }]} />
          <View style={[styles.cornerV, styles.cornerVBottom, { backgroundColor: colors.scanFrame }]} />
        </View>
        {/* Bottom-right */}
        <View style={[styles.corner, styles.bottomRight]}>
          <View style={[styles.cornerH, styles.cornerHRight, { backgroundColor: colors.scanFrame }]} />
          <View style={[styles.cornerV, styles.cornerVBottom, { backgroundColor: colors.scanFrame }]} />
        </View>
      </Animated.View>

      {/* Camera content */}
      <View style={[styles.inner, { borderRadius: FRAME_RADIUS }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.scanFrameGlow,
  },
  inner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
  cornerH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_THICKNESS,
    borderTopLeftRadius: 2,
  },
  cornerHRight: {
    left: undefined,
    right: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 2,
  },
  cornerV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_THICKNESS,
    height: CORNER_SIZE,
    borderTopLeftRadius: 2,
  },
  cornerVBottom: {
    top: undefined,
    bottom: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 2,
  },
});
