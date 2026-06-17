import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { colors } from '../../../theme/tokens';

const DEFAULT_SPLASH_DURATION_MS = 2600;

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
  const armProgress = useRef(new Animated.Value(0)).current;
  const carProgress = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);
  const [isProgressComplete, setIsProgressComplete] = useState(false);

  const progressTrackWidth = useMemo(() => Math.min(Math.max(width - 96, 180), 280), [width]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(armProgress, {
            toValue: 1,
            duration: 720,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(carProgress, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(armProgress, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(carProgress, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [armProgress, carProgress]);

  useEffect(() => {
    if (launchOnly) {
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setIsProgressComplete(true);
        }
      });
      return;
    }

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsProgressComplete(true);
      }
    });
  }, [durationMs, launchOnly, logoOpacity, logoScale, progress]);

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
  const armRotate = armProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-28deg', '0deg'],
  });
  const carTranslateY = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const carScale = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const carOpacity = carProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
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
              <Svg width={132} height={132} viewBox="0 0 132 132">
                <Path
                  d="M34 18h42c29 0 48 19 48 47 0 28-19 47-48 47H48v20H34V18zm14 14v66h28c20 0 34-13 34-33S96 32 76 32H48z"
                  fill="#0D727C"
                />
                <Rect x="18" y="56" width="14" height="68" rx="7" fill="#0D727C" />
                <Circle cx="25" cy="74" r="3.2" fill="#0D727C" />
                <Rect x="8" y="122" width="34" height="8" rx="4" fill="#0D727C" />
              </Svg>

              <View style={styles.armAnchor}>
                <Animated.View
                  style={[
                    styles.armWrap,
                    {
                      transform: [{ rotate: armRotate }],
                    },
                  ]}
                >
                  <Svg width={76} height={26} viewBox="0 0 76 26">
                    <Rect x="2" y="3" width="72" height="20" rx="10" fill="#0D727C" />
                    <Path d="M18 8l12-1-7 9-12 1 7-9z" fill="#FAFAF9" />
                    <Path d="M37 8l12-1-7 9-12 1 7-9z" fill="#FAFAF9" />
                    <Path d="M56 8l12-1-7 9-12 1 7-9z" fill="#FAFAF9" />
                  </Svg>
                </Animated.View>
              </View>

              <Animated.View
                style={[
                  styles.carWrap,
                  {
                    opacity: carOpacity,
                    transform: [{ translateY: carTranslateY }, { scale: carScale }],
                  },
                ]}
              >
                <Svg width={62} height={44} viewBox="0 0 62 44">
                  <Path
                    d="M10 18c1.4-4.3 5.2-7.2 9.8-7.2h16.4c4.6 0 8.4 2.9 9.8 7.2l1.1 3.4h3.4c3.7 0 6.7 3 6.7 6.7v4.3c0 3.7-3 6.7-6.7 6.7H48c-2.7 0-4.8-2.1-4.8-4.8v-.8H18.8v.8c0 2.7-2.1 4.8-4.8 4.8H11.5c-3.7 0-6.7-3-6.7-6.7v-4.3c0-3.7 3-6.7 6.7-6.7h3.4l1.1-3.4z"
                    fill="#1682EA"
                  />
                  <Path
                    d="M21 13.8h14c3.4 0 6.4 1.9 8 5l1 1.9H12l1-1.9c1.6-3.1 4.6-5 8-5z"
                    fill="#D7EEF8"
                  />
                  <Rect x="12" y="25" width="10" height="4.4" rx="2.2" fill="#F4FBFE" />
                  <Rect x="40" y="25" width="10" height="4.4" rx="2.2" fill="#F4FBFE" />
                  <Circle cx="16.2" cy="33.6" r="2.2" fill="#B6E3FF" />
                  <Circle cx="45.8" cy="33.6" r="2.2" fill="#B6E3FF" />
                </Svg>
              </Animated.View>
            </View>
            <Text style={styles.brandWordmark}>ParkingPH</Text>
            <Text style={styles.brandTagline}>Smart Parking Made Easy</Text>
          </View>
        </Animated.View>

        <View style={[styles.progressWrap, { width: progressTrackWidth }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {auth.isLoading && isProgressComplete ? <Text style={styles.loadingCopy}>Loading your account...</Text> : null}
        </View>
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
  markWrap: {
    width: 132,
    height: 132,
    position: 'relative',
  },
  armAnchor: {
    position: 'absolute',
    left: 25,
    top: 50,
    width: 0,
    height: 0,
  },
  armWrap: {
    marginLeft: -3,
    marginTop: -18,
  },
  carWrap: {
    position: 'absolute',
    right: 6,
    bottom: 1,
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

