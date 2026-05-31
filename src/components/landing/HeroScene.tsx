'use client';

// Main 3D hero scene — React Three Fiber Canvas.
// Composes FoodPlate, ParticleSystem, FloatingDealCard, and LightRays.
// Handles intro animation via a shared introProgress ref (0→1 over ~5s).
// Mouse/gyro parallax moves the camera subtly.

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import FoodPlate       from './FoodPlate';
import ParticleSystem  from './ParticleSystem';
import FloatingDealCard from './FloatingDealCard';
import LightRays       from './LightRays';
import HeroFallback    from './HeroFallback';

// ─── Deal card data ────────────────────────────────────────────────────────────

const DEAL_CARDS = [
  { emoji: '🍛', title: '30% Off Full Menu',     restaurant: 'Nirvana Restaurant',   discount: '30% OFF', tag: 'dine-in', radius: 2.9, startAngle: 0.5,  speed:  0.13, height:  0.4 },
  { emoji: '🍣', title: 'Free Appetizer',          restaurant: 'Tokyo Garden',         discount: 'FREE',    tag: 'pickup',  radius: 3.3, startAngle: 2.1,  speed: -0.09, height: -0.3 },
  { emoji: '🥩', title: '$10 Off $40+',            restaurant: 'Lancaster Smokehouse', discount: '$10',     tag: 'dine-in', radius: 2.7, startAngle: 4.0,  speed:  0.16, height:  0.7 },
  { emoji: '🍕', title: 'BOGO Entrée',             restaurant: 'Pizza Nova',           discount: 'BOGO',    tag: 'pickup',  radius: 3.6, startAngle: 1.2,  speed: -0.11, height: -0.5 },
  { emoji: '🍜', title: 'Free Dessert w/ Any $30', restaurant: 'Pho House',            discount: 'FREE',    tag: 'dine-in', radius: 3.0, startAngle: 3.5,  speed:  0.08, height:  0.1 },
];

// ─── Camera rig — mouse / gyro parallax ───────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const mouse      = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      mouse.current.x = Math.max(-1, Math.min(1, e.gamma / 30));
      mouse.current.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, []);

  useFrame((_, delta) => {
    const speed  = Math.min(1, delta * 2.5);
    const tx     = mouse.current.x * 1.6;
    const ty     = 1.0 + mouse.current.y * 0.7;
    camera.position.x += (tx - camera.position.x) * speed;
    camera.position.y += (ty - camera.position.y) * speed;
    camera.lookAt(0, 0.3, 0);
  });

  return null;
}

// ─── Intro animation driver — advances introProgress ref ──────────────────────

function IntroDriver({
  introProgress,
  skipIntro,
}: {
  introProgress: React.MutableRefObject<number>;
  skipIntro:     React.MutableRefObject<boolean>;
}) {
  useFrame((_, delta) => {
    if (skipIntro.current) {
      introProgress.current = 1;
      return;
    }
    // Ramp from 0 → 1 over ~5 seconds
    introProgress.current = Math.min(1, introProgress.current + delta * 0.2);
  });
  return null;
}

// ─── Floor — dark reflective plane ────────────────────────────────────────────

function Floor({ introProgress }: { introProgress: React.MutableRefObject<number> }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    if (!mat.current) return;
    const vis = Math.max(0, Math.min(1, (introProgress.current - 0.15) / 0.4));
    mat.current.opacity = vis * 0.4;
  });

  return (
    <mesh position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[22, 22]} />
      <meshStandardMaterial
        ref={mat}
        color="#0A0A0A"
        metalness={0.85}
        roughness={0.15}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

// ─── Full 3D scene composition ────────────────────────────────────────────────

function Scene({
  introProgress,
  skipIntro,
  particleCount,
  showCards,
}: {
  introProgress: React.MutableRefObject<number>;
  skipIntro:     React.MutableRefObject<boolean>;
  particleCount: number;
  showCards:     boolean;
}) {
  return (
    <>
      <IntroDriver introProgress={introProgress} skipIntro={skipIntro} />
      <CameraRig />

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      {/* Warm orange key light from above */}
      <pointLight position={[0, 4.5, 1]} intensity={3} color="#FF7A30" distance={12} decay={2} />
      {/* Cool fill light from side */}
      <pointLight position={[-4, 1.5, 3]} intensity={0.6} color="#3B82F6" distance={12} decay={2} />
      {/* Rim light from behind */}
      <pointLight position={[0, 0, -5]} intensity={1.2} color="#E85D04" distance={10} decay={2} />

      <LightRays       introProgress={introProgress} />
      <FoodPlate       introProgress={introProgress} />
      <ParticleSystem  count={particleCount} introProgress={introProgress} />
      <Floor           introProgress={introProgress} />

      {showCards && DEAL_CARDS.map((card, i) => (
        <FloatingDealCard
          key={i}
          {...card}
          index={i}
          introProgress={introProgress}
        />
      ))}
    </>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export default function HeroScene() {
  const introProgress  = useRef(0);
  const skipIntro      = useRef(false);
  const [ready,    setReady]    = useState(false);
  const [fallback, setFallback] = useState(false);

  // Detect device capabilities
  const isMobile       = typeof window !== 'undefined' && window.innerWidth < 768;
  const particleCount  = isMobile ? 80 : 200;
  const showCards      = !isMobile;

  useEffect(() => {
    // Low-end device detection: fewer than 4 logical cores → CSS fallback
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4) {
      setFallback(true);
      return;
    }

    // Reduced-motion preference → skip intro, show static scene
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Return visit this session → skip intro animation
    const alreadySeen = sessionStorage.getItem('rp_hero_seen') === '1';

    if (reducedMotion || alreadySeen) {
      skipIntro.current = true;
      introProgress.current = 1;
    } else {
      sessionStorage.setItem('rp_hero_seen', '1');
    }

    setReady(true);
  }, []);

  if (fallback) return <HeroFallback />;
  if (!ready)   return <HeroFallback />;

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      camera={{ position: [0, 1, 6], fov: 45 }}
      dpr={isMobile ? [0.5, 1] : [0.75, 1.5]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      shadows
    >
      <color attach="background" args={['#0A0A0A']} />
      <fog attach="fog" args={['#0C0806', 9, 24]} />

      <Suspense fallback={null}>
        <Scene
          introProgress={introProgress}
          skipIntro={skipIntro}
          particleCount={particleCount}
          showCards={showCards}
        />
      </Suspense>
    </Canvas>
  );
}
