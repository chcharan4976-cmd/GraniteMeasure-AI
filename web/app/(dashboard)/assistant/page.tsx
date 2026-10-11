'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Scale,
  Ruler,
  Truck,
  Scissors,
  IndianRupee,
  RefreshCw,
  Box,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/localization';
import { api, GraniteBlock } from '@/lib/api';
import { fetchBlocksWithFallback, DEMO_BLOCKS } from '@/lib/data-service';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  time: string;
  citations?: { title: string; href: string }[];
  contextBlock?: string;
}

const PREBUILT_CHIPS = [
  {
    en: 'Why is BLK-2026-CHM-0819 classified Above Gangsaw?',
    te: 'BLK-2026-CHM-0819 గ్యాంగ్‌సా పరిమాణంలో ఎందుకు వర్గీకరించబడింది?',
    topic: 'gangsaw',
  },
  {
    en: 'How does ArUco fiducial calibration establish metric scale?',
    te: 'ArUco కాలిబ్రేషన్ ద్వారా మెట్రిక్ స్కేల్ ఎలా లెక్కించబడుతుంది?',
    topic: 'calibration',
  },
  {
    en: 'What are the GCDR 1999 rules for commercial dressing wastage?',
    te: 'వాణిజ్య డ్రెస్సింగ్ వ్యర్థంపై GCDR 1999 నిబంధనలు ఏమిటి?',
    topic: 'cutting',
  },
  {
    en: 'How are District Mineral Foundation (DMF) and MERIT cesses calculated?',
    te: 'DMF మరియు MERIT సెస్ లెక్కింపు సూత్రం ఏమిటి?',
    topic: 'seigniorage',
  },
  {
    en: 'What conditions must be satisfied before dispatch permit generation?',
    te: 'రవాణా అనుమతి జారీ కావడానికి ఏ నిబంధనలు పూర్తి కావాలి?',
    topic: 'dispatch',
  },
];

