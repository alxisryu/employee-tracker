import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme';

interface AnimatedCheckmarkProps {
  size?: number;
}

export function AnimatedCheckmark({ size = 80 }: AnimatedCheckmarkProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    // Ring expands and fades out
    ringScale.value = withTiming(1.6, { duration: 600 });
    ringOpacity.value = withSequence(
      withTiming(0.5, { duration: 200 }),
      withDelay(300, withTiming(0, { duration: 400 })),
    );
    // Circle bounces in
    scale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(100, withTiming(1, { duration: 150 }));
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Expanding ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: colors.success,
          },
          ringStyle,
        ]}
      />
      {/* Filled circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.successDim,
          },
          circleStyle,
        ]}
      >
        <Ionicons name="checkmark" size={size * 0.54} color={colors.success} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
