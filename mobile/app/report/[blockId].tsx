import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useTheme } from '../../src/theme/ThemeContext';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { getBlockReport } from '../../src/api/images';
import { FileText, Share2, CheckCircle2, ShieldCheck, Clock, MapPin, Building2 } from 'lucide-react-native';

export default function ReportScreen() {
  const { blockId } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getBlockReport(blockId as string);
        setReport(data);
      } catch (err) {
        console.warn('Could not load report:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [blockId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
          Generating auditable block report...
        </Text>
      </SafeAreaView>
    );
  }

  if (!report) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Auditable Report" />
        <View style={styles.content}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>Report unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        title: `GraniteMeasure AI — ${report.block?.identifier}`,
        message: `GraniteMeasure AI Official Assessment Report\nBlock: ${report.block?.identifier}\nCategory: ${report.block?.color_group}\nVolume: ${report.measurement?.volume_m3?.toFixed(3) || 'N/A'} m³\nTonnage: ${report.measurement?.weight_mt?.toFixed(3) || 'N/A'} MT\nIndicative Seigniorage: ₹${report.seigniorage?.indicative_amount || 'N/A'}\nStatus: ${report.block?.status}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Auditable Inspection Report" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Document Header */}
        <Card style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }}>
          <View style={styles.docHeader}>
            <ShieldCheck color={colors.primary} size={28} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={[typography.cardTitle, { color: colors.text }]}>{report.report_title}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Generated: {new Date(report.generated_at).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
              <Share2 color={colors.primary} size={20} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Section 1: Block & Quarry Provenance */}
        <View style={{ marginTop: spacing.md }}>
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
              1. Block & Quarry Provenance
            </Text>
            <View style={styles.tableRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>Block Identifier</Text>
              <Text style={[typography.body, typography.mono, { color: colors.text, fontWeight: 'bold' }]}>
                {report.block?.identifier}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>Granite Category</Text>
              <Text style={[typography.body, { color: colors.accent }]}>
                {report.block?.color_group}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>Quarry Lease</Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {report.quarry?.name || 'Chimakurthy Quarry'} ({report.quarry?.district || 'Prakasam'})
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[typography.body, { color: colors.textSecondary }]}>Field GPS</Text>
              <Text style={[typography.caption, typography.mono, { color: colors.textSecondary }]}>
                15.7800°N, 79.5800°E
              </Text>
            </View>
          </Card>
        </View>

        {/* Section 2: Metric Geometry & Volume */}
        <View style={{ marginTop: spacing.md }}>
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
              2. Metrology & Photogrammetric Geometry
            </Text>
            {report.measurement ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Dimensions (L × B × H)</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {report.measurement.length_cm?.toFixed(1)} × {report.measurement.breadth_cm?.toFixed(1)} × {report.measurement.height_cm?.toFixed(1)} cm
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Bounding-box volume</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.primary, fontWeight: 'bold' }]}>
                    {report.measurement.volume_m3 != null ? `${report.measurement.volume_m3.toFixed(3)} m³` : '—'}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Irregular volume</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {report.measurement.irregular_volume_status || 'IRREGULAR_VOLUME_UNAVAILABLE'}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Density-estimated mass</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.accent, fontWeight: 'bold' }]}>
                    {report.measurement.weight_mt != null ? `${report.measurement.weight_mt.toFixed(3)} MT` : '—'}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Scale Calibration</Text>
                  <Text style={[typography.body, { color: colors.success }]}>
                    {report.measurement.calibration_status}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Evidence label</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    {report.measurement.confidence_label || 'NONE'}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>No measurement record attached.</Text>
            )}
          </Card>
        </View>

        {/* Section 3: Statutory Seigniorage Assessment */}
        <View style={{ marginTop: spacing.md }}>
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
              3. Statutory Seigniorage Assessment
            </Text>
            {report.seigniorage ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Classification</Text>
                  <Text style={[typography.body, { color: colors.text, fontWeight: 'bold' }]}>
                    {report.seigniorage.classification}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Applicable Rate</Text>
                  <Text style={[typography.body, typography.mono, { color: colors.text }]}>
                    ₹{report.seigniorage.rate_per_mt} / MT
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[typography.cardTitle, { color: colors.text }]}>Indicative Fee Due</Text>
                  <Text style={[typography.sectionTitle, typography.mono, { color: colors.primary }]}>
                    ₹{report.seigniorage.indicative_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>No assessment record attached.</Text>
            )}
          </Card>
        </View>

        {/* Section 4: Cryptographic & Audit Trail */}
        <View style={{ marginTop: spacing.md }}>
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.sm }]}>
              4. Immutable Audit Trail
            </Text>
            {report.audit_trail && report.audit_trail.length > 0 ? (
              report.audit_trail.map((log: any, idx: number) => (
                <View key={idx} style={styles.auditRow}>
                  <Clock color={colors.textSecondary} size={14} style={{ marginTop: 2 }} />
                  <View style={{ marginLeft: spacing.xs, flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontSize: 13, fontWeight: '600' }]}>
                      {log.action}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                      {log.details} • {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>No audit log entries found.</Text>
            )}
          </Card>
        </View>

        {/* Legal Disclaimer */}
        <View style={{ marginVertical: spacing.md }}>
          <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }]}>
            {report.disclaimer}
          </Text>
        </View>

        <View style={{ marginBottom: spacing.xxl }}>
          <Button
            title="Return to Home Dashboard"
            onPress={() => router.replace('/(tabs)/home')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  docHeader: { flexDirection: 'row', alignItems: 'center' },
  shareBtn: { padding: spacing.xs },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  auditRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 6 },
});
