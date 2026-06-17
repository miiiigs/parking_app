import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { getRouteParam } from '../utils';
import { AuthActionButton, AuthLogo } from '../components/AuthPrimitives';

export default function AuthLandingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const auth = useMobileAuth();
  const [busyGuest, setBusyGuest] = useState(false);
  const requestedReturnTo = getRouteParam(params.returnTo);
  const authReturnTo = requestedReturnTo ?? '/home';
  const guestReturnTo = requestedReturnTo ?? '/guest';

  useEffect(() => {
    if (auth.isLoading) {
      return;
    }

    if (auth.user) {
      router.replace(authReturnTo as Parameters<typeof router.replace>[0]);
      return;
    }

    if (auth.isGuest) {
      router.replace(guestReturnTo as Parameters<typeof router.replace>[0]);
    }
  }, [auth.isGuest, auth.isLoading, auth.user, authReturnTo, guestReturnTo, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.heroSection}>
          <View style={styles.heroBubbleTop} />
          <View style={styles.heroBubbleBottom} />
          <AuthLogo stacked size={80} showTagline />
        </View>

        <View style={styles.contentSection}>
          <View style={styles.copyBlock}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Find and reserve parking spaces before you arrive.</Text>
          </View>

          <View style={styles.actions}>
            <AuthActionButton
              label="Log In"
              onPress={() => router.push({ pathname: '/login', params: { returnTo: authReturnTo } })}
            />
            <AuthActionButton
              label="Register"
              variant="secondary"
              onPress={() => router.push({ pathname: '/register', params: { returnTo: authReturnTo } })}
            />
            <AuthActionButton
              label="Continue as Guest"
              variant="muted"
              loading={busyGuest}
              onPress={async () => {
                try {
                  setBusyGuest(true);
                  await auth.continueAsGuest();
                  router.replace(guestReturnTo as Parameters<typeof router.replace>[0]);
                } finally {
                  setBusyGuest(false);
                }
              }}
            />
          </View>

          <View style={styles.noticeCard}>
            <AlertCircle color="#F97316" size={15} strokeWidth={2.1} style={{ marginTop: 1 }} />
            <Text style={styles.noticeCopy}>
              Guests can browse parking lots and availability but cannot reserve parking slots.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  root: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  heroSection: {
    flexBasis: '44%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8FBF2',
    overflow: 'hidden',
  },
  heroBubbleTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.15)',
  },
  heroBubbleBottom: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: 'rgba(15,118,110,0.1)',
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  copyBlock: {
    gap: 6,
    marginBottom: 24,
  },
  title: {
    color: '#1E293B',
    fontSize: 28,
    lineHeight: 33,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.04,
  },
  actions: {
    gap: 12,
  },
  noticeCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    padding: 12,
  },
  noticeCopy: {
    flex: 1,
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.03,
  },
});

