'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  HardHat,
  Gem,
  Globe,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useRole, UserRole } from '@/lib/roles';
import { useTranslation } from '@/localization';
import { useTheme } from '@/lib/theme';

export default function RoleSelectionPage() {
  const router = useRouter();
  const { setRole } = useRole();
  const { language, switchLanguage, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleSelectRole = (role: UserRole) => {
    setRole(role);
    router.push('/dashboard');
  };

  const adminFeatures = [
    language === 'te' ? 'పూర్తి నిబంధనల ఆడిట్' : 'Full Regulatory Oversight',
    language === 'te' ? 'క్వారీ & లీజు నిర్వహణ' : 'Quarry & Lease Administration',
    language === 'te' ? 'సీనరేజ్ రాయల్టీ ధృవీకరణ' : 'Seigniorage Royalty Certification',
    language === 'te' ? 'సిస్టమ్ అనలిటిక్స్ & నివేదికలు' : 'Advanced Audits & Reports',
  ];

  const officerFeatures = [
    language === 'te' ? 'క్షేత్రస్థాయి బ్లాక్ రిజిస్ట్రేషన్' : 'On-Site Block Registration',
    language === 'te' ? '3D ఫోటోగ్రామెట్రీ స్కాన్' : '3D Photogrammetry Capture',
    language === 'te' ? 'జ్యామితీయ కొలత ధృవీకరణ' : 'Geometric Volume Verification',
    language === 'te' ? 'రవాణా ఈ-పర్మిట్ జారీ' : 'Transit Permit Clearance',
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Granite & Glow Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />

      {/* Floating Granite Grid Texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Top Bar Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-20">
        <button
          onClick={switchLanguage}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:border-emerald-500/40 backdrop-blur-md transition-all shadow-lg"
        >
          <Globe className="h-4 w-4 text-emerald-400" />
          <span>{language === 'en' ? 'తెలుగు' : 'English'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:border-emerald-500/40 backdrop-blur-md transition-all shadow-lg"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-300" />
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center">
        {/* Brand Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-inner"
        >
          <Gem className="h-4 w-4 text-emerald-400" />
          <span>GraniteMeasure AI</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">Govt of Andhra Pradesh</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4"
        >
          {t('roles.workspace_selection')}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl text-sm md:text-base text-slate-400 mb-12"
        >
          {t('roles.workspace_subtitle')}
        </motion.p>

        {/* Two Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left">
          {/* Card 1: Administration */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => handleSelectRole('admin')}
            className="group relative cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl hover:border-emerald-500/60 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>

            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="h-7 w-7" />
              </div>

              <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                <span>{t('roles.admin')}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ADM
                </span>
              </h2>

              <p className="mt-2 text-xs md:text-sm text-slate-400 leading-relaxed min-h-[48px]">
                {t('roles.admin_desc')}
              </p>

              <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
                {adminFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t('roles.enter_workspace')}
              </span>
              <span className="text-xs text-slate-500 font-mono">AP-MINES-HQ</span>
            </div>
          </motion.div>

          {/* Card 2: Mining Officer */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => handleSelectRole('officer')}
            className="group relative cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl hover:border-amber-500/60 transition-all duration-300 shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>

            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                <HardHat className="h-7 w-7" />
              </div>

              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                <span>{t('roles.officer')}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  INSP
                </span>
              </h2>

              <p className="mt-2 text-xs md:text-sm text-slate-400 leading-relaxed min-h-[48px]">
                {t('roles.officer_desc')}
              </p>

              <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
                {officerFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t('roles.enter_workspace')}
              </span>
              <span className="text-xs text-slate-500 font-mono">FIELD-OFFICER</span>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center text-xs text-slate-500">
          Department of Mines and Geology • Government of Andhra Pradesh • Granite Photogrammetry Protocol v1.4
        </div>
      </div>
    </div>
  );
}
