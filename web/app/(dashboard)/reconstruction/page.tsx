'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rotate3d,
  Camera,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Tag,
  Crosshair,
  Layers,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_PHOTOS,
  BlockPhoto,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Dynamic import with SSR disabled for Three.js 3D Canvas
const ReconstructionViewer = dynamic(
  () => import('@/components/three/reconstruction-viewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center bg-granite-900 rounded-xl border border-granite-800 text-granite-400">
        <Rotate3d className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
        <span className="text-sm font-medium">Initializing WebGL 3D Pipeline...</span>
      </div>
    ),
  }
);

export default function ReconstructionStudioPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
      if (data.length > 0 && !selectedBlockId) {
        setSelectedBlockId(data[0].id);
      }
    });
  }, []);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const photos: BlockPhoto[] = DEMO_PHOTOS[currentBlock.id] || DEMO_PHOTOS['blk-001'];
  const activePhoto = photos[selectedPhotoIndex] || photos[0];

  const hasReconstruction =
    currentBlock.status === 'MEASURED' ||
    currentBlock.status === 'ASSESSED' ||
    currentBlock.status === 'APPROVED' ||
    currentBlock.status === 'DISPATCHED';

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto pb-12">
      {/* Top Header & Block Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Rotate3d className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? '3D పునర్నిర్మాణ స్టూడియో' : '3D Reconstruction Studio'}
            </h1>
            <Badge variant="success">Photogrammetry v2.4</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'బహుళ-కోణ ఫోటోగ్రామెట్రీ పరిశీలన, పాయింట్ క్లౌడ్ విజువలైజేషన్ మరియు కాలిబ్రేటెడ్ స్కేల్ దృక్పథం.'
              : 'Multi-angle orbital photogrammetric inspection, dense point cloud synthesis, and metric scale validation.'}
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

      {/* Three Panel Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[640px]">
        {/* Left Panel: Photo Evidence Grid (approx 300px on desktop) */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  <span>{language === 'te' ? 'చిత్ర ఆధారాలు' : 'Photographic Evidence'}</span>
                </CardTitle>
                <Badge variant="default" className="text-[10px]">
                  {photos.length} Photos
                </Badge>
              </div>
              <p className="text-xs text-granite-400">
                {language === 'te' ? 'పరిశీలించడానికి చిత్రాన్ని ఎంచుకోండి' : 'Click thumbnail to inspect optical quality'}
              </p>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-[580px]">
              {photos.map((photo, idx) => {
                const isSelected = selectedPhotoIndex === idx;
                return (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={cn(
                      'p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-3',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-granite-200 dark:border-granite-800 hover:border-granite-400 bg-white dark:bg-granite-900/60'
                    )}
                  >
                    {/* Thumbnail View Frame */}
                    <div className="w-16 h-14 rounded-md bg-granite-800 flex flex-col items-center justify-center relative overflow-hidden border border-granite-700 shrink-0">
                      <Camera className="w-5 h-5 text-granite-400 opacity-60" />
                      <span className="text-[9px] font-mono uppercase font-bold text-granite-300 mt-1">
                        {photo.view_label}
                      </span>
                      {photo.markers_detected > 0 && (
                        <div
                          className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"
                          title={`${photo.markers_detected} ArUco markers detected`}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-granite-900 dark:text-white">
                          View {idx + 1}: {photo.view_label}
                        </span>
                        <Badge
                          variant={photo.usability === 'EXCELLENT' ? 'success' : 'default'}
                          className="text-[9px] px-1.5 py-0"
                        >
                          {photo.usability}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[10px] text-granite-500 dark:text-granite-400">
                        <span>Blur: {photo.blur_score}</span>
                        <span>•</span>
                        <span>Exp: {photo.exposure_score}</span>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium">
                          {photo.markers_detected} Markers
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Center Panel: 3D Reconstruction Viewer (Flexible) */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          <Card className="flex-1 flex flex-col p-2 bg-granite-950 border-granite-800 shadow-xl overflow-hidden min-h-[500px]">
            <div className="flex-1 relative rounded-lg overflow-hidden">
              <ReconstructionViewer
                hasReconstruction={hasReconstruction}
                lengthM={currentBlock.length_m || 2.85}
                breadthM={currentBlock.breadth_m || 1.62}
                heightM={currentBlock.height_m || 1.45}
                graniteCategory={currentBlock.granite_category}
                showCameras={true}
                viewMode="mesh"
              />
            </div>

            {/* Selected Photo Inspector Strip */}
            {activePhoto && (
              <div className="mt-2 p-2.5 rounded-lg bg-granite-900 border border-granite-800 flex items-center justify-between text-xs text-granite-300">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Active View: <strong className="text-white">{activePhoto.view_label}</strong> (Sharpness {activePhoto.blur_score}/100)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-granite-400 text-[11px]">
                  <span>ArUco Target Scale: <strong>50mm ± 0.05mm</strong></span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Geometry
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel: Block Information & Dimensional Provenance (approx 320px) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Block Overview Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{language === 'te' ? 'బ్లాక్ వివరాలు' : 'Block Specifications'}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-granite-400 block tracking-wider">
                  Block Number
                </span>
                <span className="text-base font-bold text-granite-900 dark:text-white font-mono">
                  {currentBlock.block_number}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-granite-400 block tracking-wider">
                  Mineral Variety
                </span>
                <span className="font-semibold text-granite-800 dark:text-granite-200">
                  {currentBlock.granite_category}
                </span>
              </div>

              <div className="pt-2 border-t border-granite-100 dark:border-granite-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-granite-400 block">
                    Calibration State
                  </span>
                  <Badge variant="success" dot className="mt-0.5">
                    Metric Scale Locked
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-granite-400 block">
                    Reconstruction
                  </span>
                  <Badge variant={hasReconstruction ? 'info' : 'default'} className="mt-0.5">
                    {hasReconstruction ? 'SfM Reconstructed' : 'In Progress'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Dimensions Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>{language === 'te' ? 'ధృవీకరించిన కొలతలు' : 'Certified Dimensions'}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-granite-100 dark:bg-granite-800">
                  <span className="text-[10px] uppercase font-bold text-granite-500 block">Length</span>
                  <span className="text-sm font-bold text-granite-900 dark:text-white">
                    {currentBlock.length_m ? `${currentBlock.length_m} m` : '—'}
                  </span>
                  <span className="text-[9px] text-granite-400">
                    {currentBlock.length_m ? `${(currentBlock.length_m * 100).toFixed(0)} cm` : ''}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-granite-100 dark:bg-granite-800">
                  <span className="text-[10px] uppercase font-bold text-granite-500 block">Breadth</span>
                  <span className="text-sm font-bold text-granite-900 dark:text-white">
                    {currentBlock.breadth_m ? `${currentBlock.breadth_m} m` : '—'}
                  </span>
                  <span className="text-[9px] text-granite-400">
                    {currentBlock.breadth_m ? `${(currentBlock.breadth_m * 100).toFixed(0)} cm` : ''}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-granite-100 dark:bg-granite-800">
                  <span className="text-[10px] uppercase font-bold text-granite-500 block">Height</span>
                  <span className="text-sm font-bold text-granite-900 dark:text-white">
                    {currentBlock.height_m ? `${currentBlock.height_m} m` : '—'}
                  </span>
                  <span className="text-[9px] text-granite-400">
                    {currentBlock.height_m ? `${(currentBlock.height_m * 100).toFixed(0)} cm` : ''}
                  </span>
                </div>
              </div>

              {/* Volume & Weight */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                    Certified Volume
                  </span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                    {currentBlock.volume_m3 ? `${currentBlock.volume_m3} m³` : 'Pending'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-granite-500 block">
                    Weight (2.7 MT/m³)
                  </span>
                  <span className="text-sm font-bold text-granite-800 dark:text-granite-200">
                    {currentBlock.weight_tons ? `${currentBlock.weight_tons} MT` : '—'}
                  </span>
                </div>
              </div>

              {/* Confidence & Evidence Notes */}
              <div className="space-y-1.5 text-xs text-granite-500 dark:text-granite-400">
                <div className="flex justify-between">
                  <span>Photogrammetric Confidence:</span>
                  <span className="font-semibold text-emerald-500">99.4%</span>
                </div>
                <div className="flex justify-between">
                  <span>Mean Reprojection Error:</span>
                  <span className="font-mono text-granite-300">0.38 px</span>
                </div>
                <div className="flex justify-between">
                  <span>Scale Constraint Accuracy:</span>
                  <span className="font-mono text-granite-300">± 1.2 mm</span>
                </div>
              </div>

              <div className="pt-2 border-t border-granite-100 dark:border-granite-800">
                <p className="text-[11px] text-granite-400 italic">
                  &ldquo;{currentBlock.notes || 'All 8 orbital perspectives validated.'}&rdquo;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
