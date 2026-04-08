import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { ScanFrame } from '@/src/components/ScanFrame';
import { CameraScanner } from '@/src/components/CameraScanner';
import { NeuCard } from '@/src/components/NeuCard';
import { AnalogClock } from '@/src/components/AnalogClock';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/src/theme';
import { FONT_MEDIUM } from '@/src/theme/typography';
import type { KioskAction } from '@/src/state/kiosk-machine';

const { width, height } = Dimensions.get('window');

const PAD = 16;
const GAP = 14;

// Top row height
const TOP_H = Math.min(height * 0.27, 235);

// Both rows use total flex 30 so the first column widths stay visually aligned
// Top row:    dateCard(13) + employeesCard(17)        = 30  (date ~43%, employees ~57%)
// Bottom row: qrSection(13) + centerCol(5) + clock(12) = 30
const TOTAL_FLEX = 30;
const workingW = width - PAD * 2 - GAP * 2;
const col1W = (workingW * 13) / TOTAL_FLEX; // QR / date column
const col3W = (workingW * 12) / TOTAL_FLEX; // clock column

const bottomH = height - PAD * 2 - TOP_H - GAP;

// Camera inside NeuCard with 14px padding on all sides, leave room for scan label below
const cameraSize = Math.min(col1W, bottomH - 44);
// Clock inside a card with 24px padding — keeps canvas BLEED contained within the card
const clockSize = Math.min(col3W - 48, Math.floor((bottomH - 48) / 1.55));

interface IdleScreenProps {
  dispatch: (action: KioskAction) => void;
}

