import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useTranslation } from '../../src/i18n/useTranslation';
import { useAuthStore } from '../../src/store/useAuthStore';
import { getDashboardStats, DashboardStats } from '../../src/api/blocks';
import { Clock, CheckCircle, AlertTriangle, Layers, PlusCircle, RefreshCw } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats>({
    total_blocks: 0,
    pending_analysis: 0,
    completed_measurements: 0,
    needs_verification: 0,
    recent_blocks: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.warn('Could not load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('officerIdentity')}</Text>
            <Text style={[typography.pageTitle, { color: colors.text }]}>{user?.name || 'Mining Officer'}</Text>
            <Text style={[typography.caption, { color: colors.accent, marginTop: 2 }]}>
              {user?.role || 'Officer'} • AP Mineral Intelligence
            </Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <Button
            title={t('scanNewBlock')}
            onPress={() => router.push('/block/new')}
          />
        </View>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Layers color={colors.accent} size={22} />
            <Text style={[typography.heroMeasurement, typography.mono, { color: colors.text, marginTop: spacing.xs }]}>
              {stats.total_blocks}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Total Blocks</Text>
          </Card>

          <Card style={styles.statCard}>
            <Clock color={colors.info} size={22} />
            <Text style={[typography.heroMeasurement, typography.mono, { color: colors.info, marginTop: spacing.xs }]}>
              {stats.pending_analysis}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('pending')}</Text>
          </Card>

          <Card style={styles.statCard}>
            <CheckCircle color={colors.success} size={22} />
            <Text style={[typography.heroMeasurement, typography.mono, { color: colors.success, marginTop: spacing.xs }]}>
              {stats.completed_measurements}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('completed')}</Text>
          </Card>
        </View>

        {stats.needs_verification > 0 && (
          <Card style={[styles.alertCard, { borderColor: colors.warning, borderWidth: 1 }]}>
            <View style={styles.alertHeader}>
              <AlertTriangle color={colors.warning} size={20} />
              <Text style={[typography.cardTitle, { color: colors.text, marginLeft: spacing.sm }]}>
                {t('needsVerification')}
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              {stats.needs_verification} block(s) measured and ready for seigniorage assessment & sign-off.
            </Text>
          </Card>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[typography.sectionTitle, { color: colors.text }]}>
            {t('recentActivity')}
          </Text>
          <TouchableOpacity onPress={fetchStats} style={styles.refreshBtn}>
            <RefreshCw color={colors.textSecondary} size={16} />
          </TouchableOpacity>
        </View>

        {stats.recent_blocks.length === 0 ? (
          <Card>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t('empty')} — Tap "Scan New Block" to register and measure your first granite block.
            </Text>
          </Card>
        ) : (
          stats.recent_blocks.map((block) => (
            <TouchableOpacity
              key={block.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/block/${block.id}`)}
              style={{ marginBottom: spacing.sm }}
            >
              <Card>
                <View style={styles.blockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.cardTitle, typography.mono, { color: colors.text }]}>
                      {block.identifier}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {block.color_group}
                    </Text>
                  </View>
                  <StatusBadge status={block.status as any} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  actionContainer: { marginBottom: spacing.lg },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  statCard: { flex: 1, marginHorizontal: spacing.xs, alignItems: 'center', paddingVertical: spacing.md },
  alertCard: { marginBottom: spacing.lg },
  alertHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.md },
  refreshBtn: { padding: spacing.xs },
  blockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
