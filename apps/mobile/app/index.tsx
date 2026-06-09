import React, { useEffect, useMemo, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HomeScreen } from '../src/screens/HomeScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';
import { useMobileWorkflow } from '../src/providers/MobileWorkflowProvider';
import { formatSecondsToHMS } from '../src/lib/billing';

export default function HomePage() {
  const router = useRouter();
  const { user, isGuest, isLoading, signOut } = useMobileAuth();
  const {
    workflow,
    activeLocation,
    currentReservation,
    currentSession,
    activeSlot,
    slotCountLabel,
    notificationReadiness,
    isCheckingNotifications,
    isRefreshingBackend,
    connectionBannerMessage,
    openReservationFlow,
    openSessionFlow,
    enableNotifications,
  } = useMobileWorkflow();
  const [tick, setTick] = useState(() => new Date());
  const isGuestMode = isGuest && !user;

  useEffect(() => {
    const timer = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeDurationLabel = useMemo(() => {
    if (!currentSession?.started_at) {
      return '00:00:00';
    }

    const startedAt = new Date(currentSession.started_at).getTime();
    if (Number.isNaN(startedAt)) {
      return '00:00:00';
    }

    const elapsedSeconds = Math.max(0, Math.floor((tick.getTime() - startedAt) / 1000));
    return formatSecondsToHMS(elapsedSeconds);
  }, [currentSession?.started_at, tick]);

  if (isLoading) {
    return null;
  }

  if (!user && !isGuestMode) {
    return <Redirect href="/login" />;
  }

  if (workflow.stage === 'reserve') {
    return <Redirect href="/reserve" />;
  }

  if (workflow.stage === 'validate') {
    return <Redirect href="/validate" />;
  }

  if (workflow.stage === 'session') {
    return <Redirect href="/session" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        {connectionBannerMessage ? (
          <View style={[styles.banner, workflow.connectionState === 'offline' ? styles.bannerOffline : styles.bannerDegraded]}>
            <View style={styles.bannerTextRow}>
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerTitle}>
                  {workflow.connectionState === 'offline'
                    ? 'Offline mode'
                    : workflow.connectionState === 'degraded'
                      ? 'Fallback data in use'
                      : 'Booting'}
                </Text>
                <Text style={styles.bannerText}>{connectionBannerMessage}</Text>
              </View>
              {workflow.connectionState !== 'live' ? (
                <TouchableOpacity
                  style={[styles.bannerButton, isRefreshingBackend ? styles.bannerButtonDisabled : null]}
                  onPress={() => {
                    openReservationFlow();
                    router.push('/reserve');
                  }}
                  disabled={isRefreshingBackend}
                >
                  <Text style={styles.bannerButtonText}>{isRefreshingBackend ? 'Syncing...' : 'Open Reserve'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <HomeScreen
          locationName={activeLocation?.name ?? 'Parking Site'}
          locationAddress={activeLocation?.address ?? 'Connected lot'}
          slotCountLabel={slotCountLabel}
          isLoading={workflow.connectionState === 'booting'}
          isGuest={isGuestMode}
          notificationLabel={notificationReadiness.label}
          notificationMessage={notificationReadiness.message}
          isRefreshingNotifications={isCheckingNotifications}
          onStartReservation={() => {
            if (isGuestMode) {
              router.push('/login');
              return;
            }

            openReservationFlow();
            router.push('/reserve');
          }}
          onViewSession={() => {
            if (isGuestMode) {
              router.push('/login');
              return;
            }

            openSessionFlow();
            router.push(currentSession ? '/session' : currentReservation ? '/validate' : '/reserve');
          }}
          onEnableNotifications={() => {
            void enableNotifications();
          }}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>{activeLocation?.name ?? 'No location'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned Slot</Text>
            <Text style={styles.value}>{activeSlot?.label ?? 'No slot selected'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Timer</Text>
            <Text style={styles.value}>{currentSession ? activeDurationLabel : 'Not active'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => void signOut()}>
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (isGuestMode) {
                router.push('/login');
                return;
              }

              openReservationFlow();
              router.push('/reserve');
            }}
          >
            <Text style={styles.primaryButtonText}>{isGuestMode ? 'Sign in to Reserve' : 'Reserve'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08111f',
  },
  content: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  banner: {
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
  },
  bannerTextRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bannerCopy: {
    flex: 1,
    gap: 6,
  },
  bannerOffline: {
    backgroundColor: '#2a1114',
    borderColor: '#8f3c46',
  },
  bannerDegraded: {
    backgroundColor: '#2a220f',
    borderColor: '#8a6b2f',
  },
  bannerTitle: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  bannerText: {
    color: '#f5e6bf',
    fontSize: 13,
    lineHeight: 18,
  },
  bannerButton: {
    backgroundColor: '#1a2e49',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#26405f',
  },
  bannerButtonDisabled: {
    opacity: 0.7,
  },
  bannerButtonText: {
    color: '#f4f7fb',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#0f1b2c',
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    color: '#f4f7fb',
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: '#7f94ad',
    fontSize: 14,
  },
  value: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3dd6a5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#071018',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1a2e49',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#26405f',
  },
  secondaryButtonText: {
    color: '#f4f7fb',
    fontWeight: '700',
  },
});
