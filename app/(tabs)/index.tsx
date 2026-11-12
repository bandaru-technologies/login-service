import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_BASE = 'http://localhost:8080';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const CATEGORIES = [
  { key: 'all',       label: 'All',       icon: '🗺️', amenities: null as string[] | null },
  { key: 'food',      label: 'Food',      icon: '🍽️', amenities: ['restaurant', 'cafe', 'fast_food', 'food_court'] },
  { key: 'health',    label: 'Health',    icon: '🏥', amenities: ['hospital', 'clinic', 'pharmacy', 'doctors'] },
  { key: 'finance',   label: 'Finance',   icon: '🏦', amenities: ['bank', 'atm'] },
  { key: 'shop',      label: 'Shopping',  icon: '🛒', amenities: ['supermarket', 'convenience'] },
  { key: 'fuel',      label: 'Fuel',      icon: '⛽', amenities: ['fuel'] },
  { key: 'education', label: 'Education', icon: '🎓', amenities: ['school', 'college', 'university', 'library'] },
];

const AMENITY_ICONS: Record<string, string> = {
  restaurant: '🍽️', cafe: '☕', fast_food: '🍔', food_court: '🍱',
  hospital: '🏥', clinic: '🏥', pharmacy: '💊', doctors: '👨‍⚕️',
  bank: '🏦', atm: '💳',
  supermarket: '🛒', convenience: '🏪',
  fuel: '⛽',
  school: '🏫', college: '🎓', university: '🎓', library: '📚',
};

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

