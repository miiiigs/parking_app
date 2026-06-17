import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import HomeScreen from './HomeScreen';

export default function GuestScreen() {
  const auth = useMobileAuth();

  if (auth.isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="small" color="#0F766E" />
      </View>
    );
  }

  if (auth.user) {
    return <Redirect href="/home" />;
  }

  if (!auth.isGuest) {
    return <Redirect href={{ pathname: '/auth', params: { returnTo: '/guest' } }} />;
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAF9',
  },
});
