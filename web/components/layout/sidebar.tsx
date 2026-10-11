'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Gem,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import {
  CommandNexusIcon,
  QuarryAtlasIcon,
  GraniteBlockIcon,
  GeoTwinIcon,
  MetricRulerIcon,
  FractureIntelligenceIcon,
  CutLabIcon,
  YieldIntelligenceIcon,
  RoyaltyIntelligenceIcon,
  DispatchTruckIcon,
  VisionPipelineIcon,
  EvidenceVaultIcon,
} from '@/components/icons/domain-icons';

interface NavItem {
  key: string;
  nameEn: string;
  nameTe: string;
  subEn: string;
  subTe: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  tag?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'command_center',
    nameEn: 'Command Nexus',
    nameTe: 'కమాండ్ నెక్సస్',
    subEn: 'Operations Center',
    subTe: 'కార్యాచరణ కేంద్రం',
    href: '/dashboard',
    icon: CommandNexusIcon,
  },
  {
    key: 'intelligence',
    nameEn: 'Vision Pipeline',
    nameTe: 'విజన్ పైప్‌లైన్',
    subEn: '18-Stage Intelligence',
    subTe: '18-దశల విశ్లేషణ',
    href: '/intelligence',
    icon: VisionPipelineIcon,
    tag: 'LIVE',
  },
  {
    key: 'granite_blocks',
    nameEn: 'Block Registry',
    nameTe: 'బ్లాక్ రిజిస్ట్రీ',
    subEn: 'Granite Inventory',
    subTe: 'గ్రానైట్ జాబితా',
    href: '/blocks',
    icon: GraniteBlockIcon,
  },
  {
    key: 'reconstruction_studio',
    nameEn: 'GeoTwin Studio',
    nameTe: 'జియోట్విన్ స్టూడియో',
    subEn: '3D Photogrammetry',
    subTe: '3D పునర్నిర్మాణం',
    href: '/reconstruction',
    icon: GeoTwinIcon,
  },
  {
    key: 'measurement',
    nameEn: 'Metric Intelligence',
    nameTe: 'మెట్రిక్ కొలత',
    subEn: 'Calibrated Dimensions',
    subTe: 'ధృవీకరించిన కొలతలు',
    href: '/measurement',
    icon: MetricRulerIcon,
  },
  {
    key: 'defects',
    nameEn: 'Fracture Intelligence',
    nameTe: 'లోప గుర్తింపు',
    subEn: 'Fault & Vein Diagnostics',
    subTe: 'పగుళ్లు & లోపాలు',
    href: '/defects',
    icon: FractureIntelligenceIcon,
  },
  {
    key: 'cutting_recovery',
    nameEn: 'CutLab Studio',
    nameTe: 'కట్‌ల్యాబ్ స్టూడియో',
    subEn: 'Diamond Wire Planner',
    subTe: 'డైమండ్ వైర్ ప్లానర్',
    href: '/cutting',
    icon: CutLabIcon,
  },
  {
    key: 'yield_recovery',
    nameEn: 'Yield Intelligence',
    nameTe: 'దిగుబడి రికవరీ',
    subEn: 'Recovery & Wastage',
    subTe: 'రికవరీ & వ్యర్థం',
    href: '/recovery',
    icon: YieldIntelligenceIcon,
  },
  {
    key: 'seigniorage',
    nameEn: 'Royalty Intelligence',
    nameTe: 'రాయల్టీ సీనరేజ్',
    subEn: 'AP Mines Assessment',
    subTe: 'ప్రభుత్వ సీనరేజ్ అసెస్‌మెంట్',
    href: '/seigniorage',
    icon: RoyaltyIntelligenceIcon,
  },
  {
    key: 'quarries_leases',
    nameEn: 'Quarry Atlas',
    nameTe: 'క్వారీ అట్లాస్',
    subEn: 'Lease Concessions',
    subTe: 'లీజు కన్సెషన్‌లు',
    href: '/quarries',
    icon: QuarryAtlasIcon,
  },
  {
    key: 'dispatch',
    nameEn: 'Dispatch Control',
    nameTe: 'రవాణా నియంత్రణ',
    subEn: 'RFID Transit Passes',
    subTe: 'రవాణా పాస్‌లు',
    href: '/dispatch',
    icon: DispatchTruckIcon,
  },
  {
    key: 'reports',
    nameEn: 'Evidence Vault',
    nameTe: 'ఆధారాల నివేదికలు',
    subEn: 'Certified Audit Reports',
    subTe: 'ఆడిట్ నివేదికలు',
    href: '/reports',
    icon: EvidenceVaultIcon,
  },
  {
    key: 'ai_assistant',
    nameEn: 'Granite Assistant',
    nameTe: 'గనుల AI సహాయకుడు',
    subEn: 'Bilingual Engineering AI',
    subTe: 'ద్విభాషా సహాయకుడు',
    href: '/assistant',
    icon: MessageSquare,
  },
  {
    key: 'settings',
    nameEn: 'Preferences',
    nameTe: 'సెట్టింగ్‌లు',
    subEn: 'Workspace & Language',
    subTe: 'వర్క్‌స్పేస్ సెట్టింగ్‌లు',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { language } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 272 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className={cn(
        'relative flex flex-col border-r border-granite-200 dark:border-granite-800/80 bg-white dark:bg-granite-900/95 backdrop-blur-md h-screen sticky top-0 z-40 select-none shadow-sm'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-4 border-b border-granite-200 dark:border-granite-800/80 justify-between">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/20">
            <Gem className="h-5 w-5" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-granite-900 dark:text-white">
                    GraniteMeasure
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    AI
                  </span>
                </div>
                <span className="text-[10px] font-medium text-granite-400">
                  {language === 'te' ? 'ఆంధ్రప్రదేశ్ గనుల శాఖ' : 'Stone Intelligence Platform'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname?.startsWith(item.href + '/');

          const title = language === 'te' ? item.nameTe : item.nameEn;
          const subtitle = language === 'te' ? item.subTe : item.subEn;

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold transition-all relative',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-granite-600 dark:text-granite-400 hover:bg-granite-100 dark:hover:bg-granite-850 hover:text-granite-900 dark:hover:text-white'
              )}
              title={collapsed ? title : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-1 bottom-1 w-1 rounded-r-md bg-emerald-500"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <div
                className={cn(
                  'p-1.5 rounded-md transition-colors shrink-0',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-granite-400 group-hover:text-granite-700 dark:group-hover:text-granite-200'
                )}
              >
                <Icon size={18} />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-semibold">{title}</span>
                    <span className="truncate text-[10px] text-granite-400 font-normal">
                      {subtitle}
                    </span>
                  </div>
                  {item.tag && (
                    <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                      {item.tag}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-2.5 border-t border-granite-200 dark:border-granite-800/80">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium text-granite-500 dark:text-granite-400 hover:bg-granite-100 dark:hover:bg-granite-850 hover:text-granite-900 dark:hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>{language === 'te' ? 'కుదించు' : 'Collapse'}</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
