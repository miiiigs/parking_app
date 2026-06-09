import React, { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView, StatusBar, View } from 'react-native';

import { ReservationScreen } from '../src/screens/ReservationScreen';
import { useMobileAuth } from '../src/providers/MobileAuthProvider';
import { useMobileWorkflow } from '../src/providers/MobileWorkflowProvider';

export default function ReservePage() {
  const router = useRouter();
  const { user, isGuest, isLoading } = useMobileAuth();
  const {
    workflow,
    parkingData,
    currentReservation,
    setStage,
    setSelectedSlotId,
    setSelectedArrivalWindowMinutes,
    setPlateNumber,
    createReservation,
  } = useMobileWorkflow();

  useEffect(() => {
    setStage('reserve');
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

  if (workflow.stage === 'home') {
    return <Redirect href="/" />;
  }

  if (workflow.stage === 'validate') {
    return <Redirect href="/validate" />;
  }

  if (workflow.stage === 'session') {
    return <Redirect href="/session" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#08111f' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <ReservationScreen
          slots={parkingData.slots}
          lotLayout={parkingData.lotLayout}
          selectedSlotId={workflow.selectedSlotId}
          selectedArrivalWindowMinutes={workflow.selectedArrivalWindowMinutes}
          plateNumber={workflow.plateNumber}
          isSubmitting={workflow.operation === 'creatingReservation'}
          isLiveData={parkingData.isLiveData}
          errorMessage={workflow.reservationError}
          onSelectSlot={setSelectedSlotId}
          onSelectArrivalWindow={setSelectedArrivalWindowMinutes}
          onPlateNumberChange={setPlateNumber}
          onSubmit={() => {
            void createReservation();
          }}
          onBack={() => {
            setStage('home');
            router.replace('/');
          }}
        />
      </View>
    </SafeAreaView>
  );
}
