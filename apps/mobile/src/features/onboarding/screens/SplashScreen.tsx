import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { colors } from '../../../theme/tokens';

const DEFAULT_SPLASH_DURATION_MS = 2600;
const logoImage = require('../../../../assets/branding/app-logo.png');

export default function SplashScreen({
  launchOnly = false,
  durationMs = DEFAULT_SPLASH_DURATION_MS,
}: {
  launchOnly?: boolean;
  durationMs?: number;
}) {
  const router = useRouter();
  const auth = useMobileAuth();
  const { width } = useWindowDimensions();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.84)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(8)).current;
  const progressOpacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);
  const [isProgressComplete, setIsProgressComplete] = useState(false);

  const progressTrackWidth = useMemo(() => Math.min(Math.max(width - 96, 180), 280), [width]);

  useEffect(() => {
    setIsProgressComplete(false);
    logoOpacity.setValue(0);
    logoScale.setValue(0.84);
    textOpacity.setValue(0);
    textTranslateY.setValue(8);
    progressOpacity.setValue(0);
    progress.setValue(0);

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(progressOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        setIsProgressComplete(true);
      }
    });
  }, [durationMs, launchOnly, logoOpacity, logoScale, progress, progressOpacity, textOpacity, textTranslateY]);

  useEffect(() => {
    if (launchOnly) {
      return;
    }

    if (!isProgressComplete || auth.isLoading || hasNavigated.current) {
      return;
    }

    hasNavigated.current = true;

    if (auth.user) {
      router.replace('/home');
      return;
    }

    if (auth.isGuest) {
      router.replace('/guest');
      return;
    }

    router.replace('/onboarding');
  }, [auth.isGuest, auth.isLoading, auth.user, isProgressComplete, launchOnly, router]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressTrackWidth],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.brandStack}>
            <View style={styles.markWrap}>
              <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Animated.View
              style={[
                styles.brandTextStack,
                {
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                },
              ]}
            >
              <Text style={styles.brandWordmark}>ParkingPH</Text>
              <Text style={styles.brandTagline}>Smart Parking Made Easy</Text>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.progressWrap, { width: progressTrackWidth, opacity: progressOpacity }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {auth.isLoading && isProgressComplete ? <Text style={styles.loadingCopy}>Loading your account...</Text> : null}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandStack: {
    alignItems: 'center',
    gap: 8,
  },
  brandTextStack: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  markWrap: {
    width: 132,
    height: 132,
  },
  logoImage: {
    width: 132,
    height: 132,
  },
  brandWordmark: {
    color: '#0F766E',
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    lineHeight: 30,
  },
  brandTagline: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  progressWrap: {
    position: 'absolute',
    bottom: 72,
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D9E4DC',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  loadingCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.04,
  },
});

