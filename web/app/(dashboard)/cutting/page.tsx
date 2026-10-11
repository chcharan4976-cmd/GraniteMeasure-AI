'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Scissors,
  Tag,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  PieChart,
  Layers,
  Sparkles,
  AlertTriangle,
  Plus,
  Sliders,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_CUTTING_PLANS,
  CuttingPlan,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Dynamically import 3D Cutting Viewer with SSR disabled
const CuttingViewer = dynamic(() => import('@/components/three/cutting-viewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-granite-900 rounded-xl border border-granite-800 text-granite-400">
      <Scissors className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
      <span className="text-sm font-medium">Initializing Wire Saw 3D Simulator...</span>
    </div>
  ),
});

export default function CuttingStudioPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);

  // Stepper state (0 to 4)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Target Dimension overrides
  const [targetLength, setTargetLength] = useState<number>(2.70);
  const [targetBreadth, setTargetBreadth] = useState<number>(1.50);
  const [targetHeight, setTargetHeight] = useState<number>(1.35);

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
      if (data.length > 0 && !selectedBlockId) {
        setSelectedBlockId(data[0].id);
      }
    });
  }, []);

  // Playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % 5);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const origLength = currentBlock.length_m || 2.85;
  const origBreadth = currentBlock.breadth_m || 1.62;
  const origHeight = currentBlock.height_m || 1.45;
  const rawVol = +(origLength * origBreadth * origHeight).toFixed(3);

  // Dynamic recovery math
  const dressedVol = +(targetLength * targetBreadth * targetHeight).toFixed(3);
  const removedVol = +(rawVol - dressedVol).toFixed(3);
  const recoveryRatio = +((dressedVol / rawVol) * 100).toFixed(1);
  const wastageRatio = +(100 - recoveryRatio).toFixed(1);

  const plan: CuttingPlan = DEMO_CUTTING_PLANS[currentBlock.id] || {
    id: 'cp-default',
    block_id: currentBlock.id,
    name: 'Standard Commercial Gangsaw Optimization',
    created_at: '2026-10-10T12:00:00Z',
    target_length_m: targetLength,
    target_breadth_m: targetBreadth,
    target_height_m: targetHeight,
    raw_volume_m3: rawVol,
    dressed_volume_m3: dressedVol,
    removed_volume_m3: removedVol,
    recovery_ratio_pct: recoveryRatio,
    wastage_pct: wastageRatio,
    operations: [
      {
        order: 1,
        type: 'PRIMARY_LEVEL',
        wire_angle_deg: 0,
        reason: 'Level irregular quarry top bench surface (10cm cap removal)',
        thickness_removed_cm: 10,
      },
      {
        order: 2,
        type: 'END_TRIM',
        wire_angle_deg: 90,
        reason: 'Square North end-face and eliminate quarry extraction micro-strain',
        thickness_removed_cm: 15,
      },
      {
        order: 3,
        type: 'FLANK_DRESS',
        wire_angle_deg: 90,
        reason: 'Dress East flank parallel for smooth multi-blade gangsaw seating',
        thickness_removed_cm: 12,
      },
    ],
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* Top Header & Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Scissors className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'కోత & రికవరీ స్టూడియో' : 'Cutting & Recovery Studio'}
            </h1>
            <Badge variant="success">Diamond Wire Saw Simulation</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'డైమండ్ వైర్ సా కటింగ్ ప్రణాళిక, లోపాల నివారణ మరియు వాణిజ్య గ్యాంగ్‌సా రికవరీ ఆప్టిమైజేషన్.'
              : 'Multi-axis diamond wire saw trajectory modeling, defect excision, and gangsaw recovery maximization.'}
          </p>
        </div>

        {/* Block Selector */}
        <div className="flex items-center gap-3 bg-white dark:bg-granite-900 p-2 rounded-xl border border-granite-200 dark:border-granite-800 shadow-sm self-start lg:self-center">
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

      {/* Split Layout: Left 3D Viewer, Right Controls & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Left Side: 3D Cutting Simulator (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <Card className="flex-1 flex flex-col p-2 bg-granite-950 border-granite-800 shadow-xl overflow-hidden min-h-[500px]">
            <CuttingViewer
              origLength={origLength}
              origBreadth={origBreadth}
              origHeight={origHeight}
              targetLength={targetLength}
              targetBreadth={targetBreadth}
              targetHeight={targetHeight}
              step={currentStep}
              isPlaying={isPlaying}
              onStepChange={(s) => setCurrentStep(s)}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onReset={() => {
                setIsPlaying(false);
                setCurrentStep(0);
              }}
            />
          </Card>

          {/* Stepper Status Explainer */}
          <div className="p-4 rounded-xl bg-white dark:bg-granite-900 border border-granite-200 dark:border-granite-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                {currentStep + 1}
              </span>
              <div>
                <span className="font-semibold text-granite-900 dark:text-white block">
                  {currentStep === 0 && 'Raw Inspection: Extracted Quarry Rough Block'}
                  {currentStep === 1 && 'Operation 1: Primary Wire Leveling (Excise Top Rough Cap)'}
                  {currentStep === 2 && 'Operation 2: End-Face Squaring (Eliminate Blast Strain)'}
                  {currentStep === 3 && 'Operation 3: Flank Dressing (Prepare Parallel Gangsaw Face)'}
                  {currentStep === 4 && 'Complete: Dressed Certified Gangsaw Block Ready for Slicing'}
                </span>
                <span className="text-granite-400">
                  {currentStep === 4
                    ? 'Yields approximately 42 premium gangsaw slabs (20mm thickness).'
                    : 'Diamond wire cuts follow optimal defect-avoidance geometry.'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((currentStep + 1) % 5)}
            >
              Next Cut Step
            </Button>
          </div>
        </div>

        {/* Right Side: Recovery Metrics & Optimization Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Recovery & Wastage KPI Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <span>{language === 'te' ? 'రికవరీ & వ్యర్థాల గణాంకాలు' : 'Recovery & Wastage Analytics'}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Progress Bar of Recovery vs Wastage */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Commercial Recovery: {recoveryRatio}%
                  </span>
                  <span className="text-rose-500">
                    Wastage: {wastageRatio}%
                  </span>
                </div>
                <div className="h-3 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${recoveryRatio}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${wastageRatio}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Volume Comparison Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-granite-100 dark:bg-granite-800">
                  <span className="text-[10px] uppercase font-bold text-granite-400 block">Original Vol</span>
                  <span className="text-sm font-bold text-granite-900 dark:text-white">
                    {rawVol} m³
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Dressed Vol
                  </span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {dressedVol} m³
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] uppercase font-bold text-rose-500 block">Removed</span>
                  <span className="text-sm font-bold text-rose-600">
                    {removedVol} m³
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Target Dimensions Tuning */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'te' ? 'లక్ష్య కొలతల సర్దుబాటు' : 'Target Dressed Dimensions'}</span>
                </CardTitle>
                <Badge variant="info">Wire Kerf: 3.5mm</Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Target L (m)"
                  type="number"
                  step="0.05"
                  value={targetLength}
                  onChange={(e) => setTargetLength(parseFloat(e.target.value) || 2.70)}
                />
                <Input
                  label="Target B (m)"
                  type="number"
                  step="0.05"
                  value={targetBreadth}
                  onChange={(e) => setTargetBreadth(parseFloat(e.target.value) || 1.50)}
                />
                <Input
                  label="Target H (m)"
                  type="number"
                  step="0.05"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(parseFloat(e.target.value) || 1.35)}
                />
              </div>

              {/* Defect Avoidance Notes */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Defect Avoidance Strategy Applied:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Trimming 15cm from North end face cleanly bypasses the surface blast hairline strain detected during defect scan.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sequential Cutting Operations List */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>{language === 'te' ? 'కోత చర్యల జాబితా' : 'Cutting Operations Sequence'}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2 text-xs">
              {plan.operations.map((op) => (
                <div
                  key={op.order}
                  className="p-2.5 rounded-lg border border-granite-200 dark:border-granite-800 bg-granite-50/50 dark:bg-granite-900/40 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-granite-950 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {op.order}
                    </span>
                    <div>
                      <span className="font-bold text-granite-900 dark:text-white">
                        {op.type.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[11px] text-granite-500 dark:text-granite-400 mt-0.5">
                        {op.reason}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" className="shrink-0 text-[10px]">
                    Cut -{op.thickness_removed_cm}cm
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
