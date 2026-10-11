'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Globe,
  Shield,
  HardHat,
  Server,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/localization';
import { useTheme } from '@/lib/theme';
import { useRole, UserRole } from '@/lib/roles';
import { API_BASE_URL } from '@/lib/api';

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useRole();

  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-emerald-500" />
          <span>{t('settings.title')}</span>
        </h1>
        <p className="mt-1 text-xs md:text-sm text-granite-500 dark:text-granite-400">
          {t('settings.subtitle')}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              {t('settings.appearance')}
            </CardTitle>
            <p className="text-xs text-granite-400">{t('settings.theme_desc')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Dark Charcoal</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Ivory Light</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Language Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" />
              {t('settings.language_pref')}
            </CardTitle>
            <p className="text-xs text-granite-400">{t('settings.language_desc')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  language === 'en'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <span className="text-sm font-bold">English</span>
                <span className="text-[10px] text-granite-400">English (India)</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('te')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  language === 'te'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <span className="text-sm font-bold">తెలుగు</span>
                <span className="text-[10px] text-granite-400">Telugu (ఆంధ్రప్రదేశ్)</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Role Switching */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-500" />
              {t('settings.role_pref')}
            </CardTitle>
            <p className="text-xs text-granite-400">{t('settings.role_desc')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  role === 'admin'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <Shield className="h-5 w-5 text-emerald-500" />
                <span className="text-xs">{t('roles.admin')}</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('officer')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  role === 'officer'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                    : 'border-granite-200 dark:border-granite-850 hover:border-granite-400 text-granite-400'
                }`}
              >
                <HardHat className="h-5 w-5 text-amber-500" />
                <span className="text-xs">{t('roles.officer')}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Backend API Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-purple-500" />
              {t('settings.api_config')}
            </CardTitle>
            <p className="text-xs text-granite-400">{t('settings.api_desc')}</p>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="max-w-md">
              <Input
                label={t('settings.api_url')}
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            leftIcon={<Save className="h-4 w-4" />}
          >
            {t('settings.save_settings')}
          </Button>
          {savedSuccess && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Settings updated successfully!
            </motion.span>
          )}
        </div>
      </form>
    </div>
  );
}
