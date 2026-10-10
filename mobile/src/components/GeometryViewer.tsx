import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

type Pt = [number, number, number];

export interface GeometryPayload {
  available?: boolean;
  reason?: string;
  units?: string;
  points?: number[][];
  obb?: {
    center?: number[];
    axes?: number[][];
    extents?: number[];
    corners?: number[][];
    length_cm?: number;
    breadth_cm?: number;
    height_cm?: number;
  };
  cameras?: Array<{ image_index?: number; t?: number[]; image_name?: string }>;
  coverage?: { unobserved_faces?: string[]; faces?: Array<{ name: string; observed: boolean }> };
  image_associations?: Array<{ path: string; index: number }>;
}

function rotate(p: Pt, yaw: number, pitch: number): Pt {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = p[0] * cy + p[2] * sy;
  const z1 = -p[0] * sy + p[2] * cy;
  const y2 = p[1] * cp - z1 * sp;
  const z2 = p[1] * sp + z1 * cp;
  return [x1, y2, z2];
}

function project(p: Pt, size: number, scale: number): { x: number; y: number; z: number } {
  const z = p[2] + 180;
  const f = 220 / Math.max(40, z);
  return {
    x: size / 2 + p[0] * scale * f,
    y: size / 2 - p[1] * scale * f,
    z: p[2],
  };
}

export function GeometryViewer({ data }: { data: GeometryPayload | null }) {
  const { colors } = useTheme();
  const [yaw, setYaw] = useState(0.6);
  const [pitch, setPitch] = useState(0.35);
  const size = 320;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          setYaw((y) => y + g.dx * 0.004);
          setPitch((p) => Math.max(-1.2, Math.min(1.2, p + g.dy * 0.004)));
        },
      }),
    []
  );

  if (!data || data.available === false || !data.points || data.points.length === 0) {
    return (
      <View style={[styles.unavailable, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>3D model unavailable</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }]}>
          {data?.reason ||
            'No reconstructed point cloud. A generic cube is not shown because it would misrepresent the block.'}
        </Text>
      </View>
    );
  }

  const pts = data.points as Pt[];
  const center = pts.reduce(
    (a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length],
    [0, 0, 0] as Pt
  );
  const centered = pts.map((p) => [p[0] - center[0], p[1] - center[1], p[2] - center[2]] as Pt);
  const maxAbs = Math.max(...centered.flatMap((p) => p.map(Math.abs)), 1);
  const scale = 90 / maxAbs;
  const rotated = centered.map((p) => rotate(p, yaw, pitch));
  const projected = rotated.map((p) => project(p, size, scale));

  const corners = (data.obb?.corners || []).map(
    (c) => rotate([c[0] - center[0], c[1] - center[1], c[2] - center[2]], yaw, pitch)
  );
  const cproj = corners.map((p) => project(p, size, scale));
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];

  const unobserved = data.coverage?.unobserved_faces || [];

  return (
    <View>
      <View {...pan.panHandlers} style={[styles.canvas, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
        <Svg width={size} height={size}>
          {cproj.length === 8 &&
            edges.map(([a, b], i) => (
              <Line
                key={`e${i}`}
                x1={cproj[a].x}
                y1={cproj[a].y}
                x2={cproj[b].x}
                y2={cproj[b].y}
                stroke={colors.accent}
                strokeWidth={1.5}
              />
            ))}
          {projected.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2.2} fill={colors.primary} opacity={0.85} />
          ))}
          {(data.cameras || []).map((cam, i) => {
            const t = cam.t || [0, 0, 0];
            const pr = project(
              rotate([t[0] - center[0], t[1] - center[1], t[2] - center[2]], yaw, pitch),
              size,
              scale * 0.4
            );
            return (
              <Polygon
                key={`cam${i}`}
                points={`${pr.x},${pr.y - 6} ${pr.x - 5},${pr.y + 4} ${pr.x + 5},${pr.y + 4}`}
                fill={colors.warning}
              />
            );
          })}
          <SvgText x={12} y={22} fill={colors.textSecondary} fontSize="11">
            Drag to rotate · {pts.length} pts · {data.units || 'cm'}
          </SvgText>
        </Svg>
      </View>
      <View style={styles.meta}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          L {data.obb?.length_cm ?? '—'} · B {data.obb?.breadth_cm ?? '—'} · H {data.obb?.height_cm ?? '—'} cm
        </Text>
        <Text style={[typography.caption, { color: colors.warning, marginTop: 4 }]}>
          Unobserved faces: {unobserved.length ? unobserved.join(', ') : 'none flagged'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setYaw(0.6);
            setPitch(0.35);
          }}
          style={{ marginTop: spacing.sm }}
        >
          <Text style={[typography.caption, { color: colors.primary }]}>Reset view</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  meta: { marginTop: spacing.sm },
  unavailable: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
});
