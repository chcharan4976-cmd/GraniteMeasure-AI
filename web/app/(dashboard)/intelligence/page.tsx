'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mountain,
  Tag,
  Camera,
  UploadCloud,
  Sparkles,
  Crosshair,
  Cpu,
  GitFork,
  Video,
  Rotate3d,
  Ruler,
  AlertTriangle,
  Scissors,
  PieChart,
  IndianRupee,
  CheckSquare,
  ShieldCheck,
  Truck,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  getBlockJourneyStages,
  IntelligenceStage,
  DEMO_BLOCKS,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Icon map for dynamic stages
const STAGE_ICONS: Record<string, React.ElementType> = {
  Mountain,
  Tag,
  Camera,
  UploadCloud,
  Sparkles,
  Crosshair,
  Cpu,
  GitFork,
  Video,
  Rotate3d,
  Ruler,
  AlertTriangle,
  Scissors,
  PieChart,
  IndianRupee,
  CheckSquare,
  ShieldCheck,
  Truck,
};

export default function GraniteIntelligencePage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [expandedStageId, setExpandedStageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load blocks
  useEffect(() => {
    setIsLoading(true);
    fetchBlocksWithFallback()
      .then((data) => {
        setBlocks(data);
        if (data.length > 0 && !selectedBlockId) {
          setSelectedBlockId(data[0].id);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const stages = getBlockJourneyStages(currentBlock);

  // Find active / running or first awaiting stage
  const activeStage =
    stages.find((s) => s.status === 'running') ||
    stages.find((s) => s.status === 'awaiting') ||
    stages[stages.length - 1];

  const completedCount = stages.filter((s) => s.status === 'completed').length;
  const progressPct = Math.round((completedCount / stages.length) * 100);

  // Color mapping based on stage state
  const getStageStatusStyles = (status: IntelligenceStage['status']) => {
    switch (status) {
      case 'completed':
        return {
          border: 'border-emerald-500/40 dark:border-emerald-500/30',
          bg: 'bg-emerald-500/5 dark:bg-emerald-950/20',
          indicator: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
          badge: 'success' as const,
          label: language === 'te' ? 'పూర్తయింది' : 'Completed',
          line: 'bg-emerald-500',
        };
      case 'running':
        return {
          border: 'border-cyan-400/60 dark:border-cyan-400/40 shadow-lg shadow-cyan-500/10',
          bg: 'bg-cyan-500/10 dark:bg-cyan-950/30',
          indicator: 'bg-cyan-400 text-granite-950 animate-pulse ring-4 ring-cyan-400/20',
          badge: 'processing' as const,
          label: language === 'te' ? 'ప్రస్తుతం అమలవుతోంది' : 'Running Now',
          line: 'bg-cyan-400 animate-pulse',
        };
      case 'insufficient_evidence':
        return {
          border: 'border-amber-500/50 dark:border-amber-500/30',
          bg: 'bg-amber-500/5 dark:bg-amber-950/20',
          indicator: 'bg-amber-500 text-white',
          badge: 'warning' as const,
          label: language === 'te' ? 'ఆధారాలు సరిపోవు' : 'Insufficient Evidence',
          line: 'bg-amber-500',
        };
      case 'failed':
        return {
          border: 'border-rose-500/50 dark:border-rose-500/30',
          bg: 'bg-rose-500/5 dark:bg-rose-950/20',
          indicator: 'bg-rose-500 text-white',
          badge: 'error' as const,
          label: language === 'te' ? 'విఫలమైంది' : 'Failed',
          line: 'bg-rose-500',
        };
      case 'blocked':
        return {
          border: 'border-granite-300 dark:border-granite-800 opacity-60',
          bg: 'bg-granite-100/50 dark:bg-granite-900/20',
          indicator: 'bg-granite-600 text-granite-300',
          badge: 'default' as const,
          label: language === 'te' ? 'లాక్ చేయబడింది' : 'Locked / Blocked',
          line: 'bg-granite-700',
        };
      case 'awaiting':
      default:
        return {
          border: 'border-granite-200 dark:border-granite-800 opacity-80',
          bg: 'bg-white/40 dark:bg-granite-900/40',
          indicator: 'bg-granite-400 dark:bg-granite-700 text-granite-200',
          badge: 'default' as const,
          label: language === 'te' ? 'నిరీక్షణలో' : 'Awaiting Prerequisite',
          line: 'bg-granite-300 dark:bg-granite-800',
        };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'గ్రానైట్ ఇంటెలిజెన్స్ ప్రయాణం' : 'Granite Intelligence Journey'}
            </h1>
            <Badge variant="info" className="ml-2">18 Stages</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'గ్రానైట్ గుర్తింపు నుండి రవాణా వరకు ఎండ్-టు-ఎండ్ ప్రాసెస్ కంట్రోల్ మరియు ఆడిట్ జాడ.'
              : 'End-to-end photogrammetric process control, dimensional certification, and transit pipeline.'}
          </p>
        </div>

        {/* Block Selector */}
        <div className="flex items-center gap-3 bg-white dark:bg-granite-900 p-2 rounded-xl border border-granite-200 dark:border-granite-800 shadow-sm">
          <Tag className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />
          <span className="text-xs font-semibold uppercase text-granite-500 hidden sm:inline">
            {language === 'te' ? 'బ్లాక్' : 'Select Block'}:
          </span>
          <select
            value={currentBlock.id}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="bg-transparent text-sm font-semibold text-granite-900 dark:text-white focus:outline-none cursor-pointer pr-2"
          >
            {blocks.map((blk) => (
              <option key={blk.id} value={blk.id} className="dark:bg-granite-900">
                {blk.block_number} ({blk.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Process Control KPI Summary Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current State Indicator */}
        <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-medium text-granite-500 dark:text-granite-400 uppercase tracking-wider block">
                {language === 'te' ? 'ఇప్పుడు ఏమి జరుగుతోంది?' : 'What Is Happening Now?'}
              </span>
              <span className="text-sm font-bold text-granite-900 dark:text-white">
                {language === 'te' ? activeStage.name_te : activeStage.name_en}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Completed Count */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-granite-500 dark:text-granite-400 uppercase tracking-wider block">
                {language === 'te' ? 'పూర్తయిన దశలు' : 'Pipeline Progress'}
              </span>
              <span className="text-sm font-bold text-granite-900 dark:text-white">
                {completedCount} / 18 ({progressPct}%)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Certified Volume & Mass */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-granite-500 dark:text-granite-400 uppercase tracking-wider block">
                {language === 'te' ? 'కొలతలు & ఘనపరిమాణం' : 'Dimensions & Volume'}
              </span>
              <span className="text-sm font-bold text-granite-900 dark:text-white">
                {currentBlock.volume_m3 ? `${currentBlock.volume_m3} m³ (${currentBlock.weight_tons} MT)` : 'Pending'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Transit Readiness */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-medium text-granite-500 dark:text-granite-400 uppercase tracking-wider block">
                {language === 'te' ? 'తదుపరి దశ' : 'What Comes Next?'}
              </span>
              <span className="text-sm font-bold text-granite-900 dark:text-white">
                {currentBlock.status === 'APPROVED'
                  ? 'Dispatch Permit & Transit'
                  : currentBlock.status === 'MEASURED'
                  ? 'Seigniorage Assessment'
                  : 'Surface Reconstruction'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Vertical Connected Pipeline */}
      <div className="relative pl-6 md:pl-10 space-y-4">
        {/* Master Vertical Line Backbone */}
        <div className="absolute left-9 md:left-13 top-4 bottom-8 w-1 bg-gradient-to-b from-emerald-500 via-cyan-500 to-granite-300 dark:to-granite-800 rounded-full" />

        {stages.map((stage, index) => {
          const styles = getStageStatusStyles(stage.status);
          const IconComponent = STAGE_ICONS[stage.icon] || Sparkles;
          const isExpanded = expandedStageId === stage.id;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="relative flex items-start gap-4 md:gap-6 group"
            >
              {/* Stage Number Node / Indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-sm transition-all duration-300 border-2 border-white dark:border-granite-950',
                  styles.indicator
                )}
              >
                {stage.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <span>{stage.id}</span>
                )}
              </div>

              {/* Stage Card */}
              <div
                onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                className={cn(
                  'flex-1 rounded-xl p-4 md:p-5 border transition-all duration-200 cursor-pointer shadow-sm select-none',
                  styles.border,
                  styles.bg,
                  isExpanded && 'ring-2 ring-emerald-500/40 shadow-md'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/60 dark:bg-granite-800/80 text-granite-800 dark:text-granite-200 shadow-xs">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-granite-900 dark:text-white">
                          {language === 'te' ? stage.name_te : stage.name_en}
                        </h3>
                        <span className="text-xs text-granite-400 font-normal">
                          ({language === 'te' ? stage.name_en : stage.name_te})
                        </span>
                      </div>
                      <p className="text-xs text-granite-500 dark:text-granite-400 mt-0.5">
                        {language === 'te' ? stage.summary_te : stage.summary_en}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    {stage.timestamp && (
                      <span className="text-[11px] font-mono text-granite-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stage.timestamp}
                      </span>
                    )}
                    <Badge variant={styles.badge} dot>
                      {styles.label}
                    </Badge>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-granite-400 transition-transform duration-200',
                        isExpanded && 'rotate-180 text-emerald-500'
                      )}
                    />
                  </div>
                </div>

                {/* Expanded Stage Provenance Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-3 border-t border-granite-200/60 dark:border-granite-800/80 overflow-hidden text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-white/60 dark:bg-granite-900/60 p-3 rounded-lg border border-granite-200/50 dark:border-granite-800/50">
                        {stage.details &&
                          Object.entries(stage.details).map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-granite-400 tracking-wider">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="font-semibold text-granite-800 dark:text-granite-200 break-words">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-granite-500">
                        <span>
                          {language === 'te'
                            ? 'బ్లాక్‌చెయిన్ ఆడిట్ లెడ్జర్: రికార్డ్ లాక్ చేయబడింది'
                            : 'Cryptographic Provenance: Signed by Mining Inspectorate'}
                        </span>
                        {stage.id === 10 && (
                          <Link
                            href="/reconstruction"
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>Open 3D Studio</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {stage.id === 11 && (
                          <Link
                            href="/measurement"
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>Open Measurements</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {stage.id === 15 && (
                          <Link
                            href="/seigniorage"
                            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                          >
                            <span>View Seigniorage Sheet</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
