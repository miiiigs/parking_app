import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CarFront, Compass, Home, LayoutList, User } from 'lucide-react-native';

import { useParkingFlowStore } from '../../features/parking/store/useParkingFlowStore';

type BottomNavTab = 'home' | 'explore' | 'session' | 'history' | 'profile';

type BottomNavProps = {
  activeTab: BottomNavTab;
};

const tabs = [
  { key: 'home', label: 'Home', icon: Home, route: '/home', standout: false },
  { key: 'explore', label: 'Explore', icon: Compass, route: '/explore', standout: false },
  { key: 'session', label: 'Park', icon: CarFront, route: '/session', standout: true },
  { key: 'history', label: 'History', icon: LayoutList, route: '/history', standout: false },
  { key: 'profile', label: 'Profile', icon: User, route: '/profile', standout: false },
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
          const showBadge = tab.key === 'session' && hasActiveWorkflow && !active && !tab.standout;
          const standout = tab.standout === true;

          return (
            <Pressable
              key={tab.key}
              onPress={() => router.replace(tab.route)}
              style={[styles.tabButton, standout ? styles.tabButtonStandout : null]}
            >
              {active ? <View style={styles.activeIndicator} /> : null}
              <View
                style={[
                  styles.iconWrap,
                  standout ? styles.iconWrapStandout : null,
                  standout && active ? styles.iconWrapStandoutActive : null,
                ]}
              >
                <Icon
                  color={
                    standout
                      ? active
                        ? '#FFFFFF'
                        : '#0F766E'
                      : active
                        ? '#0F766E'
                        : '#94A3B8'
                  }
                  size={standout ? 24 : 22}
                  strokeWidth={active || standout ? 2.2 : 1.9}
                />
                {showBadge ? <View style={styles.notificationDot} /> : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  standout ? styles.tabLabelStandout : null,
                  active ? styles.tabLabelActive : null,
                ]}
              >
                {tab.label}
              </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 12,
    paddingBottom: 11,
  },
  tabButtonStandout: {
    paddingTop: 8,
    paddingBottom: 9,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: '#0F766E',
  },
  iconWrap: {
    position: 'relative',
  },
  iconWrapStandout: {
    minWidth: 42,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconWrapStandoutActive: {
    backgroundColor: '#0F766E',
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    lineHeight: 12,
    fontFamily: 'Poppins_400Regular',
  },
  tabLabelStandout: {
    color: '#64748B',
    fontFamily: 'Poppins_600SemiBold',
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

