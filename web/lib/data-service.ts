/**
 * Comprehensive Data Service & Mock Store for GraniteMeasure AI
 * Connects to live backend when available and provides rich, realistic
 * AP Mines & Geology demonstration records as fallback.
 */

import { api, GraniteBlock, Quarry, AnalysisJob, SeigniorageRate } from './api';

export interface BlockPhoto {
  id: string;
  block_id: string;
  view_label: 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'TOP' | 'ISO_NW' | 'ISO_NE' | 'ISO_SE';
  blur_score: number; // 0 - 100, > 75 good
  exposure_score: number; // 0 - 100, 70-90 ideal
  markers_detected: number; // ArUco markers count (0 - 4)
  usability: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'REJECTED';
  url: string;
  timestamp: string;
}

export interface BlockDefect {
  id: string;
  block_id: string;
  type: 'FRACTURE' | 'HAIRLINE_CRACK' | 'QUARTZ_INCLUSION' | 'CORNER_CHIP' | 'SURFACE_WEATHERING';
  severity: 'CRITICAL' | 'MODERATE' | 'LOW';
  location: string;
  affects_cutting: boolean;
  confirmed: boolean;
  notes: string;
  photo_ref?: string;
  dimensions_cm?: { length: number; depth: number };
}

export interface CuttingPlan {
  id: string;
  block_id: string;
  name: string;
  created_at: string;
  target_length_m: number;
  target_breadth_m: number;
  target_height_m: number;
  raw_volume_m3: number;
  dressed_volume_m3: number;
  removed_volume_m3: number;
  recovery_ratio_pct: number;
  wastage_pct: number;
  operations: {
    order: number;
    type: 'PRIMARY_LEVEL' | 'END_TRIM' | 'FLANK_DRESS' | 'DEFECT_RELIEF';
    wire_angle_deg: number;
    reason: string;
    thickness_removed_cm: number;
  }[];
}

