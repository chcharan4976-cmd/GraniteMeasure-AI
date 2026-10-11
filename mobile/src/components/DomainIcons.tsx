import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string | any;
}

export function GraniteBlockIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m3.3 7 8.7 5 8.7-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12v9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m7.5 9.5-3.5 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <Path d="m16.5 9.5 3.5 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  );
}

export function QuarryAtlasIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m2 22 7-14 5 7 8-11" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2 22h20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="18" cy="5" r="2" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

export function MetricRulerIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.3 8.7 8.7 21.3a2.5 2.5 0 0 1-3.5 0l-2.5-2.5a2.5 2.5 0 0 1 0-3.5L15.3 2.7a2.5 2.5 0 0 1 3.5 0l2.5 2.5a2.5 2.5 0 0 1 0 3.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m7.5 10.5 2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="m10.5 7.5 2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Path d="m13.5 4.5 2 2" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function FractureIntelligenceIcon({ size = 24, color = '#f59e0b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="m12 3-2 6 4 3-3 5 3 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CutLabIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="6" r="3" stroke={color} strokeWidth="1.8" />
      <Circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.8" />
      <Line x1="20" y1="4" x2="8.12" y2="15.88" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="14.47" y1="14.48" x2="20" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="8.12" y1="8.12" x2="12" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function GeoTwinIcon({ size = 24, color = '#06b6d4' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" fill="none" />
    </Svg>
  );
}

export function ShieldEmblemIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="m9 12 2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function VisionPipelineIcon({ size = 24, color = '#10b981' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
      <Path
        d="M2 12c2.5-5 6.5-8 10-8s7.5 3 10 8c-2.5 5-6.5 8-10 8s-7.5-3-10-8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}
