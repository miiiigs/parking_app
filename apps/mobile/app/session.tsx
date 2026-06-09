import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView, StatusBar, View } from 'react-native';

import { SessionScreen } from '../src/screens/SessionScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';
import { useMobileWorkflow } from '../src/providers/MobileWorkflowProvider';

export default function SessionPage() {
  const router = useRouter();
  const { user, isGuest, isLoading } = useMobileAuth();
  const {
    workflow,
    currentSession,
    currentReservation,
    setStage,
    endSession,
    returnHome,
  } = useMobileWorkflow();

  useEffect(() => {
    setStage('session');
  }, [setStage]);

  if (isLoading) {
    return null;
  }

  if (!user && !isGuest) {
    return <Redirect href="/login" />;
  }

  if (isGuest) {
    return <Redirect href="/login" />;
  }

  if (!currentReservation) {
    return <Redirect href="/reserve" />;
  }

  if (workflow.stage === 'home') {
    return <Redirect href="/" />;
  }

  if (workflow.stage === 'reserve') {
    return <Redirect href="/reserve" />;
  }

  if (workflow.stage === 'validate' && !currentSession) {
    return <Redirect href="/validate" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08111f' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <SessionScreen
          parkingSession={currentSession}
          reservation={currentReservation}
          selectedArrivalWindowMinutes={workflow.selectedArrivalWindowMinutes}
          isSubmitting={workflow.operation === 'endingSession'}
          errorMessage={workflow.reservationError}
          onFinish={() => {
            void (workflow.activeParkingSession?.session_status === 'completed' ? returnHome() : endSession());
          }}
          onBack={() => {
            if (workflow.activeParkingSession?.session_status === 'completed') {
              void returnHome();
              return;
            }

            setStage('validate');
            router.replace('/validate');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
