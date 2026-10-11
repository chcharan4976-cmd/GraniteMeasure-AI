'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Layers, Eye, Camera as CameraIcon, Box as BoxIcon, Sparkles } from 'lucide-react';

interface ReconstructionViewerProps {
  hasReconstruction?: boolean;
  lengthM?: number;
  breadthM?: number;
  heightM?: number;
  graniteCategory?: string;
  showCameras?: boolean;
  viewMode?: 'mesh' | 'points' | 'wireframe';
}

// Camera Frustum Indicator in 3D
function CameraFrustum({ position, target, index }: { position: [number, number, number]; target: [number, number, number]; index: number }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(new THREE.Vector3(...target));
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Small camera body */}
      <mesh>
        <boxGeometry args={[0.15, 0.1, 0.1]} />
        <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.4} />
      </mesh>
      {/* Pyramidal viewing cone */}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 4]} />
        <meshBasicMaterial color="#38bdf8" wireframe />
      </mesh>
      <Text position={[0, 0.15, 0]} fontSize={0.08} color="#06b6d4" anchorX="center" anchorY="bottom">
        {`CAM ${index + 1}`}
      </Text>
    </group>
  );
}

// Granite Block Mesh / Point Cloud
function GraniteBlockScene({
  dimensions,
  mode,
  showCameras,
  category,
}: {
  dimensions: [number, number, number]; // length, height, breadth in meters
  mode: 'mesh' | 'points' | 'wireframe';
  showCameras: boolean;
  category: string;
}) {
  const [l, h, b] = dimensions;
  const blockRef = useRef<THREE.Mesh>(null);

  // Synthesize realistic granite point cloud
  const pointCloud = useMemo(() => {
    const count = 3500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const baseColor = category.toLowerCase().includes('galaxy')
      ? new THREE.Color('#18181b') // Dark charcoal with gold specs
      : category.toLowerCase().includes('blue')
      ? new THREE.Color('#334155')
      : new THREE.Color('#27272a');

    for (let i = 0; i < count; i++) {
      // Pick a random face of the block
      const face = Math.floor(Math.random() * 6);
      let x = 0, y = 0, z = 0;
      const jitter = (Math.random() - 0.5) * 0.04; // Photogrammetry noise

      switch (face) {
        case 0: x = l / 2 + jitter; y = (Math.random() - 0.5) * h; z = (Math.random() - 0.5) * b; break;
        case 1: x = -l / 2 + jitter; y = (Math.random() - 0.5) * h; z = (Math.random() - 0.5) * b; break;
        case 2: x = (Math.random() - 0.5) * l; y = h / 2 + jitter; z = (Math.random() - 0.5) * b; break;
        case 3: x = (Math.random() - 0.5) * l; y = -h / 2 + jitter; z = (Math.random() - 0.5) * b; break;
        case 4: x = (Math.random() - 0.5) * l; y = (Math.random() - 0.5) * h; z = b / 2 + jitter; break;
        case 5: x = (Math.random() - 0.5) * l; y = (Math.random() - 0.5) * h; z = -b / 2 + jitter; break;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y + h / 2; // Elevate so bottom rests on ground
      positions[i * 3 + 2] = z;

      // Realistic speckling for granite (gold speckles if black galaxy)
      if (Math.random() < 0.12 && category.toLowerCase().includes('galaxy')) {
        colors[i * 3] = 0.95;
        colors[i * 3 + 1] = 0.78;
        colors[i * 3 + 2] = 0.25;
      } else {
        const shade = 0.2 + Math.random() * 0.3;
        colors[i * 3] = baseColor.r * shade;
        colors[i * 3 + 1] = baseColor.g * shade;
        colors[i * 3 + 2] = baseColor.b * shade;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [l, h, b, category]);

  // Orbital Camera poses around block
  const cameraPoses = useMemo(() => {
    const poses: [number, number, number][] = [];
    const count = 8;
    const radius = Math.max(l, b) * 1.5;
    const elevation = h * 1.2;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      poses.push([x, elevation + (i % 2 === 0 ? 0.3 : -0.2), z]);
    }
    return poses;
  }, [l, b, h]);

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Measurement Dimension Guides */}
      <group position={[0, h / 2, 0]}>
        {/* Length label (X) */}
        <Text
          position={[0, -h / 2 - 0.25, b / 2 + 0.2]}
          fontSize={0.16}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
        >
          {`L: ${(l * 100).toFixed(0)} cm`}
        </Text>

        {/* Breadth label (Z) */}
        <Text
          position={[l / 2 + 0.3, -h / 2 - 0.25, 0]}
          fontSize={0.16}
          color="#06b6d4"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI / 2, 0]}
        >
          {`B: ${(b * 100).toFixed(0)} cm`}
        </Text>

        {/* Height label (Y) */}
        <Text
          position={[-l / 2 - 0.25, 0, b / 2 + 0.1]}
          fontSize={0.16}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
        >
          {`H: ${(h * 100).toFixed(0)} cm`}
        </Text>
      </group>

      {/* Main Granite Block */}
      {mode === 'points' ? (
        <points geometry={pointCloud}>
          <pointsMaterial size={0.035} vertexColors sizeAttenuation transparent opacity={0.9} />
        </points>
      ) : (
        <mesh ref={blockRef} position={[0, h / 2, 0]}>
          <boxGeometry args={[l, h, b]} />
          {mode === 'wireframe' ? (
            <meshStandardMaterial color="#10b981" wireframe />
          ) : (
            <meshStandardMaterial
              color={category.toLowerCase().includes('galaxy') ? '#1c1917' : '#292524'}
              roughness={0.7}
              metalness={0.1}
            />
          )}
          {/* Subtle edge highlight for mesh */}
          {mode === 'mesh' && (
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(l, h, b)]} />
              <lineBasicMaterial color="#34d399" linewidth={1.5} />
            </lineSegments>
          )}
        </mesh>
      )}

      {/* Camera positions */}
      {showCameras &&
        cameraPoses.map((pos, idx) => (
          <CameraFrustum key={idx} position={pos} target={[0, h / 2, 0]} index={idx} />
        ))}
    </group>
  );
}

