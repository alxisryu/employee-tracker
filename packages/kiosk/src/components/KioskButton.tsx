import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface KioskButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.accent },
    text: { color: '#FFFFFF', fontWeight: '600' },
  },
  secondary: {
    container: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.textSecondary, fontWeight: '500' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.textMuted, fontWeight: '400' },
  },
  danger: {
    container: { backgroundColor: colors.errorDim, borderWidth: 1, borderColor: colors.error },
    text: { color: colors.error, fontWeight: '600' },
  },
};

const sizeStyles: Record<'sm' | 'md' | 'lg', { container: ViewStyle; text: TextStyle }> = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 }, text: { fontSize: 15 } },
  md: { container: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16 }, text: { fontSize: 17 } },
  lg: { container: { paddingVertical: 18, paddingHorizontal: 36, borderRadius: 18 }, text: { fontSize: 19 } },
};

export function KioskButton({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  onPress,
  ...props
}: KioskButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(
    (e: Parameters<NonNullable<TouchableOpacityProps['onPress']>>[0]) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(e);
    },
    [onPress],
  );

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth && styles.fullWidth,
        animStyle,
      ]}
      onPress={handlePress}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
      activeOpacity={1}
      {...props}
    >
      <Text style={[styles.text, variantStyles[variant].text, sizeStyles[size].text]}>
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});
