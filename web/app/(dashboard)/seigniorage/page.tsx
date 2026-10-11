'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  IndianRupee,
  Tag,
  CheckCircle2,
  FileText,
  Shield,
  Layers,
  HelpCircle,
  AlertTriangle,
  Settings2,
  Calculator,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/localization';
import { useRole } from '@/lib/roles';
import { GraniteBlock, SeigniorageRate } from '@/lib/api';
import {
  fetchBlocksWithFallback,
  DEMO_BLOCKS,
  DEMO_SEIGNIORAGE_RATES,
  DEMO_SEIGNIORAGE_ASSESSMENTS,
  SeigniorageAssessment,
} from '@/lib/data-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SeignioragePage() {
  const { t, language } = useTranslation();
  const { role, isAdmin } = useRole();
  const [blocks, setBlocks] = useState<GraniteBlock[]>(DEMO_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>(DEMO_BLOCKS[0].id);
  const [rates, setRates] = useState<SeigniorageRate[]>(DEMO_SEIGNIORAGE_RATES);
  const [assessments, setAssessments] = useState<Record<string, SeigniorageAssessment>>(
    DEMO_SEIGNIORAGE_ASSESSMENTS
  );
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Density config
  const [density, setDensity] = useState<number>(2.70);

  useEffect(() => {
    fetchBlocksWithFallback().then((data) => {
      setBlocks(data);
      if (data.length > 0 && !selectedBlockId) {
        setSelectedBlockId(data[0].id);
      }
    });
  }, []);

  const currentBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || DEMO_BLOCKS[0];
  const blockCategory = currentBlock.granite_category || currentBlock.color_group || 'Black Galaxy';
  const blockNum = currentBlock.block_number || currentBlock.identifier || `BLK-${currentBlock.id}`;

  const lCm = currentBlock.length_m ? Math.round(currentBlock.length_m * 100) : 285;
  const bCm = currentBlock.breadth_m ? Math.round(currentBlock.breadth_m * 100) : 162;
  const volM3 = currentBlock.volume_m3 || 6.70;
  const massMT = +(volM3 * density).toFixed(2);

  // Gangsaw determination rule
  const isLengthQual = lCm >= 270;
  const isBreadthQual = bCm >= 150;
  const isAboveGangsaw = isLengthQual && isBreadthQual;

  // Rate lookup
  const matchedRate =
    rates.find((r) => {
      const cat = (r.category || r.color_group || '').toLowerCase();
      const bCat = blockCategory.toLowerCase();
      if (bCat.includes('galaxy')) return cat.includes('galaxy');
      if (bCat.includes('blue')) return cat.includes('blue');
      return cat.includes('black');
    }) || rates[0];

  const applicableRate = isAboveGangsaw
    ? (matchedRate.rate_above_gangsaw ?? matchedRate.above_gangsaw_rate ?? 3500)
    : (matchedRate.rate_below_gangsaw ?? matchedRate.below_gangsaw_rate ?? 2200);

  const baseRoyalty = Math.round(massMT * applicableRate);
  const dmfCess = Math.round(baseRoyalty * 0.30); // 30% District Mineral Foundation
  const meritCess = Math.round(baseRoyalty * 0.02); // 2% MERIT
  const totalPayable = baseRoyalty + dmfCess + meritCess;

  const activeAssessment: SeigniorageAssessment =
    assessments[currentBlock.id] || {
      id: `asmt-${currentBlock.id}`,
      block_id: currentBlock.id,
      category: blockCategory,
      gangsaw_class: isAboveGangsaw ? 'ABOVE_GANGSAW' : 'BELOW_GANGSAW',
      threshold_criteria: `Length (${lCm}cm ${isLengthQual ? '≥' : '<'} 270cm) & Breadth (${bCm}cm ${isBreadthQual ? '≥' : '<'} 150cm)`,
      length_cm: lCm,
      breadth_cm: bCm,
      volume_m3: volM3,
      density_mt_per_m3: density,
      estimated_mass_mt: massMT,
      weighbridge_mass_mt: currentBlock.weight_tons || massMT,
      applicable_rate_per_mt: applicableRate,
      assessment_amount_inr: baseRoyalty,
      cess_amount_inr: dmfCess + meritCess,
      total_payable_inr: totalPayable,
      status: currentBlock.status === 'APPROVED' ? 'APPROVED' : 'SUBMITTED',
      rate_schedule_version: 'G.O.Ms.No. 42 Ind & Comm (Mines-II) Dept',
      created_at: '2026-10-10T10:00:00Z',
    };

  const handleUpdateStatus = (newStatus: 'APPROVED' | 'REJECTED') => {
    setAssessments((prev) => ({
      ...prev,
      [currentBlock.id]: {
        ...activeAssessment,
        status: newStatus,
        approved_by: isAdmin ? 'Joint Director of Mines & Geology' : 'Mining Officer',
        approved_at: new Date().toISOString(),
      },
    }));

    setActionSuccessMsg(`Assessment has been officially marked as ${newStatus}.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-granite-200 dark:border-granite-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white">
              {language === 'te' ? 'సీనరేజ్ రుసుము అంచనా & ఆడిట్' : 'Seigniorage Fee Assessment'}
            </h1>
            <Badge variant="success">Statutory APMMCR 1966</Badge>
          </div>
          <p className="text-sm text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'ఆంధ్రప్రదేశ్ మైనర్ ఖనిజ రాయల్టీ నియమాలు, గ్యాంగ్‌సా థ్రెషోల్డ్ వర్గీకరణ మరియు e-చలాన్ గణన.'
              : 'Statutory government royalty calculations, gangsaw threshold rule evaluation, and e-Challan certification.'}
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

      {/* Admin Action Notice Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-semibold animate-in fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {actionSuccessMsg}
          </span>
          <button onClick={() => setActionSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-400 flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          <strong>Statutory Notice:</strong> Indicative assessment computed using configured demonstration rates and standard photogrammetric geometry. Final payment receipt generated via AP Mineral e-Permit portal.
        </span>
      </div>

      {/* Main Assessment Card */}
      <Card>
        <CardHeader className="p-5 pb-3 border-b border-granite-100 dark:border-granite-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-granite-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-500" />
                <span>{language === 'te' ? 'సీనరేజ్ గణన విశ్లేషణ' : 'Seigniorage Assessment Dossier'}</span>
              </CardTitle>
              <p className="text-xs text-granite-400 mt-0.5">
                Target Block: {blockNum} • Mineral: {blockCategory}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  activeAssessment.status === 'APPROVED'
                    ? 'success'
                    : activeAssessment.status === 'REJECTED'
                    ? 'error'
                    : 'warning'
                }
                dot
              >
                Status: {activeAssessment.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Gangsaw Threshold Rule Engine Box */}
          <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-900/60 border border-granite-200 dark:border-granite-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-granite-500">
                Gangsaw Threshold Determination Rule
              </span>
              <Badge variant={isAboveGangsaw ? 'success' : 'default'} className="font-semibold">
                {isAboveGangsaw ? 'Above Gangsaw Size' : 'Below Gangsaw Size'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60 flex items-center justify-between">
                <span>
                  Length Condition: <strong>L ≥ 270 cm</strong>
                </span>
                <span className="flex items-center gap-1 font-mono font-bold">
                  {lCm} cm {isLengthQual ? '≥ 270 cm' : '< 270 cm'}
                  {isLengthQual ? (
                    <Check className="w-4 h-4 text-emerald-500 ml-1" />
                  ) : (
                    <X className="w-4 h-4 text-rose-500 ml-1" />
                  )}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60 flex items-center justify-between">
                <span>
                  Breadth Condition: <strong>B ≥ 150 cm</strong>
                </span>
                <span className="flex items-center gap-1 font-mono font-bold">
                  {bCm} cm {isBreadthQual ? '≥ 150 cm' : '< 150 cm'}
                  {isBreadthQual ? (
                    <Check className="w-4 h-4 text-emerald-500 ml-1" />
                  ) : (
                    <X className="w-4 h-4 text-rose-500 ml-1" />
                  )}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-granite-400">
              Rule: Both Length ≥ 270cm AND Breadth ≥ 150cm must be satisfied simultaneously for Above Gangsaw classification.
            </p>
          </div>

          {/* Mathematical Formula Breakdown Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-granite-500 block">
              Step-by-Step Mathematical Calculation
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-granite-100 dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60">
                <span className="text-[10px] font-bold uppercase text-granite-400 block">
                  1. Certified Volume
                </span>
                <span className="text-base font-bold text-granite-900 dark:text-white font-mono mt-1 block">
                  {volM3} m³
                </span>
                <span className="text-[10px] text-emerald-500">From 3D Point Cloud</span>
              </div>

              <div className="p-3.5 rounded-xl bg-granite-100 dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60">
                <span className="text-[10px] font-bold uppercase text-granite-400 block">
                  2. Density & Mass
                </span>
                <span className="text-base font-bold text-granite-900 dark:text-white font-mono mt-1 block">
                  {massMT} MT
                </span>
                <span className="text-[10px] text-granite-400">
                  {volM3} m³ × {density} MT/m³
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-granite-100 dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60">
                <span className="text-[10px] font-bold uppercase text-granite-400 block">
                  3. Applicable Royalty Rate
                </span>
                <span className="text-base font-bold text-granite-900 dark:text-white font-mono mt-1 block">
                  ₹{applicableRate.toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-granite-400">/ MT</span>
                </span>
                <span className="text-[10px] text-cyan-500">
                  {isAboveGangsaw ? 'Above Gangsaw Rate' : 'Below Gangsaw Rate'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                  4. Total Royalty Fee
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 block">
                  ₹{totalPayable.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-granite-500">Incl. 32% DMF & MERIT Cess</span>
              </div>
            </div>
          </div>

          {/* Cess Fee Breakdown Detail */}
          <div className="p-4 rounded-xl bg-granite-50 dark:bg-granite-900/60 border border-granite-200 dark:border-granite-800 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-granite-500">Base Seigniorage Fee (Mass × Rate):</span>
              <span className="font-mono font-bold text-granite-900 dark:text-white">
                ₹{baseRoyalty.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-granite-500">District Mineral Foundation (DMF) Cess (30%):</span>
              <span className="font-mono text-granite-700 dark:text-granite-300">
                ₹{dmfCess.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-granite-500">Mineral Exploration & Remediation (MERIT) Cess (2%):</span>
              <span className="font-mono text-granite-700 dark:text-granite-300">
                ₹{meritCess.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="pt-2 border-t border-granite-200 dark:border-granite-800 flex justify-between font-bold text-sm">
              <span className="text-granite-900 dark:text-white">Net Total Payable Challan Amount:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Admin Workflow & Approval Actions */}
          <div className="p-4 rounded-xl bg-white dark:bg-granite-850 border border-granite-200 dark:border-granite-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-granite-900 dark:text-white block">
                Official Administrative Authorization
              </span>
              <span className="text-xs text-granite-400">
                {isAdmin
                  ? 'As an Administrator, you have full authority to approve or reject this seigniorage assessment.'
                  : 'Mining Officer view. Approvals require Administrator credential.'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={activeAssessment.status === 'REJECTED'}
              >
                Reject Assessment
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleUpdateStatus('APPROVED')}
                disabled={activeAssessment.status === 'APPROVED'}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Approve & Issue Challan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Government Rate Configuration Schedule */}
      <Card>
        <CardHeader className="p-5 pb-3 border-b border-granite-100 dark:border-granite-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-500" />
              <span>{language === 'te' ? 'ప్రభుత్వ రాయల్టీ రేట్ల షెడ్యూల్' : 'Statutory Seigniorage Rates Schedule'}</span>
            </CardTitle>
            <span className="text-xs text-granite-400 font-mono">
              G.O.Ms.No. 42 (Mines-II)
            </span>
          </div>
          <p className="text-xs text-granite-400">
            Official government gazette rates per metric ton based on block classification and dimension thresholds.
          </p>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-granite-50 dark:bg-granite-850/80 border-b border-granite-200 dark:border-granite-800 text-xs font-semibold text-granite-500 uppercase tracking-wider">
                <th className="p-4">Mineral / Granite Variety</th>
                <th className="p-4">Rate Above Gangsaw (₹/MT)</th>
                <th className="p-4">Rate Below Gangsaw (₹/MT)</th>
                <th className="p-4">Thresholds</th>
                <th className="p-4">Effective Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-granite-100 dark:divide-granite-800/60 font-mono text-xs">
              {rates.map((rate) => (
                <tr key={rate.id} className="hover:bg-granite-50/50 dark:hover:bg-granite-850/30">
                  <td className="p-4 font-sans font-semibold text-granite-900 dark:text-white">
                    {rate.category || rate.color_group || 'Granite'}
                  </td>
                  <td className="p-4 text-emerald-500 font-bold">
                    ₹{(rate.rate_above_gangsaw ?? rate.above_gangsaw_rate ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-cyan-400 font-bold">
                    ₹{(rate.rate_below_gangsaw ?? rate.below_gangsaw_rate ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 font-sans text-granite-400">L ≥ 270cm & B ≥ 150cm</td>
                  <td className="p-4 text-granite-400">{rate.effective_from || 'Current'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
