"use client";

import { useEffect, useRef } from "react";

// Energy rays: glowing comet heads flying smooth Lissajous-style paths,
// each leaving a light trail that fades away after ~1.5s.
// Rendered on a single full-screen canvas with additive blending.

type Point = { x: number; y: number };

type Ray = {
  color: string; // "r, g, b"
  // x(t) = w * (0.5  + ax1*sin(t*fx1+px1) + ax2*sin(t*fx2+px2))
  // y(t) = h * (yBase + ay1*cos(t*fy1+py1) + ay2*sin(t*fy2+py2))
  ax1: number;
  ax2: number;
  ay1: number;
  ay2: number;
  fx1: number;
  fx2: number;
  fy1: number;
  fy2: number;
  px1: number;
  px2: number;
  py1: number;
  py2: number;
  yBase: number;
  width: number;
  maxPoints: number;
  points: Point[];
};

// 3 brand-green + 2 cyan rays (palette of the orbs they replace)
const RAY_COLORS = [
  "19, 241, 135",
  "0, 224, 160",
  "19, 241, 135",
  "0, 224, 255",
  "19, 241, 135",
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function EnergyRays() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rays: Ray[] = RAY_COLORS.map((color) => ({
      color,
      ax1: rand(0.3, 0.42),
      ax2: rand(0.06, 0.14),
      ay1: rand(0.16, 0.26),
      ay2: rand(0.05, 0.12),
      fx1: rand(0.00012, 0.00022),
      fx2: rand(0.00035, 0.0006),
      fy1: rand(0.0001, 0.0002),
      fy2: rand(0.0003, 0.00055),
      px1: rand(0, Math.PI * 2),
      px2: rand(0, Math.PI * 2),
      py1: rand(0, Math.PI * 2),
      py2: rand(0, Math.PI * 2),
      yBase: rand(0.28, 0.5),
      width: rand(1.6, 2.6),
      maxPoints: Math.floor(rand(70, 100)),
      points: [],
    }));

    const head = (r: Ray, t: number): Point => ({
      x:
        w *
        (0.5 +
          r.ax1 * Math.sin(t * r.fx1 + r.px1) +
          r.ax2 * Math.sin(t * r.fx2 + r.px2)),
      y:
        h *
        (r.yBase +
          r.ay1 * Math.cos(t * r.fy1 + r.py1) +
          r.ay2 * Math.sin(t * r.fy2 + r.py2)),
    });

    let last = performance.now();

    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const r of rays) {
        const p = head(r, now);
        // After a long pause (hidden tab), restart the trail at the head
        // instead of drawing a straight streak across the screen.
        if (dt > 120 || r.points.length === 0) {
          r.points = [p];
        } else {
          r.points.push(p);
          if (r.points.length > r.maxPoints) r.points.shift();
        }
        const pts = r.points;
        if (pts.length < 2) continue;

        const tail = pts[0];
        // Two passes: wide soft glow, then thin bright core. A tail-to-head
        // gradient makes the trail fade out behind the ray.
        const passes = [
          { lineWidth: r.width * 4, alpha: 0.07 },
          { lineWidth: r.width, alpha: 0.55 },
        ];
        for (const pass of passes) {
          const grad = ctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
          grad.addColorStop(0, `rgba(${r.color}, 0)`);
          grad.addColorStop(0.65, `rgba(${r.color}, ${pass.alpha * 0.35})`);
          grad.addColorStop(1, `rgba(${r.color}, ${pass.alpha})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = pass.lineWidth;
          ctx.beginPath();
          ctx.moveTo(tail.x, tail.y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }

        // Bright head with a soft radial glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r.width * 7);
        glow.addColorStop(0, `rgba(${r.color}, 0.85)`);
        glow.addColorStop(0.35, `rgba(${r.color}, 0.25)`);
        glow.addColorStop(1, `rgba(${r.color}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r.width * 7, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
