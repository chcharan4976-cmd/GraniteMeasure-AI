'use client';

import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, StepForward, CheckCircle2 } from 'lucide-react';

export interface CuttingViewerProps {
  origLength?: number;
  origBreadth?: number;
  origHeight?: number;
  targetLength?: number;
  targetBreadth?: number;
  targetHeight?: number;
  step?: number; // 0: Raw Block, 1: Top cut plane, 2: End-face trim, 3: Side dress, 4: Final Gangsaw slab block
  isPlaying?: boolean;
  onStepChange?: (step: number) => void;
  onTogglePlay?: () => void;
  onReset?: () => void;
}

// 3D Cut Scene Component
function CuttingScene({
  origLength = 2.8,
  origBreadth = 1.6,
  origHeight = 1.4,
  targetLength = 2.5,
  targetBreadth = 1.4,
  targetHeight = 1.25,
  step = 0,
}: {
  origLength: number;
  origBreadth: number;
  origHeight: number;
  targetLength: number;
  targetBreadth: number;
  targetHeight: number;
  step: number;
}) {
  // Current active dimensions interpolated by step
  const l = step >= 2 ? targetLength : origLength;
  const b = step >= 3 ? targetBreadth : origBreadth;
  const h = step >= 1 ? targetHeight : origHeight;

  return (
    <group position={[0, 0, 0]}>
      {/* Target Final Geometry Ghost Wireframe */}
      <mesh position={[0, targetHeight / 2, 0]}>
        <boxGeometry args={[targetLength, targetHeight, targetBreadth]} />
        <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.35} />
      </mesh>

      {/* Main Block Being Dressed */}
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[l, h, b]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.6}
          metalness={0.2}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(l, h, b)]} />
          <lineBasicMaterial color="#38bdf8" linewidth={1.5} />
        </lineSegments>
      </mesh>

      {/* Discarded/Wastage Geometry Highlights */}
      {step === 1 && (
        // Top cap being cut off
        <mesh position={[0, targetHeight + (origHeight - targetHeight) / 2, 0]}>
          <boxGeometry args={[origLength, origHeight - targetHeight, origBreadth]} />
          <meshStandardMaterial color="#f43f5e" transparent opacity={0.4} />
          {/* Wire Cut Plane */}
          <mesh position={[0, -(origHeight - targetHeight) / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[origLength + 0.4, origBreadth + 0.4]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        </mesh>
      )}

      {step === 2 && (
        // Length trim plane and discarded cap
        <mesh position={[targetLength / 2 + (origLength - targetLength) / 2, h / 2, 0]}>
          <boxGeometry args={[origLength - targetLength, h, origBreadth]} />
          <meshStandardMaterial color="#f43f5e" transparent opacity={0.4} />
          {/* Vertical cut plane */}
          <mesh position={[-(origLength - targetLength) / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[origBreadth + 0.4, h + 0.4]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        </mesh>
      )}

      {step === 3 && (
        // Breadth trim plane and discarded cap
        <mesh position={[0, h / 2, targetBreadth / 2 + (origBreadth - targetBreadth) / 2]}>
          <boxGeometry args={[targetLength, h, origBreadth - targetBreadth]} />
          <meshStandardMaterial color="#f43f5e" transparent opacity={0.4} />
          {/* Side cut plane */}
          <mesh position={[0, 0, -(origBreadth - targetBreadth) / 2]}>
            <planeGeometry args={[targetLength + 0.4, h + 0.4]} />
            <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} transparent opacity={0.7} />
          </mesh>
        </mesh>
      )}

      {step >= 4 && (
        // Slicing indicator for gangsaw slabs
        <group position={[0, targetHeight / 2, 0]}>
          {[-0.4, -0.2, 0, 0.2, 0.4].map((zOffset, idx) => (
            <mesh key={idx} position={[0, 0, zOffset]}>
              <planeGeometry args={[targetLength, targetHeight]} />
              <meshBasicMaterial color="#34d399" side={THREE.DoubleSide} transparent opacity={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {/* Text annotations */}
      <Text
        position={[0, h + 0.35, 0]}
        fontSize={0.16}
        color={step === 4 ? '#10b981' : '#38bdf8'}
        anchorX="center"
        anchorY="middle"
      >
        {step === 0 && 'STEP 0: Raw Extracted Quarry Block'}
        {step === 1 && 'STEP 1: Primary Wire Saw Leveling (Top Face)'}
        {step === 2 && 'STEP 2: End-Face Squaring (Defect Avoidance)'}
        {step === 3 && 'STEP 3: Side Dressing (Parallel Gangsaw Reference)'}
        {step === 4 && 'FINAL: Certified Dressed Commercial Gangsaw Block'}
      </Text>
    </group>
  );
}

export default function CuttingViewer({
  origLength = 2.8,
  origBreadth = 1.6,
  origHeight = 1.4,
  targetLength = 2.5,
  targetBreadth = 1.4,
  targetHeight = 1.25,
  step = 0,
  isPlaying = false,
  onStepChange,
  onTogglePlay,
  onReset,
}: CuttingViewerProps) {
  return (
    <div className="relative w-full h-full min-h-[460px] bg-gradient-to-b from-granite-900 to-granite-950 rounded-xl overflow-hidden border border-granite-800 flex flex-col">
      {/* 3D Canvas */}
      <div className="flex-1 w-full relative">
        {/* Step status badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-granite-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-granite-700/60 shadow-lg text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-granite-200">
            {step === 0 && 'Raw Inspection Mode'}
            {step === 1 && 'Wire Saw #1: Top Leveling'}
            {step === 2 && 'Wire Saw #2: End Trim'}
            {step === 3 && 'Wire Saw #3: Flank Dress'}
            {step === 4 && 'Certified Gangsaw Block Ready'}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-3 z-10 bg-granite-900/85 backdrop-blur-md px-3 py-2 rounded-lg border border-granite-700/60 shadow-lg text-[11px] text-granite-300 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded-xs bg-[#1e293b] border border-cyan-400 inline-block" />
            <span>Retained Granite Mass</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded-xs bg-rose-500/60 inline-block" />
            <span>Kerf / Wastage Trimming</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-2 rounded-xs bg-amber-400/80 inline-block" />
            <span>Diamond Wire Cutting Plane</span>
          </div>
        </div>

        <Canvas camera={{ position: [4.0, 3.2, 4.0], fov: 42 }} className="w-full h-full cursor-grab active:cursor-grabbing">
          <ambientLight intensity={0.9} />
          <directionalLight position={[10, 15, 10]} intensity={1.3} />
          <directionalLight position={[-10, 8, -10]} intensity={0.5} />

          <Center top>
            <CuttingScene
              origLength={origLength}
              origBreadth={origBreadth}
              origHeight={origHeight}
              targetLength={targetLength}
              targetBreadth={targetBreadth}
              targetHeight={targetHeight}
              step={step}
            />
          </Center>

          <Grid
            infiniteGrid
            cellSize={0.5}
            cellThickness={0.6}
            cellColor="#10b981"
            sectionSize={2.0}
            sectionThickness={1.2}
            sectionColor="#059669"
            fadeDistance={25}
            fadeStrength={1.5}
          />
          <axesHelper args={[2.5]} />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2 + 0.05} />
        </Canvas>
      </div>

      {/* Playback & Step Control Bar */}
      <div className="p-3 bg-granite-900/90 border-t border-granite-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Sequence'}</span>
          </button>

          <button
            onClick={() => onStepChange && onStepChange((step + 1) % 5)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-granite-800 hover:bg-granite-700 text-granite-200 text-xs transition-colors"
            title="Step Forward"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>Next Cut</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-granite-400 hover:text-white hover:bg-granite-800 transition-colors"
            title="Reset to Raw Block"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stepper Progress Dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((s) => (
            <button
              key={s}
              onClick={() => onStepChange && onStepChange(s)}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? 'w-6 bg-emerald-500'
                  : s < step
                  ? 'w-2 bg-emerald-700'
                  : 'w-2 bg-granite-700'
              }`}
              title={`Jump to step ${s}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
