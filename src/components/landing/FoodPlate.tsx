'use client';

// 3D food plate that slowly rotates.
// Built with standard Three.js geometries: flat cylinder (plate body),
// torus (rim), and flattened spheres (food mounds).

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  introProgress: React.MutableRefObject<number>;
}

export default function FoodPlate({ introProgress }: Props) {
  const groupRef  = useRef<THREE.Group>(null);
  const plateMat  = useRef<THREE.MeshStandardMaterial>(null);
  const rimMat    = useRef<THREE.MeshStandardMaterial>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);

  const foodMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  const foodData = useMemo(() => [
    { pos: [0.45,  0.14,  0.15] as [number,number,number], color: '#E85D04', radius: 0.22, scale: [1, 0.7, 1] as [number,number,number] },
    { pos: [-0.3,  0.12, -0.3]  as [number,number,number], color: '#F59E0B', radius: 0.18, scale: [1, 0.65, 1] as [number,number,number] },
    { pos: [0.05,  0.10,  0.42] as [number,number,number], color: '#FF7A30', radius: 0.16, scale: [1, 0.6, 1]  as [number,number,number] },
    { pos: [-0.42, 0.08,  0.28] as [number,number,number], color: '#FFB366', radius: 0.14, scale: [1, 0.55, 1] as [number,number,number] },
  ], []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Rotate plate
    groupRef.current.rotation.y += delta * 0.28;

    // Lerp opacity in based on introProgress
    const ip  = introProgress.current;
    const vis = Math.max(0, Math.min(1, (ip - 0.2) / 0.4));

    const mats = [plateMat.current, rimMat.current, ...foodMats.current];
    for (const m of mats) {
      if (m) m.opacity = vis;
    }
    if (shadowMat.current) shadowMat.current.opacity = vis * 0.35;
  });

  return (
    <group ref={groupRef}>
      {/* Ambient occlusion shadow below plate */}
      <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 48]} />
        <meshBasicMaterial
          ref={shadowMat}
          color="#000000"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Plate base */}
      <mesh position={[0, -0.06, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.0, 0.1, 64]} />
        <meshStandardMaterial
          ref={plateMat}
          color="#1E1E1E"
          metalness={0.2}
          roughness={0.75}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Plate rim — subtle raised ring */}
      <mesh position={[0, -0.02, 0]}>
        <torusGeometry args={[1.08, 0.06, 12, 64]} />
        <meshStandardMaterial
          ref={rimMat}
          color="#2A2A2A"
          metalness={0.4}
          roughness={0.55}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Food mounds */}
      {foodData.map((f, i) => (
        <mesh key={i} position={f.pos} scale={f.scale} castShadow>
          <sphereGeometry args={[f.radius, 20, 20]} />
          <meshStandardMaterial
            ref={(el) => { foodMats.current[i] = el; }}
            color={f.color}
            roughness={0.65}
            metalness={0.05}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}
