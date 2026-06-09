import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView, StatusBar, View } from 'react-native';

import { ValidationScreen } from '../src/screens/ValidationScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';
import { useMobileWorkflow } from '../src/providers/MobileWorkflowProvider';

export default function ValidatePage() {
  const router = useRouter();
  const { user, isGuest, isLoading } = useMobileAuth();
  const {
    workflow,
    parkingData,
    currentReservation,
    createdReservationSlotLabel,
    setStage,
    setValidationQrToken,
    startSession,
  } = useMobileWorkflow();

  useEffect(() => {
    setStage('validate');
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

  if (workflow.stage === 'session') {
    return <Redirect href="/session" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08111f' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <ValidationScreen
          reservation={currentReservation}
          assignedSlotLabel={createdReservationSlotLabel}
          expectedQrToken={currentReservation ? parkingData.slots.find((slot) => slot.id === currentReservation.slot_id)?.qrToken ?? workflow.validationQrToken : workflow.validationQrToken}
          slotQrToken={workflow.validationQrToken}
          onSlotQrTokenChange={setValidationQrToken}
          isSubmitting={workflow.operation === 'startingSession'}
          errorMessage={workflow.reservationError}
          onValidate={(slotQrToken?: string) => {
            void startSession(slotQrToken);
          }}
          onBack={() => {
            setStage('reserve');
            router.replace('/reserve');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