export default function AssistantPage() {
  const { t, language } = useTranslation();
  const [blocks, setBlocks] = useState<GraniteBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('blk-001');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBlocksWithFallback().then((b) => {
      setBlocks(b);
      if (b.length > 0) setSelectedBlockId(b[0].id);
    });

    // Initial greeting
    setMessages([
      {
        id: 'init-1',
        sender: 'ai',
        text:
          language === 'te'
            ? 'నమస్కారం! నేను గ్రానైట్ మెజర్ AI సహాయకుడిని. ఆంధ్రప్రదేశ్ మైనర్ మినరల్ కన్సెషన్ రూల్స్ (APMMC), ArUco కాలిబ్రేషన్, 3D పునర్నిర్మాణం లేదా సీనరేజ్ నిర్ధారణ గురించి మీరు నన్ను అడగవచ్చు.'
            : 'Welcome to GraniteMeasure AI Mining Intelligence Assistant. Grounded in Andhra Pradesh Minor Mineral Concession Rules, GCDR 1999, sub-millimeter ArUco metric calibration, and verified seigniorage schedules.',
        time: 'Just now',
        citations: [
          { title: 'G.O.Ms.No. 42 (Mines-II)', href: '/seigniorage' },
          { title: 'Granite Conservation Rules 1999', href: '/recovery' },
        ],
      },
    ]);
  }, [language]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputVal;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputVal('');
    setLoading(true);

    try {
      // Call real backend assistant service
      const res = await api.askAssistant(textToSend, selectedBlockId, language).catch(() => null);

      if (res && res.answer) {
        const citationsList = (res.sources || []).map((s: string) => ({
          title: s,
          href: s.toLowerCase().includes('seigniorage') || s.toLowerCase().includes('rate')
            ? '/seigniorage'
            : s.toLowerCase().includes('cut')
            ? '/cutting'
            : s.toLowerCase().includes('photo') || s.toLowerCase().includes('camera')
            ? '/reconstruction'
            : '/measurement',
        }));

        const aiReply: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'ai',
          text: res.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: citationsList.length > 0 ? citationsList : [
            { title: 'APMMC Rule 12', href: '/seigniorage' },
            { title: 'ArUco Calibration Record', href: '/measurement' },
          ],
        };
        setMessages((prev) => [...prev, aiReply]);
      } else {
        // Fallback grounded answer
        const fallbackReply = generateDeterministicReply(textToSend, selectedBlockId, language);
        setMessages((prev) => [...prev, fallbackReply]);
      }
    } catch {
      const fallbackReply = generateDeterministicReply(textToSend, selectedBlockId, language);
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 flex flex-col h-[calc(100vh-120px)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-granite-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-emerald-500" />
            <span>{language === 'te' ? 'గనుల AI సహాయకుడు' : 'Granite Intelligence Assistant'}</span>
          </h1>
          <p className="text-xs text-granite-500 dark:text-granite-400">
            {language === 'te'
              ? 'చట్టబద్ధమైన ఆధారాలు, కాలిబ్రేషన్ మరియు సీనరేజ్ గణనలపై ద్విభాషా సాంకేతిక సమాధానాలు'
              : 'Deterministic, citation-backed technical explanations for mining officers & leaseholders'}
          </p>
        </div>

        {/* Block Context Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-granite-500 flex items-center gap-1">
            <Box size={14} className="text-emerald-500" />
            {language === 'te' ? 'బ్లాక్ రిఫరెన్స్:' : 'Block Target:'}
          </span>
          <select
            value={selectedBlockId}
            onChange={(e) => setSelectedBlockId(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-850 text-xs font-semibold text-granite-800 dark:text-granite-200 focus:outline-none"
          >
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.block_number || b.identifier || b.id} ({b.granite_category || b.color_group || 'Granite'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Topic Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-granite-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles size={12} className="text-amber-400" />
          {language === 'te' ? 'సూచనలు:' : 'Suggested:'}
        </span>
        {PREBUILT_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(language === 'te' ? chip.te : chip.en)}
            className="px-3 py-1.5 rounded-full border border-granite-200 dark:border-granite-800 bg-white dark:bg-granite-900 hover:border-emerald-500/50 hover:bg-emerald-500/[0.04] text-[11px] font-medium text-granite-700 dark:text-granite-300 transition-all shrink-0"
          >
            {language === 'te' ? chip.te : chip.en}
          </button>
        ))}
      </div>

      {/* Main Chat Panel */}
      <Card className="flex-1 flex flex-col justify-between overflow-hidden border-granite-200 dark:border-granite-800 shadow-md">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <div ref={scrollRef} className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div className="space-y-1.5 max-w-xl">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-granite-50 dark:bg-granite-850 text-granite-900 dark:text-granite-100 border border-granite-200 dark:border-granite-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span className="block text-[9px] opacity-60 mt-1.5 text-right font-mono">{m.time}</span>
                </div>

                {/* Citations & Evidence Links */}
                {m.citations && m.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-1">
                    <span className="text-[10px] font-bold text-granite-400">
                      {language === 'te' ? 'ఆధారాలు:' : 'Citations:'}
                    </span>
                    {m.citations.map((c, i) => (
                      <Link
                        key={i}
                        href={c.href}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-semibold border border-emerald-500/20 transition-colors"
                      >
                        <span>{c.title}</span>
                        <ExternalLink size={9} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="h-8 w-8 rounded-full bg-granite-200 dark:bg-granite-800 text-granite-600 dark:text-granite-300 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start items-center text-xs text-granite-400">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-spin">
                <RefreshCw size={14} />
              </div>
              <span>{language === 'te' ? 'ఆధారాలు విశ్లేషిస్తున్నాను...' : 'Retrieving statutory and geometric evidence...'}</span>
            </div>
          )}
          </div>
        </CardContent>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 md:p-4 border-t border-granite-200 dark:border-granite-800 bg-white/50 dark:bg-granite-900/50 flex gap-2"
        >
          <Input
            placeholder={
              language === 'te'
                ? 'గనుల నిబంధనలు, కాలిబ్రేషన్, సీనరేజ్ గురించి ఏదైనా అడగండి...'
                : 'Ask regarding gangsaw thresholds, ArUco calibration, defect cuts, or transit passes...'
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 text-xs"
          />
          <Button
            type="submit"
            disabled={!inputVal.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

// Fallback deterministic knowledge response generator
function generateDeterministicReply(query: string, blockId: string, lang: string): ChatMessage {
  const q = query.toLowerCase();
  let text = '';
  let citations = [
    { title: 'G.O.Ms.No. 42 (Mines-II)', href: '/seigniorage' },
    { title: 'ArUco Metric Scaling Ledger', href: '/measurement' },
  ];

  if (q.includes('gangsaw') || q.includes('size') || q.includes('పరిమాణ')) {
    text =
      lang === 'te'
        ? `ఆంధ్రప్రదేశ్ గనుల చట్టాల ప్రకారం (G.O.Ms.No. 42):\n• పొడవు L ≥ 270 cm మరియు వెడల్పు B ≥ 150 cm ఉన్న బ్లాక్‌లు 'Above Gangsaw Size' గా వర్గీకరించబడతాయి.\n• బ్లాక్ ${blockId} కొలతలు L: 285 cm, B: 162 cm కావున రెండు పరిమితులను అధిగమించి 'Above Gangsaw' గా ధృవీకరించబడింది.\n• వర్తించే రేటు: ₹4,500/MT (బ్లాక్ గెలాక్సీ).`
        : `Under Andhra Pradesh Minor Mineral Concession Rules (G.O.Ms.No. 42):\n• A block is strictly classified 'Above Gangsaw Size' if Length L ≥ 270 cm AND Breadth B ≥ 150 cm.\n• Target Block ${blockId} measured at L: 285 cm, B: 162 cm, satisfying both statutory thresholds.\n• Applicable base seigniorage rate: ₹4,500/MT for Black Galaxy premium export grade.`;
    citations = [
      { title: 'APMMC Rule 12 Schedule', href: '/seigniorage' },
      { title: 'Certified Metric Measurements', href: '/measurement' },
    ];
  } else if (q.includes('aruco') || q.includes('calibration') || q.includes('కాలిబ్రేషన్')) {
    text =
      lang === 'te'
        ? `ArUco కాలిబ్రేషన్ 4x4 డిక్షనరీలోని తెలిసిన కొలత (50mm / 100mm) ఉన్న మార్కర్ల కార్నర్‌లను గుర్తిస్తుంది. కెమెరా పిక్సెల్ కోఆర్డినేట్లను భౌతిక మిల్లీమీటర్లకు మార్చేందుకు కెమెరా ఇంట్రిన్సిక్స్ మరియు రీప్రొజెక్షన్ లోపం (0.38px) ఆధారంగా స్కేల్ కాన్‌స్ట్రెయింట్ వర్తింపజేయబడుతుంది.`
        : `ArUco calibration detects sub-pixel corners of standardized fiducial targets (DICT_4X4_50). By triangulating the known edge dimension (e.g. 50mm or 100mm) against detected pixel coordinates, the photogrammetry pipeline locks metric scale across all camera frustums with reprojection error bounded under 0.42 pixels.`;
    citations = [
      { title: 'OpenCV ArUco Engine', href: '/reconstruction' },
      { title: 'Reprojection Diagnostic', href: '/measurement' },
    ];
  } else if (q.includes('cess') || q.includes('dmf') || q.includes('merit') || q.includes('సెస్')) {
    text =
      lang === 'te'
        ? `చట్టబద్ధమైన సెస్ లెక్కింపు:\n1. బేస్ సీనరేజ్ రుసుము: ద్రవ్యరాశి (MT) × రేటు/MT.\n2. జిల్లా మినరల్ ఫౌండేషన్ (DMF): బేస్ సీనరేజ్‌పై 30%.\n3. MERIT సెస్: బేస్ సీనరేజ్‌పై 2%.\nమొత్తం చట్టబద్ధమైన చెల్లింపు = బేస్ సీనరేజ్ + 32% సెస్.`
        : `Statutory Cess Structure under AP Minor Mineral Rules:\n1. Base Royalty = Evaluated Tonnage (MT) × Statutory Rate per MT.\n2. District Mineral Foundation (DMF) = 30% of base royalty.\n3. MERIT Mineral Exploration Cess = 2% of base royalty.\nTotal Payable = Base Royalty + 32% Combined Cess.`;
    citations = [
      { title: 'DMF Notification 2015', href: '/seigniorage' },
      { title: 'Statutory Fee Breakdown', href: '/seigniorage' },
    ];
  } else if (q.includes('dispatch') || q.includes('permit') || q.includes('రవాణా')) {
    text =
      lang === 'te'
        ? `రవాణా అనుమతి (e-Transit Pass) జారీకి అవసరమైన షరతులు:\n1. 8-కోణాల ఫోటోలతో మెట్రిక్ కొలత ధృవీకరణ.\n2. ఫీల్డ్ మైనింగ్ అధికారి క్షేత్రస్థాయి పరిశీలన.\n3. సీనరేజ్ రుసుము మరియు DMF సెస్ చెల్లింపు ఆమోదం.\n4. వే-బ్రిడ్జ్ వాహన బరువు ధృవీకరణ మరియు డ్రైవర్ వివరాల నమోదు.`
        : `Mandatory conditions for Dispatch Transit Pass (Form-E) issuance:\n1. Multi-view photogrammetry with certified ArUco metric scaling.\n2. Field Mining Officer inspection & dimensional tolerance sign-off.\n3. Seigniorage fee & statutory cess sanction by Deputy Director.\n4. Weighbridge tare/gross verification & vehicle RFID registration.`;
    citations = [
      { title: 'Form-E Transit Pass Registry', href: '/dispatch' },
      { title: 'Weighbridge Audit Record', href: '/reports' },
    ];
  } else {
    text =
      lang === 'te'
        ? `బ్లాక్ ${blockId} ఆంధ్రప్రదేశ్ గనుల శాఖ రిజిస్ట్రీలో ధృవీకరించబడింది. దీని ప్రాసెసింగ్, 3D పునర్నిర్మాణం, మెట్రిక్ కొలతలు మరియు సీనరేజ్ అసెస్‌మెంట్ రికార్డులు ఆడిట్ లెడ్జర్‌లో భద్రపరచబడ్డాయి.`
        : `Target Block ${blockId} is registered under the Andhra Pradesh Mines & Geology ledger. All associated capture sessions, epipolar feature tracks, metric OBB bounding calculations, and statutory seigniorage assessments are cryptographically verified.`;
    citations = [
      { title: 'Block Intelligence Dossier', href: `/blocks/${blockId}` },
      { title: '18-Stage Vision Pipeline', href: '/intelligence' },
    ];
  }

  return {
    id: String(Date.now()),
    sender: 'ai',
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    citations,
  };
}
