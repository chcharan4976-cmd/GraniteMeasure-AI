import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTranslation } from '../../src/i18n/useTranslation';
import { getBlocks, GraniteBlockItem } from '../../src/api/blocks';
import { Search, Plus } from 'lucide-react-native';

export default function BlocksScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [blocks, setBlocks] = useState<GraniteBlockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

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

  const filteredBlocks = blocks.filter(b =>
    b.identifier.toLowerCase().includes(search.toLowerCase()) ||
    b.color_group.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[typography.pageTitle, { color: colors.text }]}>{t('blocks')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/block/new')}
        >
          <Plus color="#FFF" size={20} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search color={colors.textSecondary} size={18} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by Block ID or granite type..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredBlocks}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBlocks} tintColor={colors.primary} />}
        ListEmptyComponent={() => (
          <Card style={{ marginVertical: spacing.xl, alignItems: 'center' }}>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {loading ? 'Loading blocks...' : 'No granite blocks found.'}
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
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                    {item.registered_at ? new Date(item.registered_at).toLocaleDateString() : 'Registered'}
                  </Text>
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
    marginBottom: spacing.md,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  blockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
