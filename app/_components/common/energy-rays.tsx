"use client";

import { useEffect, useRef } from "react";

// Energy atmosphere, three systems on two canvases:
// 1. Rays — glowing comet heads in three parallax depth layers (far: thin,
//    dim, slow / near: thick, bright, fast) flying Lissajous paths, each
//    with a light trail that fades after ~1-2s. Several rays are followers:
//    they lean toward the pointer and orbit it while it's active.
// 2. Fog — a low-res persistence canvas where ray heads stamp soft light
//    that fades over ~4s. The pointer parts the fog like a flashlight.
// 3. Dust — tiny drifting, twinkling motes so the darkness has texture.
// Everything is time-based (not frame-count-based) so it survives low fps.

type TrailPoint = { x: number; y: number; t: number };

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
  alpha: number; // depth multiplier
  trailMs: number;
  glowR: number; // head glow radius factor
  fogR: number; // fog blot radius factor
  pull: number; // pointer attraction strength (0 = pure wanderer)
  orbitR: number; // orbit radius around the pointer (px)
  orbitW: number; // orbit angular speed (rad/ms)
  orbitP: number; // orbit phase
  points: TrailPoint[];
  fogAcc: number;
  lastX: number;
  lastY: number;
};

type Mote = {
  color: string;
  x0: number; // fraction of screen
  y0: number;
  vx: number; // fraction per ms
  vy: number;
  size: number;
  baseA: number;
  twF: number; // twinkle frequency (rad/ms)
  twP: number; // twinkle phase
};

type LayerCfg = {
  count: number;
  followers: number; // how many rays in this layer chase the pointer
  pull: [number, number]; // attraction strength range
  width: [number, number];
  alpha: number;
  speed: number;
  trail: [number, number];
  glowR: number;
  fogR: number;
};

// Only the far layer: two thin, dim, slow wanderers.
const LAYERS: LayerCfg[] = [
  { count: 2, followers: 0, pull: [0, 0], width: [0.8, 1.3], alpha: 0.35, speed: 0.65, trail: [1000, 1400], glowR: 5, fogR: 18 },
];

// green-biased brand palette (cycled per ray)
const RAY_COLORS = ["19, 241, 135", "19, 241, 135", "0, 224, 160", "0, 224, 255"];
// white-biased dust palette
const DUST_COLORS = ["255, 255, 255", "255, 255, 255", "19, 241, 135", "0, 224, 255", "0, 224, 160"];

