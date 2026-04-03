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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors } from '@/src/theme';
import { FONT } from '@/src/theme/typography';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface KioskButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizeStyles: Record<'sm' | 'md' | 'lg', { container: ViewStyle; text: TextStyle }> = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 14 }, text: { fontSize: 15 } },
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

  const sizeStyle = sizeStyles[size];

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        style={[
          styles.base,
          sizeStyle.container,
          fullWidth && styles.fullWidth,
          styles.primaryShadow,
          animStyle,
        ]}
        onPress={handlePress}
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 80 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
        activeOpacity={1}
        {...props}
      >
        <LinearGradient
          colors={['#5B7EF5', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: sizeStyle.container.borderRadius as number }]}
        />
        <Text style={[styles.text, styles.primaryText, sizeStyle.text]}>{label}</Text>
      </AnimatedTouchable>
    );
  }

  const variantContainerStyle: ViewStyle =
    variant === 'secondary'
      ? styles.secondaryContainer
      : variant === 'danger'
        ? styles.dangerContainer
        : styles.ghostContainer;

  const variantTextStyle: TextStyle =
    variant === 'secondary'
      ? styles.secondaryText
      : variant === 'danger'
        ? styles.dangerText
        : styles.ghostText;

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantContainerStyle,
        sizeStyle.container,
        fullWidth && styles.fullWidth,
        animStyle,
      ]}
      onPress={handlePress}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 80 }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: 120 }); }}
      activeOpacity={1}
      {...props}
    >
      <Text style={[styles.text, variantTextStyle, sizeStyle.text]}>{label}</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
    fontFamily: FONT,
  },

  // Primary — gradient with shadow
  primaryShadow: {
    shadowColor: 'rgba(91, 126, 245, 0.45)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Secondary — neumorphic
  secondaryContainer: {
    backgroundColor: colors.bg,
    shadowColor: colors.neuShadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.78)',
  },
  secondaryText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Ghost — minimal
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.textMuted,
    fontWeight: '400',
  },

  // Danger
  dangerContainer: {
    backgroundColor: colors.errorDim,
    borderWidth: 1,
    borderColor: colors.error,
  },
  dangerText: {
    color: colors.error,
    fontWeight: '600',
  },
});
