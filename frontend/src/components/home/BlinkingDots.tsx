"use client";

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  color: string;
  base: number; // resting brightness, so stars never fully vanish together
}

const COLORS = ["216,140,255", "190,120,240", "240,170,255", "255,255,255", "255,255,255", "200,215,255"];

/** A field of twinkling stars. Decorative; sits behind page content. */
export function BlinkingDots({ density = 1 / 1800 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const layout = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = Array.from({ length: Math.round(w * h * density) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.06 ? 1.6 + Math.random() * 0.9 : 0.4 + Math.random() * 1.0,
        speed: 0.5 + Math.random() * 2.2,
        base: Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        // Two out-of-sync waves give an irregular twinkle; the power sharpens it into brief flashes.
        const tt = (t / 1000) * d.speed + d.phase;
        const wave = (Math.sin(tt) + Math.sin(tt * 2.7 + d.phase * 3)) / 4 + 0.5;
        const a = reduced ? 0.6 : d.base + (1 - d.base) * wave ** 3;
        ctx.fillStyle = `rgba(${d.color},${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (0.7 + 0.3 * a), 0, Math.PI * 2);
        ctx.fill();
        if (d.r > 1.6 && a > 0.35) {
          // Bright stars get a soft glow and a small cross sparkle at their peak.
          const g = d.r * 5 * a;
          ctx.fillStyle = `rgba(${d.color},${(a * 0.12).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y, g, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(${d.color},${(a * 0.5).toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(d.x - g * 1.6, d.y);
          ctx.lineTo(d.x + g * 1.6, d.y);
          ctx.moveTo(d.x, d.y - g * 1.6);
          ctx.lineTo(d.x, d.y + g * 1.6);
          ctx.stroke();
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    layout();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => {
      layout();
      if (reduced) draw(0);
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
