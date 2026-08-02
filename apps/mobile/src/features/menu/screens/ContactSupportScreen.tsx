import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, ChevronRight, Mail, MessageSquare, Phone } from 'lucide-react-native';
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';

const TOPICS = [
  'Reservation issue',
  'Payment problem',
  'Walk-in parking help',
  'Account and login',
  'Vehicle information',
  'Technical bug',
  'Other',
] as const;

export default function ContactSupportScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [showTopicList, setShowTopicList] = useState(false);
  const canSend = topic.length > 0 && message.trim().length >= 10;

  if (sent) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successWrap}>
          <View style={styles.successBubble}>
            <Check color="#FFFFFF" size={34} strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>Message Sent</Text>
          <Text style={styles.successCopy}>Our support team will get back to you within 24 to 48 hours via email or SMS.</Text>
          <View style={styles.topicCard}>
            <Text style={styles.topicLabel}>Topic submitted</Text>
            <Text style={styles.topicValue}>{topic}</Text>
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
              <AppScreenHeader title="Contact Support" onBack={() => router.back()} />
            </View>

            <View style={styles.content}>
              <View>
                <Text style={styles.eyebrow}>CONTACT US DIRECTLY</Text>
                <View style={styles.stack}>
                  <ContactCard
                    icon={Mail}
                    label="Email Support"
                    value="support@parkingph.com"
                    onPress={() => void Linking.openURL('mailto:support@parkingph.com')}
                  />
                  <ContactCard
                    icon={Phone}
                    label="Hotline"
                    value="+63 2 800 1234"
                    detail="Mon-Fri, 8:00 AM to 6:00 PM"
                    onPress={() => void Linking.openURL('tel:+6328001234')}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.eyebrow}>SEND US A MESSAGE</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Topic</Text>
                  <Pressable onPress={() => setShowTopicList((value) => !value)} style={[styles.pickerButton, topic ? styles.pickerButtonActive : null]}>
                    <View style={styles.pickerLeft}>
                      <MessageSquare color="#94A3B8" size={16} strokeWidth={2.2} />
                      <Text style={[styles.pickerText, !topic ? styles.pickerPlaceholder : null]}>{topic || 'Select a topic'}</Text>
                    </View>
                    <ChevronRight color="#64748B" size={16} strokeWidth={2.2} style={{ transform: [{ rotate: showTopicList ? '90deg' : '0deg' }] }} />
                  </Pressable>

                  {showTopicList ? (
                    <View style={styles.topicList}>
                      {TOPICS.map((item, index) => {
                        const active = item === topic;

                        return (
                          <Pressable
                            key={item}
                            onPress={() => {
                              setTopic(item);
                              setShowTopicList(false);
                            }}
                            style={[styles.topicItem, index < TOPICS.length - 1 ? styles.topicItemBorder : null, active ? styles.topicItemActive : null]}
                          >
                            <Text style={[styles.topicItemText, active ? styles.topicItemTextActive : null]}>{item}</Text>
                            {active ? <Check color="#0F766E" size={14} strokeWidth={2.4} /> : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Message</Text>
                  <TextInput
                    multiline
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Describe your issue or question in detail..."
                    placeholderTextColor="#94A3B8"
                    style={[styles.textArea, message.trim().length >= 10 ? styles.textAreaActive : null]}
                    textAlignVertical="top"
                  />
                  <View style={styles.counterRow}>
                    <Text style={styles.helperText}>Minimum 10 characters</Text>
                    <Text style={[styles.counterText, message.length > 0 ? styles.counterTextActive : null]}>{message.length}/500</Text>
                  </View>
                </View>

                <Pressable onPress={() => canSend && setSent(true)} disabled={!canSend} style={[styles.primaryButton, !canSend ? styles.primaryButtonDisabled : null]}>
                  <Text style={[styles.primaryButtonText, !canSend ? styles.primaryButtonTextDisabled : null]}>Send Message</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ContactCard({
  detail,
  icon: Icon,
  label,
  onPress,
  value,
}: {
  detail?: string;
  icon: typeof Mail;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.contactCard}>
      <View style={styles.contactIconWrap}>
        <Icon color="#0F766E" size={18} strokeWidth={2.2} />
      </View>
      <View style={styles.contactCopy}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue}>{value}</Text>
        {detail ? <Text style={styles.contactDetail}>{detail}</Text> : null}
      </View>
      <ChevronRight color="#CBD5E1" size={16} strokeWidth={2.2} />
    </Pressable>
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
    gap: 24,
    paddingTop: 20,
  },
  eyebrow: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  stack: {
    gap: 8,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
  },
  contactLabel: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
  },
  contactValue: {
    color: '#0F766E',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  contactDetail: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  formGroup: {
    gap: 6,
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  pickerButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickerButtonActive: {
    borderColor: '#0F766E',
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pickerText: {
    color: '#1E293B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  pickerPlaceholder: {
    color: '#94A3B8',
  },
  topicList: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  topicItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  topicItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topicItemActive: {
    backgroundColor: '#F0FDFA',
  },
  topicItemText: {
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
  },
  topicItemTextActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
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
  topicCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDFA',
    padding: 16,
    marginBottom: 24,
  },
  topicLabel: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
  },
  topicValue: {
    color: '#0F766E',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
});
