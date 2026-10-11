import { Tabs } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';
import { Home, Settings, UploadCloud } from 'lucide-react-native';
import { useTranslation } from '../../src/i18n/useTranslation';
import {
  GraniteBlockIcon,
  QuarryAtlasIcon,
} from '../../src/components/DomainIcons';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="quarries"
        options={{
          title: t('quarries'),
          tabBarIcon: ({ color }) => <QuarryAtlasIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="blocks"
        options={{
          title: t('blocks'),
          tabBarIcon: ({ color }) => <GraniteBlockIcon color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: t('upload'),
          tabBarIcon: ({ color }) => <UploadCloud color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}

