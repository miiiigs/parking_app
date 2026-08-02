import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import {
  Bell,
  Car,
  ChevronRight,
  LogOut,
  MapPin,
  Shield,
  User,
} from 'lucide-react-native';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { BottomNav } from '../../../components/navigation/BottomNav';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';
import { AppScreenHeader, AuthActionButton } from '../../auth/components/AuthPrimitives';

type RowProps = {
  label: string;
  sublabel?: string;
  onPress: () => void;
};

export default function ProfileScreen({ title = 'Profile' }: { title?: string }) {
  const router = useRouter();
  const auth = useMobileAuth();
  const { vehicles, selectedVehicle } = useMobileVehicles();
  const { contentWidth, horizontalPadding } = useResponsiveMetrics();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [locationOn, setLocationOn] = useState(true);

  const displayName = useMemo(() => {
    if (auth.isGuest) {
      return 'Guest Session';
    }

    const metadataName = auth.user?.user_metadata?.display_name ?? auth.user?.user_metadata?.full_name;
    if (typeof metadataName === 'string' && metadataName.trim()) {
      return metadataName.trim();
    }

    if (auth.user?.email) {
      return auth.user.email.split('@')[0];
    }

    if (auth.user?.phone) {
      return auth.user.phone;
    }

    return 'ParkingPH User';
  }, [auth.isGuest, auth.user?.email, auth.user?.phone, auth.user?.user_metadata?.display_name, auth.user?.user_metadata?.full_name]);

  const displayContact = auth.isGuest
    ? 'Sign in to save your profile and preferences'
    : auth.user?.phone ?? auth.user?.email ?? 'Account connected';

  const vehicleSummary = selectedVehicle
    ? `${selectedVehicle.model} - ${selectedVehicle.plate}${vehicles.length > 1 ? ` (${vehicles.length} saved)` : ''}`
    : 'No saved vehicle yet';

  function handleAuthAction() {
    if (auth.isGuest || !auth.user) {
      router.push('/auth');
      return;
    }

    Alert.alert('Log Out', 'Do you want to sign out of ParkingPH on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await auth.signOut();
            router.replace('/auth');
          })();
        },
      },
    ]);
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
                <AppScreenHeader title={title} />
              </View>

              <View style={styles.content}>
                <View style={styles.profileCard}>
                  <View style={styles.profileRow}>
                    <View style={styles.profileAvatar}>
                      <User color="#FFFFFF" size={26} strokeWidth={2.1} />
                    </View>
                    <View style={styles.profileCopy}>
                      <Text style={styles.profileName}>{displayName}</Text>
                      <Text style={styles.profileContact}>{displayContact}</Text>
                    </View>
                  </View>

                  <View style={styles.profileChips}>
                    <ProfileChip icon={Car} label={selectedVehicle?.model ?? 'No vehicle'} />
                    <ProfileChip icon={Shield} label={selectedVehicle?.plate ?? 'No plate'} />
                    <ProfileChip label={selectedVehicle?.color ?? (auth.isGuest ? 'Guest access' : 'Add vehicle')} />
                  </View>
                </View>

                <SectionHeader label="ACCOUNT" />
                <Card>
                  <Row label="Edit Profile" sublabel="Name, photo" onPress={() => router.push('/edit-profile')} />
                  <Row label="Change Phone Number" onPress={() => router.push('/change-phone')} />
                  <Row label="Vehicle Information" sublabel={vehicleSummary} onPress={() => router.push('/edit-vehicle')} />
                </Card>

                <SectionHeader label="PAYMENTS" />
                <Card>
                  <Row label="Payment Methods" sublabel="GCash, Maya, cards" onPress={() => router.push('/payment-methods')} />
                </Card>

                <SectionHeader label="PREFERENCES" />
                <Card>
                  <ToggleRow label="Notifications" icon={Bell} value={notificationsOn} onValueChange={setNotificationsOn} />
                  <ToggleRow label="Location Services" icon={MapPin} value={locationOn} onValueChange={setLocationOn} last />
                </Card>

                <SectionHeader label="SUPPORT & INFO" />
                <Card>
                  <Row label="Report an Issue" onPress={() => router.push('/report-issue')} />
                  <Row label="Contact Support" sublabel="support@parkingph.com" onPress={() => router.push('/contact-support')} />
                  <Row label="Privacy Policy" onPress={() => router.push('/privacy')} />
                  <Row label="Terms & Conditions" onPress={() => router.push('/terms')} />
                  <Row label="About the App" sublabel="v1.0.0" onPress={() => router.push('/about')} />
                </Card>

                {auth.isGuest || !auth.user ? (
                  <AuthActionButton label="Sign In or Create Account" onPress={handleAuthAction} />
                ) : (
                  <Pressable onPress={handleAuthAction} style={styles.logoutButton}>
                    <LogOut color="#DC2626" size={18} strokeWidth={2.2} />
                    <Text style={styles.logoutText}>Log Out</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNav activeTab="profile" />
      </View>
    </SafeAreaView>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeaderLabel}>{label}</Text>;
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Row({ label, onPress, sublabel }: RowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        {sublabel ? <Text style={styles.rowSubtitle}>{sublabel}</Text> : null}
      </View>
      <ChevronRight color="#CBD5E1" size={16} strokeWidth={2.2} />
    </Pressable>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  last = false,
  onValueChange,
  value,
}: {
  icon: typeof Bell;
  label: string;
  last?: boolean;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last ? styles.rowBorder : null]}>
      <View style={styles.toggleLabelRow}>
        <Icon color="#64748B" size={15} strokeWidth={2.2} />
        <Text style={styles.toggleLabel}>{label}</Text>
      </View>
      <Switch
        trackColor={{ false: '#CBD5E1', true: '#0F766E' }}
        thumbColor="#FFFFFF"
        ios_backgroundColor="#CBD5E1"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
}

function ProfileChip({
  icon: Icon,
  label,
}: {
  icon?: typeof Car;
  label: string;
}) {
  return (
    <View style={styles.profileChip}>
      {Icon ? <Icon color="rgba(255,255,255,0.9)" size={11} strokeWidth={2.2} /> : null}
      <Text style={styles.profileChipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
    gap: 14,
    paddingTop: 20,
  },
  profileCard: {
    borderRadius: 18,
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_700Bold',
  },
  profileContact: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 3,
  },
  profileChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  profileChipText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
  },
  sectionHeaderLabel: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.8,
    marginLeft: 4,
    marginTop: 6,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  row: {
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  rowSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  toggleRow: {
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleLabel: {
    color: '#0F172A',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_500Medium',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.05)',
  },
  logoutButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
});
