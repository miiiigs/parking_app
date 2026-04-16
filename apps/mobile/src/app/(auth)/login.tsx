import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button, Card } from '@/components';
import { useAuthStore } from '@/store';
import { COLORS, SPACING } from '@/constants';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setToken, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    // For now, simulate login
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      // Simulated login
      const mockUser = {
        id: '1',
        email,
        name: email.split('@')[0],
      };
      const mockToken = 'mock-token-' + Date.now();

      setUser(mockUser);
      setToken(mockToken);

      // Navigate to home
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>ParkHub</Text>
          <Text style={styles.subtitle}>Find & Book Parking Easily</Text>
        </View>

        {/* Form */}
        <Card style={styles.formCard}>
          {error && <Text style={styles.error}>{error}</Text>}

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ marginTop: SPACING.md }}
          />

          <Button
            label={loading ? 'Signing in...' : 'Sign In'}
            variant="primary"
            size="lg"
            onPress={handleLogin}
            disabled={loading}
            loading={loading}
            style={{ marginTop: SPACING.lg, width: '100%' }}
          />
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/register')}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  formCard: {
    marginVertical: SPACING.xl,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