export default function ReconstructionViewer({
  hasReconstruction = true,
  lengthM = 2.8,
  breadthM = 1.6,
  heightM = 1.4,
  graniteCategory = 'Black Galaxy Granite',
  showCameras: initialShowCameras = true,
  viewMode: initialViewMode = 'mesh',
}: ReconstructionViewerProps) {
  const [viewMode, setViewMode] = useState<'mesh' | 'points' | 'wireframe'>(initialViewMode);
  const [showCameras, setShowCameras] = useState<boolean>(initialShowCameras);

  return (
    <div className="relative w-full h-full min-h-[440px] bg-gradient-to-b from-granite-900 to-granite-950 rounded-xl overflow-hidden border border-granite-800">
      {/* 3D Scene Controls Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 bg-granite-900/85 backdrop-blur-md p-1.5 rounded-lg border border-granite-700/60 shadow-lg text-xs">
        <button
          onClick={() => setViewMode('mesh')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            viewMode === 'mesh' ? 'bg-emerald-500 text-granite-950 font-bold' : 'text-granite-300 hover:bg-granite-800'
          }`}
          title="Shaded Surface Mesh"
        >
          <BoxIcon className="w-3.5 h-3.5" />
          <span>Surface</span>
        </button>

        <button
          onClick={() => setViewMode('points')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            viewMode === 'points' ? 'bg-emerald-500 text-granite-950 font-bold' : 'text-granite-300 hover:bg-granite-800'
          }`}
          title="SfM Sparse Point Cloud"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Point Cloud</span>
        </button>

        <button
          onClick={() => setViewMode('wireframe')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            viewMode === 'wireframe' ? 'bg-emerald-500 text-granite-950 font-bold' : 'text-granite-300 hover:bg-granite-800'
          }`}
          title="Volumetric Bounding Wireframe"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Wireframe</span>
        </button>

        <div className="w-px h-5 bg-granite-700 my-auto mx-1" />

        <button
          onClick={() => setShowCameras(!showCameras)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
            showCameras ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-granite-400 hover:bg-granite-800'
          }`}
          title="Toggle Multi-View Camera Cones"
        >
          <CameraIcon className="w-3.5 h-3.5" />
          <span>Camera Poses</span>
        </button>
      </div>

      {/* Helper Legend / Info Overlay */}
      <div className="absolute bottom-3 right-3 z-10 bg-granite-900/85 backdrop-blur-md px-3 py-2 rounded-lg border border-granite-700/60 shadow-lg text-[11px] text-granite-300 space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          <span>Length: {lengthM} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
          <span>Breadth: {breadthM} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
          <span>Height: {heightM} m</span>
        </div>
      </div>

      {/* Three.js Canvas */}
      {hasReconstruction ? (
        <Canvas
          camera={{ position: [4.2, 3.2, 4.2], fov: 42 }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 15, 10]} intensity={1.2} />
          <directionalLight position={[-10, 8, -10]} intensity={0.4} />

          <Center top>
            <GraniteBlockScene
              dimensions={[lengthM, heightM, breadthM]}
              mode={viewMode}
              showCameras={showCameras}
              category={graniteCategory}
            />
          </Center>

          {/* Precision ground grid */}
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
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-granite-400">
          <BoxIcon className="w-16 h-16 text-granite-600 mb-3 animate-pulse" />
          <h4 className="text-base font-semibold text-granite-200">Awaiting 3D Reconstruction</h4>
          <p className="text-xs max-w-sm mt-1 text-granite-500">
            Upload photographic evidence and run the Structure-from-Motion (SfM) pipeline to generate 3D mesh.
          </p>
        </div>
      )}
    </div>
  );
}
