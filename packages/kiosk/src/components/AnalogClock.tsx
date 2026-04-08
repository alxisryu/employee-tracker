import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas, Box, BoxShadow, Circle, Path, Skia, rect, rrect } from '@shopify/react-native-skia';
import { colors } from '@/src/theme';

const NEU_BG = '#E0E5EC';
// Extra canvas space so circular shadows don't get clipped into a rectangle
const BLEED = 24;

interface AnalogClockProps {
  size: number;
}

export function AnalogClock({ size }: AnalogClockProps) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const canvasSize = size + BLEED * 2;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  const outerR = size / 2 - 2;
  const dialR = outerR - 16;

  const h12 = time.getHours() % 12 || 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
  const timeStr = `${h12}:${String(minutes).padStart(2, '0')}`;

  const hourAngle = ((h12 * 60 + minutes) / 720) * 2 * Math.PI - Math.PI / 2;
  const minAngle = (minutes / 60) * 2 * Math.PI - Math.PI / 2;
  const secAngle = (seconds / 60) * 2 * Math.PI - Math.PI / 2;

  const hourLen = dialR * 0.50;
  const minLen = dialR * 0.74;
  const secLen = dialR * 0.78;
  const secTail = dialR * 0.22;

  const hourPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy);
    p.lineTo(cx + Math.cos(hourAngle) * hourLen, cy + Math.sin(hourAngle) * hourLen);
    return p;
  }, [cx, cy, hourAngle, hourLen]);

  const minPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(cx, cy);
    p.lineTo(cx + Math.cos(minAngle) * minLen, cy + Math.sin(minAngle) * minLen);
    return p;
  }, [cx, cy, minAngle, minLen]);

  const secPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(
      cx - Math.cos(secAngle) * secTail,
      cy - Math.sin(secAngle) * secTail,
    );
    p.lineTo(
      cx + Math.cos(secAngle) * secLen,
      cy + Math.sin(secAngle) * secLen,
    );
    return p;
  }, [cx, cy, secAngle, secLen, secTail]);

  // Tick mark paths
  const minorTickPaths = useMemo(() =>
    [1, 2, 4, 5, 7, 8, 10, 11].map((i) => {
      const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const outer = dialR - 2;
      const inner = outer - 8;
      const p = Skia.Path.Make();
      p.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      p.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      return { key: i, path: p };
    }), [cx, cy, dialR]);

  const majorTickPaths = useMemo(() =>
    [0, 3, 6, 9].map((i) => {
      const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      const outer = dialR - 2;
      const inner = outer - 14;
      const p = Skia.Path.Make();
      p.moveTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      p.lineTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      return { key: i, path: p };
    }), [cx, cy, dialR]);

  const tickPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#B8C0CC'));
    p.setStrokeWidth(2);
    p.setStyle(1);
    p.setStrokeCap(1);
    return p;
  }, []);

  const majorPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#8A94A6'));
    p.setStrokeWidth(3);
    p.setStyle(1);
    p.setStrokeCap(1);
    return p;
  }, []);

  // Dark gray hands matching the reference neumorphic clock design
  const hourHandPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#4A556A'));
    p.setStrokeWidth(5);
    p.setStyle(1);
    p.setStrokeCap(1);
    return p;
  }, []);

  const minHandPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color('#4A556A'));
    p.setStrokeWidth(3);
    p.setStyle(1);
    p.setStrokeCap(1);
    return p;
  }, []);

  // Accent (purple) second hand with tail — reference had red, we use our accent color
  const secHandPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(colors.accent));
    p.setStrokeWidth(2);
    p.setStyle(1);
    p.setStrokeCap(1);
    return p;
  }, []);

  return (
    <View style={styles.wrapper}>
      {/* Canvas is canvasSize to give shadow room; offset by -BLEED so clock appears centred */}
      <View style={{ width: size, height: size, overflow: 'visible' }}>
        <Canvas
          style={{
            position: 'absolute',
            left: -BLEED,
            top: -BLEED,
            width: canvasSize,
            height: canvasSize,
            backgroundColor: 'transparent',
          }}
        >
          {/* Outer raised ring */}
          <Box
            box={rrect(rect(cx - outerR, cy - outerR, outerR * 2, outerR * 2), outerR, outerR)}
            color={NEU_BG}
          >
            <BoxShadow dx={-6} dy={-6} blur={14} color="rgba(255,255,255,1.0)" />
            <BoxShadow dx={6} dy={6} blur={14} color="rgba(170,180,200,0.50)" />
          </Box>

          {/* Inner dial with inset shadow */}
          <Box
            box={rrect(rect(cx - dialR, cy - dialR, dialR * 2, dialR * 2), dialR, dialR)}
            color={NEU_BG}
          >
            <BoxShadow dx={-3} dy={-3} blur={7} color="rgba(255,255,255,0.9)" />
            <BoxShadow dx={3} dy={3} blur={7} color="rgba(170,180,200,0.4)" />
            <BoxShadow dx={3} dy={3} blur={7} color="rgba(170,180,200,0.50)" inner />
            <BoxShadow dx={-3} dy={-3} blur={7} color="rgba(255,255,255,0.85)" inner />
          </Box>

          {/* Minor ticks */}
          {minorTickPaths.map(({ key, path }) => (
            <Path key={key} path={path} paint={tickPaint} />
          ))}

          {/* Major ticks */}
          {majorTickPaths.map(({ key, path }) => (
            <Path key={key} path={path} paint={majorPaint} />
          ))}

          {/* Hour + minute hands */}
          <Path path={hourPath} paint={hourHandPaint} />
          <Path path={minPath} paint={minHandPaint} />

          {/* Second hand on top (accent/purple, with tail) */}
          <Path path={secPath} paint={secHandPaint} />

          {/* Centre hub — accent dot with white cap */}
          <Circle cx={cx} cy={cy} r={6} color={colors.accent} />
          <Circle cx={cx} cy={cy} r={2.5} color="#FFFFFF" />
        </Canvas>
      </View>

      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { fontSize: Math.round(size * 0.28) }]}>{timeStr}</Text>
        <Text style={[styles.ampmText, { fontSize: Math.round(size * 0.12), marginBottom: Math.round(size * 0.02) }]}>{ampm}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  timeText: {
    fontFamily: 'SuissNord',
    color: '#1A2332',
    letterSpacing: -1,
  },
  ampmText: {
    fontFamily: 'SuissNord',
    color: '#8A94A6',
    letterSpacing: 0.5,
  },
});
