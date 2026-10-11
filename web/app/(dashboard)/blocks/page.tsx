'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Archive,
  ArchiveRestore,
  Trash2,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldAlert,
  CheckSquare,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useTranslation } from '@/localization';
import { useRole } from '@/lib/roles';
import { api, GraniteBlock, Quarry, BlockType } from '@/lib/api';

export default function BlocksRegistryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { role, hasPermission } = useRole();

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [quarries, setQuarries] = useState<Quarry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Register Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({
    identifier: '',
    block_type: 'RAW' as BlockType,
    color_group: 'Black Galaxy',
    quarry_id: '1',
    observations: '',
    gps_latitude: 15.5869,
    gps_longitude: 79.8705,
  });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Safe Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<GraniteBlock | null>(null);
  const [deleteReason, setDeleteReason] = useState('Administrative deletion by mining officer');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Archive Modal state
  const [archiveTarget, setArchiveTarget] = useState<GraniteBlock | null>(null);
  const [archiveReason, setArchiveReason] = useState('Archived after inspection review');
  const [isArchiving, setIsArchiving] = useState(false);

  // Restore state
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Bulk Selection & Action state
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<'delete' | 'archive' | null>(null);
  const [bulkReason, setBulkReason] = useState('Bulk administrative operation');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadQuarries();
  }, []);

  useEffect(() => {
    setSelectedBlockIds([]);
    fetchBlocks();
  }, [activeTab, statusFilter]);

  const loadQuarries = async () => {
    try {
      const qData = await api.getQuarries();
      if (Array.isArray(qData) && qData.length > 0) {
        setQuarries(qData);
        setNewBlock((prev) => ({ ...prev, quarry_id: String(qData[0].id) }));
      }
    } catch {
      // Keep defaults
    }
  };

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      setError(null);
      const isArchived = activeTab === 'archived';
      const data = await api.getBlocks({
        search: searchQuery || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        only_archived: isArchived,
        include_archived: isArchived,
      });
      if (Array.isArray(data)) {
        setBlocks(data);
      } else {
        setBlocks([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load granite blocks from mining registry.');
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      setSubmitting(true);
      const quarryIdNum = parseInt(newBlock.quarry_id, 10) || 1;
      const created = await api.createBlock({
        identifier: newBlock.identifier.trim() || undefined,
        quarry_id: String(quarryIdNum),
        color_group: newBlock.color_group,
        block_type: newBlock.block_type,
        observations: newBlock.observations || undefined,
        gps_latitude: newBlock.gps_latitude,
        gps_longitude: newBlock.gps_longitude,
      });

      setIsModalOpen(false);
      setNewBlock({
        identifier: '',
        block_type: 'RAW',
        color_group: 'Black Galaxy',
        quarry_id: quarries[0]?.id ? String(quarries[0].id) : '1',
        observations: '',
        gps_latitude: 15.5869,
        gps_longitude: 79.8705,
      });

      // Immediately navigate to the single block's authoritative workspace
      router.push(`/blocks/${created.id}`);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to register block.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveBlock = async () => {
    if (!archiveTarget) return;
    try {
      setIsArchiving(true);
      await api.archiveBlock(String(archiveTarget.id), archiveReason);
      setArchiveTarget(null);
      fetchBlocks();
    } catch (err: any) {
      alert(`Archive failed: ${err?.message || err}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreBlock = async (blockId: string) => {
    try {
      setRestoringId(blockId);
      await api.restoreBlock(blockId);
      fetchBlocks();
    } catch (err: any) {
      alert(`Restore failed: ${err?.message || err}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBlock = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    const targetIdent = deleteTarget.identifier || deleteTarget.block_number;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.deleteBlock(String(targetId), targetIdent, deleteReason);
      // Optimistically remove from active list for immediate feedback
      setBlocks((prev) => prev.filter((b) => String(b.id) !== String(targetId) && b.identifier !== targetIdent));
      setDeleteTarget(null);
      await fetchBlocks();
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete block.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectBlock = (blockId: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(blockId) ? prev.filter((id) => id !== blockId) : [...prev, blockId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedBlockIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      const res = await api.bulkDeleteBlocks(selectedBlockIds, bulkReason);
      setBulkActionFeedback(`Safely deleted ${res.success_count} of ${res.total} selected block(s).`);
      setSelectedBlockIds([]);
      setBulkActionModal(null);
      fetchBlocks();
    } catch (err: any) {
      alert(`Bulk delete error: ${err?.message || err}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedBlockIds.length === 0) return;
    try {
      setIsBulkProcessing(true);
      const res = await api.bulkArchiveBlocks(selectedBlockIds, bulkReason);
      setBulkActionFeedback(`Archived ${res.success_count} of ${res.total} selected block(s).`);
      setSelectedBlockIds([]);
      setBulkActionModal(null);
      fetchBlocks();
    } catch (err: any) {
      alert(`Bulk archive error: ${err?.message || err}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredBlocks = blocks.filter((b) => {
    const blockNum = (b.block_number || b.identifier || '').toLowerCase();
    const cat = (b.granite_category || b.color_group || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = searchQuery === '' || blockNum.includes(query) || cat.includes(query);
    const matchesType = typeFilter === 'ALL' || b.block_type === typeFilter;
    return matchesQuery && matchesType;
  });

  const isAllVisibleSelected =
    filteredBlocks.length > 0 &&
    filteredBlocks.every((b) => selectedBlockIds.includes(String(b.id)));

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(filteredBlocks.map((b) => String(b.id)));
      setSelectedBlockIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredBlocks.map((b) => String(b.id));
      setSelectedBlockIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const clearSelection = () => {
    setSelectedBlockIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Register Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white flex items-center gap-2">
            <Box className="h-6 w-6 text-emerald-500" />
            <span>{t('blocks.title') || 'Granite Block Registry'}</span>
          </h1>
          <p className="mt-1 text-xs md:text-sm text-granite-500 dark:text-granite-400">
            {t('blocks.subtitle') || 'Authoritative Andhra Pradesh mining block registry, photographic multi-side sessions & volumetric intelligence.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBlocks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateError(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t('blocks.new_block') || 'Register Genuine Block'}
          </Button>
        </div>
      </div>

      {/* Bulk Action Feedback Banner */}
      {bulkActionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{bulkActionFeedback}</span>
          </div>
          <button
            onClick={() => setBulkActionFeedback(null)}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs: Active Blocks vs Archived Blocks */}
      <div className="flex items-center gap-2 border-b border-granite-200 dark:border-granite-800 pb-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === 'active'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'text-granite-500 hover:text-granite-800 dark:hover:text-granite-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Active Registry</span>
          {activeTab === 'active' && !loading && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              {filteredBlocks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${
            activeTab === 'archived'
              ? 'border-b-2 border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
              : 'text-granite-500 hover:text-granite-800 dark:hover:text-granite-200'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Archived Blocks</span>
          {activeTab === 'archived' && !loading && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {filteredBlocks.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search block identifier or granite category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'REGISTERED', label: 'Registered' },
                  { value: 'CAPTURED', label: 'Captured' },
                  { value: 'ANALYZING', label: 'Analyzing' },
                  { value: 'MEASURED', label: 'Measured' },
                  { value: 'ASSESSED', label: 'Assessed' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'DISPATCHED', label: 'Dispatched' },
                ]}
              />
            </div>

            <div className="w-36">
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Block Types' },
                  { value: 'RAW', label: 'RAW' },
                  { value: 'PROCESSED', label: 'PROCESSED' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBlocks}>
            Retry
          </Button>
        </div>
      )}

      {/* Blocks Table / Grid */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBlocks.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-granite-100 dark:bg-granite-800 flex items-center justify-center text-granite-400">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-granite-900 dark:text-granite-100">
                {activeTab === 'archived' ? 'No Archived Granite Blocks' : 'No Granite Blocks Registered Yet'}
              </h3>
              <p className="text-xs text-granite-500 max-w-md mx-auto">
                {activeTab === 'archived'
                  ? 'Granite blocks that are soft-archived will appear here and can be restored at any time.'
                  : 'Start by registering a genuine extracted granite block from an Andhra Pradesh quarry pit to begin multi-view capture and metric intelligence.'}
              </p>
              {activeTab === 'active' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Register First Block
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-granite-50 dark:bg-granite-850/80 text-granite-500 dark:text-granite-400 uppercase tracking-wider font-semibold border-b border-granite-200 dark:border-granite-800">
                  <tr>
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        className="rounded border-granite-300 dark:border-granite-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 bg-white dark:bg-granite-900"
                        aria-label="Select all visible blocks"
                      />
                    </th>
                    <th className="px-5 py-3.5">Block Identifier</th>
                    <th className="px-5 py-3.5">Quarry Concession</th>
                    <th className="px-5 py-3.5">Granite Category</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Metric Geometry / Mass</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-granite-100 dark:divide-granite-800">
                  {filteredBlocks.map((blk) => (
                    <motion.tr
                      key={blk.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-granite-50/70 dark:hover:bg-granite-850/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/blocks/${blk.id}`)}
                    >
                      <td className="px-4 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedBlockIds.includes(String(blk.id))}
                          onChange={() => toggleSelectBlock(String(blk.id))}
                          className="rounded border-granite-300 dark:border-granite-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 bg-white dark:bg-granite-900"
                          aria-label={`Select block ${blk.identifier}`}
                        />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-granite-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 dark:text-emerald-400 group-hover:underline">
                            {blk.identifier || blk.block_number}
                          </span>
                        </div>
                        {blk.gps_latitude && (
                          <span className="block text-[10px] font-normal text-granite-400 mt-0.5">
                            GPS: {blk.gps_latitude?.toFixed(4)}, {blk.gps_longitude?.toFixed(4)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-granite-700 dark:text-granite-300 font-medium">
                        {(blk as any).quarry_name || 'Chimakurthy Galaxy Bench'}
                      </td>
                      <td className="px-5 py-4 text-granite-700 dark:text-granite-300 font-medium">
                        {blk.granite_category || blk.color_group}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-granite-100 dark:bg-granite-800 text-granite-600 dark:text-granite-300">
                          {blk.block_type || 'RAW'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {(blk as any).dimensions ? (
                          <>
                            <span className="text-granite-900 dark:text-white font-semibold">
                              {(blk as any).dimensions}
                            </span>
                            <span className="block text-[10px] font-normal text-granite-400">
                              {(blk as any).volume_m3 ? `${Number((blk as any).volume_m3).toFixed(2)} m³` : ''}{' '}
                              {(blk as any).weight_mt ? `• ${Number((blk as any).weight_mt).toFixed(2)} MT` : ''}
                            </span>
                          </>
                        ) : blk.volume_m3 ? (
                          <>
                            <span className="text-granite-900 dark:text-white font-semibold">
                              {blk.volume_m3.toFixed(2)} m³
                            </span>
                            <span className="block text-[10px] font-normal text-granite-400">
                              {blk.weight_mt ? `${blk.weight_mt.toFixed(2)} MT` : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-granite-400 italic">Pending 3D fit</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={blk.status} />
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/blocks/${blk.id}`)}
                            title="Open Block Workspace"
                            className="text-xs"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                            Workspace
                          </Button>

                          {activeTab === 'active' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setArchiveTarget(blk);
                                setArchiveReason('Archived by officer');
                              }}
                              title="Archive Block"
                              className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreBlock(String(blk.id))}
                              disabled={restoringId === String(blk.id)}
                              title="Restore Block to Active"
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget(blk);
                              setDeleteError(null);
                            }}
                            title="Safe Delete Block"
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Bulk Selection Toolbar */}
      <AnimatePresence>
        {selectedBlockIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-granite-900/95 dark:bg-granite-900/95 text-white border border-granite-700 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-granite-700">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-xs">
                {selectedBlockIds.length} block{selectedBlockIds.length > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionModal('archive')}
                className="text-amber-400 border-amber-500/40 hover:bg-amber-500/10 text-xs py-1 h-8"
              >
                <Archive className="w-3.5 h-3.5 mr-1.5" />
                Archive Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkActionModal('delete')}
                className="text-red-400 border-red-500/40 hover:bg-red-500/10 text-xs py-1 h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-granite-400 hover:text-white text-xs py-1 h-8"
              >
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Register Block Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Genuine Granite Block"
        description="Register an extracted granite block in the official Andhra Pradesh mining registry. A unique Block Workspace will be created immediately."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateBlock} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
              Block Identifier (Optional - leave blank to auto-generate)
            </label>
            <Input
              placeholder="e.g. AP-PRK-BG-2026-101"
              value={newBlock.identifier}
              onChange={(e) => setNewBlock({ ...newBlock, identifier: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                Quarry Concession
              </label>
              <Select
                value={newBlock.quarry_id}
                onChange={(e) => setNewBlock({ ...newBlock, quarry_id: e.target.value })}
                options={
                  quarries.length > 0
                    ? quarries.map((q) => ({
                        value: String(q.id),
                        label: `${q.name} (${q.district || 'Prakasam'})`,
                      }))
                    : [
                        { value: '1', label: 'Chimakurthy Galaxy Pit #1 (Prakasam)' },
                        { value: '2', label: 'Ballikurava Steel Grey Quarry #2 (Bapatla)' },
                      ]
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                Block Type
              </label>
              <Select
                value={newBlock.block_type}
                onChange={(e) => setNewBlock({ ...newBlock, block_type: e.target.value as BlockType })}
                options={[
                  { value: 'RAW', label: 'RAW (Quarry extracted bench)' },
                  { value: 'PROCESSED', label: 'PROCESSED (Dressed / Sawn)' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                Granite Variety / Color Group
              </label>
              <Select
                value={newBlock.color_group}
                onChange={(e) => setNewBlock({ ...newBlock, color_group: e.target.value })}
                options={[
                  { value: 'Black Galaxy', label: 'Black Galaxy (Premium Star)' },
                  { value: 'Tan Brown', label: 'Tan Brown' },
                  { value: 'Steel Grey', label: 'Steel Grey' },
                  { value: 'Kashmir White', label: 'Kashmir White' },
                  { value: 'Viscount White', label: 'Viscount White' },
                  { value: 'Black Pearl', label: 'Black Pearl' },
                  { value: 'Colonial White', label: 'Colonial White' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                Extraction Bench Notes
              </label>
              <Input
                placeholder="Bench tier, extraction method, initial quality"
                value={newBlock.observations}
                onChange={(e) => setNewBlock({ ...newBlock, observations: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                GPS Latitude
              </label>
              <Input
                type="number"
                step="0.000001"
                value={newBlock.gps_latitude}
                onChange={(e) => setNewBlock({ ...newBlock, gps_latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
                GPS Longitude
              </label>
              <Input
                type="number"
                step="0.000001"
                value={newBlock.gps_longitude}
                onChange={(e) => setNewBlock({ ...newBlock, gps_longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-granite-100 dark:border-granite-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
            >
              Register & Open Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive Granite Block"
        description={`Archive block "${archiveTarget?.identifier || archiveTarget?.block_number}". Archived blocks are hidden from the active dispatch registry but remain preserved in audit history.`}
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
              placeholder="e.g. Export fulfilled, inspection closed, bench cleared"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="outline" size="sm" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleArchiveBlock}
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
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
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
              <span>Block: {deleteTarget?.identifier || deleteTarget?.block_number || deleteTarget?.id}</span>
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
                    if (!deleteTarget) return;
                    try {
                      setIsDeleting(true);
                      await api.archiveBlock(String(deleteTarget.id), 'Archived instead of deletion due to statutory records');
                      setDeleteTarget(null);
                      setDeleteError(null);
                      await fetchBlocks();
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
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteBlock}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Block
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={bulkActionModal === 'delete'}
        onClose={() => setBulkActionModal(null)}
        title={`Delete ${selectedBlockIds.length} Selected Granite Blocks?`}
        description="Soft-deletion removes the selected blocks from the active registry while preserving audit history. Blocks with active transit passes will be safely skipped."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>{selectedBlockIds.length} blocks targeted for deletion</span>
            </div>
            <p>This action is logged under government audit ledger compliance.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
              Reason for Bulk Deletion
            </label>
            <Input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="e.g. Bulk clearance of invalid test records"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="outline" size="sm" onClick={() => setBulkActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkDelete}
              isLoading={isBulkProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete {selectedBlockIds.length} Blocks
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Archive Modal */}
      <Modal
        isOpen={bulkActionModal === 'archive'}
        onClose={() => setBulkActionModal(null)}
        title={`Archive ${selectedBlockIds.length} Selected Granite Blocks?`}
        description="Archiving moves the blocks to the archived registry tab where they can be reviewed or restored at any time."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span>{selectedBlockIds.length} blocks targeted for archive</span>
            </div>
            <p>Archived blocks will no longer appear in the active registry view.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-granite-700 dark:text-granite-300 mb-1">
              Reason for Bulk Archive
            </label>
            <Input
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
              placeholder="e.g. Concession batch closed"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="outline" size="sm" onClick={() => setBulkActionModal(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkArchive}
              isLoading={isBulkProcessing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Archive {selectedBlockIds.length} Blocks
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
