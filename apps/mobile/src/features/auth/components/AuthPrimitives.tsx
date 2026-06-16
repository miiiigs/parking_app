import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { ChevronLeft, Phone } from 'lucide-react-native';

import { colors, radius, spacing } from '../../../theme/tokens';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'muted';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

type AuthHeaderBarProps = {
  title: string;
  onBack: () => void;
};

type AuthLogoProps = {
  height?: number;
  size?: number;
  stacked?: boolean;
  showTagline?: boolean;
};

type AuthPhoneFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helper?: string;
  valid?: boolean;
};

type AuthTextFieldProps = TextInputProps & {
  label: string;
  helper?: string;
};

export function AuthLogo({ height = 30, size = 80, stacked = false, showTagline = false }: AuthLogoProps) {
  if (stacked) {
    return (
      <View style={styles.logoStack}>
        <View style={[styles.logoBadgeLarge, { width: size * 0.86, height: size * 0.86, borderRadius: size * 0.24 }]}>
          <Text style={styles.logoBadgeLargeText}>P</Text>
        </View>
        <Text style={styles.logoWordmarkLarge}>ParkingPH</Text>
        {showTagline ? <Text style={styles.logoTagline}>Smart Parking Made Easy</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.logoInline}>
      <View style={[styles.logoBadgeSmall, { width: height, height: height, borderRadius: height * 0.28 }]}>
        <Text style={styles.logoBadgeSmallText}>P</Text>
      </View>
      <Text style={styles.logoWordmarkSmall}>ParkingPH</Text>
    </View>
  );
}

export function AuthHeaderBar({ title, onBack }: AuthHeaderBarProps) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerLeading}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.headerBackButton}>
          <ChevronLeft color="#1E293B" size={24} strokeWidth={2.2} />
        </Pressable>
        <AuthLogo height={28} />
      </View>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function AuthActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.buttonBase,
        isPrimary ? styles.buttonPrimary : null,
        isSecondary ? styles.buttonSecondary : null,
        variant === 'muted' ? styles.buttonMuted : null,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary && !disabled ? '#FFFFFF' : '#0F766E'} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            isPrimary ? styles.buttonLabelPrimary : null,
            isSecondary ? styles.buttonLabelSecondary : null,
            variant === 'muted' ? styles.buttonLabelMuted : null,
            disabled ? styles.buttonLabelDisabled : null,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthPhoneField({ value, onChangeText, placeholder = '9XX XXX XXXX', helper, valid = false }: AuthPhoneFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>Phone Number</Text>
      <View style={[styles.phoneField, valid ? styles.phoneFieldValid : null]}>
        <View style={styles.phonePrefix}>
          <View style={styles.phoneCountryBadge}>
            <Text style={styles.phoneCountryBadgeText}>PH</Text>
          </View>
          <Text style={styles.phonePrefixText}>+63</Text>
        </View>
        <Phone color="#94A3B8" size={16} strokeWidth={2.1} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          style={styles.phoneInput}
        />
      </View>
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

export function AuthTextField({ label, helper, style, ...inputProps }: AuthTextFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#94A3B8"
        style={[styles.textInput, style]}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  logoStack: {
    alignItems: 'center',
    gap: 8,
  },
  logoBadgeLarge: {
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F766E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logoBadgeLargeText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.9,
  },
  logoWordmarkLarge: {
    color: '#0F766E',
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.35,
    lineHeight: 28,
  },
  logoTagline: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.05,
  },
  logoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoBadgeSmall: {
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeSmallText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.25,
  },
  logoWordmarkSmall: {
    color: '#0F766E',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.24,
    lineHeight: 18,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 17,
  },
  headerLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.08,
  },
  buttonBase: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F766E',
  },
  buttonMuted: {
    backgroundColor: '#F1F5F9',
  },
  buttonDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.06,
  },
  buttonLabelPrimary: {
    color: '#FFFFFF',
  },
  buttonLabelSecondary: {
    color: '#0F766E',
  },
  buttonLabelMuted: {
    color: '#64748B',
  },
  buttonLabelDisabled: {
    color: '#94A3B8',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.05,
  },
  phoneField: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  phoneFieldValid: {
    borderColor: '#0F766E',
    shadowColor: '#0F766E',
    shadowOpacity: 0.08,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  phoneCountryBadge: {
    minWidth: 28,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCountryBadgeText: {
    color: '#0F766E',
    fontSize: 9,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.15,
  },
  phonePrefixText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.04,
  },
  phoneInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: -0.04,
    paddingVertical: 0,
  },
  textInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#1E293B',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: -0.04,
  },
  fieldHelper: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
    letterSpacing: 0.04,
  },
});
