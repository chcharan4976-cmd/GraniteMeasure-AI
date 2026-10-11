'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Tag,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  Scissors,
  Layers,
  Camera,
  ShieldAlert,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_DEFECTS,
  BlockDefect,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export default function DefectsPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [defectsByBlock, setDefectsByBlock] = useState<Record<string, BlockDefect[]>>(DEMO_DEFECTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<BlockDefect | null>(null);

  // Form state
  const [newType, setNewType] = useState<BlockDefect['type']>('HAIRLINE_CRACK');
  const [newSeverity, setNewSeverity] = useState<BlockDefect['severity']>('MODERATE');
  const [newLocation, setNewLocation] = useState<string>('East flank, 40cm above base bench');
  const [newAffectsCutting, setNewAffectsCutting] = useState<boolean>(true);
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
      if (data.length > 0 && !selectedBlockId) {
        setSelectedBlockId(data[0].id);
      }
    });
  }, []);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const blockDefects: BlockDefect[] = defectsByBlock[currentBlock.id] || [];

  // Default active defect for preview
  const activeDefect = selectedDefect || blockDefects[0] || null;

  const handleAddDefect = (e: React.FormEvent) => {
    e.preventDefault();
    const newDef: BlockDefect = {
      id: `def-${Date.now().toString().slice(-4)}`,
      block_id: currentBlock.id,
      type: newType,
      severity: newSeverity,
      location: newLocation,
      affects_cutting: newAffectsCutting,
      confirmed: true,
      notes: newNotes || 'Added during field visual inspection.',
      dimensions_cm: { length: 25, depth: 4.5 },
    };

    setDefectsByBlock((prev) => ({
      ...prev,
      [currentBlock.id]: [newDef, ...(prev[currentBlock.id] || [])],
    }));

    setSelectedDefect(newDef);
    setIsAddModalOpen(false);
  };

  const getSeverityBadgeVariant = (sev: BlockDefect['severity']) => {
    switch (sev) {
      case 'CRITICAL':
        return 'error' as const;
      case 'MODERATE':
        return 'warning' as const;
      case 'LOW':
      default:
        return 'info' as const;
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'లోప ఇంటెలిజెన్స్ & స్ట్రక్చరల్ ఆడిట్' : 'Defect Intelligence & Structural Audit'}
            </h1>
            <Badge variant="warning">Defect Inspection Module</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'ఉపరితల క్రాక్ విశ్లేషణ, సహజ చేరికల మ్యాపింగ్ మరియు కోతపై వాటి ప్రభావం యొక్క మూల్యాంకనం.'
              : 'Structural hairline fracture detection, quartz inclusion mapping, and sawing plane impact certification.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Block Selector */}
          <div className="flex items-center gap-3 bg-white dark:bg-granite-900 p-2 rounded-xl border border-granite-200 dark:border-granite-800 shadow-sm">
            <Tag className="w-4 h-4 text-emerald-500 shrink-0 ml-1" />
            <span className="text-xs font-semibold uppercase text-granite-500 hidden sm:inline">
              {language === 'te' ? 'బ్లాక్' : 'Select Block'}:
            </span>
            <select
              value={currentBlock.id}
              onChange={(e) => {
                setSelectedBlockId(e.target.value);
                setSelectedDefect(null);
              }}
              className="bg-transparent text-sm font-semibold text-granite-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              {blocks.map((blk) => (
                <option key={blk.id} value={blk.id} className="dark:bg-granite-900">
                  {blk.block_number} ({blk.status})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Log Defect
          </Button>
        </div>
      </div>

      {/* Defect Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-granite-400 block">Identified Defects</span>
              <span className="text-2xl font-black text-granite-900 dark:text-white font-mono mt-1 block">
                {blockDefects.length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-granite-100 dark:bg-granite-800 text-granite-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-rose-500 block">Critical Fractures</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1 block">
                {blockDefects.filter((d) => d.severity === 'CRITICAL').length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-500 block">Affects Cutting</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                {blockDefects.filter((d) => d.affects_cutting).length}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500">
              <Scissors className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-500 block">Commercial Grade</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                {blockDefects.some((d) => d.severity === 'CRITICAL') ? 'Grade B (Commercial)' : 'Grade A (GangSaw Prime)'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Defect List (Left) & Side-by-Side Optical Overlay View (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left: Defect List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Structural Defect Log</span>
                <Badge variant="default">{blockDefects.length} Entries</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-[580px]">
              {blockDefects.length === 0 ? (
                <div className="p-8 text-center text-xs text-granite-400">
                  No structural defects flagged for this block.
                </div>
              ) : (
                blockDefects.map((defect) => {
                  const isSelected = activeDefect?.id === defect.id;
                  return (
                    <div
                      key={defect.id}
                      onClick={() => setSelectedDefect(defect)}
                      className={cn(
                        'p-3 rounded-xl border transition-all cursor-pointer space-y-2',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                          : 'border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900/60 hover:border-granite-400'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={cn(
                              'w-4 h-4',
                              defect.severity === 'CRITICAL'
                                ? 'text-rose-500'
                                : defect.severity === 'MODERATE'
                                ? 'text-amber-500'
                                : 'text-cyan-400'
                            )}
                          />
                          <span className="text-xs font-bold text-granite-900 dark:text-white">
                            {defect.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <Badge variant={getSeverityBadgeVariant(defect.severity)} dot>
                          {defect.severity}
                        </Badge>
                      </div>

                      <p className="text-xs text-granite-600 dark:text-granite-300">
                        {defect.notes}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-granite-400 pt-1 border-t border-granite-100 dark:border-granite-800">
                        <span>Loc: {defect.location}</span>
                        {defect.affects_cutting ? (
                          <span className="text-amber-500 font-medium">Affects Wire Cut</span>
                        ) : (
                          <span className="text-emerald-500">Surface Only</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Side-by-Side Optical Defect Overlay Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Side-by-Side Optical Comparison: Clean Photo vs AI Defect Overlay</span>
                {activeDefect && (
                  <Badge variant={getSeverityBadgeVariant(activeDefect.severity)}>
                    {activeDefect.type} ({activeDefect.severity})
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[340px]">
                {/* Clean Photo View */}
                <div className="rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-950 p-3 flex flex-col justify-between overflow-hidden relative group">
                  <div className="flex items-center justify-between text-xs text-granite-300 mb-2">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      Clean Multi-View Perspective
                    </span>
                    <span className="font-mono text-[10px] text-granite-500">4000 × 3000 RAW</span>
                  </div>

                  {/* Clean Block Graphic Representation */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-granite-900 to-granite-950 rounded-lg p-6 border border-granite-800 relative">
                    <div className="w-48 h-32 rounded bg-granite-800 border-2 border-granite-600 flex items-center justify-center shadow-inner relative">
                      <span className="text-xs text-granite-400 font-mono">
                        {currentBlock.granite_category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-center text-granite-500 mt-2">
                    Unmodified photogrammetric evidence frame
                  </span>
                </div>

                {/* Defect Overlay View */}
                <div className="rounded-xl border border-emerald-500/30 bg-granite-950 p-3 flex flex-col justify-between overflow-hidden relative">
                  <div className="flex items-center justify-between text-xs text-emerald-400 mb-2">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      AI Neural Defect Segmentation Mask
                    </span>
                    <Badge variant="warning" className="text-[9px]">
                      Confidence: 96.8%
                    </Badge>
                  </div>

                  {/* Defect Overlay Graphic Representation */}
                  <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-granite-900 to-granite-950 rounded-lg p-6 border border-granite-800 relative">
                    <div className="w-48 h-32 rounded bg-granite-800 border-2 border-emerald-500/50 flex items-center justify-center shadow-inner relative overflow-hidden">
                      {/* Visual Defect Highlight Lines & Bounding Box */}
                      <div className="absolute top-4 right-4 w-16 h-12 border-2 border-dashed border-rose-500 rounded bg-rose-500/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-rose-300 font-mono">
                          {activeDefect ? activeDefect.type.slice(0, 8) : 'DEFECT'}
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <line x1="80" y1="30" x2="140" y2="70" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="3 2" />
                      </svg>
                      <span className="text-xs text-granite-400 font-mono">
                        Segmented Feature Mask
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-center text-granite-400 mt-2">
                    Bounding Box & Trajectory: Sub-pixel crack detection
                  </span>
                </div>
              </div>

              {/* Active Defect Detail Summary Box */}
              {activeDefect && (
                <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-900/60 border border-granite-200 dark:border-granite-800 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-granite-900 dark:text-white">
                      Selected Defect: {activeDefect.type.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-granite-400">
                      Depth: ~{activeDefect.dimensions_cm?.depth || 2.5} cm • Length: ~
                      {activeDefect.dimensions_cm?.length || 20} cm
                    </span>
                  </div>
                  <p className="text-granite-600 dark:text-granite-300 leading-relaxed">
                    {activeDefect.notes}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-granite-400 pt-1 border-t border-granite-200 dark:border-granite-800">
                    <span>
                      Location: <strong className="text-granite-200">{activeDefect.location}</strong>
                    </span>
                    <span>
                      Cutting Avoidance Requirement:{' '}
                      <strong className={activeDefect.affects_cutting ? 'text-rose-400' : 'text-emerald-400'}>
                        {activeDefect.affects_cutting ? 'Mandatory Offset' : 'None Required'}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Defect Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Structural Defect Observation"
        description="Record physical fracture, hairline stress line, or inclusion onto block audit record."
        maxWidth="md"
      >
        <form onSubmit={handleAddDefect} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-granite-600 dark:text-granite-400 mb-1.5">
              Defect Classification
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as BlockDefect['type'])}
              className="w-full rounded-lg border border-granite-300 dark:border-granite-700 bg-white dark:bg-granite-850 px-3.5 py-2 text-sm text-granite-900 dark:text-granite-100"
            >
              <option value="FRACTURE">FRACTURE (Deep structural shear)</option>
              <option value="HAIRLINE_CRACK">HAIRLINE CRACK (Surface blast strain)</option>
              <option value="QUARTZ_INCLUSION">QUARTZ INCLUSION (Mineral discoloration)</option>
              <option value="CORNER_CHIP">CORNER CHIP (Excavator impact volume loss)</option>
              <option value="SURFACE_WEATHERING">SURFACE WEATHERING (Quarry crust oxidation)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-granite-600 dark:text-granite-400 mb-1.5">
              Severity Level
            </label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as BlockDefect['severity'])}
              className="w-full rounded-lg border border-granite-300 dark:border-granite-700 bg-white dark:bg-granite-850 px-3.5 py-2 text-sm text-granite-900 dark:text-granite-100"
            >
              <option value="LOW">LOW (Superficial, harmless)</option>
              <option value="MODERATE">MODERATE (Requires saw angle accommodation)</option>
              <option value="CRITICAL">CRITICAL (Breaches Gangsaw Class 1 standard)</option>
            </select>
          </div>

          <Input
            label="Location Description on Block Face"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            required
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="affects_cut"
              checked={newAffectsCutting}
              onChange={(e) => setNewAffectsCutting(e.target.checked)}
              className="rounded border-granite-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <label htmlFor="affects_cut" className="font-semibold text-granite-800 dark:text-granite-200">
              Affects wire saw cutting trajectory or recovery ratio
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-granite-600 dark:text-granite-400">
              Technical Description & Action Notes
            </label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Detail depth estimation, origin (blasting vs geological), avoidance recommendations..."
              className="w-full rounded-lg border border-granite-300 dark:border-granite-700 bg-white dark:bg-granite-850 px-3.5 py-2 text-sm text-granite-900 dark:text-granite-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Defect Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
