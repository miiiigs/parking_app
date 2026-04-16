import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, FlatList } from 'react-native';
import { Input, ParkingCard } from '@/components';
import { useMapStore } from '@/store';
import { COLORS, SPACING } from '@/constants';

export default function SearchScreen() {
  const { nearbyParking } = useMapStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredParking = nearbyParking.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Parking</Text>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Search by name or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredParking}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ParkingCard parking={item} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  cardContainer: {
    paddingHorizontal: SPACING.lg,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
});
