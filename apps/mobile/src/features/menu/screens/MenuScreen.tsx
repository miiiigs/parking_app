import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
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
import {
  AlertTriangle,
  Bell,
  Car,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Info,
  LogOut,
  MapPin,
  Settings,
  Shield,
  User,
} from 'lucide-react-native';

import { BottomNav } from '../../../components/navigation/BottomNav';
import { useResponsiveMetrics } from '../../../hooks/useResponsive';
import { useMobileAuth } from '../../../providers/MobileAuthProvider';
import { useMobileVehicles } from '../../../providers/MobileVehicleProvider';
import { AppScreenHeader, AuthActionButton } from '../../auth/components/AuthPrimitives';

type SectionId = 'profile' | 'wallet' | 'settings' | 'about';

type SectionItem = {
  label: string;
  sublabel?: string;
  onPress: () => void;
};

export default function MenuScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const { vehicles, selectedVehicle: vehicle } = useMobileVehicles();
  const { contentWidth, horizontalPadding, isCompact } = useResponsiveMetrics();
  const [expanded, setExpanded] = useState<SectionId | null>('profile');
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

  const profileItems: SectionItem[] = [
    { label: 'Edit Profile', sublabel: 'Name, photo', onPress: () => router.push('/edit-profile') },
    { label: 'Change Phone Number', onPress: () => router.push('/change-phone') },
    {
      label: 'Vehicle Information',
      sublabel: vehicle ? `${vehicle.model} - ${vehicle.plate}${vehicles.length > 1 ? ` (${vehicles.length} saved)` : ''}` : 'No saved vehicle yet',
      onPress: () => router.push('/edit-vehicle'),
    },
  ];

  const walletItems: SectionItem[] = [
    { label: 'Payment Methods', sublabel: 'Cards, GCash, Maya', onPress: () => router.push('/payment-methods') },
  ];

  const aboutItems: SectionItem[] = [
    { label: 'App Version', sublabel: 'v1.0.0 (Mobile)', onPress: () => showComingSoon('About ParkingPH') },
    { label: 'Terms & Conditions', onPress: () => showComingSoon('Terms & Conditions') },
    { label: 'Privacy Policy', onPress: () => showComingSoon('Privacy Policy') },
    { label: 'Contact Support', sublabel: 'support@parkingph.com', onPress: () => showComingSoon('Contact Support') },
  ];

  function showComingSoon(label: string) {
    Alert.alert(label, 'This page is in the updated Enj design and can be migrated next.');
  }

  function toggleSection(sectionId: SectionId) {
    setExpanded((current) => (current === sectionId ? null : sectionId));
  }

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
                <AppScreenHeader title="Menu" />
              </View>

              <View style={styles.content}>
                <View style={styles.profileCard}>
                  <View style={[styles.profileRow, isCompact ? styles.profileRowCompact : null]}>
                    <View style={styles.profileAvatar}>
                      <User color="#FFFFFF" size={26} strokeWidth={2.1} />
                    </View>
                    <View style={styles.profileCopy}>
                      <Text style={styles.profileName}>{displayName}</Text>
                      <Text style={styles.profileContact}>{displayContact}</Text>
                    </View>
                  </View>

                  <View style={styles.profileChips}>
                    <ProfileChip icon={Car} label={vehicle?.model ?? 'No vehicle'} />
                    <ProfileChip icon={Shield} label={vehicle?.plate ?? 'No plate'} />
                    <ProfileChip label={vehicle?.color ?? (auth.isGuest ? 'Guest access' : 'Add vehicle')} />
                  </View>
                </View>

                <MenuSection
                  expanded={expanded === 'profile'}
                  icon={User}
                  label="User Profile"
                  onToggle={() => toggleSection('profile')}
                >
                  {profileItems.map((item) => (
                    <NavItem key={item.label} {...item} />
                  ))}
                </MenuSection>

                <MenuSection
                  expanded={expanded === 'wallet'}
                  icon={CreditCard}
                  label="Payment Wallet"
                  onToggle={() => toggleSection('wallet')}
                >
                  {walletItems.map((item) => (
                    <NavItem key={item.label} {...item} />
                  ))}
                </MenuSection>

                <MenuSection
                  expanded={expanded === 'settings'}
                  icon={Settings}
                  label="Settings"
                  onToggle={() => toggleSection('settings')}
                >
                  <ToggleItem
                    icon={Bell}
                    label="Notifications"
                    value={notificationsOn}
                    onValueChange={setNotificationsOn}
                  />
                  <ToggleItem
                    icon={MapPin}
                    label="Location Services"
                    value={locationOn}
                    onValueChange={setLocationOn}
                    showBorder={false}
                  />
                </MenuSection>

                <Pressable onPress={() => showComingSoon('Report an Issue')} style={styles.reportCard}>
                  <View style={styles.reportIconWrap}>
                    <AlertTriangle color="#F97316" size={18} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.reportLabel}>Report an Issue</Text>
                  <ChevronRight color="#FED7AA" size={18} strokeWidth={2.2} />
                </Pressable>

                <MenuSection
                  expanded={expanded === 'about'}
                  icon={Info}
                  label="About the App"
                  onToggle={() => toggleSection('about')}
                >
                  {aboutItems.map((item) => (
                    <NavItem key={item.label} {...item} />
                  ))}
                </MenuSection>

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

        <BottomNav activeTab="menu" />
      </View>
    </SafeAreaView>
  );
}

