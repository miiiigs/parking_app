import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthLogo } from '../../auth/components/AuthPrimitives';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';

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
  const progress = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);
  const [isProgressComplete, setIsProgressComplete] = useState(false);

  const progressTrackWidth = useMemo(() => Math.min(Math.max(width - 96, 180), 280), [width]);

  useEffect(() => {
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
  }, [durationMs, logoOpacity, logoScale, progress]);

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
          <AuthLogo stacked size={110} showTagline />
        </Animated.View>

        <View style={[styles.progressWrap, { width: progressTrackWidth }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          {!launchOnly && auth.isLoading && isProgressComplete ? <Text style={styles.loadingCopy}>Loading your account...</Text> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  loadingCopy: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.04,
  },
});

