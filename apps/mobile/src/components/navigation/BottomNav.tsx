import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock3, Compass, Home, LayoutList, User } from 'lucide-react-native';

import { useParkingFlowStore } from '../../features/parking/store/useParkingFlowStore';

type BottomNavTab = 'home' | 'explore' | 'session' | 'history' | 'profile';

type BottomNavProps = {
  activeTab: BottomNavTab;
};

const tabs = [
  { key: 'home', label: 'Home', icon: Home, route: '/home' },
  { key: 'explore', label: 'Explore', icon: Compass, route: '/explore' },
  { key: 'session', label: 'Active', icon: Clock3, route: '/session' },
  { key: 'history', label: 'History', icon: LayoutList, route: '/history' },
  { key: 'profile', label: 'Profile', icon: User, route: '/profile' },
] as const;

export function BottomNav({ activeTab }: BottomNavProps) {
  const router = useRouter();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);
  const hasActiveWorkflow = Boolean(session ?? booking);

  return (
    <View style={styles.shell}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          const Icon = tab.icon;
          const showBadge = tab.key === 'session' && hasActiveWorkflow && !active;

          return (
            <Pressable
              key={tab.key}
              onPress={() => router.replace(tab.route)}
              style={styles.tabButton}
            >
              {active ? <View style={styles.activeIndicator} /> : null}
              <View style={styles.iconWrap}>
                <Icon color={active ? '#0F766E' : '#94A3B8'} size={20} strokeWidth={active ? 2.2 : 1.8} />
                {showBadge ? <View style={styles.notificationDot} /> : null}
              </View>
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 10,
    paddingBottom: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 2.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: '#0F766E',
  },
  iconWrap: {
    position: 'relative',
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    lineHeight: 11,
    fontFamily: 'Poppins_400Regular',
  },
  tabLabelActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F766E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

