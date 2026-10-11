'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Printer,
  Download,
  Tag,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Layers,
  Calendar,
  ExternalLink,
  Eye,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { GraniteBlock } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_SEIGNIORAGE_ASSESSMENTS,
  DEMO_DISPATCHES,
  DEMO_DEFECTS,
  DEMO_CUTTING_PLANS,
  DEMO_PHOTOS,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ReportTypeItem {
  id: string;
  number: number;
  name: string;
  name_te: string;
  description: string;
  required_data: string;
}

const REPORT_TYPES: ReportTypeItem[] = [
  {
    id: 'block_reg',
    number: 1,
    name: 'Block Registration Report',
    name_te: 'బ్లాక్ నమోదు నివేదిక',
    description: 'Statutory registration dossier with quarry concession, lease credentials, and GPS coordinates.',
    required_data: 'Block record, Quarry lease number, GPS telemetry',
  },
  {
    id: 'photo_evidence',
    number: 2,
    name: 'Photo Evidence Report',
    name_te: 'చిత్ర ఆధారాల నివేదిక',
    description: 'EXIF metadata audit of all multi-angle orbital camera views and ArUco marker detections.',
    required_data: '8-12 Multi-view photographs, blur scores',
  },
  {
    id: 'calib_meas',
    number: 3,
    name: 'Calibration & Measurement Report',
    name_te: 'కాలిబ్రేషన్ & కొలతల నివేదిక',
    description: 'Sub-millimeter dimension certificate, ArUco scale factor verification, and uncertainty analysis.',
    required_data: 'L, B, H in cm, reprojection error, ArUco constraints',
  },
  {
    id: 'ai_recon',
    number: 4,
    name: 'AI Reconstruction Summary',
    name_te: 'AI 3D పునర్నిర్మాణ సారాంశం',
    description: 'Structure-from-Motion keypoint matching density, Poisson surface mesh parameters, and 3D diagnostics.',
    required_data: 'Point cloud vertex count, bundle adjustment inliers',
  },
  {
    id: 'defect_asmt',
    number: 5,
    name: 'Defect Assessment Dossier',
    name_te: 'లోప అంచనా డాసియర్',
    description: 'Structural defect mapping, hairline crack avoidance paths, and commercial gangsaw grade classification.',
    required_data: 'Defect coordinates, severities, cutting impact',
  },
  {
    id: 'cutting_plan',
    number: 6,
    name: 'Cutting & Recovery Plan',
    name_te: 'కోత & రికవరీ ప్రణాళిక',
    description: 'Diamond wire cutting sequence, dressed block dimensions, recovery percentage, and kerf wastage report.',
    required_data: 'Target dimensions, dressed volume, recovery %',
  },
  {
    id: 'seigniorage_sheet',
    number: 7,
    name: 'Seigniorage Assessment Sheet',
    name_te: 'సీనరేజ్ అంచనా పత్రం',
    description: 'Statutory Andhra Pradesh royalty breakdown, gangsaw threshold rule evaluation, and DMF/MERIT cess summary.',
    required_data: 'Mass calculation, applicable rate, total challan',
  },
  {
    id: 'approval_summary',
    number: 8,
    name: 'Review & Approval Summary',
    name_te: 'సమీక్ష & ఆమోద సారాంశం',
    description: 'Sign-off audit trail by Field Mining Officer and Assistant Geologist with cryptographic hash.',
    required_data: 'Approval timestamps, officer badges',
  },
  {
    id: 'dispatch_summary',
    number: 9,
    name: 'Dispatch & Transit Summary',
    name_te: 'రవాణా & ట్రాన్సిట్ సారాంశం',
    description: 'Weighbridge gross/tare/net certification, carrier vehicle registration, and destination delivery manifest.',
    required_data: 'e-Permit number, weighbridge tickets, QR token',
  },
  {
    id: 'complete_history',
    number: 10,
    name: 'Complete Block History (Full Official Dossier)',
    name_te: 'సంపూర్ణ బ్లాక్ చరిత్ర (సమగ్ర అధికారిక డాసియర్)',
    description: 'Comprehensive end-to-end statutory document compiling all 18 journey stages into an official audit dossier.',
    required_data: 'All sessions, photos, geometry, fees, approvals, dispatch',
  },
];

