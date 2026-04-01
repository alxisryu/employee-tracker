import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  safe?: boolean;
}

export function ScreenContainer({ children, safe = true, style, ...props }: ScreenContainerProps) {
  if (safe) {
    return (
      <SafeAreaView style={[styles.safeArea]}>
        <View style={[styles.container, style]} {...props}>
          {children}
        </View>
      </SafeAreaView>
    );
  }
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
