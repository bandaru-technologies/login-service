import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, SafeAreaView, StatusBar, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:8080';

const AMENITY_ICONS: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', fast_food: '🍔', food_court: '🍱',
  hospital: '🏥', clinic: '🏥', pharmacy: '💊', doctors: '👨‍⚕️',
  bank: '🏦', atm: '💳',
  supermarket: '🛒', convenience: '🏪',
  fuel: '⛽',
  school: '🏫', college: '🎓', university: '🎓', library: '📚',
};

const FOOD_AMENITIES = ['restaurant', 'cafe', 'fast_food', 'food_court'];

type MenuItem = {
  id: number;
  name: string;
  description?: string;
  price?: number;
  category?: string;
};

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string; name: string; amenity: string; address?: string; distance: string;
  }>();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'menu'>('info');

  const isFood = FOOD_AMENITIES.includes(params.amenity);

  useEffect(() => {
    if (!isFood) return;
    (async () => {
      setMenuLoading(true);
      setMenuError('');
      const token = await AsyncStorage.getItem('authToken');
      try {
        const res = await fetch(`${API_BASE}/api/services/${params.id}/menu-items`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
        });
        if (!res.ok) throw new Error('Could not load menu.');
        const data = await res.json();
        setMenuItems(data);
      } catch (err: any) {
        setMenuError(err.message || 'Could not load menu.');
      } finally {
        setMenuLoading(false);
      }
    })();
  }, [params.id, isFood]);

  const icon = AMENITY_ICONS[params.amenity] || '📍';
  const distance = parseFloat(params.distance || '0');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>{icon}</Text>
          </View>
          <Text style={styles.heroName}>{params.name}</Text>
          <View style={styles.heroBadgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{params.amenity?.replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.distBadge}>
              <Text style={styles.distBadgeIcon}>📍</Text>
              <Text style={styles.distBadgeText}>{formatDistance(distance)}</Text>
            </View>
          </View>
          {params.address ? (
            <Text style={styles.heroAddress}>📌  {params.address}</Text>
          ) : null}
        </View>

        {/* Tabs (only for food) */}
        {isFood && (
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'info' && styles.tabActive]}
              onPress={() => setActiveTab('info')}>
              <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'menu' && styles.tabActive]}
              onPress={() => setActiveTab('menu')}>
              <Text style={[styles.tabText, activeTab === 'menu' && styles.tabTextActive]}>Menu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info tab */}
        {(!isFood || activeTab === 'info') && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>About</Text>
            <View style={styles.infoCard}>
              <InfoRow icon="🏷️" label="Type" value={params.amenity?.replace(/_/g, ' ')} />
              {params.address ? <InfoRow icon="📌" label="Address" value={params.address} /> : null}
              <InfoRow icon="📍" label="Distance" value={formatDistance(distance)} last />
            </View>
          </View>
        )}

        {/* Menu tab */}
        {isFood && activeTab === 'menu' && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionLabel}>Menu</Text>

            {menuLoading && (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={styles.centerText}>Loading menu...</Text>
              </View>
            )}

            {!menuLoading && menuError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{menuError}</Text>
              </View>
            ) : null}

            {!menuLoading && !menuError && menuItems.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyTitle}>No menu available</Text>
                <Text style={styles.emptyText}>This place hasn't added their menu yet.</Text>
              </View>
            )}

            {!menuLoading && menuItems.length > 0 && (
              <>
                {/* Group by category */}
                {groupByCategory(menuItems).map(({ category, items }) => (
                  <View key={category} style={styles.menuGroup}>
                    <Text style={styles.menuCategory}>{category}</Text>
                    {items.map(item => (
                      <View key={item.id} style={styles.menuItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                          {item.description ? (
                            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                          ) : null}
                        </View>
                        {item.price != null && (
                          <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoRowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={styles.infoRowValue}>{value}</Text>
      </View>
    </View>
  );
}

function groupByCategory(items: MenuItem[]) {
  const map: Record<string, MenuItem[]> = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    if (!map[cat]) map[cat] = [];
    map[cat].push(item);
  });
  return Object.entries(map).map(([category, items]) => ({ category, items }));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09071e' },
  scroll: { paddingBottom: 48 },

  /* Header bar */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: '#fff', fontSize: 20, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  /* Hero */
  heroCard: {
    margin: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 24, padding: 28,
    alignItems: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18, shadowRadius: 30, elevation: 12,
  },
  heroIconWrap: {
    width: 90, height: 90, borderRadius: 26,
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  heroIcon: { fontSize: 44 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  heroBadgeRow: { flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' },
  typeBadge: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  typeBadgeText: { color: '#a5b4fc', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  distBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  distBadgeIcon: { fontSize: 12 },
  distBadgeText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  heroAddress: { color: 'rgba(255,255,255,0.38)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  /* Info section */
  infoSection: { marginHorizontal: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  infoRowIcon: { fontSize: 18, marginTop: 1 },
  infoRowLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  infoRowValue: { fontSize: 14, color: '#e0e0f0', fontWeight: '500' },

  /* Menu section */
  menuSection: { marginHorizontal: 20 },
  menuGroup: { marginBottom: 24 },
  menuCategory: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 16, marginBottom: 10,
  },
  menuItemName: { fontSize: 15, fontWeight: '700', color: '#e0e0f0', marginBottom: 4 },
  menuItemDesc: { fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 18 },
  menuItemPrice: { fontSize: 15, fontWeight: '800', color: '#a5b4fc', flexShrink: 0 },

  /* States */
  centerBox: { alignItems: 'center', paddingVertical: 48 },
  centerText: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 },
  errorBox: {
    backgroundColor: 'rgba(220,53,69,0.1)',
    borderWidth: 1, borderColor: 'rgba(220,53,69,0.2)',
    borderRadius: 12, padding: 14,
  },
  errorText: { color: '#f8a5ae', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 56 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.28)', textAlign: 'center' },
});