export function IdleScreen({ dispatch }: IdleScreenProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const isPortrait = winH > winW;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dateStr = `${day}/${month}`;

  const fadeTop = useSharedValue(0);
  const fadeBot = useSharedValue(0);
  const slideY = useSharedValue(8);

  useEffect(() => {
    const ease = Easing.bezier(0.33, 1, 0.68, 1);
    fadeTop.value = withTiming(1, { duration: 450, easing: ease });
    slideY.value = withTiming(0, { duration: 450, easing: ease });
    fadeBot.value = withDelay(150, withTiming(1, { duration: 450, easing: ease }));
  }, []);

  const topStyle = useAnimatedStyle(() => ({
    opacity: fadeTop.value,
    transform: [{ translateY: slideY.value }],
  }));
  const botStyle = useAnimatedStyle(() => ({ opacity: fadeBot.value }));

  const handleScan = (employeeId: string) => {
    dispatch({
      type: 'SCAN_DETECTED',
      payload: { employeeUuid: employeeId, rawValue: employeeId, format: 'raw_cuid', isValid: true },
    });
  };

  if (isPortrait) {
    const portraitCameraSize = winW - PAD * 2;
    return (
      <ScreenContainer>
        <View style={styles.portraitRoot}>

          {/* Lyra logo — top right */}
          <View style={styles.portraitTopBar}>
            <View style={styles.lyraRow}>
              <LinearGradient
                colors={['#5B7EF5', '#8B5CF6']}
                start={{ x: 1, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.lyraDot}
              />
              <Text style={styles.lyraText}>Lyra</Text>
            </View>
          </View>

          {/* Camera — centered */}
          <View style={styles.portraitCenter}>
            <ScanFrame size={portraitCameraSize} active borderRadius={20}>
              <CameraScanner onScan={handleScan} active />
            </ScanFrame>
            <Text style={styles.scanLabelText}>Scan QR Code</Text>
          </View>

          {/* Action buttons — bottom right */}
          <View style={styles.portraitBottom}>
            <TouchableOpacity
              style={styles.portraitBtn}
              activeOpacity={0.82}
              onPress={() => dispatch({ type: 'SHOW_GUEST' })}
            >
              <NeuCard style={StyleSheet.absoluteFill} radius={22} />
              <Ionicons name="person-outline" size={15} color={colors.textMuted} />
              <Text style={styles.portraitBtnText}>Guest sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.portraitBtn}
              activeOpacity={0.82}
              onPress={() => dispatch({ type: 'SHOW_MANUAL' })}
            >
              <NeuCard style={StyleSheet.absoluteFill} radius={22} />
              <Ionicons name="create-outline" size={15} color={colors.textMuted} />
              <Text style={styles.portraitBtnText}>Manual sign in</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.root}>

        {/* ═══ TOP ROW ═══ */}
        <Animated.View style={[styles.topRow, topStyle]}>

          {/* Date card — left edge aligns with camera below (both flex 10/22) */}
          <NeuCard style={styles.dateCard} radius={20}>
            <Text style={styles.dateText} numberOfLines={1} adjustsFontSizeToFit={true}>
              {dateStr}
            </Text>
          </NeuCard>

          {/* Employees card — Lyra inside */}
          <NeuCard style={styles.employeesCard} radius={20}>
            <View style={styles.lyraRow}>
              <LinearGradient
                colors={['#5B7EF5', '#8B5CF6']}
                start={{ x: 1, y: 1 }}
                end={{ x: 0, y: 0 }}
                style={styles.lyraDot}
              />
              <Text style={styles.lyraText}>Lyra</Text>
            </View>
            <View style={styles.employeeRow}>
              <Text style={styles.employeeCount}>12</Text>
              <Text style={styles.employeeLabel}>Employees in office</Text>
            </View>
          </NeuCard>

        </Animated.View>

        {/* ═══ BOTTOM ROW ═══ */}
        <Animated.View style={[styles.bottomRow, botStyle]}>

          {/* QR camera — flush with surrounding cards, text below */}
          <View style={styles.qrSection}>
            <ScanFrame size={cameraSize} active borderRadius={20}>
              <CameraScanner onScan={handleScan} active />
            </ScanFrame>
            <View style={styles.scanLabelArea}>
              <Text style={styles.scanLabelText}>Scan QR</Text>
            </View>
          </View>

          {/* Guest + Manual sign-in tiles */}
          <View style={styles.centerCol}>
            <TouchableOpacity
              style={styles.actionTile}
              activeOpacity={0.85}
              onPress={() => dispatch({ type: 'SHOW_GUEST' })}
            >
              <NeuCard style={StyleSheet.absoluteFill} radius={20} />
              <Ionicons name="person-outline" size={22} color={colors.textMuted} style={styles.actionIcon} />
              <Text style={styles.actionText}>Guest{'\n'}sign in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              activeOpacity={0.85}
              onPress={() => dispatch({ type: 'SHOW_MANUAL' })}
            >
              <NeuCard style={StyleSheet.absoluteFill} radius={20} />
              <Ionicons name="create-outline" size={22} color={colors.textMuted} style={styles.actionIcon} />
              <Text style={styles.actionText}>Manual{'\n'}sign in</Text>
            </TouchableOpacity>
          </View>

          {/* Clock card */}
          <NeuCard style={styles.clockCard} radius={20}>
            <AnalogClock size={clockSize} />
          </NeuCard>

        </Animated.View>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: PAD,
    gap: GAP,
    backgroundColor: '#E0E5EC',
  },

  // ── Portrait layout ──
  portraitRoot: {
    flex: 1,
    padding: PAD,
    backgroundColor: '#E0E5EC',
  },
  portraitTopBar: {
    alignItems: 'flex-end',
    paddingVertical: 6,
  },
  portraitCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  portraitBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingBottom: 8,
  },
  portraitBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  portraitBtnText: {
    fontSize: 14,
    fontFamily: FONT_MEDIUM,
    color: colors.textSecondary,
    letterSpacing: -0.2,
  },

  // ── Top row ──
  topRow: {
    height: TOP_H,
    flexDirection: 'row',
    gap: GAP,
  },

  dateCard: {
    flex: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  dateText: {
    fontSize: Math.min(TOP_H * 0.68, 128),
    fontFamily: 'SuissNord',
    color: colors.textPrimary,
    letterSpacing: -3,
    lineHeight: Math.min(TOP_H * 0.76, 143),
  },

  employeesCard: {
    flex: 14,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  lyraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  lyraDot: {
    width: 20,
    height: 20,
    borderRadius: 100,
  },
  lyraText: {
    fontSize: 22,
    fontFamily: 'Satoshi',
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  employeeCount: {
    fontSize: Math.min(TOP_H * 0.50, 85),
    fontFamily: 'SuissNord',
    color: colors.textPrimary,
    letterSpacing: -2,
  },
  employeeLabel: {
    fontSize: 15,
    fontFamily: FONT_MEDIUM,
    color: colors.textSecondary,
    letterSpacing: -0.1,
    paddingBottom: 6,
  },

  // ── Bottom row ──
  bottomRow: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },

  qrSection: {
    flex: 13,
    flexDirection: 'column',
    alignItems: 'center',
  },
  scanLabelArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLabelText: {
    fontSize: 16,
    fontFamily: FONT_MEDIUM,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },

  centerCol: {
    flex: 5,
    gap: GAP,
  },
  actionTile: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'visible',
    paddingBottom: 14,
    paddingRight: 14,
  },
  actionIcon: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  actionText: {
    fontSize: 15,
    fontFamily: FONT_MEDIUM,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 16,
    letterSpacing: -0.2,
  },

  clockCard: {
    flex: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
});
