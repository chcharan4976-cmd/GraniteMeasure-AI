import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { GeometryViewer, GeometryPayload } from '../../src/components/GeometryViewer';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { getMeasurementGeometry } from '../../src/api/images';
import { useTranslation } from '../../src/i18n/useTranslation';

export default function GeometryScreen() {
  const { blockId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<GeometryPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const geo = await getMeasurementGeometry(blockId as string);
        setData(geo);
      } catch {
        setData({ available: false, reason: 'Geometry endpoint failed.' });
      } finally {
        setLoading(false);
      }
    })();
  }, [blockId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('geometry')} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Card>
            <Text style={[typography.cardTitle, { color: colors.text, marginBottom: spacing.md }]}>
              Reconstructed evidence
            </Text>
            <GeometryViewer data={data} />
            {data?.image_associations && data.image_associations.length > 0 && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.md }]}>
                Source images: {data.image_associations.length} associated files
              </Text>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
