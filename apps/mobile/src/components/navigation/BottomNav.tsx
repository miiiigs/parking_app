import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock3, Menu, Search } from 'lucide-react-native';

type BottomNavTab = 'search' | 'session' | 'menu';

type BottomNavProps = {
  activeTab: BottomNavTab;
  onMenuPress?: () => void;
};

const tabs = [
  { key: 'search', label: 'Search', icon: Search, route: '/home' },
  { key: 'session', label: 'Active Session', icon: Clock3, route: '/session' },
  { key: 'menu', label: 'Menu', icon: Menu, route: '/menu' },
] as const;

export function BottomNav({ activeTab, onMenuPress }: BottomNavProps) {
  const router = useRouter();

  return (
    <View style={styles.shell}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          const Icon = tab.icon;

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (tab.key === 'menu') {
                  if (onMenuPress) {
                    onMenuPress();
                    return;
                  }
                }

                router.replace(tab.route);
              }}
              style={styles.tabButton}
            >
              <Icon color={active ? '#0F766E' : '#94A3B8'} size={22} strokeWidth={active ? 2.2 : 1.9} />
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{tab.label}</Text>
              {active ? <View style={styles.tabDot} /> : <View style={styles.tabDotSpacer} />}
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
    gap: 3,
    paddingTop: 12,
    paddingBottom: 10,
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: 'Poppins_400Regular',
  },
  tabLabelActive: {
    color: '#0F766E',
    fontFamily: 'Poppins_600SemiBold',
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F766E',
  },
  tabDotSpacer: {
    width: 4,
    height: 4,
  },
});