const FOG_SCALE = 0.5; // fog canvas renders at half resolution (naturally soft)
const FOG_ERASE_RADIUS = 260; // pointer flashlight radius (CSS px)
const POINTER_IDLE_MS = 2500; // disengage after this much pointer silence
const TAU = Math.PI * 2;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function EnergyRays() {
  const fogRef = useRef<HTMLCanvasElement>(null);
  const sharpRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fogCanvas = fogRef.current;
    const sharpCanvas = sharpRef.current;
    if (!fogCanvas || !sharpCanvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fctx = fogCanvas.getContext("2d");
    const sctx = sharpCanvas.getContext("2d");
    if (!fctx || !sctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w * dpr > 2600) dpr = 2600 / w;
      sharpCanvas.width = Math.floor(w * dpr);
      sharpCanvas.height = Math.floor(h * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fogCanvas.width = Math.floor(w * FOG_SCALE);
      fogCanvas.height = Math.floor(h * FOG_SCALE);
      fctx.setTransform(FOG_SCALE, 0, 0, FOG_SCALE, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // pointer state: raw target, smoothed position, engagement envelope
    const pointer = {
      x: w / 2,
      y: h / 2,
      sx: w / 2,
      sy: h / 2,
      env: 0,
      lastMove: -1e9,
    };
    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.lastMove = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });

    const smallScreen = w < 768;

    const rays: Ray[] = LAYERS.flatMap((layer, li) => {
      const count = smallScreen ? Math.ceil(layer.count / 2) : layer.count;
      const followers = Math.min(layer.followers, count);
      return Array.from({ length: count }, (_, i) => {
        const isFollower = i < followers;
        return {
          color: RAY_COLORS[(li * 5 + i) % RAY_COLORS.length],
          ax1: rand(0.3, 0.42),
          ax2: rand(0.06, 0.14),
          ay1: rand(0.16, 0.26),
          ay2: rand(0.05, 0.12),
          fx1: rand(0.00012, 0.00022) * layer.speed,
          fx2: rand(0.00035, 0.0006) * layer.speed,
          fy1: rand(0.0001, 0.0002) * layer.speed,
          fy2: rand(0.0003, 0.00055) * layer.speed,
          px1: rand(0, TAU),
          px2: rand(0, TAU),
          py1: rand(0, TAU),
          py2: rand(0, TAU),
          yBase: rand(0.26, 0.52),
          width: rand(layer.width[0], layer.width[1]),
          alpha: layer.alpha,
          trailMs: rand(layer.trail[0], layer.trail[1]),
          glowR: layer.glowR,
          fogR: layer.fogR,
          pull: isFollower ? rand(layer.pull[0], layer.pull[1]) : 0,
          orbitR: rand(50, 130),
          orbitW: rand(0.0004, 0.0009) * (Math.random() < 0.5 ? -1 : 1),
          orbitP: rand(0, TAU),
          points: [],
          fogAcc: 0,
          lastX: 0,
          lastY: 0,
        };
      });
    });

    const motes: Mote[] = Array.from({ length: smallScreen ? 60 : 130 }, (_, i) => ({
      color: DUST_COLORS[i % DUST_COLORS.length],
      x0: Math.random(),
      y0: Math.random(),
      vx: rand(-0.000008, 0.000008),
      vy: rand(-0.000004, 0.000004),
      size: rand(0.6, 1.7),
      baseA: rand(0.1, 0.38),
      twF: rand(0.0006, 0.0022),
      twP: rand(0, TAU),
    }));

    const head = (r: Ray, t: number): TrailPoint => {
      let x =
        w *
        (0.5 +
          r.ax1 * Math.sin(t * r.fx1 + r.px1) +
          r.ax2 * Math.sin(t * r.fx2 + r.px2));
      let y =
        h *
        (r.yBase +
          r.ay1 * Math.cos(t * r.fy1 + r.py1) +
          r.ay2 * Math.sin(t * r.fy2 + r.py2));
      // followers lean toward the pointer and circle it; the engagement
      // envelope eases the blend in/out so there are no jumps
      if (r.pull > 0 && pointer.env > 0.001) {
        const osc = 0.8 + 0.4 * Math.sin(t * 0.0005 + r.px1);
        const f = Math.min(0.6, r.pull * osc) * pointer.env;
        const ang = t * r.orbitW + r.orbitP;
        const tx = pointer.sx + Math.cos(ang) * r.orbitR;
        const ty = pointer.sy + Math.sin(ang) * r.orbitR;
        x += (tx - x) * f;
        y += (ty - y) * f;
      }
      return { x, y, t };
    };

    const stampFog = (r: Ray, x: number, y: number) => {
      const radius = r.width * r.fogR;
      const g = fctx.createRadialGradient(x, y, 0, x, y, radius);
      const a = Math.min(0.06 * r.alpha, 0.08);
      g.addColorStop(0, `rgba(${r.color}, ${a})`);
      g.addColorStop(1, `rgba(${r.color}, 0)`);
      fctx.fillStyle = g;
      fctx.beginPath();
      fctx.arc(x, y, radius, 0, TAU);
      fctx.fill();
    };

    let last = performance.now();

    const frame = (now: number) => {
      const dt = now - last;
      last = now;

      // pointer engagement + smoothing (time-based)
      const engaged = now - pointer.lastMove < POINTER_IDLE_MS ? 1 : 0;
      pointer.env += (engaged - pointer.env) * Math.min(1, dt / 400);
      const pk = Math.min(1, dt / 120);
      pointer.sx += (pointer.x - pointer.sx) * pk;
      pointer.sy += (pointer.y - pointer.sy) * pk;

      // --- fog: time-based fade (90% gone every ~4s at any frame rate) ---
      fctx.globalCompositeOperation = "destination-out";
      fctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, 1 - Math.pow(0.1, dt / 4000))})`;
      fctx.fillRect(0, 0, w, h);
      // flashlight: the pointer parts the fog, rays refill it over time
      if (pointer.env > 0.001) {
        const ea = Math.min(1, dt / 90) * pointer.env;
        const eg = fctx.createRadialGradient(
          pointer.sx, pointer.sy, 0,
          pointer.sx, pointer.sy, FOG_ERASE_RADIUS
        );
        eg.addColorStop(0, `rgba(0, 0, 0, ${ea.toFixed(3)})`);
        eg.addColorStop(1, "rgba(0, 0, 0, 0)");
        fctx.fillStyle = eg;
        fctx.beginPath();
        fctx.arc(pointer.sx, pointer.sy, FOG_ERASE_RADIUS, 0, TAU);
        fctx.fill();
      }
      fctx.globalCompositeOperation = "lighter";

      // --- sharp canvas ---
      sctx.clearRect(0, 0, w, h);
      sctx.globalCompositeOperation = "lighter";
      sctx.lineCap = "round";
      sctx.lineJoin = "round";

      // dust
      for (const m of motes) {
        const mx = (((m.x0 + m.vx * now) % 1) + 1) % 1 * w;
        const my = (((m.y0 + m.vy * now) % 1) + 1) % 1 * h;
        const a = m.baseA * (0.55 + 0.45 * Math.sin(now * m.twF + m.twP));
        sctx.fillStyle = `rgba(${m.color}, ${a.toFixed(3)})`;
        sctx.beginPath();
        sctx.arc(mx, my, m.size, 0, TAU);
        sctx.fill();
      }

      // rays
      for (const r of rays) {
        const p = head(r, now);
        // Only a genuine pause (hidden tab) restarts the trail.
        if (dt > 500 || r.points.length === 0) {
          r.points = [p];
          r.lastX = p.x;
          r.lastY = p.y;
          r.fogAcc = 0;
        } else {
          r.points.push(p);
          while (r.points.length > 2 && now - r.points[0].t > r.trailMs) {
            r.points.shift();
          }
          // fog stamps: distance-based so brightness is fps-independent
          r.fogAcc += Math.hypot(p.x - r.lastX, p.y - r.lastY);
          r.lastX = p.x;
          r.lastY = p.y;
          const step = r.width * 10;
          let stamps = 0;
          while (r.fogAcc > step && stamps < 4) {
            r.fogAcc -= step;
            stampFog(r, p.x, p.y);
            stamps++;
          }
        }
        const pts = r.points;
        if (pts.length < 2) continue;

        const tail = pts[0];
        // wide soft glow pass, then thin bright core pass; tail-to-head
        // gradient fades the trail out behind the ray
        const passes = [
          { lineWidth: r.width * 4, alpha: 0.09 * r.alpha },
          { lineWidth: r.width, alpha: Math.min(1, 0.65 * r.alpha) },
        ];
        for (const pass of passes) {
          const grad = sctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
          grad.addColorStop(0, `rgba(${r.color}, 0)`);
          grad.addColorStop(0.65, `rgba(${r.color}, ${(pass.alpha * 0.35).toFixed(3)})`);
          grad.addColorStop(1, `rgba(${r.color}, ${pass.alpha.toFixed(3)})`);
          sctx.strokeStyle = grad;
          sctx.lineWidth = pass.lineWidth;
          sctx.beginPath();
          sctx.moveTo(tail.x, tail.y);
          for (let i = 1; i < pts.length; i++) sctx.lineTo(pts[i].x, pts[i].y);
          sctx.stroke();
        }

        // bright head with a soft radial glow
        const hr = r.width * r.glowR;
        const glow = sctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, hr);
        glow.addColorStop(0, `rgba(${r.color}, ${(0.85 * r.alpha).toFixed(3)})`);
        glow.addColorStop(0.35, `rgba(${r.color}, ${(0.25 * r.alpha).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${r.color}, 0)`);
        sctx.fillStyle = glow;
        sctx.beginPath();
        sctx.arc(p.x, p.y, hr, 0, TAU);
        sctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <>
      <canvas
        ref={fogRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <canvas
        ref={sharpRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </>
  );
}