type Service = { id: number; name: string; amenity: string; address?: string; distance: number };
type Suggestion = { place_id: string; display_name: string; lat: string; lon: string };

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('User');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('username').then(u => { if (u) setUsername(u); });
  }, []);

  const fetchServices = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setFetchError('');
    const token = await AsyncStorage.getItem('authToken');
    try {
      const res = await fetch(
        `${API_BASE}/api/services/nearby?lat=${lat}&lon=${lon}&radius=1500`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (res.status === 401 || res.status === 403) {
        setFetchError('Session expired. Please log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setServices(data.map((s: any) => ({ ...s, distance: s.distanceMeters })));
    } catch (err: any) {
      setFetchError(`Failed to load services: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setFetchError('Location permission denied. Search for a location above.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = pos.coords;
      setLocation({ lat: latitude, lon: longitude });
      setLocationLabel('Current location');
      fetchServices(latitude, longitude);
    })();
  }, [fetchServices]);

  useEffect(() => {
    if (locationQuery.trim().length < 3) { setSuggestions([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${NOMINATIM_URL}?q=${encodeURIComponent(locationQuery)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setSuggestions(await res.json());
      } catch { setSuggestions([]); }
    }, 400);
  }, [locationQuery]);

  const selectSuggestion = (place: Suggestion) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setLocation({ lat, lon });
    setLocationLabel(place.display_name.split(',').slice(0, 3).join(', '));
    setLocationQuery('');
    setSuggestions([]);
    setActiveCategory('all');
    setServiceSearch('');
    fetchServices(lat, lon);
  };

  const handleUseMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords;
    setLocation({ lat: latitude, lon: longitude });
    setLocationLabel('Current location');
    setLocationQuery('');
    setSuggestions([]);
    fetchServices(latitude, longitude);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('username');
    router.replace('/login');
  };

  const activeCat = CATEGORIES.find(c => c.key === activeCategory);
  const filtered = services.filter(s => {
    const matchesCat = !activeCat?.amenities || activeCat.amenities.includes(s.amenity);
    const matchesSearch = !serviceSearch || s.name.toLowerCase().includes(serviceSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navBrand}>
          <Text style={styles.navBrandIcon}>📍</Text>
          <Text style={styles.navBrandText}>LocalServices</Text>
        </View>
        <View style={styles.navRight}>
          <Text style={styles.navHello}>Hi, <Text style={styles.navUsername}>{username}</Text></Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {/* Search bar */}
            <View style={styles.searchBox}>
              <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                  <Text style={styles.searchPin}>📍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search location..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={locationQuery}
                    onChangeText={v => setLocationQuery(v)}
                    autoCorrect={false}
                  />
                  {locationQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setLocationQuery(''); setSuggestions([]); }}>
                      <Text style={styles.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity style={styles.gpsBtn} onPress={handleUseMyLocation}>
                  <Text style={{ fontSize: 18 }}>🎯</Text>
                </TouchableOpacity>
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsList}>
                  {suggestions.map(place => (
                    <TouchableOpacity
                      key={place.place_id}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(place)}>
                      <Text style={styles.sugPin}>📍</Text>
                      <Text style={styles.sugText} numberOfLines={2}>
                        {place.display_name.split(',').slice(0, 4).join(', ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Location pill */}
            {locationLabel ? (
              <View style={styles.locationPill}>
                <Text style={styles.locationPillIcon}>📍</Text>
                <Text style={styles.locationPillText} numberOfLines={1}>{locationLabel}</Text>
              </View>
            ) : null}

            {/* Error banner */}
            {fetchError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{fetchError}</Text>
              </View>
            ) : null}

            {/* Detecting location */}
            {!location && !fetchError && (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={styles.statusText}>Detecting your location...</Text>
              </View>
            )}

            {location && (
              <>
                {/* Section header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nearby Services</Text>
                  {!loading && (
                    <Text style={styles.resultsCount}>{filtered.length} within 1.5 km</Text>
                  )}
                </View>

                {/* Service name search */}
                <TextInput
                  style={styles.serviceSearch}
                  placeholder="🔍  Search services..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={serviceSearch}
                  onChangeText={setServiceSearch}
                />

                {/* Category chips */}
                <FlatList
                  horizontal
                  data={CATEGORIES}
                  keyExtractor={c => c.key}
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                  contentContainerStyle={{ paddingHorizontal: 2 }}
                  renderItem={({ item: cat }) => (
                    <TouchableOpacity
                      style={[styles.chip, activeCategory === cat.key && styles.chipActive]}
                      onPress={() => setActiveCategory(cat.key)}>
                      <Text style={styles.chipIcon}>{cat.icon}</Text>
                      <Text style={[styles.chipText, activeCategory === cat.key && styles.chipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                />

                {loading && (
                  <View style={styles.statusBox}>
                    <ActivityIndicator color="#6366f1" />
                    <Text style={styles.statusText}>Finding services...</Text>
                  </View>
                )}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          location && !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No services found in this category nearby.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: s }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => router.push({
              pathname: '/service-detail',
              params: {
                id: s.id,
                name: s.name,
                amenity: s.amenity,
                address: s.address || '',
                distance: s.distance,
              },
            })}>
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>{AMENITY_ICONS[s.amenity] || '📍'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
              <Text style={styles.cardType}>{s.amenity.replace(/_/g, ' ')}</Text>
              {s.address ? <Text style={styles.cardAddress} numberOfLines={1}>{s.address}</Text> : null}
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{formatDistance(s.distance)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09071e' },

  /* Navbar */
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navBrandIcon: { fontSize: 18 },
  navBrandText: { fontSize: 17, fontWeight: '800', color: '#a5b4fc', letterSpacing: -0.3 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navHello: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  navUsername: { color: '#a5b4fc', fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  /* List */
  listContent: { padding: 16, paddingBottom: 40 },

  /* Search */
  searchBox: { marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 14,
  },
  searchPin: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, paddingVertical: 12 },
  clearBtn: { color: 'rgba(255,255,255,0.35)', fontSize: 13, paddingLeft: 6 },
  gpsBtn: {
    width: 46, height: 46,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },

  /* Suggestions */
  suggestionsList: {
    marginTop: 6, backgroundColor: '#1a1740',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 8, padding: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sugPin: { fontSize: 13, marginTop: 1 },
  sugText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18 },

  /* Location pill */
  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  locationPillIcon: { fontSize: 13 },
  locationPillText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600', maxWidth: 260 },

  /* Error */
  errorBanner: {
    backgroundColor: 'rgba(220,53,69,0.12)',
    borderWidth: 1, borderColor: 'rgba(220,53,69,0.25)',
    borderRadius: 10, padding: 12, marginBottom: 14,
  },
  errorBannerText: { color: '#f8a5ae', fontSize: 13, lineHeight: 18 },

  /* Status */
  statusBox: { alignItems: 'center', paddingVertical: 48 },
  statusText: { color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 14 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#e0e0f0' },
  resultsCount: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },

  /* Service name search */
  serviceSearch: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 28, color: '#fff', fontSize: 13,
    paddingHorizontal: 18, paddingVertical: 11, marginBottom: 14,
  },

  /* Category chips */
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8,
  },
  chipActive: { backgroundColor: '#6366f1', borderColor: 'transparent' },
  chipIcon: { fontSize: 13 },
  chipText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  /* Empty */
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, textAlign: 'center' },

  /* Service card */
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28, padding: 32, marginBottom: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45, shadowRadius: 26, elevation: 12,
  },
  cardIconWrap: {
    width: 100, height: 100, borderRadius: 26,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardIcon: { fontSize: 48 },
  cardName: { fontSize: 20, fontWeight: '700', color: '#e0e0f0', marginBottom: 10 },
  cardType: {
    fontSize: 13, fontWeight: '700', color: '#818cf8',
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderRadius: 8, paddingHorizontal: 13, paddingVertical: 5,
    alignSelf: 'flex-start', textTransform: 'capitalize', letterSpacing: 0.3,
  },
  cardAddress: { fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 10 },
  distanceBadge: {
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderRadius: 24, paddingHorizontal: 18, paddingVertical: 11, flexShrink: 0,
  },
  distanceText: { color: '#818cf8', fontSize: 14, fontWeight: '800' },
});
