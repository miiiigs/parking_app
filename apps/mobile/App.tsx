import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { ReservationScreen } from './src/screens/ReservationScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ValidationScreen } from './src/screens/ValidationScreen';

type Stage = 'home' | 'reserve' | 'validate' | 'session';

export default function App() {
  const [stage, setStage] = useState<Stage>('home');

  const renderStage = () => {
    if (stage === 'reserve') {
      return <ReservationScreen onContinue={() => setStage('validate')} onBack={() => setStage('home')} />;
    }

    if (stage === 'validate') {
      return <ValidationScreen onValidate={() => setStage('session')} onBack={() => setStage('reserve')} />;
    }

    if (stage === 'session') {
      return <SessionScreen onFinish={() => setStage('home')} onBack={() => setStage('validate')} />;
    }

    return <HomeScreen onStartReservation={() => setStage('reserve')} onViewSession={() => setStage('session')} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        {renderStage()}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Session</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.value}>BGC Pilot Site</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Assigned Slot</Text>
            <Text style={styles.value}>Slot #12</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Timer</Text>
            <Text style={styles.value}>01:24:18</Text>
          </View>
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
  },
  label: {
    color: '#7f94ad',
    fontSize: 14,
  },
  value: {
    color: '#f4f7fb',
    fontSize: 14,
    fontWeight: '600',
  },
});
