'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  Shield,
  HardHat,
  ChevronDown,
  Check,
  Building2,
  ChevronRight,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useRole, UserRole } from '@/lib/roles';
import { useTranslation } from '@/localization';
import { api, Quarry } from '@/lib/api';

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { role, setRole, roleDisplayName } = useRole();
  const { language, switchLanguage, t } = useTranslation();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [quarries, setQuarries] = useState<Quarry[]>([]);
  const [selectedQuarryId, setSelectedQuarryId] = useState<string>('all');
  const [workerOnline, setWorkerOnline] = useState(false);

  useEffect(() => {
    // Fetch quarries and backend health
    api.getQuarries()
      .then((data) => {
        if (Array.isArray(data)) setQuarries(data);
      })
      .catch(() => {});

    api.getHealth()
      .then((h) => {
        if (h && (h.colmap_available || h.tools?.colmap)) {
          setWorkerOnline(true);
        }
      })
      .catch(() => {});
  }, []);

  const getBreadcrumbTitle = () => {
    if (pathname === '/' || pathname === '/dashboard') {
      return language === 'te' ? 'కమాండ్ నెక్సస్' : 'Command Nexus';
    }
    const segment = pathname.split('/')[1];
    switch (segment) {
      case 'intelligence':
        return language === 'te' ? 'విజన్ పైప్‌లైన్ (18-దశలు)' : 'Vision Pipeline (18-Stage)';
      case 'blocks':
        return language === 'te' ? 'బ్లాక్ రిజిస్ట్రీ' : 'Block Registry';
      case 'processing':
        return language === 'te' ? 'AI ప్రాసెసింగ్ సెంటర్' : 'AI Processing Center';
      case 'reconstruction':
        return language === 'te' ? 'జియోట్విన్ స్టూడియో (3D)' : 'GeoTwin Studio (3D Twin)';
      case 'measurement':
        return language === 'te' ? 'మెట్రిక్ కొలత ఇంటెలిజెన్స్' : 'Metric Intelligence';
      case 'defects':
        return language === 'te' ? 'ఫ్రాక్చర్ ఇంటెలిజెన్స్' : 'Fracture Intelligence';
      case 'cutting':
        return language === 'te' ? 'కట్‌ల్యాబ్ స్టూడియో' : 'CutLab Studio';
      case 'recovery':
        return language === 'te' ? 'దిగుబడి & రికవరీ ఇంటెలిజెన్స్' : 'Yield Intelligence';
      case 'seigniorage':
        return language === 'te' ? 'రాయల్టీ & సీనరేజ్ అసెస్‌మెంట్' : 'Royalty Intelligence';
      case 'dispatch':
        return language === 'te' ? 'రవాణా నియంత్రణ' : 'Dispatch Control';
      case 'quarries':
        return language === 'te' ? 'క్వారీ అట్లాస్' : 'Quarry Atlas';
      case 'reports':
        return language === 'te' ? 'ఆధారాల వాల్ట్' : 'Evidence Vault';
      case 'assistant':
        return language === 'te' ? 'గనుల AI సహాయకుడు' : 'Granite Assistant';
      case 'settings':
        return language === 'te' ? 'సిస్టమ్ సెట్టింగ్‌లు' : 'System Preferences';
      default:
        return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'Workspace';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-granite-200 dark:border-granite-800/80 bg-white/85 dark:bg-granite-900/85 px-4 md:px-6 backdrop-blur-md">
      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs font-medium text-granite-500 dark:text-granite-400">
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          GraniteMeasure
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-granite-300 dark:text-granite-700" />
        <span className="font-bold text-granite-900 dark:text-white">
          {getBreadcrumbTitle()}
        </span>
      </div>

      {/* Controls & Contexts */}
      <div className="flex items-center gap-2.5">
        {/* Architecture Health Pill */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-granite-100 dark:bg-granite-800/70 border border-granite-200 dark:border-granite-700/60 text-[11px]"
          title="Railway API memory bounded within free tier (~512MB). Heavy reconstruction delegated to worker interface."
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-granite-600 dark:text-granite-300">Railway API</span>
          <span className="text-granite-400">|</span>
          <span className={workerOnline ? 'text-emerald-500 font-semibold' : 'text-cyan-500 font-semibold'}>
            {workerOnline ? 'Worker Active' : 'Lightweight CV'}
          </span>
        </div>

        {/* Quarry Context Selector */}
        <div className="hidden md:flex items-center gap-1.5 bg-granite-100 dark:bg-granite-850 px-2.5 py-1.5 rounded-lg border border-granite-200 dark:border-granite-800 text-xs">
          <Building2 className="h-3.5 w-3.5 text-emerald-500" />
          <select
            value={selectedQuarryId}
            onChange={(e) => setSelectedQuarryId(e.target.value)}
            className="bg-transparent text-xs font-medium text-granite-700 dark:text-granite-300 focus:outline-none cursor-pointer max-w-[140px] truncate"
          >
            <option value="all" className="bg-white dark:bg-granite-900">
              {language === 'te' ? 'అన్ని క్వారీలు' : 'All Quarries'}
            </option>
            {quarries.map((q) => (
              <option key={q.id} value={q.id} className="bg-white dark:bg-granite-900">
                {q.name}
              </option>
            ))}
          </select>
        </div>

        {/* Role Switcher Dropdown (No-Login Instant Demo Switch) */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-all"
            title="Instant Role Switch (Admin / Mining Officer)"
          >
            {role === 'admin' ? (
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <HardHat className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span>{language === 'te' ? roleDisplayName.te : roleDisplayName.en}</span>
            <ChevronDown className="h-3 w-3 text-emerald-600/70 dark:text-emerald-400/70" />
          </button>

          <AnimatePresence>
            {roleMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-granite-200 dark:border-granite-700 bg-white dark:bg-granite-850 p-1.5 shadow-xl z-50"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-granite-400">
                  {language === 'te' ? 'వర్క్‌స్పేస్ మార్పిడి' : 'Switch Workspace'}
                </div>
                {(['admin', 'officer'] as UserRole[]).map((r) => {
                  const isCur = role === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setRoleMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-granite-100 dark:hover:bg-granite-800 text-granite-800 dark:text-granite-200"
                    >
                      <div className="flex items-center gap-2">
                        {r === 'admin' ? (
                          <Shield className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <HardHat className="h-4 w-4 text-amber-500" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold">{t(`roles.${r}`)}</span>
                          <span className="text-[10px] text-granite-400">
                            {r === 'admin' ? 'State Administration' : 'Field Inspection & Verification'}
                          </span>
                        </div>
                      </div>
                      {isCur && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Language Toggle */}
        <button
          onClick={switchLanguage}
          className="flex items-center gap-1 rounded-lg border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 px-2.5 py-1.5 text-xs font-bold text-granite-700 dark:text-granite-300 hover:text-emerald-500 transition-colors"
          title="Switch Language (English / తెలుగు)"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-500" />
          <span>{language === 'en' ? 'తెలుగు' : 'EN'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 text-granite-600 dark:text-granite-300 hover:text-emerald-500 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-granite-600" />
          )}
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 text-granite-600 dark:text-granite-300 hover:text-emerald-500 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500" />
        </button>
      </div>
    </header>
  );
}
