import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Check, CreditCard, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { AppScreenHeader } from '../../auth/components/AuthPrimitives';
import { useWalkInPreferencesStore } from '../../parking/store/useWalkInPreferencesStore';
import { usePaymentMethodsStore } from '../store/usePaymentMethodsStore';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const wallets = usePaymentMethodsStore((state) => state.wallets);
  const cards = usePaymentMethodsStore((state) => state.cards);
  const linkWallet = usePaymentMethodsStore((state) => state.linkWallet);
  const unlinkWallet = usePaymentMethodsStore((state) => state.unlinkWallet);
  const addCard = usePaymentMethodsStore((state) => state.addCard);
  const removeCard = usePaymentMethodsStore((state) => state.removeCard);
  const selectedPaymentMethod = useWalkInPreferencesStore((state) => state.paymentMethod);
  const setPaymentMethod = useWalkInPreferencesStore((state) => state.setPaymentMethod);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const normalizedCardNumber = cardNumber.replace(/\D/g, '').slice(0, 16);
  const expiryDigits = expiry.replace(/\D/g, '').slice(0, 4);
  const formattedCardNumber = normalizedCardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  const formattedExpiry = expiryDigits.length > 2 ? `${expiryDigits.slice(0, 2)}/${expiryDigits.slice(2, 4)}` : expiryDigits;
  const isCardValid =
    normalizedCardNumber.length >= 12
    && cardholderName.trim().length >= 3
    && expiryDigits.length === 4
    && cvv.replace(/\D/g, '').length >= 3;

  const nextWalletDetail = useMemo(() => '+63 912 345 6789', []);

  function getCardType(value: string) {
    if (value.startsWith('4')) {
      return 'Visa';
    }

    if (/^5[1-5]/.test(value) || /^2(2[2-9]|[3-6]|7[01])/.test(value)) {
      return 'Mastercard';
    }

    return 'Card';
  }

  function handleWalletToggle(walletId: string, name: string, linked: boolean) {
    if (linked) {
      unlinkWallet(walletId);
      if (selectedPaymentMethod === name) {
        setPaymentMethod(null);
      }
      return;
    }

    linkWallet(walletId, nextWalletDetail);
    setPaymentMethod(name);
  }

  function handleSaveCard() {
    if (!isCardValid) {
      return;
    }

    const last4 = normalizedCardNumber.slice(-4);
    const type = getCardType(normalizedCardNumber);
    const label = `${type} •••• ${last4}`;

    addCard({
      id: Date.now().toString(),
      label,
      type,
      last4,
    });
    setPaymentMethod(label);
    setCardNumber('');
    setCardholderName('');
    setExpiry('');
    setCvv('');
    setShowAddCard(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.inner, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.maxWidth, { maxWidth: contentWidth }]}>
              <View
                style={[
                styles.header,
                {
                  marginHorizontal: -horizontalPadding,
                },
              ]}
            >
                <AppScreenHeader title="Payment Methods" onBack={() => router.back()} />
              </View>

              <View style={styles.content}>
                <View>
                  <Text style={styles.sectionEyebrow}>E-WALLETS</Text>
                  <View style={styles.stack}>
                    {wallets.map((wallet) => {
                      const active = selectedPaymentMethod === wallet.name;

                      return (
                        <View key={wallet.id} style={[styles.walletCard, wallet.linked ? styles.walletCardLinked : null, active ? styles.walletCardSelected : null]}>
                          <View style={styles.walletRow}>
                            <View style={styles.walletLeft}>
                              <View style={[styles.walletIcon, { backgroundColor: wallet.color }]}>
                                <Text style={styles.walletIconText}>{wallet.name}</Text>
                              </View>
                              <View>
                                <Text style={styles.walletName}>{wallet.name}</Text>
                                <Text style={[styles.walletDetail, wallet.linked ? styles.walletDetailLinked : null]}>{wallet.detail}</Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() => handleWalletToggle(wallet.id, wallet.name, wallet.linked)}
                              style={[styles.walletAction, wallet.linked ? styles.walletActionDanger : styles.walletActionPrimary]}
                            >
                              <Text style={[styles.walletActionText, wallet.linked ? styles.walletActionTextDanger : styles.walletActionTextPrimary]}>
                                {wallet.linked ? 'Unlink' : 'Link'}
                              </Text>
                            </Pressable>
                          </View>

                          {wallet.linked ? (
                            <Pressable onPress={() => setPaymentMethod(wallet.name)} style={styles.walletFooter}>
                              <Check color="#16A34A" size={12} strokeWidth={2.4} />
                              <Text style={styles.walletFooterText}>
                                {active ? 'Default payment method for walk-in parking' : 'Account linked and ready for payments'}
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={styles.sectionEyebrow}>CREDIT / DEBIT CARDS</Text>
                  <View style={styles.stack}>
                    {cards.map((card) => {
                      const active = selectedPaymentMethod === card.label;

                      return (
                        <Pressable key={card.id} onPress={() => setPaymentMethod(card.label)} style={[styles.cardRow, active ? styles.cardRowSelected : null]}>
                          <View style={styles.cardLeft}>
                            <View style={styles.cardTypeBadge}>
                              <Text style={styles.cardTypeText}>{card.type}</Text>
                            </View>
                            <Text style={styles.cardLabel}>{card.label}</Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              removeCard(card.id);
                              if (selectedPaymentMethod === card.label) {
                                setPaymentMethod(null);
                              }
                            }}
                            hitSlop={8}
                            style={styles.cardDeleteButton}
                          >
                            <Trash2 color="#94A3B8" size={16} strokeWidth={2.1} />
                          </Pressable>
                        </Pressable>
                      );
                    })}

                    <Pressable onPress={() => setShowAddCard((value) => !value)} style={styles.addCardButton}>
                      <Plus color="#64748B" size={16} strokeWidth={2.2} />
                      <Text style={styles.addCardText}>Add New Card</Text>
                    </Pressable>

                    {showAddCard ? (
                      <View style={styles.addCardPanel}>
                        <Field label="Card Number">
                          <TextInput
                            value={formattedCardNumber}
                            onChangeText={setCardNumber}
                            keyboardType="number-pad"
                            placeholder="1234 5678 9012 3456"
                            placeholderTextColor="#94A3B8"
                            style={styles.textField}
                          />
                        </Field>

                        <Field label="Cardholder Name">
                          <TextInput
                            value={cardholderName}
                            onChangeText={setCardholderName}
                            placeholder="Juan dela Cruz"
                            placeholderTextColor="#94A3B8"
                            style={styles.textField}
                          />
                        </Field>

                        <View style={styles.splitRow}>
                          <Field label="Expiry" style={styles.splitField}>
                            <TextInput
                              value={formattedExpiry}
                              onChangeText={setExpiry}
                              keyboardType="number-pad"
                              placeholder="MM/YY"
                              placeholderTextColor="#94A3B8"
                              style={styles.textField}
                            />
                          </Field>
                          <Field label="CVV" style={styles.splitField}>
                            <TextInput
                              value={cvv.replace(/\D/g, '').slice(0, 4)}
                              onChangeText={setCvv}
                              keyboardType="number-pad"
                              placeholder="•••"
                              placeholderTextColor="#94A3B8"
                              style={styles.textField}
                            />
                          </Field>
                        </View>

                        <Pressable onPress={handleSaveCard} disabled={!isCardValid} style={[styles.saveCardButton, !isCardValid ? styles.saveCardButtonDisabled : null]}>
                          <Text style={[styles.saveCardText, !isCardValid ? styles.saveCardTextDisabled : null]}>Save Card</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Field({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: object;
}) {
  return (
    <View style={style}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  page: {
    flex: 1,
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
  sectionEyebrow: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  stack: {
    gap: 12,
  },
  walletCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  walletCardLinked: {
    borderColor: '#A7F3D0',
  },
  walletCardSelected: {
    shadowColor: '#0F766E',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Poppins_700Bold',
  },
  walletName: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  walletDetail: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  walletDetailLinked: {
    color: '#16A34A',
  },
  walletAction: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletActionPrimary: {
    backgroundColor: '#0F766E',
  },
  walletActionDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  walletActionText: {
    fontSize: 14,
    lineHeight: 17,
    fontFamily: 'Poppins_600SemiBold',
  },
  walletActionTextPrimary: {
    color: '#FFFFFF',
  },
  walletActionTextDanger: {
    color: '#DC2626',
  },
  walletFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECFDF5',
  },
  walletFooterText: {
    color: '#16A34A',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    flex: 1,
  },
  cardRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardRowSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#F0FDFA',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardTypeBadge: {
    width: 42,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_700Bold',
  },
  cardLabel: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
  },
  cardDeleteButton: {
    padding: 4,
  },
  addCardButton: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addCardText: {
    color: '#64748B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  addCardPanel: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#0F766E',
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  textField: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitField: {
    flex: 1,
  },
  saveCardButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCardButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  saveCardText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
  },
  saveCardTextDisabled: {
    color: '#94A3B8',
  },
});


