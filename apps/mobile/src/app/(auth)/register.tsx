import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Input, Button, Card } from '@/components';
import { useAuthStore } from '@/store';
import { COLORS, SPACING } from '@/constants';

export default function RegisterScreen() {
  const router = useRouter();
  const { setUser, setToken, loading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      // Simulated registration
      const mockUser = {
        id: '1',
        email,
        name,
      };
      const mockToken = 'mock-token-' + Date.now();

      setUser(mockUser);
      setToken(mockToken);

      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.appName}>ParkHub</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </View>

        <Card style={styles.formCard}>
          {error && <Text style={styles.error}>{error}</Text>}

          <Input
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginTop: SPACING.md }}
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={{ marginTop: SPACING.md }}
          />

          <Input
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={{ marginTop: SPACING.md }}
          />

          <Button
            label={loading ? 'Creating account...' : 'Sign Up'}
            variant="primary"
            size="lg"
            onPress={handleRegister}
            disabled={loading}
            loading={loading}
            style={{ marginTop: SPACING.lg, width: '100%' }}
          />
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
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
    flexGrow: 1,
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
