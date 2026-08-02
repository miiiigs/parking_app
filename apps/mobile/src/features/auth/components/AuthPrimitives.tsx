import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
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
  animated?: boolean;
};

type AppScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  rightAccessory?: ReactNode;
};

type FlowScreenHeaderProps = {
  title?: string;
  onBack?: () => void;
  rightAccessory?: ReactNode;
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

const staticLogoSource = require('../../../../assets/branding/app-logo.png');
const animatedLogoSource = require('../../../../assets/branding/app-logo-splash.gif');

export const HEADER_LOGO_HEIGHT = 28;

export function AuthLogo({
  height = HEADER_LOGO_HEIGHT,
  size = 80,
  stacked = false,
  showTagline = false,
  animated = false,
}: AuthLogoProps) {
  const logoSource = animated ? animatedLogoSource : staticLogoSource;
  const [animatedReady, setAnimatedReady] = useState(false);

  useEffect(() => {
    if (!animated) {
      setAnimatedReady(false);
    }
  }, [animated]);

  if (stacked) {
    return (
      <View style={styles.logoStack}>
        <View style={[styles.logoStackMedia, { width: size, height: size }]}>
          <Image source={staticLogoSource} style={{ width: size, height: size }} resizeMode="contain" />
          {animated ? (
            <Image
              source={logoSource}
              style={[
                styles.animatedOverlay,
                {
                  width: size,
                  height: size,
                  opacity: animatedReady ? 1 : 0,
                },
              ]}
              resizeMode="contain"
              onLoad={() => setAnimatedReady(true)}
              onError={() => setAnimatedReady(false)}
            />
          ) : null}
        </View>
        <Text style={styles.logoWordmarkLarge}>ParkingPH</Text>
        {showTagline ? <Text style={styles.logoTagline}>Smart Parking Made Easy</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.logoInline}>
      <Image source={staticLogoSource} style={{ width: height, height }} resizeMode="contain" />
      <Text style={styles.logoWordmarkSmall}>ParkingPH</Text>
    </View>
  );
}

export function AppScreenHeader({ title, onBack, rightAccessory }: AppScreenHeaderProps) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerLeading}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.headerBackButton}>
            <ChevronLeft color="#1E293B" size={24} strokeWidth={2.2} />
          </Pressable>
        ) : null}
        <AuthLogo height={HEADER_LOGO_HEIGHT} />
      </View>
      <View style={styles.headerTitleWrap}>
        <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
        {rightAccessory ? <View style={styles.headerAccessoryWrap}>{rightAccessory}</View> : null}
      </View>
    </View>
  );
}

export function FlowScreenHeader({ title, onBack, rightAccessory }: FlowScreenHeaderProps) {
  return (
    <View style={styles.flowHeader}>
      <View style={styles.flowHeaderEdge}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.flowHeaderBackButton}>
            <ChevronLeft color="#1E293B" size={20} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View style={styles.flowHeaderSpacer} />
        )}
      </View>

      <View style={styles.flowHeaderCenter}>
        {title ? <Text numberOfLines={1} style={styles.flowHeaderTitle}>{title}</Text> : null}
      </View>

      <View style={styles.flowHeaderEdge}>
        {rightAccessory ? rightAccessory : <View style={styles.flowHeaderSpacer} />}
      </View>
    </View>
  );
}

export function AuthHeaderBar({ title, onBack }: AuthHeaderBarProps) {
  return <AppScreenHeader title={title} onBack={onBack} />;
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
  logoStackMedia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  animatedOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  logoWordmarkLarge: {
    color: '#0F766E',
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.35,
    lineHeight: 30,
  },
  logoTagline: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    letterSpacing: 0.05,
  },
  logoInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logoWordmarkSmall: {
    color: '#0F766E',
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.24,
    lineHeight: 19,
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
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 6,
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: -0.08,
    textAlign: 'right',
  },
  headerAccessoryWrap: {
    alignItems: 'flex-end',
  },
  flowHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowHeaderEdge: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  flowHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  flowHeaderBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowHeaderSpacer: {
    width: 40,
    height: 40,
  },
  flowHeaderTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
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
    fontSize: 17,
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
    fontSize: 14,
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
    fontSize: 10,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.15,
  },
  phonePrefixText: {
    color: '#64748B',
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: 0.04,
  },
  phoneInput: {
    flex: 1,
    color: '#1E293B',
    fontSize: 16,
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
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    letterSpacing: -0.04,
  },
  fieldHelper: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 19,
    letterSpacing: 0.04,
  },
});

