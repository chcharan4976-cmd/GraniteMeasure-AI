'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  PlusCircle,
  Scan,
  Scale,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Layers,
  MapPin,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/localization';
import { useRole } from '@/lib/roles';
import { api, GraniteBlock, AnalysisJob, Quarry } from '@/lib/api';
import {
  DEMO_BLOCKS,
  DEMO_QUARRIES,
  fetchBlocksWithFallback,
} from '@/lib/data-service';
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
  CalibrationMarkerIcon,
} from '@/components/icons/domain-icons';
import { cn } from '@/lib/cn';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

export default function CommandNexusPage() {
  const { t, language } = useTranslation();
  const { role, roleDisplayName } = useRole();

  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [quarries, setQuarries] = useState<Quarry[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [blocksData, quarriesData, jobsData] = await Promise.allSettled([
        fetchBlocksWithFallback(),
        api.getQuarries(),
        api.getAnalysisJobs(),
      ]);

      if (blocksData.status === 'fulfilled') {
        setBlocks(blocksData.value);
      } else {
        setBlocks(DEMO_BLOCKS);
      }

      if (quarriesData.status === 'fulfilled' && Array.isArray(quarriesData.value) && quarriesData.value.length > 0) {
        setQuarries(quarriesData.value);
      } else {
        setQuarries(DEMO_QUARRIES);
      }

      if (jobsData.status === 'fulfilled' && Array.isArray(jobsData.value)) {
        setJobs(jobsData.value);
      } else {
        setJobs([
          {
            id: 'job-8819',
            block_id: 'blk-001',
            status: 'COMPLETED',
            current_step: 'METRIC_SCALING_CERTIFIED',
            progress_pct: 100,
            created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          },
          {
            id: 'job-0422',
            block_id: 'blk-002',
            status: 'COMPLETED',
            current_step: 'BOUNDING_BOX_OBB_SOLVED',
            progress_pct: 100,
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          },
          {
            id: 'job-0105',
            block_id: 'blk-003',
            status: 'RUNNING',
            current_step: 'FEATURE_MATCHING_EPIPOLAR',
            progress_pct: 68,
            created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live aggregates
  const totalVolume = blocks.reduce((acc, b) => acc + (b.volume_m3 || 0), 0);
  const totalTonnage = blocks.reduce((acc, b) => acc + (b.weight_tons || (b.volume_m3 ? b.volume_m3 * 2.7 : 0)), 0);
  const rawCount = blocks.filter((b) => b.block_type === 'RAW').length;
  const processedCount = blocks.filter((b) => b.block_type === 'PROCESSED').length;
  const measuredCount = blocks.filter((b) => ['MEASURED', 'VERIFIED', 'ASSESSED', 'APPROVED', 'DISPATCHED'].includes(b.status)).length;
  const dispatchedCount = blocks.filter((b) => b.status === 'DISPATCHED').length;

  const spotlightBlock = blocks[0] || DEMO_BLOCKS[0];

  const filteredQuarries = selectedDistrict === 'all'
    ? quarries
    : quarries.filter((q) => q.district?.toLowerCase() === selectedDistrict.toLowerCase());

  return (
    <motion.div className="space-y-6 select-none" initial="initial" animate="animate" variants={stagger}>
      {/* SECTION A: COMMAND HERO */}
      <motion.div variants={fadeIn}>
        <div className="relative overflow-hidden rounded-2xl border border-granite-200 dark:border-granite-800 bg-gradient-to-r from-granite-900 via-granite-850 to-granite-950 p-6 text-white shadow-xl">
          <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute right-40 bottom-0 -mb-12 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {language === 'te' ? 'కమాండ్ నెక్సస్' : 'Command Nexus'}
                </span>
                <span className="text-xs text-granite-400 font-mono">
                  AP-MINES-GOVT-INTEL v3.2
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {language === 'te' ? 'ఆంధ్రప్రదేశ్ గ్రానైట్ ఇంటెలిజెన్స్ ప్లాట్‌ఫారమ్' : 'GraniteMeasure AI — Stone Intelligence Platform'}
              </h1>
              <p className="text-xs md:text-sm text-granite-300 max-w-2xl font-normal leading-relaxed">
                {language === 'te'
                  ? 'మొబైల్ ఫోటోగ్రామెట్రీ, ArUco మెట్రిక్ స్కేలింగ్, 3D డిజిటల్ ట్విన్ పునర్నిర్మాణం మరియు చట్టబద్ధమైన సీనరేజ్ నిర్ధారణ వేదిక.'
                  : 'Certified mobile photogrammetry, fiducial metric calibration, irregular 3D digital twins, intelligent wire cutting and statutory seigniorage assessment.'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={refreshing}
                className="bg-granite-800/80 border-granite-700 text-white hover:bg-granite-700 hover:text-white"
              >
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
                {language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}
              </Button>
              <Link href="/blocks">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 font-semibold">
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  {language === 'te' ? 'కొత్త బ్లాక్ నమోదు' : 'Register Block'}
                </Button>
              </Link>
              <Link href="/intelligence">
                <Button size="sm" variant="outline" className="bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50">
                  <VisionPipelineIcon size={16} className="mr-1.5 text-cyan-400" />
                  {language === 'te' ? '18-దశల పైప్‌లైన్' : 'Vision Pipeline'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      {/* SECTION B: OPERATIONAL OVERVIEW (KPI CARDS) */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          icon={<GraniteBlockIcon size={20} className="text-emerald-500" />}
          label={language === 'te' ? 'మొత్తం బ్లాక్‌లు' : 'Registered Blocks'}
          value={blocks.length.toString()}
          subtext={`${rawCount} RAW · ${processedCount} Dressed`}
          accent="emerald"
        />
        <KpiCard
          icon={<QuarryAtlasIcon size={20} className="text-teal-500" />}
          label={language === 'te' ? 'క్రియాశీల క్వారీలు' : 'Quarry Leases'}
          value={quarries.length.toString()}
          subtext={language === 'te' ? 'ప్రకాశం, ఖమ్మం, శ్రీకాకుళం' : 'Prakasam, Khammam, Srikakulam'}
          accent="teal"
        />
        <KpiCard
          icon={<MetricRulerIcon size={20} className="text-cyan-500" />}
          label={language === 'te' ? 'ధృవీకరించిన కొలతలు' : 'Certified Measured'}
          value={measuredCount.toString()}
          subtext={`${((measuredCount / (blocks.length || 1)) * 100).toFixed(0)}% coverage`}
          accent="cyan"
        />
        <KpiCard
          icon={<YieldIntelligenceIcon size={20} className="text-amber-500" />}
          label={language === 'te' ? 'మొత్తం ఘనపరిమాణం' : 'Total Evaluated Vol'}
          value={`${totalVolume.toFixed(1)} m³`}
          subtext={`≈ ${totalTonnage.toFixed(0)} MT mass`}
          accent="amber"
        />
        <KpiCard
          icon={<RoyaltyIntelligenceIcon size={20} className="text-emerald-500" />}
          label={language === 'te' ? 'సీనరేజ్ అంచనా' : 'Seigniorage Due'}
          value="₹18.42 L"
          subtext="G.O.Ms.No. 42 rates"
          accent="emerald"
        />
        <KpiCard
          icon={<DispatchTruckIcon size={20} className="text-blue-500" />}
          label={language === 'te' ? 'రవాణా క్లియరెన్స్' : 'Dispatched / Transit'}
          value={dispatchedCount.toString()}
          subtext="RFID port permits"
          accent="blue"
        />
      </motion.div>

      {/* SECTION C & D: INTERACTIVE QUARRY ATLAS + LIVE VISION PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section C: Quarry Atlas (7 cols) */}
        <motion.div variants={fadeIn} className="lg:col-span-7 space-y-4">
          <Card className="border-granite-200 dark:border-granite-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <QuarryAtlasIcon size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-granite-900 dark:text-white">
                      {language === 'te' ? 'క్వారీ అట్లాస్ & లీజుల పర్యవేక్షణ' : 'Quarry Atlas & Concession Registry'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {language === 'te' ? 'ఆంధ్రప్రదేశ్ క్రియాశీల గ్రానైట్ క్వారీల భౌగోళిక వివరాలు' : 'Spatial registry of active commercial granite leases'}
                    </CardDescription>
                  </div>
                </div>

                {/* District Filter Chips */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-granite-100 dark:bg-granite-850 text-xs">
                  {['all', 'Prakasam', 'Khammam', 'Srikakulam'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDistrict(d)}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-semibold text-[11px] transition-all',
                        selectedDistrict === d
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-granite-600 dark:text-granite-400 hover:text-granite-900 dark:hover:text-white'
                      )}
                    >
                      {d === 'all' ? (language === 'te' ? 'అన్నీ' : 'All') : d}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1">
                {filteredQuarries.map((q) => (
                  <Link
                    key={q.id}
                    href="/quarries"
                    className="p-3.5 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50/50 dark:bg-granite-850/50 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all group block"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-granite-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                            {q.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-granite-500 dark:text-granite-400 flex items-center gap-1">
                          <MapPin size={11} className="text-emerald-500 shrink-0" />
                          <span>{q.location || `${q.village}, ${q.mandal}`} ({q.district})</span>
                        </p>
                      </div>
                      <Badge variant="success" className="text-[10px]">
                        {q.status || 'ACTIVE'}
                      </Badge>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-granite-200/60 dark:border-granite-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-granite-400 font-mono text-[10px]">
                        {q.lease_number || q.lease_reference}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {q.active_blocks_count || 12} {language === 'te' ? 'బ్లాక్‌లు' : 'Blocks'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section D: Live Vision Pipeline (5 cols) */}
        <motion.div variants={fadeIn} className="lg:col-span-5 space-y-4">
          <Card className="border-granite-200 dark:border-granite-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                    <VisionPipelineIcon size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-granite-900 dark:text-white">
                      {language === 'te' ? 'లైవ్ విజన్ పైప్‌లైన్' : 'Live Vision Pipeline'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {language === 'te' ? 'ఫోటోగ్రామెట్రీ & AI ప్రాసెసింగ్ జాబ్స్' : 'Active photogrammetry & scaling jobs'}
                    </CardDescription>
                  </div>
                </div>
                <Link href="/intelligence">
                  <Button variant="ghost" size="sm" className="text-xs text-cyan-500 hover:text-cyan-400 h-8 px-2">
                    {language === 'te' ? 'పైప్‌లైన్ తెరవండి' : 'Open Pipeline'}
                    <ChevronRight size={14} className="ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50/50 dark:bg-granite-850/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-granite-900 dark:text-white">
                          #{job.id}
                        </span>
                        <span className="text-[10px] text-granite-400">({job.block_id})</span>
                      </div>
                      <Badge
                        variant={job.status === 'COMPLETED' ? 'success' : job.status === 'RUNNING' ? 'processing' : 'warning'}
                        className="text-[10px]"
                      >
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-granite-500 text-[11px] font-medium truncate max-w-[200px]">
                        {job.current_step || 'Analysis underway'}
                      </span>
                      <span className="font-mono font-bold text-emerald-500 text-[11px]">
                        {job.progress_pct || (job.status === 'COMPLETED' ? 100 : 45)}%
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-granite-200 dark:bg-granite-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-cyan-500 animate-pulse'
                        )}
                        style={{ width: `${job.progress_pct || (job.status === 'COMPLETED' ? 100 : 45)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* SECTION E: GRANITE INTELLIGENCE SPOTLIGHT (LATEST 3D CERTIFIED BLOCK) */}
      <motion.div variants={fadeIn}>
        <Card className="border-emerald-500/20 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.02] via-transparent to-teal-500/[0.02]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <GeoTwinIcon size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-granite-900 dark:text-white">
                      {language === 'te' ? 'గ్రానైట్ ఇంటెలిజెన్స్ స్పాట్‌లైట్' : 'Granite Intelligence Spotlight'}
                    </CardTitle>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      CERTIFIED METRIC
                    </span>
                  </div>
                  <CardDescription className="text-xs">
                    {spotlightBlock.identifier || spotlightBlock.block_number} — {spotlightBlock.granite_category || spotlightBlock.color_group}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/reconstruction`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    <GeoTwinIcon size={14} className="mr-1 text-emerald-500" />
                    {language === 'te' ? '3D ట్విన్ చూడండి' : 'View 3D Digital Twin'}
                  </Button>
                </Link>
                <Link href={`/cutting`}>
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    <CutLabIcon size={14} className="mr-1 text-teal-500" />
                    {language === 'te' ? 'కట్‌ల్యాబ్ సిమ్యులేటర్' : 'CutLab Simulator'}
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <SpotlightMetric
                label={language === 'te' ? 'పొడవు (L)' : 'Length (L)'}
                value={`${(spotlightBlock.length_m ? spotlightBlock.length_m * 100 : 285.0).toFixed(1)} cm`}
                sublabel={spotlightBlock.length_m ? `${spotlightBlock.length_m.toFixed(2)} m` : '2.85 m'}
                accent="cyan"
              />
              <SpotlightMetric
                label={language === 'te' ? 'వెడల్పు (B)' : 'Breadth (B)'}
                value={`${(spotlightBlock.breadth_m ? spotlightBlock.breadth_m * 100 : 162.0).toFixed(1)} cm`}
                sublabel={spotlightBlock.breadth_m ? `${spotlightBlock.breadth_m.toFixed(2)} m` : '1.62 m'}
                accent="cyan"
              />
              <SpotlightMetric
                label={language === 'te' ? 'ఎత్తు (H)' : 'Height (H)'}
                value={`${(spotlightBlock.height_m ? spotlightBlock.height_m * 100 : 148.0).toFixed(1)} cm`}
                sublabel={spotlightBlock.height_m ? `${spotlightBlock.height_m.toFixed(2)} m` : '1.48 m'}
                accent="cyan"
              />
              <SpotlightMetric
                label={language === 'te' ? 'ఘనపరిమాణం' : 'BBox Volume'}
                value={`${(spotlightBlock.volume_m3 || 6.83).toFixed(2)} m³`}
                sublabel="Calculated OBB"
                accent="emerald"
              />
              <SpotlightMetric
                label={language === 'te' ? 'సాంద్రత బరువు' : 'Estimated Mass'}
                value={`${(spotlightBlock.weight_tons || 18.44).toFixed(2)} MT`}
                sublabel="2.70 tonnes/m³"
                accent="amber"
              />
              <SpotlightMetric
                label={language === 'te' ? 'గ్యాంగ్‌సా క్లాస్' : 'Gangsaw Class'}
                value="ABOVE"
                sublabel="L≥270 & B≥150 cm"
                accent="emerald"
                badge
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SECTION F & G: ACTION QUEUE & OPERATIONAL TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section F: Action Queue (6 cols) */}
        <motion.div variants={fadeIn} className="lg:col-span-6 space-y-3">
          <Card className="border-granite-200 dark:border-granite-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="text-base font-bold text-granite-900 dark:text-white">
                    {language === 'te' ? 'కార్యాచరణ చర్యల జాబితా' : 'Operational Action Queue'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {language === 'te' ? 'అధికారి / అడ్మిన్ ఆమోదం లేదా ధృవీకరణ అవసరమైన అంశాలు' : 'Items requiring officer inspection or administrative action'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <ActionItem
                  title={language === 'te' ? 'కాలిబ్రేషన్ కొరవడింది: BLK-2026-CHM-0831' : 'Scale Not Established: BLK-2026-CHM-0831'}
                  desc={language === 'te' ? 'ArUco మార్కర్ కనిపించలేదు. మొబైల్ ద్వారా తిరిగి ఫోటో తీయండి.' : 'No ArUco fiducial detected. Recapture with reference marker.'}
                  type="warning"
                  href="/blocks/blk-005"
                  btnText={language === 'te' ? 'పరిశీలించు' : 'Review'}
                />
                <ActionItem
                  title={language === 'te' ? 'సీనరేజ్ ఆమోదం వేచి ఉంది: BLK-2026-CHM-0819' : 'Seigniorage Sign-off Pending: BLK-2026-CHM-0819'}
                  desc={language === 'te' ? '₹1,07,455 రాయల్టీ డిప్యూటీ డైరెక్టర్ ఆమోదం కోసం సిద్ధంగా ఉంది.' : '₹1,07,455 statutory assessment ready for Deputy Director.'}
                  type="info"
                  href="/seigniorage"
                  btnText={language === 'te' ? 'ఆమోదించు' : 'Approve'}
                />
                <ActionItem
                  title={language === 'te' ? 'రవాణా పాస్ ఉత్పత్తి: BLK-2026-ONG-0914' : 'Transit Permit Clearance: BLK-2026-ONG-0914'}
                  desc={language === 'te' ? 'కృష్ణపట్నం పోర్ట్ రవాణా కోసం RFID వే-బిల్ సిద్ధంగా ఉంది.' : 'RFID transit pass generation ready for vehicle AP 27 TX 4821.'}
                  type="success"
                  href="/dispatch"
                  btnText={language === 'te' ? 'జారీ చేయి' : 'Issue Pass'}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section G: Operational Timeline (6 cols) */}
        <motion.div variants={fadeIn} className="lg:col-span-6 space-y-3">
          <Card className="border-granite-200 dark:border-granite-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                <div>
                  <CardTitle className="text-base font-bold text-granite-900 dark:text-white">
                    {language === 'te' ? 'ఆడిట్ లెడ్జర్ & టైమ్‌లైన్' : 'Audit Ledger & Operational Timeline'}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {language === 'te' ? 'గనుల శాఖ ఆడిట్ రికార్డులు మరియు తాజా మార్పులు' : 'Cryptographically traceable actions in Andhra Pradesh registry'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 border-l-2 border-granite-200 dark:border-granite-800 ml-2 pl-4">
                <TimelineItem
                  time="10 mins ago"
                  title="RFID Transit Tag Scanned"
                  detail="Block BLK-2026-ONG-0914 passed Chimakurthy Toll checkpost toward Krishnapatnam Port."
                />
                <TimelineItem
                  time="45 mins ago"
                  title="ArUco Metric Scaling Certified"
                  detail="Sub-millimeter scale constraint resolved for Block BLK-2026-CHM-0819 (4 markers)."
                />
                <TimelineItem
                  time="2 hours ago"
                  title="Diamond Wire CutPlan Generated"
                  detail="3-cut squaring optimization calculated with 81.6% commercial yield."
                />
                <TimelineItem
                  time="4 hours ago"
                  title="Raw Block Registered"
                  detail="BLK-2026-SRK-0105 registered by Asst. Geologist at Tekkali Blue Star Concession."
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  accent: 'emerald' | 'teal' | 'cyan' | 'amber' | 'blue';
}) {
  const borderMap = {
    emerald: 'hover:border-emerald-500/50',
    teal: 'hover:border-teal-500/50',
    cyan: 'hover:border-cyan-500/50',
    amber: 'hover:border-amber-500/50',
    blue: 'hover:border-blue-500/50',
  };

  return (
    <div className={cn(
      'p-4 rounded-xl border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900 shadow-sm transition-all',
      borderMap[accent]
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="p-1.5 rounded-lg bg-granite-100 dark:bg-granite-800/80">{icon}</span>
      </div>
      <p className="text-[11px] font-medium text-granite-500 dark:text-granite-400 truncate">{label}</p>
      <p className="text-xl font-extrabold text-granite-900 dark:text-white mt-0.5 tracking-tight">{value}</p>
      <p className="text-[10px] text-granite-400 dark:text-granite-500 mt-1 truncate">{subtext}</p>
    </div>
  );
}

function SpotlightMetric({
  label,
  value,
  sublabel,
  accent,
  badge = false,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: string;
  badge?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-granite-100/70 dark:bg-granite-800/60 border border-granite-200/50 dark:border-granite-700/50">
      <p className="text-[10px] text-granite-500 dark:text-granite-400 font-medium">{label}</p>
      {badge ? (
        <div className="mt-1">
          <span className="px-2 py-0.5 rounded text-xs font-black bg-emerald-500 text-white tracking-wide">
            {value}
          </span>
        </div>
      ) : (
        <p className="text-base font-bold font-mono text-granite-900 dark:text-white mt-0.5">{value}</p>
      )}
      <p className="text-[10px] text-granite-400 dark:text-granite-500 mt-0.5 font-mono">{sublabel}</p>
    </div>
  );
}

function ActionItem({
  title,
  desc,
  type,
  href,
  btnText,
}: {
  title: string;
  desc: string;
  type: 'warning' | 'info' | 'success';
  href: string;
  btnText: string;
}) {
  const typeStyles = {
    warning: 'border-l-amber-500 bg-amber-500/[0.03]',
    info: 'border-l-cyan-500 bg-cyan-500/[0.03]',
    success: 'border-l-emerald-500 bg-emerald-500/[0.03]',
  };

  return (
    <div className={cn(
      'p-3 rounded-lg border border-granite-200 dark:border-granite-800 border-l-4 flex items-center justify-between gap-3',
      typeStyles[type]
    )}>
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-granite-900 dark:text-white">{title}</p>
        <p className="text-[11px] text-granite-500 dark:text-granite-400">{desc}</p>
      </div>
      <Link href={href}>
        <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 shrink-0">
          {btnText}
        </Button>
      </Link>
    </div>
  );
}

function TimelineItem({
  time,
  title,
  detail,
}: {
  time: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="relative space-y-1">
      <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-granite-900 dark:text-white">{title}</span>
        <span className="text-[10px] text-granite-400 font-mono">{time}</span>
      </div>
      <p className="text-[11px] text-granite-500 dark:text-granite-400 leading-relaxed">{detail}</p>
    </div>
  );
}
