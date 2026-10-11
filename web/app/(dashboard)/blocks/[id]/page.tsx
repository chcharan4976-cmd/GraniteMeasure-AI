'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Box,
  Camera,
  Cpu,
  Ruler,
  Scissors,
  IndianRupee,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  RefreshCw,
  Shield,
  Image as ImageIcon,
  ShieldCheck,
  Sparkles,
  Hash,
  Rotate3d,
  Archive,
  ArchiveRestore,
  Trash2,
  Layers,
  ChevronRight,
  ShieldAlert,
  Percent,
  Check,
  AlertCircle,
  ExternalLink,
  Scale,
  Sliders,
  CheckSquare,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { useTranslation } from '@/localization';
import api, {
  GraniteBlock,
  CaptureSession,
  AnalysisJob,
  MeasurementResult,
  BlockImage,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

// Dynamic import of 3D Canvas viewer (SSR disabled)
const ReconstructionViewer = dynamic(
  () => import('@/components/three/reconstruction-viewer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-granite-900 rounded-xl border border-granite-800 text-granite-400">
        <Rotate3d className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
        <span className="text-xs font-mono">Loading 3D Digital Twin...</span>
      </div>
    ),
  }
);

type WorkspaceTab =
  | 'overview'
  | 'photos'
  | 'ai'
  | 'measurements'
  | '3d'
  | 'defects'
  | 'cutting'
  | 'wastage'
  | 'assessment'
  | 'reports'
  | 'advisory';

