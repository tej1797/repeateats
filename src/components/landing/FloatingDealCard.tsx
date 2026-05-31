'use client';

// A real deal card rendered in 3D space via @react-three/drei's Html component.
// Orbits around the food plate and always faces the camera (billboarding).

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface DealCardData {
  emoji:      string;
  title:      string;
  restaurant: string;
  discount:   string;
  tag:        string;
  radius:     number;
  startAngle: number;
  speed:      number;
  height:     number;
  index:      number;
  introProgress: React.MutableRefObject<number>;
}

export default function FloatingDealCard({
  emoji, title, restaurant, discount, tag,
  radius, startAngle, speed, height, index, introProgress,
}: DealCardData) {
  const groupRef  = useRef<THREE.Group>(null);
  const angle     = useRef(startAngle);
  const appear    = useRef(0); // 0→1 opacity of the card

  // Each card has a staggered intro threshold
  const threshold = 0.65 + index * 0.06;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    angle.current += speed * dt;

    groupRef.current.position.x = Math.cos(angle.current) * radius;
    groupRef.current.position.z = Math.sin(angle.current) * radius;
    groupRef.current.position.y = height + Math.sin(state.clock.elapsedTime * 0.7 + startAngle) * 0.12;

    // Billboard: face camera
    groupRef.current.lookAt(state.camera.position);

    // Fade in
    const ip = introProgress.current;
    appear.current = Math.max(0, Math.min(1, (ip - threshold) / 0.15));
  });

  return (
    <group ref={groupRef}>
      <Html
        center
        transform
        distanceFactor={5}
        zIndexRange={[1, 2]}
        style={{ opacity: 1, transition: 'opacity 0.3s' }}
        occlude={false}
      >
        <div
          style={{
            width: 170,
            background: 'rgba(18,18,18,0.94)',
            border: '1px solid rgba(255,255,255,0.11)',
            borderRadius: 12,
            padding: '11px 13px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(232,93,4,0.15)',
            backdropFilter: 'blur(12px)',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: 'rgba(232,93,4,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, flexShrink: 0,
            }}>
              {emoji}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 9, color: '#4A4A4A', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {restaurant}
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </div>
            </div>
          </div>

          {/* Discount row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 17, fontWeight: 800, color: '#E85D04',
            }}>
              {discount}
            </div>
            <div style={{
              fontSize: 8.5, fontWeight: 700,
              background: 'rgba(232,93,4,0.13)',
              color: '#E85D04',
              padding: '2px 6px', borderRadius: 100,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {tag}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
