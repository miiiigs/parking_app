import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Phone, User } from 'lucide-react-native';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { formatPhilippinePhoneDisplay } from '../../auth/utils';
import { AuthLogo } from '../../auth/components/AuthPrimitives';

export default function EditProfileScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const initialName = useMemo(() => {
    const metadataName = auth.user?.user_metadata?.display_name ?? auth.user?.user_metadata?.full_name;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim();
    }

    if (auth.user?.email) {
      return auth.user.email.split('@')[0];
    }

    return '';
  }, [auth.user?.email, auth.user?.user_metadata?.display_name, auth.user?.user_metadata?.full_name]);
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phoneLabel = auth.user?.phone ? formatPhilippinePhoneDisplay(auth.user.phone) : 'No phone number on file';
  const canSave = !auth.isGuest && Boolean(auth.user) && name.trim().length >= 2 && name.trim() !== initialName;

  async function handleSave() {
    if (!canSave) {
      return;
    }

    try {
      setBusy(true);
      setSaved(false);
      setErrorMessage(null);
      await auth.updateProfile({ displayName: name.trim() });
      setSaved(true);
      setTimeout(() => {
        router.back();
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the profile right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                  styles.header,
                  {
                    marginHorizontal: -horizontalPadding,
                    paddingHorizontal: horizontalPadding,
                  },
                ]}
              >
              <View style={styles.headerLeading}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                  <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
                </Pressable>
                <AuthLogo height={28} />
              </View>
              <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            <View style={styles.content}>
              <View style={styles.avatarBlock}>
                <View style={styles.avatarBubble}>
                  <User color="#FFFFFF" size={36} strokeWidth={2.1} />
                </View>
                <Pressable onPress={() => Alert.alert('Change Photo', 'Profile photo upload is not connected yet in the mobile app.')} hitSlop={8}>
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </Pressable>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <View style={styles.inputShell}>
                  <User color="#94A3B8" size={16} strokeWidth={2.2} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your full name"
                    placeholderTextColor="#94A3B8"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone Number</Text>
                <View style={styles.inputShellMuted}>
                  <Phone color="#94A3B8" size={16} strokeWidth={2.2} />
                  <TextInput
                    editable={false}
                    value={phoneLabel}
                    style={styles.inputMuted}
                  />
                </View>
                <Text style={styles.fieldHint}>Phone number cannot be changed here. Use Change Phone Number from the menu.</Text>
              </View>

              {auth.isGuest ? (
                <Text style={styles.infoText}>Sign in to save profile changes to your account.</Text>
              ) : null}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable onPress={() => void handleSave()} disabled={!canSave || busy} style={[styles.saveButton, (!canSave || busy) ? styles.saveButtonDisabled : null, saved ? styles.saveButtonSaved : null]}>
                <View style={styles.saveButtonRow}>
                  {saved ? <Check color="#FFFFFF" size={18} strokeWidth={2.4} /> : null}
                  <Text style={styles.saveButtonText}>
                    {busy ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
  },
  maxWidth: {
    width: '100%',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 20,
    paddingBottom: 16,
    gap: 14,
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 17,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  content: {
    gap: 20,
    paddingTop: 24,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 12,
  },
  avatarBubble: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  changePhotoText: {
    color: '#0F766E',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  inputShell: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  inputShellMuted: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#1E293B',
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    paddingVertical: 0,
  },
  inputMuted: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 17,
    fontFamily: 'Poppins_500Medium',
    paddingVertical: 0,
  },
  fieldHint: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
  },
  infoText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonSaved: {
    backgroundColor: '#16A34A',
  },
  saveButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_500Medium',
  },
});