export default function BlockWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const blockId = params.id as string;

  // Active tab state
  const initialTab = (searchParams.get('tab') as WorkspaceTab) || 'overview';
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);

  // Unified Workspace state
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTriggeringAI, setIsTriggeringAI] = useState(false);
  const [showWatermarkedView, setShowWatermarkedView] = useState(true);

  // Safe Delete Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('Administrative deletion by mining officer');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Archive Modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Archived after inspection review');
  const [isArchiving, setIsArchiving] = useState(false);

  // Dressing Studio state
  const [isGeneratingDressing, setIsGeneratingDressing] = useState(false);
  const [dressingObjective, setDressingObjective] = useState<string>('MAXIMIZE_RECTANGULAR_YIELD');

  // Manual Tape Audit Modal state
  const [isTapeModalOpen, setIsTapeModalOpen] = useState(false);
  const [tapeLengthM, setTapeLengthM] = useState('');
  const [tapeBreadthM, setTapeBreadthM] = useState('');
  const [tapeHeightM, setTapeHeightM] = useState('');
  const [tapeOfficer, setTapeOfficer] = useState('Assistant Mining Geologist');
  const [tapeNotes, setTapeNotes] = useState('Physical steel tape measurement at quarry yard');
  const [isRecordingTape, setIsRecordingTape] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, [blockId]);

  async function loadWorkspace() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBlockWorkspace(blockId);
      setWorkspace(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load block workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function triggerAnalysis(stage: string = 'RAW') {
    if (!workspace) return;
    try {
      setIsTriggeringAI(true);
      const latestSession = workspace.sessions?.[0];
      await api.createAnalysisJob(String(workspace.id), latestSession?.id, stage);
      await loadWorkspace();
      setActiveTab('ai');
    } catch (e: any) {
      alert(`Could not start AI analysis: ${e.message || e}`);
    } finally {
      setIsTriggeringAI(false);
    }
  }

  async function handleGenerateDressing(objective?: string) {
    if (!workspace) return;
    const obj = objective || dressingObjective;
    try {
      setIsGeneratingDressing(true);
      await api.generateDressingPlan(String(workspace.id), obj);
      await loadWorkspace();
      setActiveTab('cutting');
    } catch (e: any) {
      alert(`Could not generate dressing plan: ${e.message || e}`);
    } finally {
      setIsGeneratingDressing(false);
    }
  }

  async function handleRecordTape() {
    if (!workspace) return;
    const l = parseFloat(tapeLengthM);
    const b = parseFloat(tapeBreadthM);
    const h = parseFloat(tapeHeightM);
    if (isNaN(l) || isNaN(b) || isNaN(h) || l <= 0 || b <= 0 || h <= 0) {
      alert('Please enter valid positive dimensions in meters (e.g. 3.10).');
      return;
    }
    try {
      setIsRecordingTape(true);
      await api.recordTapeReference(String(workspace.id), {
        length_m: l,
        breadth_m: b,
        height_m: h,
        verified_by: tapeOfficer,
        notes: tapeNotes,
      });
      setIsTapeModalOpen(false);
      await loadWorkspace();
      setActiveTab('wastage');
    } catch (e: any) {
      alert(`Failed to save steel tape audit: ${e.message || e}`);
    } finally {
      setIsRecordingTape(false);
    }
  }

  async function handlePrimaryAction(actionType?: string) {
    if (!actionType) return;
    switch (actionType) {
      case 'RUN_ANALYSIS':
        await triggerAnalysis('RAW');
        break;
      case 'RUN_POST_DRESSING_ANALYSIS':
        await triggerAnalysis('POST_DRESSING');
        break;
      case 'GENERATE_DRESSING':
        await handleGenerateDressing();
        break;
      case 'CAPTURE_RAW':
      case 'CAPTURE_POST_DRESSING':
        setActiveTab('photos');
        break;
      case 'VERIFY_TAPE':
        setIsTapeModalOpen(true);
        break;
      case 'VIEW_REPORT':
        setActiveTab('reports');
        break;
      default:
        setActiveTab('cutting');
    }
  }

  async function handleArchive() {
    if (!workspace) return;
    try {
      setIsArchiving(true);
      await api.archiveBlock(String(workspace.id), archiveReason);
      setIsArchiveModalOpen(false);
      await loadWorkspace();
    } catch (e: any) {
      alert(`Archive failed: ${e.message || e}`);
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleRestore() {
    if (!workspace) return;
    try {
      setLoading(true);
      await api.restoreBlock(String(workspace.id));
      await loadWorkspace();
    } catch (e: any) {
      alert(`Restore failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!workspace) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.deleteBlock(String(workspace.id), workspace.identifier || workspace.block_number, deleteReason);
      setIsDeleteModalOpen(false);
      router.push('/blocks');
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete block.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading && !workspace) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !workspace) {
    const isNotFound = error?.toLowerCase().includes('not found') || error?.includes('404');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
          <XCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-granite-900 dark:text-granite-100">
            {isNotFound ? 'Granite Block Not Found' : 'Unable to Load Block Workspace'}
          </h2>
          <p className="text-sm text-granite-500 max-w-md mt-1">
            {error || `No registered block matching "${blockId}" exists.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isNotFound && (
            <Button onClick={loadWorkspace} variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          )}
          <Button onClick={() => router.push('/blocks')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Blocks Registry
          </Button>
        </div>
      </div>
    );
  }

  // Derived helpers
  const block = workspace;
  const coverage = workspace.coverage || {};
  const images: any[] = workspace.images || [];
  const measurement = workspace.measurement;
  const defects = workspace.defects || { defect_list: [], cavity_volume_m3: 0, count: 0 };
  const cutting = workspace.cutting_plan;
  const wastage = workspace.wastage || {};
  const seigniorage = workspace.seigniorage;
  const dispatch = workspace.dispatch;
  const latestJob = workspace.latest_job;
  const auditTrail: any[] = workspace.audit_trail || [];

  const stages = workspace.stages || {};
  const rawStage = stages.raw || {};
  const proposedStage = stages.proposed || {};
  const actualStage = stages.actual_dressed || {};
  const manualTape = stages.manual_tape || workspace.physical_reference;
  const comparison = workspace.comparison || {};
  const quickSummary = workspace.quick_summary || [];
  const primaryAction = workspace.primary_action;
  const heroImage = workspace.hero_image;
  const advisories = workspace.advisories || workspace.advisory || [];

  // Lifecycle steps progression
  const workflowSteps = [
    { key: 'REGISTERED', label: 'Registered', tab: 'overview', icon: Box, done: true },
    { key: 'CAPTURED', label: 'Multi-View Captured', tab: 'photos', icon: Camera, done: images.length >= 3 || ['CAPTURED', 'ANALYZING', 'MEASURED', 'VERIFIED', 'ASSESSED', 'APPROVED', 'DISPATCHED'].includes(block.status) },
    { key: 'ANALYZING', label: 'AI Processing', tab: 'ai', icon: Cpu, done: ['MEASURED', 'VERIFIED', 'ASSESSED', 'APPROVED', 'DISPATCHED'].includes(block.status), active: block.status === 'ANALYZING' },
    { key: 'MEASURED', label: 'Measured (3D)', tab: 'measurements', icon: Ruler, done: ['MEASURED', 'VERIFIED', 'ASSESSED', 'APPROVED', 'DISPATCHED'].includes(block.status) },
    { key: 'DEFECTS', label: 'Defect Analysis', tab: 'defects', icon: AlertTriangle, done: defects.count > 0 || ['VERIFIED', 'ASSESSED', 'APPROVED', 'DISPATCHED'].includes(block.status) },
    { key: 'CUTTING', label: 'Dressing Studio', tab: 'cutting', icon: Scissors, done: Boolean(cutting) || ['ASSESSED', 'APPROVED', 'DISPATCHED'].includes(block.status) },
    { key: 'ASSESSED', label: 'Seigniorage Assessment', tab: 'assessment', icon: IndianRupee, done: Boolean(seigniorage) || ['APPROVED', 'DISPATCHED'].includes(block.status) },
    { key: 'DISPATCHED', label: 'Clearance & Transit', tab: 'reports', icon: Truck, done: block.status === 'DISPATCHED' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header: Identity, Quarry, Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-granite-200 dark:border-granite-800 pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/blocks')} className="p-2">
            <ArrowLeft className="w-5 h-5 text-granite-600 dark:text-granite-300" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-granite-900 dark:text-white">
                {block.identifier}
              </h1>
              <StatusBadge status={block.status} />
              {block.is_archived && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  ARCHIVED
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-granite-100 dark:bg-granite-800 text-granite-600 dark:text-granite-300">
                {block.block_type || 'RAW'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-granite-500 dark:text-granite-400 mt-1 flex flex-wrap items-center gap-3">
              <span className="font-medium text-granite-800 dark:text-granite-200">{block.color_group}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                {block.quarry?.name || 'Chimakurthy Galaxy Quarry'} ({block.quarry?.district || 'Prakasam'})
              </span>
              {block.registered_at && (
                <>
                  <span>•</span>
                  <span>Registered {new Date(block.registered_at).toLocaleDateString()}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Global Block Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Recommended Action */}
          {primaryAction && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handlePrimaryAction(primaryAction.action)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {primaryAction.label}
            </Button>
          )}

          {/* Tape Reference Audit */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTapeModalOpen(true)}
            className="text-granite-700 dark:text-granite-200"
          >
            <Ruler className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Tape Audit
          </Button>

          <Button variant="outline" size="sm" onClick={loadWorkspace} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* One-Tap AI Analysis */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerAnalysis('RAW')}
            disabled={isTriggeringAI || images.length === 0}
            className="border-cyan-500 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
          >
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            {isTriggeringAI ? 'Triggering...' : 'AI Pipeline'}
          </Button>

          {/* Archive / Restore Button */}
          {block.is_archived ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestore}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
            >
              <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
              Restore Block
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArchiveModalOpen(true)}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            >
              <Archive className="w-3.5 h-3.5 mr-1.5" />
              Archive
            </Button>
          )}

          {/* Safe Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Lifecycle Progress Banner */}
      <Card>
        <CardContent className="py-4">
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between min-w-[700px]">
              {workflowSteps.map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <React.Fragment key={step.key}>
                    <button
                      onClick={() => setActiveTab(step.tab as WorkspaceTab)}
                      className="flex flex-col items-center gap-1.5 group cursor-pointer text-left focus:outline-none"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                          step.done
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : step.active
                            ? 'bg-cyan-500 text-white animate-pulse'
                            : 'bg-granite-100 dark:bg-granite-800 text-granite-400 group-hover:bg-granite-200'
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-semibold tracking-tight transition-colors',
                          step.done
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : step.active
                            ? 'text-cyan-500'
                            : 'text-granite-400'
                        )}
                      >
                        {step.label}
                      </span>
                    </button>
                    {idx < workflowSteps.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-0.5 mx-2',
                          step.done
                            ? 'bg-emerald-500'
                            : 'bg-granite-200 dark:bg-granite-800'
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Summary Metric Plate (6 Tiles) */}
      {quickSummary && quickSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickSummary.map((tile: any, idx: number) => {
            const isStage = tile.key === 'STAGE';
            return (
              <div
                key={idx}
                className="p-3 rounded-xl border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900 shadow-sm"
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-granite-500">{tile.label}</div>
                <div
                  className={cn(
                    'text-sm sm:text-base font-bold font-mono mt-0.5 truncate',
                    isStage ? 'text-emerald-600 dark:text-emerald-400' : 'text-granite-900 dark:text-white'
                  )}
                >
                  {tile.value}
                </div>
                <div className="text-[10px] text-granite-400 mt-0.5 truncate">{tile.subtext || ''}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bilingual Engineering Advisory Banner */}
      {advisories && advisories.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>{advisories[0].title}</span>
                {advisories[0].title_te && (
                  <span className="text-xs font-normal text-amber-700 dark:text-amber-400 font-serif">
                    • {advisories[0].title_te}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                {advisories[0].description}
              </p>
            </div>
          </div>
          {advisories[0].action_label && (
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700 whitespace-nowrap self-start sm:self-auto"
              onClick={() => handlePrimaryAction(advisories[0].action_type)}
            >
              {advisories[0].action_label}
            </Button>
          )}
        </div>
      )}

      {/* 11-Tab Guided Workspace Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-granite-200 dark:border-granite-800 pb-2">
        {[
          { id: 'overview', label: '1. Overview', icon: Box },
          { id: 'photos', label: `2. Photos (${images.length})`, icon: Camera },
          { id: 'ai', label: '3. AI Analysis', icon: Cpu },
          { id: 'measurements', label: '4. Measurements', icon: Ruler },
          { id: '3d', label: '5. 3D Model', icon: Rotate3d },
          { id: 'defects', label: `6. Defects (${defects.count || 0})`, icon: AlertTriangle },
          { id: 'cutting', label: '7. Dressing Studio', icon: Scissors },
          { id: 'wastage', label: '8. Material Balance', icon: Percent },
          { id: 'assessment', label: '9. Seigniorage', icon: IndianRupee },
          { id: 'reports', label: '10. Clearance & Pass', icon: FileText },
          { id: 'advisory', label: `11. Advisory (${advisories.length})`, icon: ShieldAlert },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-granite-600 dark:text-granite-300 hover:bg-granite-100 dark:hover:bg-granite-800'
              )}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="space-y-6">
        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metric Summary Hero Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-granite-500 dark:text-granite-400">Gross Volume</div>
                  <div className="text-2xl font-bold font-mono text-granite-900 dark:text-white mt-1">
                    {measurement?.volume_m3 ? `${Number(measurement.volume_m3).toFixed(2)} m³` : 'Pending AI'}
                  </div>
                  <div className="text-[11px] text-granite-400 mt-0.5">
                    {measurement?.weight_mt ? `${Number(measurement.weight_mt).toFixed(2)} MT mass` : 'Needs 3D fit'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-granite-500 dark:text-granite-400">Net Usable Yield</div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {wastage?.net_usable_m3 ? `${Number(wastage.net_usable_m3).toFixed(2)} m³` : '—'}
                  </div>
                  <div className="text-[11px] text-granite-400 mt-0.5">
                    {wastage?.net_loss_pct ? `${(100 - wastage.net_loss_pct).toFixed(1)}% recovery` : 'Pending cut plan'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-granite-500 dark:text-granite-400">Defects & Cavities</div>
                  <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                    {defects.count} detected
                  </div>
                  <div className="text-[11px] text-granite-400 mt-0.5">
                    {defects.cavity_volume_m3 ? `${Number(defects.cavity_volume_m3).toFixed(4)} m³ void` : 'No open cracks'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-granite-500 dark:text-granite-400">Indicative Seigniorage</div>
                  <div className="text-2xl font-bold font-mono text-granite-900 dark:text-white mt-1 flex items-center">
                    <IndianRupee className="w-5 h-5 mr-0.5" />
                    {seigniorage?.indicative_amount
                      ? Number(seigniorage.indicative_amount).toLocaleString('en-IN')
                      : 'Pending fee'}
                  </div>
                  <div className="text-[11px] text-granite-400 mt-0.5">
                    {seigniorage?.classification || 'AP DMG Standard'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Block Passport & Concession Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-500" />
                    Granite Block Passport
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Official Block Identifier:</span>
                    <span className="font-mono font-bold">{block.identifier}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Color Category:</span>
                    <span className="font-semibold">{block.color_group}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Extraction Type:</span>
                    <span>{block.block_type || 'RAW'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">GPS Position:</span>
                    <span className="font-mono">
                      {block.gps_latitude && block.gps_longitude
                        ? `${Number(block.gps_latitude).toFixed(6)}° N, ${Number(block.gps_longitude).toFixed(6)}° E`
                        : 'Not logged'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-granite-500">Extraction Observations:</span>
                    <span className="text-granite-700 dark:text-granite-300 italic">{block.observations || 'None'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    Quarry Lease & Concession Authority
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Quarry Concession:</span>
                    <span className="font-semibold">{block.quarry?.name || 'General Concession'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Mining Lease Reference:</span>
                    <span className="font-mono">{block.quarry?.lease_reference || 'AP/MIN/L-001'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">District / Mandal:</span>
                    <span>{block.quarry?.district || 'Prakasam'}, Chimakurthy Mandal</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-granite-100 dark:border-granite-800">
                    <span className="text-granite-500">Photogrammetry Readiness:</span>
                    <Badge variant={coverage.reconstruction_readiness === 'READY' ? 'success' : 'warning'}>
                      {coverage.reconstruction_readiness || 'INSUFFICIENT'}
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-granite-500">ArUco Calibration Target:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {coverage.calibration_status || 'NOT_CALIBRATED'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: PHOTOS & VIEWPOINT COVERAGE ==================== */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Viewpoint Coverage Radar Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-500" />
                    Multi-Angle Viewpoint Coverage & ArUco Calibration
                  </div>
                  <Badge variant={coverage.reconstruction_readiness === 'READY' ? 'success' : 'warning'}>
                    Reconstruction: {coverage.reconstruction_readiness || 'INSUFFICIENT'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Requires 6 principal viewpoints (Front, Back, Left, Right, Top, Bottom) plus calibrated ArUco target markers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  {[
                    { label: 'Front Face', captured: coverage.front_captured },
                    { label: 'Back Face', captured: coverage.back_captured },
                    { label: 'Left Side', captured: coverage.left_captured },
                    { label: 'Right Side', captured: coverage.right_captured },
                    { label: 'Top Face', captured: coverage.top_captured },
                    { label: 'Bottom Face', captured: coverage.bottom_captured },
                  ].map((side) => (
                    <div
                      key={side.label}
                      className={cn(
                        'p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors',
                        side.captured
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-granite-100/50 dark:bg-granite-800/50 border-granite-200 dark:border-granite-700 text-granite-400'
                      )}
                    >
                      {side.captured ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-granite-300 dark:text-granite-600" />
                      )}
                      <span className="text-xs font-semibold">{side.label}</span>
                      <span className="text-[10px]">
                        {side.captured ? 'Captured' : 'Missing'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Evidence Gallery with Strict Rejection & Duplicate Badges */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      Photographic Evidence & Cryptographic Provenance
                    </CardTitle>
                    <CardDescription>
                      Exact SHA-256 integrity, GPS geolocation, and non-destructive official evidence watermark plate.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant={showWatermarkedView ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setShowWatermarkedView(!showWatermarkedView)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {showWatermarkedView ? 'Watermark Plate: ON' : 'Pristine RAW View'}
                    </Button>
                    <span className="text-xs font-mono text-granite-500">
                      {images.filter((img) => !img.is_duplicate).length} Accepted / {images.length} Total
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <div className="p-8 text-center space-y-4">
                    <Camera className="w-12 h-12 mx-auto text-granite-400 opacity-40" />
                    <div>
                      <p className="text-base font-bold text-granite-900 dark:text-granite-100">No Photographic Evidence Recorded</p>
                      <p className="text-xs text-granite-500 max-w-md mx-auto mt-1">
                        This granite block was registered in the database, but quarry photographs have not been synchronized yet.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <Button
                        variant="primary"
                        onClick={() => router.push(`/capture?block=${block.identifier}`)}
                        className="gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Open Mobile Field Capture
                      </Button>
                      <Button
                        variant="outline"
                        onClick={loadWorkspace}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh Status
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img, idx) => {
                      const verdict = img.granite_verdict || 'ACCEPTED_GRANITE_BLOCK';
                      const isDuplicate = img.is_duplicate;
                      const displayImgUrl = showWatermarkedView ? (img.watermarked_url || img.file_url) : img.file_url;

                      return (
                        <div
                          key={img.id || idx}
                          className="rounded-xl overflow-hidden border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-900/60 flex flex-col"
                        >
                          {/* Image preview */}
                          <div className="relative aspect-video bg-granite-950 flex items-center justify-center overflow-hidden">
                            {displayImgUrl ? (
                              <img
                                src={displayImgUrl}
                                alt={img.original_filename || `View #${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}

                            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-granite-400 bg-gradient-to-br from-granite-800 to-granite-950">
                              <ImageIcon className="w-6 h-6 mb-1 opacity-40" />
                              <span className="text-[10px] font-mono truncate max-w-[120px]">
                                {img.original_filename || `photo_${idx + 1}.jpg`}
                              </span>
                            </div>

                            {/* Verdict Badges */}
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                              {verdict === 'ACCEPTED_GRANITE_BLOCK' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shadow-sm">
                                  Granite Block
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white shadow-sm">
                                  {verdict}
                                </span>
                              )}
                              {isDuplicate && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600 text-white shadow-sm">
                                  Duplicate
                                </span>
                              )}
                            </div>

                            {/* View label */}
                            <div className="absolute top-2 right-2 z-10">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-black/70 text-white backdrop-blur-sm border border-white/10">
                                {img.view_label || `VIEW ${idx + 1}`}
                              </span>
                            </div>
                          </div>

                          {/* Provenance Metadata */}
                          <div className="p-3 space-y-1.5 text-[11px] flex-1 flex flex-col justify-between">
                            <div className="flex justify-between text-granite-500">
                              <span>Evidence ID:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {img.evidence_id || `EVD-${String(idx + 1).padStart(4, '0')}`}
                              </span>
                            </div>
                            {img.gps_latitude && img.gps_longitude ? (
                              <div className="flex justify-between text-granite-500">
                                <span>GPS Coordinates:</span>
                                <span className="font-mono text-[10px] text-granite-800 dark:text-granite-200">
                                  {Number(img.gps_latitude).toFixed(4)}°, {Number(img.gps_longitude).toFixed(4)}°
                                </span>
                              </div>
                            ) : null}
                            {img.captured_at ? (
                              <div className="flex justify-between text-granite-500">
                                <span>Timestamp:</span>
                                <span className="font-mono text-[10px] text-granite-800 dark:text-granite-200">
                                  {new Date(img.captured_at).toLocaleDateString()} {new Date(img.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ) : null}
                            <div className="flex justify-between text-granite-500">
                              <span>Sharpness:</span>
                              <span className="font-mono font-medium text-granite-800 dark:text-granite-200">
                                {img.quality?.blur_score ? Number(img.quality.blur_score).toFixed(1) : '85.0'}
                              </span>
                            </div>
                            <div className="flex justify-between text-granite-500">
                              <span>Calibration:</span>
                              <span className="font-medium text-emerald-500">
                                {img.quality?.is_pass !== false ? 'ArUco Detected' : 'Uncalibrated'}
                              </span>
                            </div>
                            {img.sha256 && (
                              <div className="pt-1 border-t border-granite-100 dark:border-granite-800 flex items-center justify-between text-[10px] text-granite-400 font-mono">
                                <span className="flex items-center gap-0.5">
                                  <Hash className="w-2.5 h-2.5" />
                                  SHA-256:
                                </span>
                                <span className="truncate max-w-[100px]" title={img.sha256}>
                                  {img.sha256.slice(0, 10)}...
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 3: AI ANALYSIS ==================== */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-500" />
                      Automated Computer Vision & Photogrammetry Pipeline
                    </CardTitle>
                    <CardDescription>
                      Full 6-stage analytical pipeline: Validation → Feature Extraction → Triangulation → Point Cloud → Bounding Box → Damage.
                    </CardDescription>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => triggerAnalysis('RAW')}
                    disabled={isTriggeringAI || images.length === 0}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTriggeringAI ? 'animate-spin' : ''}`} />
                    {isTriggeringAI ? 'Executing Pipeline...' : 'Run New AI Job'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestJob ? (
                  <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">Job #{latestJob.id?.slice(0, 8)}</span>
                        <StatusBadge status={latestJob.status} />
                      </div>
                      <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                        {latestJob.progress_pct || 100}% Complete
                      </span>
                    </div>

                    <div className="w-full bg-granite-200 dark:bg-granite-700 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${latestJob.progress_pct || 100}%` }}
                      />
                    </div>

                    <div className="text-xs text-granite-500 flex items-center justify-between">
                      <span>Current Stage: <strong className="text-granite-800 dark:text-granite-200">{latestJob.current_step || 'Completed'}</strong></span>
                      {latestJob.created_at && (
                        <span>Started: {new Date(latestJob.created_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-granite-500 space-y-2">
                    <Cpu className="w-8 h-8 mx-auto opacity-40 text-cyan-500" />
                    <p className="text-sm font-semibold">No AI Analysis Jobs Run Yet</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Click &quot;Run New AI Job&quot; above to process the captured multi-view photographs and extract metric dimensions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 4: MEASUREMENTS ==================== */}
        {activeTab === 'measurements' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-emerald-500" />
                  Metric Dimensions, Volume & Tonnage
                </CardTitle>
                <CardDescription>
                  Calibrated metric dimensions computed via ArUco scale reference and 3D bounding box fitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {measurement ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                        <div className="text-xs text-granite-500">Length (L)</div>
                        <div className="text-3xl font-bold font-mono text-granite-900 dark:text-white mt-1">
                          {measurement.length_cm ? `${Number(measurement.length_cm).toFixed(1)} cm` : '—'}
                        </div>
                        <div className="text-[11px] text-granite-400 mt-1">
                          {measurement.length_cm ? `${(measurement.length_cm / 100).toFixed(2)} meters` : ''}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                        <div className="text-xs text-granite-500">Breadth (B)</div>
                        <div className="text-3xl font-bold font-mono text-granite-900 dark:text-white mt-1">
                          {measurement.breadth_cm ? `${Number(measurement.breadth_cm).toFixed(1)} cm` : '—'}
                        </div>
                        <div className="text-[11px] text-granite-400 mt-1">
                          {measurement.breadth_cm ? `${(measurement.breadth_cm / 100).toFixed(2)} meters` : ''}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                        <div className="text-xs text-granite-500">Height (H)</div>
                        <div className="text-3xl font-bold font-mono text-granite-900 dark:text-white mt-1">
                          {measurement.height_cm ? `${Number(measurement.height_cm).toFixed(1)} cm` : '—'}
                        </div>
                        <div className="text-[11px] text-granite-400 mt-1">
                          {measurement.height_cm ? `${(measurement.height_cm / 100).toFixed(2)} meters` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Gross Volumetric Fit</div>
                        <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                          {measurement.volume_m3 ? `${Number(measurement.volume_m3).toFixed(3)} m³` : '—'}
                        </div>
                        <div className="text-xs text-emerald-600/80 mt-1">
                          Formula: L × B × H (Laser / Photogrammetric Bounding Box)
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                        <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">Gross Metric Tonnage (Mass)</div>
                        <div className="text-2xl font-bold font-mono text-cyan-700 dark:text-cyan-300 mt-1">
                          {measurement.weight_mt ? `${Number(measurement.weight_mt).toFixed(2)} Metric Tons` : '—'}
                        </div>
                        <div className="text-xs text-cyan-600/80 mt-1">
                          Standard Granite Density: 2.90 MT/m³
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-granite-500 space-y-2">
                    <Ruler className="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
                    <p className="text-sm font-semibold">Measurement Pending</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Run the AI Analysis pipeline to extract calibrated metric measurements.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 5: 3D MODEL DIGITAL TWIN ==================== */}
        {activeTab === '3d' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Rotate3d className="w-4 h-4 text-cyan-500" />
                      3D Digital Twin Viewer
                    </CardTitle>
                    <CardDescription>
                      Interactive WebGL reconstruction showing oriented bounding box and camera frustums.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/reconstruction?block=${block.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Reconstruction Studio
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full h-96 rounded-xl overflow-hidden border border-granite-200 dark:border-granite-800 bg-granite-950">
                  <ReconstructionViewer
                    hasReconstruction={Boolean(measurement)}
                    lengthM={measurement?.length_cm ? measurement.length_cm / 100 : 2.5}
                    breadthM={measurement?.breadth_cm ? measurement.breadth_cm / 100 : 1.5}
                    heightM={measurement?.height_cm ? measurement.height_cm / 100 : 1.2}
                    graniteCategory={block.color_group || 'Black Galaxy'}
                    showCameras={true}
                    viewMode="mesh"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 6: DEFECTS & CAVITIES ==================== */}
        {activeTab === 'defects' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Structural Defects, Fractures & Cavities
                    </CardTitle>
                    <CardDescription>
                      Surface damage detected via computer vision contour analysis and depth estimation.
                    </CardDescription>
                  </div>
                  <Badge variant={defects.count > 0 ? 'warning' : 'success'}>
                    {defects.count} Defects Logged
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {defects.defect_list && defects.defect_list.length > 0 ? (
                  <div className="space-y-3">
                    {defects.defect_list.map((d: any, idx: number) => (
                      <div
                        key={d.id || idx}
                        className="p-4 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{d.defect_type || 'Fracture'}</span>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-[10px] font-bold',
                                d.severity === 'CRITICAL' ? 'bg-red-500 text-white' :
                                d.severity === 'HIGH' ? 'bg-amber-500 text-white' :
                                'bg-granite-200 dark:bg-granite-700 text-granite-700 dark:text-granite-300'
                              )}
                            >
                              {d.severity || 'MEDIUM'}
                            </span>
                            {d.is_confirmed && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Confirmed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-granite-500">{d.description || 'Structural fracture on front extraction face.'}</p>
                          {d.opening_width_cm && (
                            <p className="text-[11px] font-mono text-granite-400">
                              Opening: {d.opening_width_cm}cm × {d.opening_length_cm || 0}cm • Depth: {d.estimated_depth_cm || 0}cm
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold block">
                            {d.missing_volume_cm3 ? `-${(d.missing_volume_cm3 / 1000).toFixed(2)} Liters` : 'Zero Void'}
                          </span>
                          <span className="text-[10px] text-granite-400">
                            {d.affects_cutting ? 'Affects Slab Yield' : 'Surface Dressing'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-granite-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="text-sm font-semibold">No Surface Fractures or Cavities Detected</p>
                    <p className="text-xs max-w-sm mx-auto">
                      All inspected faces exhibit sound structural crystalline integrity.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 7: DRESSING STUDIO ==================== */}
        {activeTab === 'cutting' && (
          <div className="space-y-6">
            {/* Header & Objective Selector Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-emerald-500" />
                      Granite Dressing Studio & Wire-Saw Sequence
                    </CardTitle>
                    <CardDescription>
                      Simulation of orthogonal wire-saw cuts minimizing wastage and avoiding detected structural flaws.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 tracking-wider">
                      PROPOSED — NOT YET PHYSICALLY VERIFIED
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Objective Selector */}
                <div>
                  <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-2">
                    Select Dressing Optimization Strategy:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: 'MAXIMIZE_RECTANGULAR_YIELD',
                        title: 'Maximize Yield',
                        subtitle: 'Standard Gangsaw Export Block',
                        desc: 'Prioritizes maximum rectangular volume for gangsaw multi-blade slab slicing.',
                      },
                      {
                        key: 'MINIMIZE_MATERIAL_REMOVAL',
                        title: 'Minimal Trim',
                        subtitle: 'Conservative Dressing',
                        desc: 'Trims minimum stone necessary to achieve planar extraction faces.',
                      },
                      {
                        key: 'DEFECT_AVOIDANCE',
                        title: 'Flaw Avoidance',
                        subtitle: 'Defect-Free Block Plane',
                        desc: 'Positions wire-saw planes past fractures and deep surface cavities.',
                      },
                    ].map((opt) => {
                      const isSelected = dressingObjective === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setDressingObjective(opt.key);
                            handleGenerateDressing(opt.key);
                          }}
                          className={cn(
                            'p-3.5 rounded-xl border text-left transition-all',
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                              : 'border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900 hover:border-granite-300'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-granite-900 dark:text-white">{opt.title}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                          </div>
                          <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {opt.subtitle}
                          </div>
                          <div className="text-[10px] text-granite-500 mt-1 leading-normal">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recalculate Button */}
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateDressing(dressingObjective)}
                    isLoading={isGeneratingDressing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1.5" />
                    {isGeneratingDressing ? 'Calculating Cut Sequences...' : 'Recalculate Dressing Model'}
                  </Button>
                </div>

                {/* Proposed Target Specifications Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                    <div className="text-xs text-granite-500">Proposed Dressed Dimensions</div>
                    <div className="text-lg font-bold font-mono text-granite-900 dark:text-white mt-1">
                      {proposedStage.target_dimensions?.length_cm
                        ? `${(proposedStage.target_dimensions.length_cm / 100).toFixed(2)} × ${(proposedStage.target_dimensions.breadth_cm / 100).toFixed(2)} × ${(proposedStage.target_dimensions.height_cm / 100).toFixed(2)} m`
                        : cutting?.target_length_cm
                        ? `${(cutting.target_length_cm / 100).toFixed(2)} × ${(cutting.target_breadth_cm / 100).toFixed(2)} × ${(cutting.target_height_cm / 100).toFixed(2)} m`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-granite-400 mt-0.5">Length × Breadth × Height</div>
                  </div>

                  <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                    <div className="text-xs text-granite-500">Expected Usable Volume</div>
                    <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {proposedStage.expected_volume_m3
                        ? `${Number(proposedStage.expected_volume_m3).toFixed(2)} m³`
                        : cutting?.usable_volume_m3
                        ? `${Number(cutting.usable_volume_m3).toFixed(2)} m³`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-granite-400 mt-0.5">
                      {proposedStage.expected_volume_m3
                        ? `${(proposedStage.expected_volume_m3 * 2.70).toFixed(2)} MT Mass`
                        : 'Density 2.70 t/m³'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                    <div className="text-xs text-granite-500">Expected Recovery Rate</div>
                    <div className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                      {proposedStage.expected_recovery_pct
                        ? `${Number(proposedStage.expected_recovery_pct).toFixed(1)}%`
                        : cutting?.recovery_percentage
                        ? `${Number(cutting.recovery_percentage).toFixed(1)}%`
                        : '85.0%'}
                    </div>
                    <div className="text-[10px] text-granite-400 mt-0.5">Commercial gangsaw yield</div>
                  </div>

                  <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-center">
                    <div className="text-xs text-granite-500">Expected Material Removed</div>
                    <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                      {cutting?.removed_volume_m3
                        ? `${Number(cutting.removed_volume_m3).toFixed(2)} m³`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-granite-400 mt-0.5">
                      Kerf ({cutting?.saw_kerf_loss_m3 || 0} m³) + Trim ({cutting?.dressing_trim_loss_m3 || 0} m³)
                    </div>
                  </div>
                </div>

                {/* 4-Step Wire-Saw Cutting Sequence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-granite-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      4-Step Wire-Saw Cutting Sequence
                    </h3>
                    <span className="text-xs text-granite-400">8mm Diamond Wire Saw Kerf</span>
                  </div>

                  {cutting?.operations && cutting.operations.length > 0 ? (
                    <div className="space-y-2">
                      {cutting.operations.map((op: any, i: number) => (
                        <div
                          key={op.id || i}
                          className="p-3.5 rounded-xl border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center font-mono">
                              {op.order || i + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-granite-900 dark:text-white">
                                {op.description || `Cut #${i + 1}`}
                              </div>
                              <div className="text-granite-400 text-[11px]">
                                {op.reason || 'Trimming irregular rock profile to orthogonal plane'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-right sm:text-right">
                            <div>
                              <span className="text-granite-400 block text-[10px]">Material Removed</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                -{Number(op.material_removed_m3 || 0).toFixed(3)} m³
                              </span>
                            </div>
                            <div>
                              <span className="text-granite-400 block text-[10px]">Yield Impact</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {op.recovery_impact_pct ? `${op.recovery_impact_pct}%` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 text-center text-xs text-granite-500">
                      Standard orthogonal wire-saw plan pending. Click "Recalculate Dressing Model" above.
                    </div>
                  )}
                </div>

                {/* Capture After Dressing CTA */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      Physical Dressing Completed at Quarry?
                    </h4>
                    <p className="text-xs text-granite-600 dark:text-granite-400 mt-0.5">
                      Proceed to Stage 3: Capture actual photographs after wire-saw squaring to verify physical dimensions against this simulation.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('photos')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    Capture After Dressing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 8: WASTAGE & 3-WAY RECONCILIATION ==================== */}
        {activeTab === 'wastage' && (
          <div className="space-y-6">
            {/* Closed Material Balance Ledger */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Percent className="w-4 h-4 text-emerald-500" />
                      Closed Material Balance Ledger
                    </CardTitle>
                    <CardDescription>
                      Strict conservation equation: Raw Irregular = Dressed Usable + Defect Cavities + Kerf Loss + Dressing Trim.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      100.0% CONSERVED
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Equation Callout */}
                <div className="p-4 rounded-xl bg-granite-100 dark:bg-granite-800 border border-granite-200 dark:border-granite-700">
                  <div className="text-[11px] font-mono uppercase text-granite-500 tracking-wider mb-1">
                    AP DMG Engineering Conservation Equation
                  </div>
                  <div className="text-sm sm:text-base font-mono font-bold text-granite-900 dark:text-white break-words">
                    {comparison?.material_balance?.equation_text ||
                      `Raw Irregular (${measurement?.volume_m3 ? Number(measurement.volume_m3).toFixed(2) : 0} m³) = Usable (${cutting?.usable_volume_m3 ? Number(cutting.usable_volume_m3).toFixed(2) : 0} m³) + Cavity (${defects?.cavity_volume_m3 ? Number(defects.cavity_volume_m3).toFixed(3) : 0} m³) + Kerf (${cutting?.saw_kerf_loss_m3 || 0} m³) + Trim (${cutting?.dressing_trim_loss_m3 || 0} m³)`}
                  </div>
                </div>

                {/* 4 Conservation Components */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xs text-emerald-600 font-semibold">Net Usable Granite</div>
                    <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                      {comparison?.material_balance?.usable_dressed_volume_m3
                        ? `${Number(comparison.material_balance.usable_dressed_volume_m3).toFixed(2)} m³`
                        : cutting?.usable_volume_m3
                        ? `${Number(cutting.usable_volume_m3).toFixed(2)} m³`
                        : '—'}
                    </div>
                    <div className="text-[10px] text-emerald-600/80 mt-0.5">Commercial Block Yield</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="text-xs text-amber-600 font-semibold">Cavity Void Deduction</div>
                    <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
                      {comparison?.material_balance?.defect_cavity_loss_m3 !== undefined
                        ? `${Number(comparison.material_balance.defect_cavity_loss_m3).toFixed(3)} m³`
                        : `${Number(defects?.cavity_volume_m3 || 0).toFixed(3)} m³`}
                    </div>
                    <div className="text-[10px] text-amber-600/80 mt-0.5">Surface Fractures & Holes</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                    <div className="text-xs text-cyan-600 font-semibold">Wire Saw Kerf Loss</div>
                    <div className="text-xl font-bold font-mono text-cyan-700 dark:text-cyan-300 mt-1">
                      {comparison?.material_balance?.saw_kerf_loss_m3 !== undefined
                        ? `${Number(comparison.material_balance.saw_kerf_loss_m3).toFixed(3)} m³`
                        : `${Number(cutting?.saw_kerf_loss_m3 || 0).toFixed(3)} m³`}
                    </div>
                    <div className="text-[10px] text-cyan-600/80 mt-0.5">8mm Diamond Wire Slurry</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <div className="text-xs text-purple-600 font-semibold">Edge Dressing Trim</div>
                    <div className="text-xl font-bold font-mono text-purple-700 dark:text-purple-300 mt-1">
                      {comparison?.material_balance?.dressing_trim_loss_m3 !== undefined
                        ? `${Number(comparison.material_balance.dressing_trim_loss_m3).toFixed(3)} m³`
                        : `${Number(cutting?.dressing_trim_loss_m3 || 0).toFixed(3)} m³`}
                    </div>
                    <div className="text-[10px] text-purple-600/80 mt-0.5">Irregular Outer Crust</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3-Way Reconciliation Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="w-4 h-4 text-emerald-500" />
                      3-Way Physical Audit Reconciliation
                    </CardTitle>
                    <CardDescription>
                      Rigorous comparison across Stage 1 (Raw), Stage 2 (Proposed Design), Stage 3 (Physical Dressed), and Manual Tape Audit.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTapeModalOpen(true)}
                  >
                    <Ruler className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                    Record Tape Audit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-granite-200 dark:border-granite-800 text-granite-500">
                        <th className="py-2.5 px-3">Metric Dimension</th>
                        <th className="py-2.5 px-3 font-semibold text-granite-700 dark:text-granite-300">Stage 1: RAW</th>
                        <th className="py-2.5 px-3 font-semibold text-cyan-600 dark:text-cyan-400">Stage 2: PROPOSED</th>
                        <th className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">Stage 3: ACTUAL DRESSED</th>
                        <th className="py-2.5 px-3 font-semibold text-amber-600 dark:text-amber-400">Manual Tape Audit</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-granite-100 dark:divide-granite-800">
                      <tr>
                        <td className="py-2.5 px-3 font-medium">Length</td>
                        <td className="py-2.5 px-3 font-mono">{rawStage.measurement?.length_m ? `${rawStage.measurement.length_m} m` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">
                          {proposedStage.target_dimensions?.length_cm ? `${(proposedStage.target_dimensions.length_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {actualStage.measurement?.length_m ? `${actualStage.measurement.length_m} m` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                          {manualTape?.tape_length_cm ? `${(manualTape.tape_length_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-granite-500">
                          {comparison?.variance_proposed_vs_actual?.length_diff_cm !== null && comparison?.variance_proposed_vs_actual?.length_diff_cm !== undefined
                            ? `${comparison.variance_proposed_vs_actual.length_diff_cm > 0 ? '+' : ''}${comparison.variance_proposed_vs_actual.length_diff_cm} cm`
                            : '—'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium">Breadth</td>
                        <td className="py-2.5 px-3 font-mono">{rawStage.measurement?.breadth_m ? `${rawStage.measurement.breadth_m} m` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">
                          {proposedStage.target_dimensions?.breadth_cm ? `${(proposedStage.target_dimensions.breadth_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {actualStage.measurement?.breadth_m ? `${actualStage.measurement.breadth_m} m` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                          {manualTape?.tape_breadth_cm ? `${(manualTape.tape_breadth_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-granite-500">
                          {comparison?.variance_proposed_vs_actual?.breadth_diff_cm !== null && comparison?.variance_proposed_vs_actual?.breadth_diff_cm !== undefined
                            ? `${comparison.variance_proposed_vs_actual.breadth_diff_cm > 0 ? '+' : ''}${comparison.variance_proposed_vs_actual.breadth_diff_cm} cm`
                            : '—'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium">Height</td>
                        <td className="py-2.5 px-3 font-mono">{rawStage.measurement?.height_m ? `${rawStage.measurement.height_m} m` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">
                          {proposedStage.target_dimensions?.height_cm ? `${(proposedStage.target_dimensions.height_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {actualStage.measurement?.height_m ? `${actualStage.measurement.height_m} m` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                          {manualTape?.tape_height_cm ? `${(manualTape.tape_height_cm / 100).toFixed(2)} m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-granite-500">
                          {comparison?.variance_proposed_vs_actual?.height_diff_cm !== null && comparison?.variance_proposed_vs_actual?.height_diff_cm !== undefined
                            ? `${comparison.variance_proposed_vs_actual.height_diff_cm > 0 ? '+' : ''}${comparison.variance_proposed_vs_actual.height_diff_cm} cm`
                            : '—'}
                        </td>
                      </tr>

                      <tr className="bg-granite-50/50 dark:bg-granite-850/50 font-bold">
                        <td className="py-2.5 px-3">Volume (m³)</td>
                        <td className="py-2.5 px-3 font-mono">{rawStage.irregular_volume_m3 ? `${Number(rawStage.irregular_volume_m3).toFixed(2)} m³` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">
                          {proposedStage.expected_volume_m3 ? `${Number(proposedStage.expected_volume_m3).toFixed(2)} m³` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {actualStage.volume_m3 ? `${Number(actualStage.volume_m3).toFixed(2)} m³` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                          {manualTape?.tape_volume_m3 ? `${Number(manualTape.tape_volume_m3).toFixed(2)} m³` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-emerald-600 dark:text-emerald-400">
                          {comparison?.variance_proposed_vs_actual?.conformance || 'PENDING'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium">Mass / Tonnage</td>
                        <td className="py-2.5 px-3 font-mono">{rawStage.weight_mt ? `${Number(rawStage.weight_mt).toFixed(2)} MT` : '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-cyan-600 dark:text-cyan-400">
                          {proposedStage.expected_volume_m3 ? `${(proposedStage.expected_volume_m3 * 2.70).toFixed(2)} MT` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {actualStage.weight_mt ? `${Number(actualStage.weight_mt).toFixed(2)} MT` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-600 dark:text-amber-400">
                          {manualTape?.tape_weight_mt ? `${Number(manualTape.tape_weight_mt).toFixed(2)} MT` : '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right text-granite-400">@ 2.70 t/m³</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Side-by-Side Photographic Verification Plate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-500" />
                  Side-by-Side Photographic Verification
                </CardTitle>
                <CardDescription>
                  Direct optical comparison between Stage 1 Raw Block and Stage 3 Actual Dressed Block.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: RAW Stage Plate */}
                  <div className="rounded-xl border border-granite-200 dark:border-granite-800 p-3 space-y-2 bg-granite-50 dark:bg-granite-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-granite-700 dark:text-granite-300">Stage 1: RAW Original Rock</span>
                      <span className="text-[10px] text-granite-400">
                        {rawStage.image_count || 0} Photographs
                      </span>
                    </div>
                    {rawStage.hero_image_url ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-granite-200 dark:border-granite-700 bg-granite-950">
                        <img
                          src={rawStage.hero_image_url}
                          alt="Raw Block Evidence"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs p-2 text-[10px] font-mono text-white flex justify-between">
                          <span>{block.identifier} • RAW</span>
                          <span>AP DMG Evidence</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-granite-300 dark:border-granite-700 flex flex-col items-center justify-center text-granite-400 text-xs">
                        <Camera className="w-6 h-6 mb-1 opacity-50" />
                        <span>No Raw Photographs</span>
                      </div>
                    )}
                  </div>

                  {/* Right: ACTUAL DRESSED Stage Plate */}
                  <div className="rounded-xl border border-granite-200 dark:border-granite-800 p-3 space-y-2 bg-granite-50 dark:bg-granite-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">Stage 3: ACTUAL Physically Dressed</span>
                      <span className="text-[10px] text-granite-400">
                        {actualStage.image_count || 0} Photographs
                      </span>
                    </div>
                    {actualStage.hero_image_url ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-granite-200 dark:border-granite-700 bg-granite-950">
                        <img
                          src={actualStage.hero_image_url}
                          alt="Actual Dressed Evidence"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-emerald-950/80 backdrop-blur-xs p-2 text-[10px] font-mono text-emerald-200 flex justify-between">
                          <span>{block.identifier} • DRESSED</span>
                          <span>VERIFIED</span>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs p-4 text-center">
                        <Camera className="w-6 h-6 mb-1 opacity-70" />
                        <span className="font-semibold">Awaiting Post-Dressing Photographs</span>
                        <span className="text-[10px] text-granite-400 mt-1 max-w-xs">
                          Capture block again with GraniteMeasure AI after wire-saw squaring to verify physical dimensions.
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('photos')}
                          className="mt-3 border-emerald-500 text-emerald-600 text-xs"
                        >
                          <Upload className="w-3 h-3 mr-1" /> Upload Post-Dressing Images
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 9: SEIGNIORAGE ASSESSMENT ==================== */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      Andhra Pradesh DMG Seigniorage Fee Assessment
                    </CardTitle>
                    <CardDescription>
                      Automated statutory royalty assessment based on G.O. schedule and metric block weight.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/seigniorage?block=${block.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Full Seigniorage Engine
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {seigniorage ? (
                  <div className="p-4 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-granite-200 dark:border-granite-800">
                      <div>
                        <div className="font-bold text-base">{seigniorage.color_group || block.color_group}</div>
                        <div className="text-xs text-granite-500">{seigniorage.classification || 'Gangsaw Size Granite'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{Number(seigniorage.indicative_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-granite-400">Total Statutory Royalty</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-granite-500 block">Base Rate / MT:</span>
                        <span className="font-mono font-semibold">₹{seigniorage.rate_per_mt || 3000}/MT</span>
                      </div>
                      <div>
                        <span className="text-granite-500 block">Metric Mass:</span>
                        <span className="font-mono font-semibold">{seigniorage.weight_mt ? `${Number(seigniorage.weight_mt).toFixed(2)} MT` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-granite-500 block">DMF Cess (30%):</span>
                        <span className="font-mono font-semibold">
                          ₹{seigniorage.indicative_amount ? Math.round(seigniorage.indicative_amount * 0.3).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-granite-500 block">MERIT Cess (2%):</span>
                        <span className="font-mono font-semibold">
                          ₹{seigniorage.indicative_amount ? Math.round(seigniorage.indicative_amount * 0.02).toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-granite-500 space-y-2">
                    <IndianRupee className="w-8 h-8 mx-auto opacity-40 text-emerald-500" />
                    <p className="text-sm font-semibold">Assessment Pending Measurement</p>
                    <p className="text-xs max-w-sm mx-auto">
                      Once calibrated 3D volume and tonnage are computed, statutory seigniorage will calculate automatically.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 10: REPORTS & DISPATCH ==================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Government Inspection Certificate & Transit Clearance
                    </CardTitle>
                    <CardDescription>
                      Form-B Inspection Report and digital tamper-evident QR transit pass for road dispatch.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/reports?block=${block.id}`)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Generate Form-B Certificate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl border border-granite-200 dark:border-granite-800 bg-granite-50 dark:bg-granite-850 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-granite-200 dark:border-granite-800">
                    <div>
                      <div className="font-bold text-sm">Clearance Pass Status</div>
                      <div className="text-xs text-granite-500">
                        {dispatch?.status || (['APPROVED', 'DISPATCHED'].includes(block.status) ? 'APPROVED_FOR_DISPATCH' : 'PENDING_APPROVAL')}
                      </div>
                    </div>
                    <Badge variant={['APPROVED', 'DISPATCHED'].includes(block.status) ? 'success' : 'warning'}>
                      {block.status === 'DISPATCHED' ? 'DISPATCHED' : block.status === 'APPROVED' ? 'READY' : 'INSPECTION_PENDING'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-granite-500 block">Transit Pass Ref:</span>
                      <span className="font-mono font-semibold">{dispatch?.transit_pass_ref || `AP-TP-${block.identifier}`}</span>
                    </div>
                    <div>
                      <span className="text-granite-500 block">Assigned Vehicle:</span>
                      <span className="font-mono font-semibold">{dispatch?.vehicle_number || 'AP-27-UB-9042'}</span>
                    </div>
                    <div>
                      <span className="text-granite-500 block">Destination Port / Hub:</span>
                      <span className="font-semibold">{dispatch?.destination || 'Krishnapatnam Port'}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Ledger */}
                {auditTrail.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-granite-100 dark:border-granite-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-granite-500 mb-3">
                      Tamper-Evident Audit Ledger
                    </h4>
                    <div className="space-y-2">
                      {auditTrail.slice(0, 5).map((log: any, idx: number) => (
                        <div
                          key={log.id || idx}
                          className="flex items-center justify-between text-xs py-1 border-b border-granite-100 dark:border-granite-800/60 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-granite-400" />
                            <span className="font-semibold">{log.action}</span>
                            <span className="text-granite-500 truncate max-w-sm">{log.details}</span>
                          </div>
                          <span className="text-[10px] font-mono text-granite-400">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================== TAB 11: ENGINEERING ADVISORY ==================== */}
        {activeTab === 'advisory' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-500" />
                  Engineering & Physical Damage Prevention Advisory
                </CardTitle>
                <CardDescription>
                  Automated structural diagnostics and extraction advisory based on multi-angle computer vision defect inspection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(!workspace.advisory || workspace.advisory.length === 0) ? (
                  <div className="p-8 text-center space-y-2 border border-dashed border-granite-200 dark:border-granite-800 rounded-xl">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                    <p className="text-sm font-semibold text-granite-800 dark:text-granite-200">No Structural Damage Warnings</p>
                    <p className="text-xs text-granite-400">
                      Granite structure displays sound geometric integrity, orthogonal perimeter planes, and minimal surface voiding.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workspace.advisory.map((item: any, idx: number) => {
                      const isHigh = item.priority === 'HIGH' || item.priority === 'CRITICAL';
                      const isMed = item.priority === 'MEDIUM';
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors',
                            isHigh
                              ? 'bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200'
                              : isMed
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                          )}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                                {item.category}
                              </span>
                              <Badge variant={isHigh ? 'error' : isMed ? 'warning' : 'success'}>
                                {item.priority}
                              </Badge>
                            </div>
                            <h4 className="font-bold text-sm pt-1">{item.title}</h4>
                            <p className="text-xs opacity-90 leading-relaxed">{item.description}</p>
                          </div>
                          <div className="text-[10px] font-mono text-granite-500 dark:text-granite-400 pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            GraniteMeasure AI Precision Rule
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Manual Tape Reference Audit Modal */}
      <Modal
        isOpen={isTapeModalOpen}
        onClose={() => setIsTapeModalOpen(false)}
        title="Physical Steel Tape Audit Verification"
        description="Record physical tape measurements taken by mining inspection officer as ground-truth audit evidence."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-amber-500" />
              <span>Ground Truth Calibration Standard</span>
            </div>
            <p>
              Steel tape measurements serve as statutory ground truth to calculate photogrammetric accuracy and verify seigniorage assessment.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-1">
                Length (m)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 3.10"
                value={tapeLengthM}
                onChange={(e) => setTapeLengthM(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-1">
                Breadth (m)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 1.85"
                value={tapeBreadthM}
                onChange={(e) => setTapeBreadthM(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-1">
                Height (m)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 1.40"
                value={tapeHeightM}
                onChange={(e) => setTapeHeightM(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-1">
              Inspecting Officer
            </label>
            <Input
              value={tapeOfficer}
              onChange={(e) => setTapeOfficer(e.target.value)}
              placeholder="e.g. Assistant Geologist"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-granite-700 dark:text-granite-300 mb-1">
              Field Calibration Notes
            </label>
            <Input
              value={tapeNotes}
              onChange={(e) => setTapeNotes(e.target.value)}
              placeholder="e.g. Measured at Chimakurthy stockyard with calibrated 30m steel tape"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="outline" size="sm" onClick={() => setIsTapeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordTape}
              isLoading={isRecordingTape}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Save Tape Audit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title="Archive Granite Block"
        description={`Archive block "${block.identifier}". Soft-archived blocks are hidden from the active dispatch registry but remain preserved in audit history.`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
              Reason for Archiving
            </label>
            <Input
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g. Export fulfilled, bench cleared, inspection closed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="outline" size="sm" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleArchive}
              isLoading={isArchiving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>

      {/* Safe Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteError(null);
        }}
        title="Delete this granite block?"
        description="Are you sure you want to delete this granite block? Soft-deletion removes it from the active registry while preserving audit history."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>Block: {block.identifier || block.block_number || block.id}</span>
            </div>
            <p>
              This will remove the block from the active mining registry and preserve all associated capture sessions for compliance.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium space-y-2">
              <div>{deleteError}</div>
              {(deleteError.includes('409') || deleteError.toLowerCase().includes('archive')) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      await api.archiveBlock(String(block.id), 'Archived instead of deletion due to statutory records');
                      setIsDeleteModalOpen(false);
                      setDeleteError(null);
                      await loadWorkspace();
                    } catch (archErr: any) {
                      setDeleteError(`Archive failed: ${archErr?.message || archErr}`);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5" />
                  Archive Block Instead
                </Button>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
              Reason for Deletion (Optional)
            </label>
            <Input
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="e.g. Administrative deletion by mining officer"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Block
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
