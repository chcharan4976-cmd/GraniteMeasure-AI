import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getQuarries, QuarryItem } from '../../src/api/quarries';
import {
  QuarryAtlasIcon,
  ShieldEmblemIcon,
} from '../../src/components/DomainIcons';
import {
  Plus,
  Search,
  MapPin,
  CheckCircle2,
  FileText,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react-native';

export default function QuarriesTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const { language, t } = useTranslation();
  const { activeQuarryId, setActiveQuarry } = useAuthStore();

  const [quarries, setQuarries] = useState<QuarryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchQuarriesList = async () => {
    try {
      setLoading(true);
      const data = await getQuarries();
      setQuarries(data);
    } catch (err) {
      console.warn('Could not load quarries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuarriesList();
  }, []);

  const filtered = quarries.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.name.toLowerCase().includes(s) ||
      (q.code && q.code.toLowerCase().includes(s)) ||
      (q.district && q.district.toLowerCase().includes(s)) ||
      (q.lease_reference && q.lease_reference.toLowerCase().includes(s)) ||
      (q.lease_number && q.lease_number.toLowerCase().includes(s))
    );
  });

  const handleSelectQuarry = (q: QuarryItem) => {
    setActiveQuarry(q.id, q.name);
    Alert.alert(
      language === 'te' ? 'క్వారీ ఎంపికైంది' : 'Active Quarry Set',
      language === 'te'
        ? `"${q.name}" ప్రస్తుత వర్క్‌స్పేస్ కొరకు సెట్ చేయబడింది. అన్ని కొత్త బ్లాక్‌లు ఈ క్వారీతో అనుసంధానించబడతాయి.`
        : `"${q.name}" is now the active quarry for mobile capture sessions.`,
      [{ text: 'OK' }]
    );
  };

  const renderQuarryItem = ({ item }: { item: QuarryItem }) => {
    const isActive = activeQuarryId === item.id;

    return (
      <View
        style={[
          styles.quarryCard,
          {
            backgroundColor: colors.surface,
            borderColor: isActive ? colors.primary : colors.border,
          },
          isActive && { borderWidth: 1.8 },
        ]}
      >
        {/* Top Card Bar */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={[typography.cardTitle, { color: colors.text, fontSize: 16 }]}>
                {item.name}
              </Text>
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary + '20' }]}>
                  <CheckCircle2 size={12} color={colors.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
                    {language === 'te' ? 'ప్రస్తుత క్వారీ' : 'ACTIVE'}
                  </Text>
                </View>
              )}
            </View>

            {item.code && (
              <Text style={[typography.caption, typography.mono, { color: colors.accent, marginTop: 2 }]}>
                CODE: {item.code}
              </Text>
            )}
          </View>
        </View>

        {/* Location & Details */}
        <View style={styles.detailRow}>
          <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 4, marginTop: 2 }} />
          <Text style={[typography.body, { color: colors.textSecondary, fontSize: 12, flex: 1 }]}>
            {[item.village, item.mandal, item.district, 'Andhra Pradesh'].filter(Boolean).join(', ')}
          </Text>
        </View>

        {(item.lease_reference || item.lease_number || item.lease_holder) && (
          <View style={styles.leaseBox}>
            <View style={styles.detailRow}>
              <FileText size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={[typography.caption, { color: colors.text, fontSize: 11, fontWeight: '600' }]}>
                {item.lease_holder || 'Authorized Concessionaire'}
              </Text>
            </View>
            <Text style={[typography.caption, typography.mono, { color: colors.textSecondary, fontSize: 10, marginTop: 2 }]}>
              Lease Ref: {item.lease_number || item.lease_reference || 'AP-MIN-REGISTERED'}
            </Text>
          </View>
        )}

        {/* Mineral Variety Pill & Blocks Count */}
        <View style={styles.metaRow}>
          <View style={[styles.mineralPill, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
              {item.granite_category || 'Black Galaxy Granite'}
            </Text>
          </View>

          {item.gps_latitude && item.gps_longitude && (
            <Text style={[typography.caption, typography.mono, { color: colors.textMuted, fontSize: 10 }]}>
              {item.gps_latitude.toFixed(3)}°N, {item.gps_longitude.toFixed(3)}°E
            </Text>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.actionRow}>
          {!isActive ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.selectBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
              onPress={() => handleSelectQuarry(item)}
            >
              <Text style={[styles.selectBtnText, { color: colors.primary }]}>
                {language === 'te' ? 'కార్యాచరణ క్వారీగా ఎంచుకోండి' : 'Set as Active Quarry'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.selectBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/block/new')}
            >
              <Text style={[styles.selectBtnText, { color: '#FFF' }]}>
                {language === 'te' ? 'రాయిని నమోదు చేయండి' : 'Register New Block Here'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <QuarryAtlasIcon size={24} color={colors.primary} />
            <Text style={[typography.pageTitle, { color: colors.text, fontSize: 22, marginLeft: spacing.xs }]}>
              {t('quarryAtlas')}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {language === 'te'
              ? 'నిజమైన లీజు వివరాలు, మ్యాపింగ్ మరియు బ్లాక్ అనుసంధానం'
              : 'Official quarry concessions & extraction pits'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.addQuarryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/quarry/new')}
        >
          <Plus size={18} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles.addQuarryText}>
            {language === 'te' ? 'కొత్త క్వారీ' : 'New Quarry'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={16} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={language === 'te' ? 'క్వారీ పేరు, జిల్లా లేదా లీజు సంఖ్య ద్వారా వెతకండి...' : 'Search by name, district, or lease ref...'}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderQuarryItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchQuarriesList} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <QuarryAtlasIcon size={48} color={colors.textSecondary} />
              <Text style={[typography.cardTitle, { color: colors.text, marginTop: spacing.md, textAlign: 'center' }]}>
                {t('noQuarriesFound')}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center', fontSize: 13 }]}>
                {language === 'te'
                  ? 'కొత్త గ్రానైట్ బ్లాక్‌లను క్యాప్చర్ చేయడానికి ముందు మీ మైనింగ్ లీజును నమోదు చేయండి.'
                  : 'Register your genuine mining lease concession to associate captured blocks.'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/quarry/new')}
              >
                <Plus size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddBtnText}>
                  {t('registerQuarry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  addQuarryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addQuarryText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  searchBox: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13 },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  quarryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xs },
  leaseBox: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  mineralPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionRow: { marginTop: spacing.md },
  selectBtn: {
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: { fontSize: 12, fontWeight: '700' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  emptyAddBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