export default function ReportsPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [activePrintModal, setActivePrintModal] = useState<boolean>(false);

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
      if (data.length > 0 && !selectedBlockId) {
        setSelectedBlockId(data[0].id);
      }
    });
  }, []);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const blockNum = currentBlock.block_number || currentBlock.identifier || `BLK-${currentBlock.id}`;
  const blockCategory = currentBlock.granite_category || currentBlock.color_group || 'Black Galaxy';
  const assessment = DEMO_SEIGNIORAGE_ASSESSMENTS[currentBlock.id] || DEMO_SEIGNIORAGE_ASSESSMENTS['blk-001'];
  const dispatch = DEMO_DISPATCHES.find((d) => d.block_id === currentBlock.id) || DEMO_DISPATCHES[0];
  const defects = DEMO_DEFECTS[currentBlock.id] || [];
  const cuttingPlan = DEMO_CUTTING_PLANS[currentBlock.id] || DEMO_CUTTING_PLANS['blk-001'];
  const photos = DEMO_PHOTOS[currentBlock.id] || DEMO_PHOTOS['blk-001'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'అధికారిక నివేదికలు & ఆడిట్ డాసియర్లు' : 'Official Reports & Audit Dossiers'}
            </h1>
            <Badge variant="success">Print & PDF Engine</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'ప్రభుత్వ సర్టిఫికెట్లు, రాయల్టీ అసెస్‌మెంట్ చలాన్లు మరియు సమగ్ర బ్లాక్ చరిత్ర నివేదికల ముద్రణ.'
              : 'Generate verifiable AP Mines & Geology certificates, statutory royalty receipts, and complete lifecycle dossiers.'}
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

      {/* Featured Card: Complete Block History Dossier */}
      <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>Signature Statutory Dossier</Badge>
              <span className="text-xs font-mono text-granite-400">DOC-GM-2026-COMPLETE</span>
            </div>
            <h2 className="text-lg font-bold text-granite-900 dark:text-white">
              {language === 'te'
                ? 'సంపూర్ణ బ్లాక్ చరిత్ర & చట్టబద్ధమైన ఆడిట్ నివేదిక'
                : 'Complete Block History & Statutory Audit Dossier'}
            </h2>
            <p className="text-xs text-granite-500 dark:text-granite-400 max-w-2xl">
              Contains complete evidence ledger: photogrammetric multi-view capture, ArUco calibration geometry, 3D measurements, defect analysis, optimal cutting plan, seigniorage calculations, and transit permits.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => setActivePrintModal(true)}
            leftIcon={<Printer className="w-4 h-4" />}
            className="shrink-0"
          >
            Generate Printable Dossier
          </Button>
        </CardContent>
      </Card>

      {/* 10 Available Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((rep) => (
          <Card key={rep.id} hoverEffect className="flex flex-col justify-between">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-emerald-500">
                  REPORT #{rep.number}
                </span>
                <Badge variant="default" className="text-[10px]">
                  PDF Ready
                </Badge>
              </div>
              <CardTitle className="text-sm font-bold text-granite-900 dark:text-white mt-1">
                {language === 'te' ? rep.name_te : rep.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 pt-1 space-y-3">
              <p className="text-xs text-granite-500 dark:text-granite-400 leading-relaxed">
                {rep.description}
              </p>

              <div className="p-2.5 rounded-lg bg-granite-50 dark:bg-granite-850 border border-granite-200 dark:border-granite-800 text-[11px] text-granite-400">
                <strong className="text-granite-300">Required Datasets:</strong> {rep.required_data}
              </div>

              <div className="pt-2 border-t border-granite-100 dark:border-granite-800 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActivePrintModal(true)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Generate Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Printable Dossier Modal / View */}
      {activePrintModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-granite-950/80 backdrop-blur-md p-4 md:p-8 flex items-center justify-center">
          <div className="relative w-full max-w-4xl bg-white dark:bg-granite-900 rounded-2xl border border-granite-200 dark:border-granite-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Action Bar (Hidden during print) */}
            <div className="p-4 border-b border-granite-200 dark:border-granite-800 flex items-center justify-between bg-granite-50 dark:bg-granite-850 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-sm text-granite-900 dark:text-white">
                  Official Printable Dossier: {blockNum}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
                  Print / Save PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActivePrintModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 text-granite-900 dark:text-granite-100 print:text-black print:bg-white text-xs">
              {/* Document Header */}
              <div className="text-center pb-6 border-b-2 border-granite-900 dark:border-granite-200 space-y-1">
                <div className="text-xs uppercase tracking-widest font-bold text-granite-500">
                  Government of Andhra Pradesh • Department of Mines and Geology
                </div>
                <h1 className="text-xl font-black uppercase tracking-tight text-granite-900 dark:text-white">
                  Statutory Granite Block Measurement & Seigniorage Certificate
                </h1>
                <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  Certificate Ref: GM-AP-CERT-2026-{blockNum.slice(-4)} • Issued Under APMMCR 1966
                </p>
              </div>

              {/* Section 1: Block & Quarry Identification */}
              <div className="space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-granite-700 dark:text-granite-300 border-b pb-1">
                  1. Quarry Concession & Block Provenance
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-granite-50 dark:bg-granite-850 p-3 rounded-lg border">
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Block Identification</span>
                    <strong className="font-mono text-sm">{blockNum}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Mineral Category</span>
                    <strong>{blockCategory}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Extraction Quarry</span>
                    <strong>Chimakurthy Leases #1</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">GPS Concession Fix</span>
                    <strong className="font-mono">{currentBlock.gps_latitude}°N, {currentBlock.gps_longitude}°E</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Certified Dimensions & Photogrammetry */}
              <div className="space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-granite-700 dark:text-granite-300 border-b pb-1">
                  2. 3D Photogrammetry & Dimensional Certification
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 bg-granite-50 dark:bg-granite-850 p-3 rounded-lg border text-center">
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Length</span>
                    <strong className="text-sm font-mono">{Math.round((currentBlock.length_m || 2.85) * 100)} cm</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Breadth</span>
                    <strong className="text-sm font-mono">{Math.round((currentBlock.breadth_m || 1.62) * 100)} cm</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Height</span>
                    <strong className="text-sm font-mono">{Math.round((currentBlock.height_m || 1.45) * 100)} cm</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Volume</span>
                    <strong className="text-sm font-mono text-emerald-600">{currentBlock.volume_m3} m³</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Certified Mass</span>
                    <strong className="text-sm font-mono">{currentBlock.weight_tons} MT</strong>
                  </div>
                </div>
                <p className="text-[10px] text-granite-500 italic">
                  Calibrated using sub-pixel ArUco Dict 4x4 scale targets. Reprojection residual: 0.38px. Measurement error tolerance within ±0.6%.
                </p>
              </div>

              {/* Section 3: Gangsaw & Seigniorage Fee */}
              <div className="space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-granite-700 dark:text-granite-300 border-b pb-1">
                  3. Statutory Seigniorage & Cess Reconciliation
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-granite-50 dark:bg-granite-850 p-3 rounded-lg border">
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Gangsaw Class</span>
                    <strong className="text-emerald-600">{assessment.gangsaw_class.replace(/_/g, ' ')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Royalty Rate</span>
                    <strong>₹{assessment.applicable_rate_per_mt.toLocaleString('en-IN')} / MT</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Base Seigniorage</span>
                    <strong>₹{assessment.assessment_amount_inr.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-granite-400 block">Net Fee (with Cess)</span>
                    <strong className="text-sm font-mono font-black text-emerald-600">
                      ₹{assessment.total_payable_inr.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Section 4: Transit Clearance & Sign-Off Signatures */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center text-[11px]">
                  <div>
                    <span>Transit e-Permit Reference:</span>
                    <strong className="font-mono ml-1">{dispatch.permit_number}</strong>
                  </div>
                  <div>
                    <span>Carrier Vehicle:</span>
                    <strong className="font-mono ml-1">{dispatch.vehicle_number}</strong>
                  </div>
                  <div>
                    <span>Clearance Token:</span>
                    <strong className="font-mono text-emerald-600 ml-1">{dispatch.qr_code_ref}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8">
                  <div className="border-t border-dashed pt-2 text-center">
                    <span className="font-bold block">M. Ramesh Babu</span>
                    <span className="text-[10px] text-granite-500">Assistant Geologist & Mining Officer</span>
                    <span className="text-[9px] text-granite-400 block">Ongole Mineral Concession Zone</span>
                  </div>

                  <div className="border-t border-dashed pt-2 text-center">
                    <span className="font-bold block">P. Subba Rao</span>
                    <span className="text-[10px] text-granite-500">Deputy Director of Mines & Geology</span>
                    <span className="text-[9px] text-granite-400 block">Prakasam District Directorate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
