import React, { useState } from 'react';
import { View, type ViewProps } from 'react-native';
import { Canvas, Box, BoxShadow, rect, rrect } from '@shopify/react-native-skia';

// Classic neumorphic light gray
export const NEU_BG = '#E0E5EC';
// Canvas extends this far outside the card on each side for shadow bleed
const BLEED = 22;

interface NeuCardProps extends ViewProps {
  children?: React.ReactNode;
  radius?: number;
}

export function NeuCard({ children, style, radius = 20, onLayout, ...props }: NeuCardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;

  return (
    <View
      style={[{ backgroundColor: NEU_BG, borderRadius: radius, overflow: 'visible' }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
        onLayout?.(e);
      }}
      {...props}
    >
      {w > 0 && h > 0 && (
        <Canvas
          style={{
            position: 'absolute',
            left: -BLEED,
            top: -BLEED,
            width: w + BLEED * 2,
            height: h + BLEED * 2,
            backgroundColor: 'transparent',
          }}
          pointerEvents="none"
        >
          <Box box={rrect(rect(BLEED, BLEED, w, h), radius, radius)} color={NEU_BG}>
            <BoxShadow dx={-6} dy={-6} blur={14} color="rgba(255,255,255,1.0)" />
            <BoxShadow dx={6} dy={6} blur={14} color="rgba(170,180,200,0.50)" />
          </Box>
        </Canvas>
      )}
      {children}
    </View>
  );
}

export function NeuCardInset({ children, style, radius = 20, onLayout, ...props }: NeuCardProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;

  return (
    <View
      style={[{ backgroundColor: NEU_BG, borderRadius: radius, overflow: 'visible' }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
        onLayout?.(e);
      }}
      {...props}
    >
      {w > 0 && h > 0 && (
        <Canvas
          style={{
            position: 'absolute',
            left: -BLEED,
            top: -BLEED,
            width: w + BLEED * 2,
            height: h + BLEED * 2,
            backgroundColor: 'transparent',
          }}
          pointerEvents="none"
        >
          <Box box={rrect(rect(BLEED, BLEED, w, h), radius, radius)} color={NEU_BG}>
            <BoxShadow dx={-6} dy={-6} blur={14} color="rgba(255,255,255,1.0)" />
            <BoxShadow dx={6} dy={6} blur={14} color="rgba(170,180,200,0.50)" />
            <BoxShadow dx={4} dy={4} blur={8} color="rgba(170,180,200,0.55)" inner />
            <BoxShadow dx={-4} dy={-4} blur={8} color="rgba(255,255,255,0.90)" inner />
          </Box>
        </Canvas>
      )}
      {children}
    </View>
  );
}