function MenuSection({
  children,
  expanded,
  icon: Icon,
  label,
  onToggle,
}: {
  children: React.ReactNode;
  expanded: boolean;
  icon: typeof User;
  label: string;
  onToggle: () => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Pressable onPress={onToggle} style={styles.sectionHeader}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionIconWrap}>
            <Icon color="#0F766E" size={18} strokeWidth={2.2} />
          </View>
          <Text style={styles.sectionTitle}>{label}</Text>
        </View>
        {expanded ? (
          <ChevronDown color="#94A3B8" size={18} strokeWidth={2.2} />
        ) : (
          <ChevronRight color="#94A3B8" size={18} strokeWidth={2.2} />
        )}
      </Pressable>
      {expanded ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function NavItem({
  label,
  sublabel,
  onPress,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={styles.navItemCopy}>
        <Text style={styles.navItemTitle}>{label}</Text>
        {sublabel ? <Text style={styles.navItemSubtitle}>{sublabel}</Text> : null}
      </View>
      <ChevronRight color="#CBD5E1" size={16} strokeWidth={2.2} />
    </Pressable>
  );
}

function ToggleItem({
  icon: Icon,
  label,
  onValueChange,
  showBorder = true,
  value,
}: {
  icon: typeof Bell;
  label: string;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
  value: boolean;
}) {
  return (
    <View style={[styles.toggleItem, showBorder ? styles.toggleItemBorder : null]}>
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
      {Icon ? <Icon color="rgba(255,255,255,0.92)" size={11} strokeWidth={2.2} /> : null}
      <Text numberOfLines={1} style={styles.profileChipText}>{label}</Text>
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
    gap: 16,
    paddingTop: 20,
  },
  profileCard: {
    borderRadius: 22,
    backgroundColor: '#0F766E',
    padding: 16,
    shadowColor: '#0F766E',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileRowCompact: {
    alignItems: 'flex-start',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Poppins_600SemiBold',
  },
  profileContact: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  profileChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  profileChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileChipText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
    flexShrink: 1,
  },
  sectionBody: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  navItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  navItemCopy: {
    flex: 1,
    minWidth: 0,
  },
  navItemTitle: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_500Medium',
  },
  navItemSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Poppins_400Regular',
    marginTop: 1,
  },
  toggleItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toggleLabel: {
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Poppins_400Regular',
    flexShrink: 1,
  },
  reportCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLabel: {
    color: '#EA580C',
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Poppins_500Medium',
    flex: 1,
  },
  logoutButton: {
    height: 50,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Poppins_500Medium',
  },
});


