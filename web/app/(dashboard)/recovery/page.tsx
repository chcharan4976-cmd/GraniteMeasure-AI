'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, BarChart3, Layers, Box, Scissors, ArrowRight,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  RefreshCw, Calculator, Maximize2, Info
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  fetchBlockById,
  DEMO_CUTTING_PLANS,
  CuttingPlan,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };

interface RecoveryBreakdown {
  originalVolume: number;
  dressedVolume: number;
  removedVolume: number;
  kerfAllowance: number;
  recoveryRatio: number;
  wastageRatio: number;
  operations: { name: string; volumeRemoved: number; percentage: number; color: string }[];
}

function computeRecovery(block: GraniteBlock, plan?: CuttingPlan): RecoveryBreakdown {
  const originalVolume = plan?.raw_volume_m3 || block.volume_m3 || 0;
  const dressedVolume = plan?.dressed_volume_m3 || originalVolume * 0.82;
  const removedVolume = plan?.removed_volume_m3 || originalVolume - dressedVolume;
  const kerfAllowance = originalVolume * 0.02;
  const recoveryRatio = plan?.recovery_ratio_pct || (originalVolume > 0 ? (dressedVolume / originalVolume) * 100 : 0);
  const wastageRatio = 100 - recoveryRatio;

  const ops = plan?.operations || [];
  const opBreakdowns = ops.length > 0
    ? ops.map((op, i) => {
        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
        const approxVol = (op.thickness_removed_cm / 100) * (originalVolume / ops.length) * 2;
        return {
          name: op.reason,
          volumeRemoved: approxVol,
          percentage: (approxVol / removedVolume) * 100,
          color: colors[i % colors.length],
        };
      })
    : [
        { name: 'Top leveling', volumeRemoved: removedVolume * 0.35, percentage: 35, color: '#ef4444' },
        { name: 'End squaring', volumeRemoved: removedVolume * 0.30, percentage: 30, color: '#f59e0b' },
        { name: 'Flank dressing', volumeRemoved: removedVolume * 0.25, percentage: 25, color: '#3b82f6' },
        { name: 'Kerf loss', volumeRemoved: kerfAllowance, percentage: 10, color: '#6b7280' },
      ];

  return { originalVolume, dressedVolume, removedVolume, kerfAllowance, recoveryRatio, wastageRatio, operations: opBreakdowns };
}

