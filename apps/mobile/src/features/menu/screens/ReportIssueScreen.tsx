import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { AlertTriangle, CarFront, Check, CreditCard, ImagePlus, MessageSquare, QrCode } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';

const CATEGORIES = [
  { id: 'slot', label: 'Slot marked available but occupied', icon: CarFront },
  { id: 'incident', label: 'Damaged vehicle or incident report', icon: AlertTriangle },
  { id: 'payment', label: 'Payment issue', icon: CreditCard },
  { id: 'qr', label: 'Entry or exit QR scan issue', icon: QrCode },
  { id: 'other', label: 'Other concerns', icon: MessageSquare },
] as const;

export default function ReportIssueScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const referenceNumber = useMemo(() => `RPT-2026-${Math.floor(Math.random() * 90000) + 10000}`, []);
  const canSubmit = Boolean(category) && description.trim().length >= 10;

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successWrap}>
          <View style={styles.successBubble}>
            <Check color="#FFFFFF" size={34} strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successCopy}>Our team will review your concern and get back to you within 24 hours.</Text>
          <View style={styles.referenceCard}>
            <Text style={styles.referenceLabel}>Reference No.</Text>
            <Text style={styles.referenceValue}>{referenceNumber}</Text>
          </View>
          <Pressable onPress={() => router.replace('/profile')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to Profile</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
          <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
            <View style={[styles.header, { marginHorizontal: -horizontalPadding }]}>
              <AppScreenHeader title="Report an Issue" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <View>
                <Text style={styles.sectionTitle}>What type of issue are you reporting?</Text>
                <View style={styles.categoryList}>
                  {CATEGORIES.map((item) => {
                    const active = category === item.id;
                    const Icon = item.icon;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setCategory(item.id)}
                        style={[styles.categoryButton, active ? styles.categoryButtonActive : null]}
                      >
                        <View style={styles.categoryIconWrap}>
                          <Icon color={active ? '#0F766E' : '#64748B'} size={18} strokeWidth={2.2} />
                        </View>
                        <Text style={[styles.categoryLabel, active ? styles.categoryLabelActive : null]}>{item.label}</Text>
                        <View style={[styles.categoryCheck, active ? styles.categoryCheckActive : null]}>
                          {active ? <Check color="#FFFFFF" size={11} strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>Issue Description</Text>
                <TextInput
                  multiline
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Please describe the issue in detail..."
                  placeholderTextColor="#94A3B8"
                  style={[styles.textArea, description.trim().length >= 10 ? styles.textAreaActive : null]}
                  textAlignVertical="top"
                />
                <View style={styles.counterRow}>
                  <Text style={styles.helperText}>Minimum 10 characters</Text>
                  <Text style={[styles.counterText, description.length > 0 ? styles.counterTextActive : null]}>{description.length}/500</Text>
                </View>
              </View>

              <View>
                <Text style={styles.sectionTitle}>Attach Photo</Text>
                <Pressable style={styles.uploadBox}>
                  <View style={styles.uploadIconWrap}>
                    <ImagePlus color="#94A3B8" size={20} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.uploadTitle}>Tap to upload a photo</Text>
                  <Text style={styles.uploadSubtitle}>JPG or PNG up to 5MB</Text>
                </Pressable>
              </View>

              <Pressable onPress={() => canSubmit && setSubmitted(true)} disabled={!canSubmit} style={[styles.primaryButton, !canSubmit ? styles.primaryButtonDisabled : null]}>
                <Text style={[styles.primaryButtonText, !canSubmit ? styles.primaryButtonTextDisabled : null]}>Submit Report</Text>
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
  header: {},
  content: {
    gap: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12,
  },
  categoryList: {
    gap: 8,
  },
  categoryButton: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryButtonActive: {
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.08,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  categoryLabelActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCheckActive: {
    borderColor: '#0F766E',
    backgroundColor: '#0F766E',
  },
  textArea: {
    minHeight: 124,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  textAreaActive: {
    borderColor: '#0F766E',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  counterText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  counterTextActive: {
    color: '#0F766E',
  },
  uploadBox: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  uploadSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  primaryButtonTextDisabled: {
    color: '#94A3B8',
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FAFAF9',
  },
  successBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    color: '#0F766E',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Poppins_700Bold',
  },
  successCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  referenceCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    padding: 16,
    marginBottom: 24,
  },
  referenceLabel: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  referenceValue: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Poppins_700Bold',
    marginTop: 2,
  },
});
