'use client';

// Volumetric-style orange light rays behind the food plate.
// Two overlapping cone geometries with transparent additive materials.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  introProgress: React.MutableRefObject<number>;
}

export default function LightRays({ introProgress }: Props) {
  const mat1 = useRef<THREE.MeshBasicMaterial>(null);
  const mat2 = useRef<THREE.MeshBasicMaterial>(null);
  const t     = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const ip      = introProgress.current;
    const visible = Math.max(0, Math.min(1, (ip - 0.05) / 0.3));
    const pulse   = 0.08 + Math.sin(t.current * 1.4) * 0.04;

    if (mat1.current) mat1.current.opacity = visible * pulse;
    if (mat2.current) mat2.current.opacity = visible * pulse * 0.65;
  });

  return (
    <group position={[0, -2.5, -1.5]} rotation={[Math.PI * 0.12, 0, 0]}>
      {/* Primary ray */}
      <mesh>
        <coneGeometry args={[4.5, 8, 10, 1, true]} />
        <meshBasicMaterial
          ref={mat1}
          color="#E85D04"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Secondary wider ray */}
      <mesh rotation={[0, Math.PI / 10, 0]}>
        <coneGeometry args={[5.5, 7, 10, 1, true]} />
        <meshBasicMaterial
          ref={mat2}
          color="#FF9A4D"
          transparent
          opacity={0}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