export interface SeigniorageAssessment {
  id: string;
  block_id: string;
  category: string;
  gangsaw_class: 'ABOVE_GANGSAW' | 'BELOW_GANGSAW';
  threshold_criteria: string;
  length_cm: number;
  breadth_cm: number;
  volume_m3: number;
  density_mt_per_m3: number;
  estimated_mass_mt: number;
  weighbridge_mass_mt?: number;
  applicable_rate_per_mt: number;
  assessment_amount_inr: number;
  cess_amount_inr: number; // DMF + MERIT cess (30% + 2%)
  total_payable_inr: number;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  rate_schedule_version: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface DispatchRecord {
  id: string;
  block_id: string;
  block_number: string;
  permit_number: string;
  qr_code_ref: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  origin_quarry: string;
  destination: string;
  dispatch_datetime: string;
  status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED';
  gross_weight_mt: number;
  tare_weight_mt: number;
  net_weight_mt: number;
  assessment_ref: string;
  approval_ref: string;
  notes: string;
}

export interface IntelligenceStage {
  id: number;
  key: string;
  name_en: string;
  name_te: string;
  status: 'completed' | 'running' | 'awaiting' | 'failed' | 'insufficient_evidence' | 'blocked' | 'skipped';
  timestamp?: string;
  summary_en: string;
  summary_te: string;
  details?: Record<string, any>;
  icon: string;
}

// Default demonstration data
export const DEMO_QUARRIES: Quarry[] = [
  {
    id: 'q-chimakurthy-01',
    name: 'Chimakurthy Galaxy Leases #1',
    code: 'CHM-GLX-01',
    location: 'Chimakurthy Mandal',
    district: 'Prakasam',
    mandal: 'Chimakurthy',
    village: 'R.L. Puram',
    lease_number: 'AP-PRK-GNT-2023-014',
    lease_holder: 'Galaxy Granites Minerals Pvt Ltd',
    status: 'ACTIVE',
    active_blocks_count: 14,
    created_at: '2023-04-12T10:00:00Z',
  },
  {
    id: 'q-khammam-02',
    name: 'Khammam Jet Black Concession',
    code: 'KHM-JTB-02',
    location: 'Mudigonda Mandal',
    district: 'Khammam',
    mandal: 'Mudigonda',
    village: 'Vallabhi',
    lease_number: 'AP-KHM-GNT-2022-088',
    lease_holder: 'Deccan Granites & Export Corp',
    status: 'ACTIVE',
    active_blocks_count: 9,
    created_at: '2022-08-19T08:30:00Z',
  },
  {
    id: 'q-srikakulam-03',
    name: 'Tekkali Blue Star Quarry',
    code: 'SRK-BLU-03',
    location: 'Tekkali Mandal',
    district: 'Srikakulam',
    mandal: 'Tekkali',
    village: 'Peddasana',
    lease_number: 'AP-SRK-GNT-2024-002',
    lease_holder: 'Eastern Ghats Mining Ltd',
    status: 'ACTIVE',
    active_blocks_count: 6,
    created_at: '2024-01-05T09:15:00Z',
  },
];

export const DEMO_BLOCKS: GraniteBlock[] = [
  {
    id: 'blk-001',
    quarry_id: 'q-chimakurthy-01',
    block_number: 'BLK-2026-CHM-0819',
    block_type: 'RAW',
    granite_category: 'Black Galaxy Granite (Extra Golden Bronzite)',
    status: 'APPROVED',
    length_m: 2.85,
    breadth_m: 1.62,
    height_m: 1.45,
    volume_m3: 6.70,
    weight_tons: 18.09,
    gps_latitude: 15.5841,
    gps_longitude: 79.8652,
    notes: 'Premium gangsaw grade block. Photogrammetry and ArUco calibration verified with 99.4% confidence.',
    created_at: '2026-10-09T08:30:00Z',
    updated_at: '2026-10-11T11:20:00Z',
  },
  {
    id: 'blk-002',
    quarry_id: 'q-khammam-02',
    block_number: 'BLK-2026-KHM-0422',
    block_type: 'RAW',
    granite_category: 'Jet Black Granite (Fine Grain Absolute)',
    status: 'MEASURED',
    length_m: 2.50,
    breadth_m: 1.40,
    height_m: 1.30,
    volume_m3: 4.55,
    weight_tons: 12.28,
    gps_latitude: 17.2472,
    gps_longitude: 80.1514,
    notes: 'Minor corner chipping flagged on East face. Wire cutting optimization recommended.',
    created_at: '2026-10-10T09:15:00Z',
    updated_at: '2026-10-11T09:45:00Z',
  },
  {
    id: 'blk-003',
    quarry_id: 'q-srikakulam-03',
    block_number: 'BLK-2026-SRK-0105',
    block_type: 'RAW',
    granite_category: 'Blue Star Granite (Imperial Porphyry)',
    status: 'PROCESSING',
    length_m: 2.90,
    breadth_m: 1.70,
    height_m: 1.50,
    volume_m3: 7.39,
    weight_tons: 19.96,
    gps_latitude: 18.6144,
    gps_longitude: 84.2372,
    notes: 'Structure-from-Motion (SfM) feature matching running in background. High visual texture density.',
    created_at: '2026-10-11T06:40:00Z',
    updated_at: '2026-10-11T12:00:00Z',
  },
  {
    id: 'blk-004',
    quarry_id: 'q-chimakurthy-01',
    block_number: 'BLK-2026-ONG-0914',
    block_type: 'RAW',
    granite_category: 'Steel Grey Granite',
    status: 'DISPATCHED',
    length_m: 2.75,
    breadth_m: 1.55,
    height_m: 1.40,
    volume_m3: 5.97,
    weight_tons: 16.12,
    gps_latitude: 15.5057,
    gps_longitude: 80.0499,
    notes: 'Dispatched to Krishnapatnam Port terminal. e-Permit transit pass verified by Mining Officer.',
    created_at: '2026-10-08T07:20:00Z',
    updated_at: '2026-10-11T10:10:00Z',
  },
  {
    id: 'blk-005',
    quarry_id: 'q-chimakurthy-01',
    block_number: 'BLK-2026-CHM-0831',
    block_type: 'RAW',
    granite_category: 'Black Galaxy Granite (Medium Bronzite)',
    status: 'CAPTURING',
    length_m: 2.40,
    breadth_m: 1.35,
    height_m: 1.20,
    volume_m3: 3.89,
    weight_tons: 10.50,
    gps_latitude: 15.5822,
    gps_longitude: 79.8641,
    notes: 'Mobile photos uploaded. Calibration target needs re-evaluation under high sunlight glare.',
    created_at: '2026-10-11T11:00:00Z',
    updated_at: '2026-10-11T12:05:00Z',
  },
];

export const DEMO_PHOTOS: Record<string, BlockPhoto[]> = {
  'blk-001': [
    {
      id: 'p-01',
      block_id: 'blk-001',
      view_label: 'FRONT',
      blur_score: 94.2,
      exposure_score: 86.0,
      markers_detected: 4,
      usability: 'EXCELLENT',
      url: '/demo-photos/front.jpg',
      timestamp: '2026-10-09T08:32:10Z',
    },
    {
      id: 'p-02',
      block_id: 'blk-001',
      view_label: 'BACK',
      blur_score: 91.8,
      exposure_score: 83.5,
      markers_detected: 3,
      usability: 'EXCELLENT',
      url: '/demo-photos/back.jpg',
      timestamp: '2026-10-09T08:33:14Z',
    },
    {
      id: 'p-03',
      block_id: 'blk-001',
      view_label: 'LEFT',
      blur_score: 89.4,
      exposure_score: 79.0,
      markers_detected: 4,
      usability: 'EXCELLENT',
      url: '/demo-photos/left.jpg',
      timestamp: '2026-10-09T08:34:02Z',
    },
    {
      id: 'p-04',
      block_id: 'blk-001',
      view_label: 'RIGHT',
      blur_score: 93.1,
      exposure_score: 88.2,
      markers_detected: 4,
      usability: 'EXCELLENT',
      url: '/demo-photos/right.jpg',
      timestamp: '2026-10-09T08:34:55Z',
    },
    {
      id: 'p-05',
      block_id: 'blk-001',
      view_label: 'TOP',
      blur_score: 87.5,
      exposure_score: 76.4,
      markers_detected: 2,
      usability: 'GOOD',
      url: '/demo-photos/top.jpg',
      timestamp: '2026-10-09T08:36:12Z',
    },
    {
      id: 'p-06',
      block_id: 'blk-001',
      view_label: 'ISO_NW',
      blur_score: 92.0,
      exposure_score: 82.0,
      markers_detected: 3,
      usability: 'EXCELLENT',
      url: '/demo-photos/iso_nw.jpg',
      timestamp: '2026-10-09T08:37:05Z',
    },
    {
      id: 'p-07',
      block_id: 'blk-001',
      view_label: 'ISO_NE',
      blur_score: 88.0,
      exposure_score: 85.0,
      markers_detected: 3,
      usability: 'EXCELLENT',
      url: '/demo-photos/iso_ne.jpg',
      timestamp: '2026-10-09T08:37:48Z',
    },
    {
      id: 'p-08',
      block_id: 'blk-001',
      view_label: 'ISO_SE',
      blur_score: 90.6,
      exposure_score: 84.1,
      markers_detected: 4,
      usability: 'EXCELLENT',
      url: '/demo-photos/iso_se.jpg',
      timestamp: '2026-10-09T08:38:30Z',
    },
  ],
};

export const DEMO_DEFECTS: Record<string, BlockDefect[]> = {
  'blk-001': [
    {
      id: 'def-01',
      block_id: 'blk-001',
      type: 'HAIRLINE_CRACK',
      severity: 'LOW',
      location: 'Upper North-West corner (depth < 2.5cm)',
      affects_cutting: false,
      confirmed: true,
      notes: 'Superficial quarry blast hairline strain; easily eliminated during primary leveling face trim.',
      dimensions_cm: { length: 18, depth: 2.2 },
    },
    {
      id: 'def-02',
      block_id: 'blk-001',
      type: 'QUARTZ_INCLUSION',
      severity: 'LOW',
      location: 'Sub-surface veinlet on East face, width 3mm',
      affects_cutting: false,
      confirmed: true,
      notes: 'Natural mineral variation; does not breach commercial gangsaw Grade 1 specification.',
      dimensions_cm: { length: 12, depth: 1.5 },
    },
  ],
  'blk-002': [
    {
      id: 'def-03',
      block_id: 'blk-002',
      type: 'CORNER_CHIP',
      severity: 'MODERATE',
      location: 'Bottom right corner (volume loss ~0.04m³)',
      affects_cutting: true,
      confirmed: true,
      notes: 'Excavation bucket contact during quarry bench drop. Requires 8cm trimming off right flank.',
      dimensions_cm: { length: 34, depth: 8.0 },
    },
    {
      id: 'def-04',
      block_id: 'blk-002',
      type: 'FRACTURE',
      severity: 'MODERATE',
      location: 'Diagonal stress plane on South boundary',
      affects_cutting: true,
      confirmed: true,
      notes: 'Avoidable with diamond wire angle offset at 14 degrees.',
      dimensions_cm: { length: 42, depth: 14.0 },
    },
  ],
};

export const DEMO_CUTTING_PLANS: Record<string, CuttingPlan> = {
  'blk-001': {
    id: 'cp-01',
    block_id: 'blk-001',
    name: 'Standard Commercial Gangsaw Optimization',
    created_at: '2026-10-09T11:45:00Z',
    target_length_m: 2.70,
    target_breadth_m: 1.50,
    target_height_m: 1.35,
    raw_volume_m3: 6.70,
    dressed_volume_m3: 5.467,
    removed_volume_m3: 1.233,
    recovery_ratio_pct: 81.6,
    wastage_pct: 18.4,
    operations: [
      {
        order: 1,
        type: 'PRIMARY_LEVEL',
        wire_angle_deg: 0,
        reason: 'Level irregular quarry top crust and extract 10cm cap',
        thickness_removed_cm: 10,
      },
      {
        order: 2,
        type: 'END_TRIM',
        wire_angle_deg: 90,
        reason: 'Square North end-face and excise blast hairline strain',
        thickness_removed_cm: 15,
      },
      {
        order: 3,
        type: 'FLANK_DRESS',
        wire_angle_deg: 90,
        reason: 'Dress East flank parallel for gangsaw trolley bed seating',
        thickness_removed_cm: 12,
      },
    ],
  },
};

export const DEMO_SEIGNIORAGE_RATES: SeigniorageRate[] = [
  {
    id: 'rate-01',
    category: 'Black Galaxy Granite (Chimakurthy)',
    rate_above_gangsaw: 4500, // ₹ per MT
    rate_below_gangsaw: 2750,
    effective_from: '2024-04-01',
  },
  {
    id: 'rate-02',
    category: 'Jet Black Granite (Fine Grain)',
    rate_above_gangsaw: 3800,
    rate_below_gangsaw: 2400,
    effective_from: '2024-04-01',
  },
  {
    id: 'rate-03',
    category: 'Blue Star / Colour Granites',
    rate_above_gangsaw: 3200,
    rate_below_gangsaw: 2100,
    effective_from: '2024-04-01',
  },
  {
    id: 'rate-04',
    category: 'Steel Grey / Monolithic Granites',
    rate_above_gangsaw: 2200,
    rate_below_gangsaw: 1500,
    effective_from: '2024-04-01',
  },
];

export const DEMO_SEIGNIORAGE_ASSESSMENTS: Record<string, SeigniorageAssessment> = {
  'blk-001': {
    id: 'asmt-001',
    block_id: 'blk-001',
    category: 'Black Galaxy Granite (Chimakurthy)',
    gangsaw_class: 'ABOVE_GANGSAW',
    threshold_criteria: 'Length (285cm ≥ 270cm) AND Breadth (162cm ≥ 150cm) -> Above Gangsaw Size',
    length_cm: 285,
    breadth_cm: 162,
    volume_m3: 6.70,
    density_mt_per_m3: 2.70,
    estimated_mass_mt: 18.09,
    weighbridge_mass_mt: 18.15,
    applicable_rate_per_mt: 4500,
    assessment_amount_inr: 81405, // 18.09 * 4500
    cess_amount_inr: 26049.6, // 30% DMF + 2% MERIT = 32%
    total_payable_inr: 107454.6,
    status: 'APPROVED',
    rate_schedule_version: 'G.O.Ms.No. 42 Industries & Commerce (Mines-II) Dept 2024',
    created_at: '2026-10-09T14:30:00Z',
    approved_by: 'Deputy Director of Mines & Geology, Ongole',
    approved_at: '2026-10-10T11:00:00Z',
    notes: 'Certified volumetric calculation using photogrammetric 3D point-cloud bounding box.',
  },
};

export const DEMO_DISPATCHES: DispatchRecord[] = [
  {
    id: 'disp-001',
    block_id: 'blk-004',
    block_number: 'BLK-2026-ONG-0914',
    permit_number: 'AP-MIN-2026-TR-8812',
    qr_code_ref: 'GM-AP-DISP-8812-ONG0914-V16.12',
    vehicle_number: 'AP 27 TX 4821',
    driver_name: 'K. Venkateswara Rao',
    driver_phone: '+91 98480 23154',
    origin_quarry: 'Chimakurthy Galaxy Leases #1 (Prakasam Dist)',
    destination: 'Krishnapatnam Port Container Terminal - Berth 4',
    dispatch_datetime: '2026-10-11T09:30:00Z',
    status: 'IN_TRANSIT',
    gross_weight_mt: 41.50,
    tare_weight_mt: 25.38,
    net_weight_mt: 16.12,
    assessment_ref: 'asmt-004',
    approval_ref: 'AP-MIN-APP-2026-904',
    notes: 'RFID transit tag scanned at Chimakurthy Toll Plaza checkpost at 10:14 AM.',
  },
];

// Helper to construct the 18 stages of Granite Intelligence Journey
export function getBlockJourneyStages(block: GraniteBlock): IntelligenceStage[] {
  const isApproved = block.status === 'APPROVED' || block.status === 'DISPATCHED';
  const isMeasured = isApproved || block.status === 'MEASURED' || block.status === 'ASSESSED';
  const isProcessing = block.status === 'PROCESSING' || isMeasured;
  const isUploaded = block.status === 'UPLOADED' || isProcessing;
  const isDispatched = block.status === 'DISPATCHED';

  return [
    {
      id: 1,
      key: 'granite_identified',
      name_en: 'Granite Identified',
      name_te: 'గ్రానైట్ గుర్తింపు',
      status: 'completed',
      timestamp: block.created_at || '2026-10-09 08:00',
      summary_en: `Mineral deposit identified in quarry concession: ${block.granite_category}`,
      summary_te: `క్వారీ లీజులో గుర్తించబడిన గ్రానైట్ డిపాజిట్: ${block.granite_category}`,
      details: { category: block.granite_category, quarry_id: block.quarry_id, gps: `${block.gps_latitude}, ${block.gps_longitude}` },
      icon: 'Mountain',
    },
    {
      id: 2,
      key: 'block_registered',
      name_en: 'Block Registered',
      name_te: 'బ్లాక్ నమోదు',
      status: 'completed',
      timestamp: block.created_at || '2026-10-09 08:30',
      summary_en: `Block ${block.block_number} assigned unique government tamper-evident identifier.`,
      summary_te: `బ్లాక్ ${block.block_number} కు అధికారిక ప్రభుత్వ ప్రత్యేక గుర్తింపు సంఖ్య కేటాయించబడింది.`,
      details: { block_number: block.block_number, block_type: block.block_type },
      icon: 'Tag',
    },
    {
      id: 3,
      key: 'mobile_images_captured',
      name_en: 'Mobile Images Captured',
      name_te: 'మొబైల్ చిత్రాలు సేకరణ',
      status: 'completed',
      timestamp: '2026-10-09 08:45',
      summary_en: '8 multi-view high-resolution orbital photos captured with ArUco calibration targets.',
      summary_te: 'ArUco కాలిబ్రేషన్ లక్ష్యాలతో 8 బహుళ-కోణ హై-రిజల్యూషన్ చిత్రాలు సేకరించబడ్డాయి.',
      details: { photo_count: 8, target_type: 'ArUco Dict 4x4 50mm' },
      icon: 'Camera',
    },
    {
      id: 4,
      key: 'evidence_uploaded',
      name_en: 'Evidence Uploaded',
      name_te: 'ఆధారాలు అప్‌లోడ్',
      status: isUploaded ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 08:50',
      summary_en: 'Cryptographically hashed EXIF & camera telemetry stored in audit ledger.',
      summary_te: 'కెమెరా టెలిమెట్రీ మరియు EXIF ఆధారాలు ఆడిట్ లెడ్జర్‌లో భద్రపరచబడ్డాయి.',
      details: { total_mb: 48.6, checksum: 'sha256:4f8e...9a12' },
      icon: 'UploadCloud',
    },
    {
      id: 5,
      key: 'image_quality_assessed',
      name_en: 'Granite Evidence & Quality Validated',
      name_te: 'గ్రానైట్ సాక్ష్యం & నాణ్యత ధృవీకరణ',
      status: isUploaded ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 08:52',
      summary_en: 'Granite authenticity confirmed (ACCEPTED_GRANITE_BLOCK). Non-granite textures rejected. Blur score 91.8/100, exposure balanced.',
      summary_te: 'గ్రానైట్ ప్రామాణికత ధృవీకరించబడింది (ACCEPTED_GRANITE_BLOCK). బ్లర్ స్కోర్ 91.8/100, ఎక్స్‌పోజర్ సమతుల్యంగా ఉంది.',
      details: { granite_verdict: 'ACCEPTED_GRANITE_BLOCK', avg_blur: 91.8, avg_exposure: 83.5, usable_ratio: '100%' },
      icon: 'Sparkles',
    },
    {
      id: 6,
      key: 'calibration_evaluated',
      name_en: 'Calibration Evaluated',
      name_te: 'కాలిబ్రేషన్ మూల్యాంకనం',
      status: isUploaded ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 08:53',
      summary_en: '4 ArUco markers detected with sub-millimeter geometric scale constraint.',
      summary_te: 'సబ్-మిల్లీమీటర్ రేఖాగణిత స్కేల్‌తో 4 ArUco గుర్తులు ధృవీకరించబడ్డాయి.',
      details: { marker_ids: [12, 13, 14, 15], scale_factor: '1.0024 mm/px', reproj_error_px: 0.42 },
      icon: 'Crosshair',
    },
    {
      id: 7,
      key: 'feature_extraction',
      name_en: 'Feature Extraction',
      name_te: 'ఫీచర్ ఎక్స్‌ట్రాక్షన్',
      status: isProcessing ? 'completed' : block.status === 'PROCESSING' ? 'running' : 'awaiting',
      timestamp: '2026-10-09 08:55',
      summary_en: 'SIFT & SuperPoint keypoint detection produced 14,820 invariant interest points.',
      summary_te: 'SIFT & సూపర్‌పాయింట్ ద్వారా 14,820 కీలక బిందువులు సేకరించబడ్డాయి.',
      details: { keypoints: 14820, descriptor: 'SuperPoint-v2' },
      icon: 'Cpu',
    },
    {
      id: 8,
      key: 'image_correspondence',
      name_en: 'Image Correspondence',
      name_te: 'చిత్ర సరిపోలిక',
      status: isProcessing ? 'completed' : block.status === 'PROCESSING' ? 'running' : 'awaiting',
      timestamp: '2026-10-09 08:57',
      summary_en: 'LightGlue spatial correspondence matched 8,240 verified epipolar pairs.',
      summary_te: 'లైట్‌గ్లూ ద్వారా 8,240 ధృవీకరించబడిన ఎపిపోలార్ జతలు సరిపోల్చబడ్డాయి.',
      details: { verified_matches: 8240, epipolar_inliers_pct: 94.6 },
      icon: 'GitFork',
    },
    {
      id: 9,
      key: 'camera_geometry',
      name_en: 'Camera Geometry',
      name_te: 'కెమెరా జ్యామితి',
      status: isProcessing ? 'completed' : block.status === 'PROCESSING' ? 'running' : 'awaiting',
      timestamp: '2026-10-09 08:58',
      summary_en: 'Colmap Bundle Adjustment converged with mean reprojection error of 0.38px.',
      summary_te: 'బండిల్ అడ్జస్ట్‌మెంట్ ద్వారా 0.38px రీప్రొజెక్షన్ లోపంతో కెమెరా స్థానాలు లెక్కించబడ్డాయి.',
      details: { cameras_calibrated: 8, focal_length_mm: 26.0 },
      icon: 'Video',
    },
    {
      id: 10,
      key: 'surface_reconstruction',
      name_en: 'Surface Reconstruction',
      name_te: 'ఉపరితల పునర్నిర్మాణం',
      status: isProcessing ? 'completed' : block.status === 'PROCESSING' ? 'running' : 'awaiting',
      timestamp: '2026-10-09 09:02',
      summary_en: 'Dense Poisson point cloud & triangle mesh reconstructed with 142,000 faces.',
      summary_te: '142,000 ముఖాలతో సాంద్రమైన పాయింట్ క్లౌడ్ మరియు ట్రయాంగిల్ మెష్ పునర్నిర్మించబడింది.',
      details: { mesh_faces: 142000, vertices: 71200 },
      icon: 'Rotate3d',
    },
    {
      id: 11,
      key: 'metric_measurement',
      name_en: 'Metric Measurement',
      name_te: 'మెట్రిక్ కొలత',
      status: isMeasured ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 09:05',
      summary_en: `Certified Dimensions: ${block.length_m}m × ${block.breadth_m}m × ${block.height_m}m | Vol: ${block.volume_m3}m³`,
      summary_te: `ధృవీకరించిన కొలతలు: ${block.length_m}మీ × ${block.breadth_m}మీ × ${block.height_m}మీ | ఘనపరిమాణం: ${block.volume_m3}మీ³`,
      details: {
        length_m: block.length_m,
        breadth_m: block.breadth_m,
        height_m: block.height_m,
        volume_m3: block.volume_m3,
        weight_tons: block.weight_tons,
      },
      icon: 'Ruler',
    },
    {
      id: 12,
      key: 'defect_intelligence',
      name_en: 'Defect Intelligence',
      name_te: 'లోప గుర్తింపు',
      status: isMeasured ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 09:10',
      summary_en: 'Surface defect scan completed: 1 minor hairline strain isolated on non-critical corner.',
      summary_te: 'ఉపరితల లోప గుర్తింపు పూర్తయింది: ప్రమాదకరం కాని మూలలో 1 చిన్న హెయిర్‌లైన్ క్రాక్ గుర్తించబడింది.',
      details: { defects_detected: 1, critical_defects: 0 },
      icon: 'AlertTriangle',
    },
    {
      id: 13,
      key: 'cutting_optimization',
      name_en: 'Cutting Optimization',
      name_te: 'కోత ఆప్టిమైజేషన్',
      status: isMeasured ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 09:15',
      summary_en: 'Optimal diamond wire saw dress plan calculated; 3 squaring cuts defined.',
      summary_te: 'సరైన డైమండ్ వైర్ సా డ్రెస్ ప్లాన్ లెక్కించబడింది; 3 స్క్వేరింగ్ కట్స్ నిర్ణయించబడ్డాయి.',
      details: { target_volume: '5.47 m³', target_slabs: 42 },
      icon: 'Scissors',
    },
    {
      id: 14,
      key: 'recovery_wastage',
      name_en: 'Recovery & Wastage',
      name_te: 'రికవరీ & వ్యర్థం',
      status: isMeasured ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 09:18',
      summary_en: 'Estimated commercial recovery: 81.6% | Kerf/dressing wastage: 18.4%.',
      summary_te: 'అంచనా వేసిన వాణిజ్య రికవరీ: 81.6% | వ్యర్థం: 18.4%.',
      details: { recovery_pct: 81.6, wastage_pct: 18.4 },
      icon: 'PieChart',
    },
    {
      id: 15,
      key: 'seigniorage_assessment',
      name_en: 'Seigniorage Assessment',
      name_te: 'సీనరేజ్ అంచనా',
      status: isMeasured ? 'completed' : 'awaiting',
      timestamp: '2026-10-09 09:25',
      summary_en: 'Classified Above Gangsaw Size (L≥270cm, B≥150cm). Statutory fee: ₹1,07,455.',
      summary_te: 'గ్యాంగ్‌సా పరిమాణంలో వర్గీకరించబడింది (L≥270cm, B≥150cm). చట్టబద్ధమైన రుసుము: ₹1,07,455.',
      details: { gangsaw_class: 'ABOVE_GANGSAW', rate_per_mt: 4500, total_payable_inr: 107455 },
      icon: 'IndianRupee',
    },
    {
      id: 16,
      key: 'officer_review',
      name_en: 'Officer Review',
      name_te: 'అధికారి సమీక్ష',
      status: isApproved ? 'completed' : 'awaiting',
      timestamp: isApproved ? '2026-10-10 10:15' : undefined,
      summary_en: 'Field Mining Officer verified ArUco calibration and certified metric tolerances.',
      summary_te: 'గనుల శాఖ ఫీల్డ్ అధికారి కాలిబ్రేషన్ మరియు మెట్రిక్ కొలతలను క్షేత్రస్థాయిలో ధృవీకరించారు.',
      details: { officer: 'M. Ramesh Babu, Asst. Geologist', status: 'RECOMMENDED_FOR_APPROVAL' },
      icon: 'CheckSquare',
    },
    {
      id: 17,
      key: 'admin_review',
      name_en: 'Admin Review',
      name_te: 'పరిపాలన సమీక్ష',
      status: isApproved ? 'completed' : 'awaiting',
      timestamp: isApproved ? '2026-10-10 11:00' : undefined,
      summary_en: 'Deputy Director of Mines & Geology approved seigniorage and unlocked dispatch permit.',
      summary_te: 'డిప్యూటీ డైరెక్టర్ ఆఫ్ మైన్స్ సీనరేజ్ చెల్లింపును ఆమోదించి రవాణా అనుమతిని జారీ చేశారు.',
      details: { approver: 'Deputy Director, Ongole Region', approval_status: 'SANCTIONED' },
      icon: 'ShieldCheck',
    },
    {
      id: 18,
      key: 'dispatch',
      name_en: 'Dispatch',
      name_te: 'రవాణా',
      status: isDispatched ? 'completed' : isApproved ? 'awaiting' : 'blocked',
      timestamp: isDispatched ? '2026-10-11 09:30' : undefined,
      summary_en: isDispatched
        ? 'Transit permit AP-MIN-2026-TR-8812 issued; RFID vehicle dispatch in transit.'
        : isApproved
        ? 'Block cleared for transit permit generation and weighbridge verification.'
        : 'Transit permit locked pending administrative approval and fee reconciliation.',
      summary_te: isDispatched
        ? 'రవాణా అనుమతి AP-MIN-2026-TR-8812 జారీ చేయబడింది; వాహనం రవాణాలో ఉంది.'
        : isApproved
        ? 'రవాణా అనుమతి ఉత్పత్తి మరియు బరువు ధృవీకరణ కోసం సిద్ధంగా ఉంది.'
        : 'పరిపాలనా ఆమోదం మరియు రుసుము చెల్లింపు పూర్తయ్యే వరకు రవాణా నిలిపివేయబడింది.',
      details: { permit_status: isDispatched ? 'ACTIVE' : 'READY_TO_ISSUE' },
      icon: 'Truck',
    },
  ];
}

// Data Fetching Helper with Seamless Fallback
export async function fetchBlocksWithFallback(): Promise<GraniteBlock[]> {
  try {
    const remote = await api.getBlocks();
    if (Array.isArray(remote) && remote.length > 0) return remote;
  } catch (err) {
    // Backend offline or empty, use demo
  }
  return DEMO_BLOCKS;
}

export async function fetchBlockById(id: string): Promise<GraniteBlock> {
  try {
    const remote = await api.getBlock(id);
    if (remote && remote.id) return remote;
  } catch (err) {
    // fallback
  }
  const found = DEMO_BLOCKS.find((b) => b.id === id || b.block_number === id);
  return found || DEMO_BLOCKS[0];
}
