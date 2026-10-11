'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Plus,
  QrCode,
  CheckCircle2,
  Clock,
  MapPin,
  FileText,
  User,
  Phone,
  Scale,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_DISPATCHES,
  DispatchRecord,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';

export default function DispatchPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>(DEMO_DISPATCHES);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchRecord | null>(DEMO_DISPATCHES[0]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New dispatch form state
  const [targetBlockId, setTargetBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [vehicleNumber, setVehicleNumber] = useState<string>('AP 27 TX 9940');
  const [driverName, setDriverName] = useState<string>('S. Ramakrishna');
  const [driverPhone, setDriverPhone] = useState<string>('+91 94401 88291');
  const [destination, setDestination] = useState<string>('Visakhapatnam Port Trust - Export Berth');
  const [tareWeight, setTareWeight] = useState<string>('24.50');
  const [grossWeight, setGrossWeight] = useState<string>('42.59');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
    });
  }, []);

  const totalCount = dispatches.length;
  const inTransitCount = dispatches.filter((d) => d.status === 'IN_TRANSIT').length;
  const deliveredCount = dispatches.filter((d) => d.status === 'DELIVERED').length;
  const createdCount = dispatches.filter((d) => d.status === 'CREATED').length;

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const selBlock = blocks.find((b) => String(b.id) === String(targetBlockId)) || blocks[0];
    const tare = parseFloat(tareWeight) || 24.5;
    const gross = parseFloat(grossWeight) || 42.59;
    const net = +(gross - tare).toFixed(2);
    const randId = `disp-${Date.now().toString().slice(-4)}`;
    const permitNo = `AP-MIN-2026-TR-${Math.floor(1000 + Math.random() * 9000)}`;
    const blockNum = selBlock ? (selBlock.block_number || selBlock.identifier || `BLK-${selBlock.id}`) : 'BLK-DEMO';
    const blockIdStr = selBlock ? String(selBlock.id) : 'blk-demo';

    const newRecord: DispatchRecord = {
      id: randId,
      block_id: blockIdStr,
      block_number: blockNum,
      permit_number: permitNo,
      qr_code_ref: `GM-AP-DISP-${permitNo.slice(-4)}-${blockNum.slice(-4)}-V${net}`,
      vehicle_number: vehicleNumber,
      driver_name: driverName,
      driver_phone: driverPhone,
      origin_quarry: 'Chimakurthy Galaxy Leases #1 (Prakasam Dist)',
      destination: destination,
      dispatch_datetime: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'IN_TRANSIT',
      gross_weight_mt: gross,
      tare_weight_mt: tare,
      net_weight_mt: net,
      assessment_ref: `asmt-${blockIdStr}`,
      approval_ref: `AP-MIN-APP-2026-${Math.floor(100 + Math.random() * 900)}`,
      notes: dispatchNotes || 'e-Permit issued upon complete weighment verification.',
    };

    setDispatches([newRecord, ...dispatches]);
    setSelectedDispatch(newRecord);
    setIsCreateModalOpen(false);
  };

  const handleUpdateStatus = (dispId: string, newStatus: DispatchRecord['status']) => {
    const updated = dispatches.map((d) => (d.id === dispId ? { ...d, status: newStatus } : d));
    setDispatches(updated);
    if (selectedDispatch?.id === dispId) {
      setSelectedDispatch({ ...selectedDispatch, status: newStatus });
    }
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* Top Header & New Dispatch Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Truck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'రవాణా & ట్రాన్సిట్ పర్మిట్ క్లియరెన్స్' : 'Dispatch & Transport Transit'}
            </h1>
            <Badge variant="success">e-Transit Permit Portal</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'డిజిటల్ రవాణా పర్మిట్ జారీ, ఆర్ఎఫ్ఐడి వాహన ట్రాకింగ్ మరియు బరువు తనిఖీ ఆడిట్.'
              : 'Digital transit e-Permit clearance, RFID vehicle dispatch verification, and tamper-evident QR manifests.'}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {language === 'te' ? 'కొత్త రవాణా పర్మిట్' : 'Create Transit Dispatch'}
        </Button>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-granite-400 block">Total Dispatches</span>
              <span className="text-2xl font-black text-granite-900 dark:text-white font-mono mt-1 block">
                {totalCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-granite-100 dark:bg-granite-800 text-granite-500">
              <Truck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-cyan-500 block">In Transit</span>
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-1 block">
                {inTransitCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-500">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-500 block">Delivered / Cleared</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                {deliveredCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-amber-500 block">Pending Clearance</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
                {createdCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Split: Dispatches List (Left) & Active Dispatch Dossier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left: Dispatch Records List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2 border-b border-granite-100 dark:border-granite-800">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>{language === 'te' ? 'రవాణా రికార్డులు' : 'Transit Records Registry'}</span>
                <Badge variant="default">{dispatches.length} Records</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-[600px]">
              {dispatches.map((record) => {
                const isSelected = selectedDispatch?.id === record.id;
                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedDispatch(record)}
                    className={cn(
                      'p-3 rounded-xl border transition-all cursor-pointer space-y-2',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900/60 hover:border-granite-400'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-granite-900 dark:text-white">
                        {record.permit_number}
                      </span>
                      <Badge
                        variant={
                          record.status === 'DELIVERED'
                            ? 'success'
                            : record.status === 'IN_TRANSIT'
                            ? 'processing'
                            : 'warning'
                        }
                        dot
                      >
                        {record.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-granite-500 dark:text-granite-400">
                      <span>Block: {record.block_number}</span>
                      <span className="font-mono text-emerald-500 font-semibold">
                        {record.net_weight_mt} MT
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-granite-400">
                      <span>Vehicle: {record.vehicle_number}</span>
                      <span>{record.dispatch_datetime}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right: Active Dispatch Dossier Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedDispatch ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="p-5 pb-3 border-b border-granite-100 dark:border-granite-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-granite-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span>Transit e-Permit Dossier: {selectedDispatch.permit_number}</span>
                    </CardTitle>
                    <p className="text-xs text-granite-400 mt-0.5">
                      Government of Andhra Pradesh • Department of Mines & Geology
                    </p>
                  </div>
                  <Badge
                    variant={
                      selectedDispatch.status === 'DELIVERED'
                        ? 'success'
                        : selectedDispatch.status === 'IN_TRANSIT'
                        ? 'processing'
                        : 'warning'
                    }
                    dot
                  >
                    {selectedDispatch.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 flex-1 space-y-5">
                {/* Status Progression Workflow Steps */}
                <div className="p-3.5 rounded-xl bg-granite-50 dark:bg-granite-900/60 border border-granite-200 dark:border-granite-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          selectedDispatch.status === 'CREATED' ||
                            selectedDispatch.status === 'IN_TRANSIT' ||
                            selectedDispatch.status === 'DELIVERED'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-granite-400'
                        )}
                      >
                        ✓
                      </span>
                      <span className="text-xs font-semibold">Permit Issued</span>
                    </div>

                    <div className="h-0.5 w-12 bg-granite-300 dark:bg-granite-700" />

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          selectedDispatch.status === 'IN_TRANSIT' ||
                            selectedDispatch.status === 'DELIVERED'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-granite-700 text-granite-300'
                        )}
                      >
                        {selectedDispatch.status === 'IN_TRANSIT' ? '⟳' : '✓'}
                      </span>
                      <span className="text-xs font-semibold">In Transit</span>
                    </div>

                    <div className="h-0.5 w-12 bg-granite-300 dark:bg-granite-700" />

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                          selectedDispatch.status === 'DELIVERED'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-granite-300 dark:bg-granite-800 text-granite-500'
                        )}
                      >
                        3
                      </span>
                      <span className="text-xs font-semibold">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Key Manifest Details & QR Code Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* QR Code Manifest Card */}
                  <div className="p-4 rounded-xl bg-white dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60 flex flex-col items-center justify-center text-center">
                    <div className="p-2.5 rounded-lg bg-granite-100 dark:bg-granite-900 border border-granite-200 dark:border-granite-800 mb-2">
                      <QrCode className="w-20 h-20 text-granite-900 dark:text-white" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-500 block break-all">
                      {selectedDispatch.qr_code_ref}
                    </span>
                    <span className="text-[10px] text-granite-400 mt-1 block">
                      Tamper-evident verification token
                    </span>
                  </div>

                  {/* Vehicle & Driver Info */}
                  <div className="md:col-span-2 p-4 rounded-xl bg-white dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-granite-400 block">
                          Vehicle Registration No.
                        </span>
                        <span className="text-sm font-bold text-granite-900 dark:text-white font-mono mt-0.5 block">
                          {selectedDispatch.vehicle_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-granite-400 block">
                          Transit Date & Time
                        </span>
                        <span className="text-xs font-semibold text-granite-800 dark:text-granite-200 mt-0.5 block">
                          {selectedDispatch.dispatch_datetime}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-granite-100 dark:border-granite-800 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-granite-400 block">
                          Driver Name
                        </span>
                        <span className="text-xs font-semibold text-granite-800 dark:text-granite-200 mt-0.5 block flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-granite-400" />
                          {selectedDispatch.driver_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-granite-400 block">
                          Contact Number
                        </span>
                        <span className="text-xs font-semibold text-granite-800 dark:text-granite-200 mt-0.5 block flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-granite-400" />
                          {selectedDispatch.driver_phone}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weighbridge Audit Triple Strip */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-granite-100 dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60">
                    <span className="text-[10px] uppercase font-bold text-granite-500 block">Gross Weight</span>
                    <span className="text-base font-bold text-granite-900 dark:text-white font-mono mt-1 block">
                      {selectedDispatch.gross_weight_mt} MT
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-granite-100 dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60">
                    <span className="text-[10px] uppercase font-bold text-granite-500 block">Tare Weight</span>
                    <span className="text-base font-bold text-granite-900 dark:text-white font-mono mt-1 block">
                      {selectedDispatch.tare_weight_mt} MT
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                      Net Granite Weight
                    </span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
                      {selectedDispatch.net_weight_mt} MT
                    </span>
                  </div>
                </div>

                {/* Origin & Destination Trace */}
                <div className="p-3.5 rounded-xl bg-granite-50 dark:bg-granite-900/60 border border-granite-200 dark:border-granite-800 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-granite-400 block">Origin Quarry:</span>
                      <span className="font-semibold text-granite-800 dark:text-granite-200">
                        {selectedDispatch.origin_quarry}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-granite-400 block">Destination Terminal:</span>
                      <span className="font-semibold text-granite-800 dark:text-granite-200">
                        {selectedDispatch.destination}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle Buttons */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-granite-400 italic">
                    Audit Ref: {selectedDispatch.approval_ref}
                  </span>

                  <div className="flex items-center gap-2">
                    {selectedDispatch.status === 'IN_TRANSIT' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedDispatch.id, 'DELIVERED')}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Confirm Delivery at Destination
                      </Button>
                    )}

                    {selectedDispatch.status === 'CREATED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(selectedDispatch.id, 'IN_TRANSIT')}
                        leftIcon={<Truck className="w-4 h-4" />}
                      >
                        Dispatch Vehicle from Quarry
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-granite-400">
              Select a dispatch record to inspect details
            </div>
          )}
        </div>
      </div>

      {/* New Dispatch Form Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue New Transit e-Permit & Dispatch"
        description="Verify weighbridge scale reading and authorized carrier vehicle details."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-granite-600 dark:text-granite-400 mb-1.5">
              Select Approved Granite Block
            </label>
            <select
              value={targetBlockId}
              onChange={(e) => setTargetBlockId(e.target.value)}
              className="w-full rounded-lg border border-granite-300 dark:border-granite-700 bg-white dark:bg-granite-850 px-3.5 py-2 text-sm text-granite-900 dark:text-granite-100"
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.block_number || b.identifier || `Block #${b.id}`} ({b.granite_category || b.color_group || 'Granite'}) - {b.weight_tons ?? '0'} MT
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Vehicle Registration Number"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
            />
            <Input
              label="Destination Processing Unit / Port"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Driver Name"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
            />
            <Input
              label="Driver Phone Number"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tare Weight of Vehicle (MT)"
              type="number"
              step="0.01"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              required
            />
            <Input
              label="Gross Weighbridge Weight (MT)"
              type="number"
              step="0.01"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-granite-600 dark:text-granite-400">
              Clearance Officer Notes
            </label>
            <textarea
              rows={2}
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              placeholder="Enter RFID tag number, toll checkpost transit route, etc."
              className="w-full rounded-lg border border-granite-300 dark:border-granite-700 bg-white dark:bg-granite-850 px-3.5 py-2 text-sm text-granite-900 dark:text-granite-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-granite-100 dark:border-granite-800">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Send className="w-4 h-4" />}>
              Issue e-Permit & Clear Transit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
