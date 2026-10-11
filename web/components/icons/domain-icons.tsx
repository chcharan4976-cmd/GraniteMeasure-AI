import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

// 1. Granite Block (Multi-faceted geometric raw stone)
export function GraniteBlockIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M12 22V12" />
      <path d="M21 7l-9 5-9-5" />
      <path d="M7 9.5l5 2.5 5-2.5" strokeOpacity="0.5" />
      <path d="M16 14.5l-4 2.5-4-2.5" strokeOpacity="0.5" />
    </svg>
  );
}

// 2. Quarry Atlas (Open pit bench cut excavation terrain)
export function QuarryAtlasIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 21h20" />
      <path d="M4 21V15h4v-4h4V7h4V3h4" />
      <circle cx="16" cy="7" r="1.5" fill="currentColor" fillOpacity="0.2" />
      <path d="M4 15l4-2 4 1 4-3 4 2" strokeOpacity="0.6" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

// 3. GeoTwin Studio (3D digital twin mesh vertex node cloud)
export function GeoTwinIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="4" r="2" />
      <circle cx="4" cy="18" r="2" />
      <circle cx="20" cy="18" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 6v4" />
      <path d="M5.5 16.5l5-3" />
      <path d="M18.5 16.5l-5-3" />
      <path d="M6 18h12" strokeDasharray="2 2" />
      <path d="M12 4L4 18" strokeOpacity="0.3" />
      <path d="M12 4l8 14" strokeOpacity="0.3" />
    </svg>
  );
}

// 4. Calibration Target (ArUco fiducial square with reticle crosshairs)
export function CalibrationMarkerIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" fill="currentColor" fillOpacity="0.15" />
      <path d="M10 10h4v4h-4z" fill="currentColor" />
      <path d="M12 1v2" />
      <path d="M12 21v2" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
    </svg>
  );
}

// 5. Metric Caliper (Industrial vernier precision dimension caliper)
export function MetricRulerIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M2 7h20v5H2z" />
      <path d="M6 7v3" />
      <path d="M10 7v2" />
      <path d="M14 7v3" />
      <path d="M18 7v2" />
      <path d="M2 17l4-5" />
      <path d="M22 17l-4-5" />
      <path d="M6 17h12" strokeDasharray="2 2" />
    </svg>
  );
}

// 6. Fracture Intelligence (Stone fault line defect diagnostic)
export function FractureIntelligenceIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M12 2l8 5v10l-8 5-8-5V7z" />
      <path d="M12 3l-2 5 4 3-3 4 3 4-2 3" stroke="#f59e0b" strokeWidth="2" />
      <circle cx="14" cy="11" r="1.5" fill="#ef4444" />
    </svg>
  );
}

// 7. CutLab (Diamond wire saw dressing plane simulation)
export function CutLabIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
      <path d="M2 4l20 16" stroke="#10b981" strokeWidth="2.2" />
      <circle cx="2" cy="4" r="1.5" fill="#10b981" />
      <circle cx="22" cy="20" r="1.5" fill="#10b981" />
      <path d="M12 8l4 4" strokeDasharray="1.5 1.5" strokeOpacity="0.6" />
    </svg>
  );
}

// 8. Yield Intelligence (Sankey recovery & waste pie ratio)
export function YieldIntelligenceIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor" fillOpacity="0.2" />
      <path d="M16 16l4 4" />
      <path d="M20 16v4h-4" />
    </svg>
  );
}

// 9. Royalty Intelligence (Andhra Pradesh seigniorage rupee seal)
export function RoyaltyIntelligenceIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M6 7h12" />
      <path d="M6 11h9" />
      <path d="M11 7c2 0 3 1 3 3s-1 3-3 3H9l5 6" />
    </svg>
  );
}

// 10. Dispatch Control (RFID heavy transit haul vehicle)
export function DispatchTruckIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M1 3h14v13H1z" />
      <path d="M15 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
      <path d="M4 7h6" strokeOpacity="0.5" />
      <path d="M4 10h8" strokeOpacity="0.5" />
    </svg>
  );
}

// 11. Vision Pipeline (Neural AI epipolar matching lines)
export function VisionPipelineIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8.5 7.5l7 0" strokeDasharray="1.5 1.5" />
      <path d="M7.5 8.5l3.5 7" />
      <path d="M16.5 8.5l-3.5 7" />
      <circle cx="12" cy="10" r="1" fill="#10b981" />
    </svg>
  );
}

// 12. Evidence Vault (Tamper-evident legal report ledger)
export function EvidenceVaultIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" stroke="#10b981" strokeWidth="2" />
      <path d="M8 11h3" strokeOpacity="0.5" />
    </svg>
  );
}

// 13. Command Nexus (Global monitoring core)
export function CommandNexusIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
      <circle cx="6.5" cy="7.5" r="1" fill="#10b981" />
      <circle cx="17.5" cy="16.5" r="1" fill="#10b981" />
    </svg>
  );
}