export default function RecoveryPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [selectedBlock, setSelectedBlock] = useState<GraniteBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFormulas, setShowFormulas] = useState(false);

  useEffect(() => {
    fetchBlocksWithFallback().then(b => {
      setBlocks(b);
      if (b.length > 0) setSelectedBlockId(b[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedBlockId) {
      fetchBlockById(selectedBlockId).then(setSelectedBlock);
    }
  }, [selectedBlockId]);

  const plan = selectedBlock ? DEMO_CUTTING_PLANS[selectedBlock.id] : undefined;
  const recovery = selectedBlock ? computeRecovery(selectedBlock, plan) : null;

  return (
    <motion.div className="space-y-6" initial="initial" animate="animate" variants={stagger}>
      {/* Header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-granite-900 dark:text-granite-100">
            {language === 'te' ? 'రికవరీ & వ్యర్థ విశ్లేషణ' : 'Recovery & Wastage Analysis'}
          </h1>
          <p className="text-sm text-granite-500 dark:text-granite-400 mt-1">
            {language === 'te' ? 'పదార్థ రికవరీ, కోత వ్యర్థం మరియు ఉత్పత్తి అంచనా' : 'Material recovery, cutting wastage, and product yield estimation'}
          </p>
        </div>
        <Select
          label=""
          value={selectedBlockId}
          onChange={(e) => setSelectedBlockId(e.target.value)}
          options={blocks.map(b => ({ value: b.id, label: b.block_number || b.identifier || b.id }))}
        />
      </motion.div>

      {selectedBlock && recovery && (
        <>
          {/* Recovery Summary Cards */}
          <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={<Box className="w-5 h-5 text-granite-500" />}
              label={language === 'te' ? 'మూల ఘనపరిమాణం' : 'Original Volume'}
              value={`${recovery.originalVolume.toFixed(2)} m³`}
              sublabel={`${(recovery.originalVolume * 2.7).toFixed(1)} MT`}
            />
            <MetricCard
              icon={<Layers className="w-5 h-5 text-emerald-500" />}
              label={language === 'te' ? 'దుస్తులు ఘనపరిమాణం' : 'Dressed Volume'}
              value={`${recovery.dressedVolume.toFixed(2)} m³`}
              sublabel={`${(recovery.dressedVolume * 2.7).toFixed(1)} MT`}
              accent
            />
            <MetricCard
              icon={<Scissors className="w-5 h-5 text-red-500" />}
              label={language === 'te' ? 'తొలగించిన పదార్థం' : 'Material Removed'}
              value={`${recovery.removedVolume.toFixed(2)} m³`}
              sublabel={`${(recovery.removedVolume * 2.7).toFixed(1)} MT`}
            />
            <MetricCard
              icon={<PieChart className="w-5 h-5 text-amber-500" />}
              label={language === 'te' ? 'రికవరీ నిష్పత్తి' : 'Recovery Ratio'}
              value={`${recovery.recoveryRatio.toFixed(1)}%`}
              sublabel={`${language === 'te' ? 'వ్యర్థం' : 'Wastage'}: ${recovery.wastageRatio.toFixed(1)}%`}
              accent
            />
          </motion.div>

          {/* Visual Recovery Breakdown */}
          <motion.div variants={fadeIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  {language === 'te' ? 'పదార్థ కేటాయింపు విజువలైజేషన్' : 'Material Allocation Visualization'}
                </CardTitle>
                <CardDescription>
                  {language === 'te' ? 'కోత కార్యకలాపాల ద్వారా పదార్థ విభజన' : 'Material distribution across cutting operations'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sankey-style horizontal bar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-granite-700 dark:text-granite-300">
                    <span>{language === 'te' ? 'మూల రాయి దిమ్మె' : 'Original Block'}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span>{language === 'te' ? 'దుస్తులు ఉత్పత్తి' : 'Dressed Product'}</span>
                  </div>
                  
                  {/* Full bar showing recovery vs wastage */}
                  <div className="relative h-12 rounded-lg overflow-hidden bg-granite-200 dark:bg-granite-700">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-emerald-500 flex items-center justify-center text-white text-sm font-bold"
                      initial={{ width: 0 }}
                      animate={{ width: `${recovery.recoveryRatio}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                    >
                      {recovery.recoveryRatio.toFixed(1)}% {language === 'te' ? 'రికవరీ' : 'Recovery'}
                    </motion.div>
                    <div className="absolute inset-y-0 right-0 flex items-center justify-center text-granite-600 dark:text-granite-300 text-sm font-medium pr-3">
                      {recovery.wastageRatio.toFixed(1)}% {language === 'te' ? 'వ్యర్థం' : 'Waste'}
                    </div>
                  </div>

                  {/* Wastage breakdown */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-granite-600 dark:text-granite-400">
                      {language === 'te' ? 'వ్యర్థం విభజన' : 'Wastage Breakdown'}
                    </p>
                    {recovery.operations.map((op, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: op.color }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-granite-700 dark:text-granite-300">{op.name}</span>
                            <span className="font-mono text-granite-600 dark:text-granite-400">
                              {op.volumeRemoved.toFixed(3)} m³
                            </span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-granite-100 dark:bg-granite-800 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: op.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${op.percentage}%` }}
                              transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Formulas and Calculations */}
          <motion.div variants={fadeIn}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-cyan-500" />
                    {language === 'te' ? 'గణన వివరాలు' : 'Calculation Details'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFormulas(!showFormulas)}
                  >
                    {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {language === 'te' ? 'సూత్రాలు' : 'Formulas'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Key calculations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormulaRow
                      label={language === 'te' ? 'బౌండింగ్ ఘనపరిమాణం' : 'Bounding Volume'}
                      formula={`L × B × H = ${selectedBlock.length_m || '?'} × ${selectedBlock.breadth_m || '?'} × ${selectedBlock.height_m || '?'}`}
                      result={`${recovery.originalVolume.toFixed(3)} m³`}
                    />
                    <FormulaRow
                      label={language === 'te' ? 'అంచనా బరువు' : 'Estimated Mass'}
                      formula={`Vol × ρ = ${recovery.originalVolume.toFixed(2)} × 2.70`}
                      result={`${(recovery.originalVolume * 2.7).toFixed(2)} MT`}
                    />
                    <FormulaRow
                      label={language === 'te' ? 'దుస్తులు ఘనపరిమాణం' : 'Dressed Volume'}
                      formula={`Original − Removed = ${recovery.originalVolume.toFixed(2)} − ${recovery.removedVolume.toFixed(2)}`}
                      result={`${recovery.dressedVolume.toFixed(3)} m³`}
                    />
                    <FormulaRow
                      label={language === 'te' ? 'రికవరీ నిష్పత్తి' : 'Recovery Ratio'}
                      formula={`(Dressed / Original) × 100`}
                      result={`${recovery.recoveryRatio.toFixed(1)}%`}
                    />
                  </div>

                  {showFormulas && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 p-4 bg-granite-50 dark:bg-granite-800/50 rounded-lg border border-granite-200 dark:border-granite-700 space-y-2"
                    >
                      <p className="text-sm font-medium text-granite-700 dark:text-granite-300">
                        {language === 'te' ? 'రికవరీ సూత్రాలు' : 'Recovery Formulas'}
                      </p>
                      <code className="block text-xs font-mono text-granite-600 dark:text-granite-400 whitespace-pre">
{`V_bounding = L × B × H  (m³)
V_dressed = V_bounding - V_removed  (m³)
V_removed = Σ(cut_thickness × affected_area)  (m³)
V_kerf = n_cuts × kerf_width × cut_area  (m³)
Recovery = V_dressed / V_bounding × 100  (%)
Wastage = 100 - Recovery  (%)
Mass = Volume × ρ_granite  (MT)
ρ_granite = 2.70 tonnes/m³  (configurable)`}
                      </code>
                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {language === 'te'
                            ? 'బౌండింగ్ ఘనపరిమాణం = భౌతిక ఘనపరిమాణం కాదు. క్రమరహిత రాయి దిమ్మెల వాస్తవ ఘనపరిమాణం తక్కువగా ఉంటుంది.'
                            : 'Bounding volume ≠ physical volume. Irregular raw blocks have actual volume less than the bounding envelope.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alternative Plans Comparison */}
          <motion.div variants={fadeIn}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize2 className="w-5 h-5 text-blue-500" />
                  {language === 'te' ? 'ప్రత్యామ్నాయ ప్రణాళిక పోలిక' : 'Alternative Plan Comparison'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-granite-200 dark:border-granite-700">
                        <th className="text-left py-2 px-3 font-medium text-granite-600 dark:text-granite-400">
                          {language === 'te' ? 'ప్రణాళిక' : 'Plan'}
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-granite-600 dark:text-granite-400">
                          {language === 'te' ? 'లక్ష్య పరిమాణం' : 'Target Dims'}
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-granite-600 dark:text-granite-400">
                          {language === 'te' ? 'దుస్తులు ఘనపరిమాణం' : 'Dressed Vol'}
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-granite-600 dark:text-granite-400">
                          {language === 'te' ? 'రికవరీ' : 'Recovery'}
                        </th>
                        <th className="text-right py-2 px-3 font-medium text-granite-600 dark:text-granite-400">
                          {language === 'te' ? 'కోతలు' : 'Cuts'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-granite-100 dark:border-granite-800 bg-emerald-50/50 dark:bg-emerald-900/10">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium">
                              {plan?.name || (language === 'te' ? 'ప్రామాణిక ప్రణాళిక' : 'Standard Plan')}
                            </span>
                            <Badge variant="success">
                              {language === 'te' ? 'సిఫార్సు' : 'Recommended'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {plan ? `${plan.target_length_m}×${plan.target_breadth_m}×${plan.target_height_m}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{recovery.dressedVolume.toFixed(2)} m³</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {recovery.recoveryRatio.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right">{plan?.operations?.length || 3}</td>
                      </tr>
                      <tr className="border-b border-granite-100 dark:border-granite-800">
                        <td className="py-2 px-3">
                          <span className="font-medium">
                            {language === 'te' ? 'గరిష్ట రికవరీ' : 'Max Recovery'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-granite-500">
                          {selectedBlock.length_m ? `${(selectedBlock.length_m - 0.05).toFixed(2)}×${((selectedBlock.breadth_m || 0) - 0.05).toFixed(2)}×${((selectedBlock.height_m || 0) - 0.05).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{(recovery.originalVolume * 0.88).toFixed(2)} m³</td>
                        <td className="py-2 px-3 text-right font-mono">88.0%</td>
                        <td className="py-2 px-3 text-right">6</td>
                      </tr>
                      <tr className="border-b border-granite-100 dark:border-granite-800">
                        <td className="py-2 px-3">
                          <span className="font-medium">
                            {language === 'te' ? 'కనిష్ట వ్యర్థం' : 'Min Wastage'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-granite-500">—</td>
                        <td className="py-2 px-3 text-right font-mono">{(recovery.originalVolume * 0.90).toFixed(2)} m³</td>
                        <td className="py-2 px-3 text-right font-mono">90.0%</td>
                        <td className="py-2 px-3 text-right">2</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 p-2 bg-granite-50 dark:bg-granite-800/50 rounded border border-granite-200 dark:border-granite-700">
                  <p className="text-xs text-granite-500 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    {language === 'te'
                      ? 'ప్రత్యామ్నాయ ప్రణాళికలు అంచనా గణనలపై ఆధారపడి ఉన్నాయి. నిజమైన రికవరీ పదార్థ నాణ్యత మరియు అంతర్గత లోపాలపై ఆధారపడి ఉంటుంది.'
                      : 'Alternative plans are based on estimated calculations. Actual recovery depends on material quality and internal defects.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  accent?: boolean;
}) {
  return (
    <motion.div variants={fadeIn}>
      <Card className={accent ? 'border-emerald-200 dark:border-emerald-800/50' : ''}>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-granite-500">{label}</span></div>
          <p className={cn('text-xl font-bold font-mono', accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-granite-900 dark:text-granite-100')}>{value}</p>
          <p className="text-xs text-granite-400 mt-0.5">{sublabel}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function FormulaRow({ label, formula, result }: { label: string; formula: string; result: string }) {
  return (
    <div className="p-3 bg-granite-50 dark:bg-granite-800/30 rounded-lg">
      <p className="text-xs text-granite-500 mb-1">{label}</p>
      <p className="text-sm font-mono text-granite-600 dark:text-granite-400">{formula}</p>
      <p className="text-lg font-bold font-mono text-granite-900 dark:text-granite-100 mt-1">= {result}</p>
    </div>
  );
}
