import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getBlocks, GraniteBlockItem } from '../../src/api/blocks';
import { Search, Plus, Filter, Box } from 'lucide-react-native';

type BlockTypeFilter = 'ALL' | 'RAW' | 'PROCESSED';
type StatusFilter = 'ALL' | 'MEASURED' | 'REGISTERED' | 'CAPTURING';

export default function BlocksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [blocks, setBlocks] = useState<GraniteBlockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<BlockTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const data = await getBlocks();
      setBlocks(data);
    } catch (err) {
      console.warn('Could not load blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const filteredBlocks = blocks.filter((b) => {
    const matchesSearch =
      b.identifier.toLowerCase().includes(search.toLowerCase()) ||
      b.color_group.toLowerCase().includes(search.toLowerCase());

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'RAW' && (!b.block_type || b.block_type.toUpperCase() === 'RAW')) ||
      (typeFilter === 'PROCESSED' && b.block_type && b.block_type.toUpperCase() === 'PROCESSED');

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'MEASURED' && (b.status === 'MEASURED' || b.measurement != null)) ||
      (statusFilter === 'REGISTERED' && b.status === 'REGISTERED') ||
      (statusFilter === 'CAPTURING' && (b.status === 'CAPTURING' || b.status === 'CAPTURED'));

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Title and Add Button */}
      <View style={styles.header}>
        <View>
          <Text style={[typography.pageTitle, { color: colors.text }]}>{t('blocks')}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {filteredBlocks.length} {t('blocks').toLowerCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/block/new')}
        >
          <Plus color="#FFF" size={20} style={{ marginRight: 4 }} />
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>New Block</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search color={colors.textSecondary} size={18} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('searchBlocks')}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Horizontal Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {/* Type filters */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: typeFilter === 'ALL' ? colors.primary : colors.surface,
                borderColor: typeFilter === 'ALL' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setTypeFilter('ALL')}
          >
            <Text style={{ color: typeFilter === 'ALL' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
              {t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: typeFilter === 'RAW' ? colors.primary : colors.surface,
                borderColor: typeFilter === 'RAW' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setTypeFilter('RAW')}
          >
            <Text style={{ color: typeFilter === 'RAW' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
              {t('raw')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: typeFilter === 'PROCESSED' ? colors.primary : colors.surface,
                borderColor: typeFilter === 'PROCESSED' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setTypeFilter('PROCESSED')}
          >
            <Text style={{ color: typeFilter === 'PROCESSED' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
              {t('processed')}
            </Text>
          </TouchableOpacity>

          {/* Status filters */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === 'MEASURED' ? colors.accent : colors.surface,
                borderColor: statusFilter === 'MEASURED' ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setStatusFilter(statusFilter === 'MEASURED' ? 'ALL' : 'MEASURED')}
          >
            <Text style={{ color: statusFilter === 'MEASURED' ? '#FFF' : colors.text, fontSize: 12, fontWeight: '600' }}>
              {t('measured')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Blocks List */}
      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBlocks} tintColor={colors.primary} />}
        ListEmptyComponent={() => (
          <Card style={{ marginVertical: spacing.xl, alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Box color={colors.textSecondary} size={36} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              {loading ? t('loading') : t('noBlocksFound')}
            </Text>
          </Card>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push(`/block/${item.id}`)}
            style={{ marginBottom: spacing.sm }}
          >
            <Card>
              <View style={styles.blockRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.cardTitle, typography.mono, { color: colors.text }]}>
                    {item.identifier}
                  </Text>
                  <Text style={[typography.body, { color: colors.accent, marginTop: 2 }]}>
                    {item.color_group}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {item.block_type || 'RAW'} • {item.registered_at ? new Date(item.registered_at).toLocaleDateString() : 'Active'}
                    </Text>
                    {item.measurement?.volume_m3 && (
                      <Text style={[typography.caption, typography.mono, { color: colors.primary, marginLeft: 8, fontWeight: '700' }]}>
                        {item.measurement.volume_m3.toFixed(2)} m³
                      </Text>
                    )}
                  </View>
                </View>
                <StatusBadge status={item.status as any} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 14 },
  filterSection: { marginVertical: spacing.xs },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xs },
  blockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
