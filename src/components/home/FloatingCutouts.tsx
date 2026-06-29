'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { C } from './homeData';

type Cut = {
  src: string; w: number; ratio: number; depth: number; // ratio = h/w; depth = parallax strength
  className: string; rotate: number; floatDur: number; floatDelay: number;
};

// 1–2 of each: food (burger, bubble tea, pizza) + restaurant + creator.
// ratio = natural height / width of the transparent cutout.
const CUTS: Cut[] = [
  { src: '/home/burger.png',     w: 200, ratio: 0.835, depth: 34, rotate: -8, floatDur: 7,   floatDelay: 0,   className: 'left-[5%] top-[26%] hidden sm:block' },
  { src: '/home/bubbletea.png',  w: 92,  ratio: 1.840, depth: 22, rotate: 9,  floatDur: 6.2, floatDelay: 0.6, className: 'left-[9%] bottom-[12%] hidden sm:block' },
  { src: '/home/restaurant.png', w: 180, ratio: 0.930, depth: 40, rotate: 6,  floatDur: 8,   floatDelay: 0.3, className: 'right-[5%] top-[20%] hidden sm:block' },
  { src: '/home/creator.png',    w: 132, ratio: 1.645, depth: 28, rotate: -5, floatDur: 6.8, floatDelay: 0.9, className: 'right-[6%] bottom-[8%] hidden sm:block' },
  { src: '/home/pizza.png',      w: 116, ratio: 0.932, depth: 18, rotate: 14, floatDur: 5.6, floatDelay: 1.2, className: 'left-[43%] top-[4%] hidden lg:block' },
];

function CutImg({ cut, mx, my }: { cut: Cut; mx: any; my: any }) {
  const x = useTransform(mx, (v: number) => v * cut.depth);
  const y = useTransform(my, (v: number) => v * cut.depth);
  const h = Math.round(cut.w * cut.ratio);
  return (
    <motion.div
      className={`absolute ${cut.className} pointer-events-none select-none`}
      style={{ x, y, width: cut.w, height: h }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4 + cut.floatDelay * 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ y: [0, -16, 0], rotate: [cut.rotate, cut.rotate + 2, cut.rotate] }}
        transition={{ duration: cut.floatDur, delay: cut.floatDelay, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.55))' }}
      >
        <Image
          src={cut.src}
          alt=""
          aria-hidden
          width={cut.w}
          height={h}
          sizes={`${cut.w}px`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          priority={cut.depth > 30}
        />
      </motion.div>
    </motion.div>
  );
}

export default function FloatingCutouts() {
  const wrap = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.4 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.4 });

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth, h = window.innerHeight;
      rawX.set((e.clientX / w - 0.5) * 2);   // -1 .. 1
      rawY.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY]);

  return (
    <div ref={wrap} aria-hidden className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
      {/* soft color glows behind cutouts for depth */}
      <div className="absolute left-[4%] top-[26%] w-[260px] h-[260px] rounded-full" style={{ background: C.orange, filter: 'blur(120px)', opacity: 0.14 }} />
      <div className="absolute right-[6%] top-[22%] w-[240px] h-[240px] rounded-full" style={{ background: C.restaurant, filter: 'blur(120px)', opacity: 0.12 }} />
      <div className="absolute right-[10%] bottom-[14%] w-[220px] h-[220px] rounded-full" style={{ background: C.creator, filter: 'blur(120px)', opacity: 0.12 }} />
      {CUTS.map((cut) => (
        <CutImg key={cut.src + cut.className} cut={cut} mx={mx} my={my} />
      ))}
    </div>
  );
}
