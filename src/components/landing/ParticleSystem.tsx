'use client';

// Orbiting particle system — 200 glowing spheres that spiral upward
// like steam rising from the food plate.
// Uses InstancedMesh for performance (single draw call).

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  count?: number;
  introProgress: React.MutableRefObject<number>;
}

const PALETTE = [
  new THREE.Color('#E85D04'),
  new THREE.Color('#F59E0B'),
  new THREE.Color('#FFE4C4'),
  new THREE.Color('#FF7A30'),
];

export default function ParticleSystem({ count = 200, introProgress }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const mat     = useRef<THREE.MeshBasicMaterial>(null);
  const dummy   = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    angle:     (i / count) * Math.PI * 2 + Math.random() * 1.2,
    radius:    0.8 + Math.random() * 1.4,
    y:        -0.4 + Math.random() * 3.5, // spread vertically on init
    angSpeed:  (0.15 + Math.random() * 0.25) * (Math.random() > 0.5 ? 1 : -1),
    riseSpeed: 0.004 + Math.random() * 0.008,
    scale:     0.012 + Math.random() * 0.022,
    phase:     Math.random() * Math.PI * 2,
  })), [count]);

  // Assign per-instance colors once on mount
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      meshRef.current.setColorAt(i, PALETTE[i % PALETTE.length]);
    }
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const dt  = Math.min(delta, 0.05);
    const ip  = introProgress.current;
    const vis = Math.max(0, Math.min(1, (ip - 0.45) / 0.35));

    if (mat.current) mat.current.opacity = vis * 0.88;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      p.angle += p.angSpeed * dt;
      p.y     += p.riseSpeed * 60 * dt;
      if (p.y > 3.5) { p.y = -0.4; p.radius = 0.8 + Math.random() * 1.4; }

      const wobble = Math.sin(state.clock.elapsedTime * 1.8 + p.phase) * 0.06;
      dummy.position.set(
        Math.cos(p.angle) * (p.radius + wobble),
        p.y,
        Math.sin(p.angle) * (p.radius + wobble),
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 5, 5]} />
      <meshBasicMaterial
        ref={mat}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
