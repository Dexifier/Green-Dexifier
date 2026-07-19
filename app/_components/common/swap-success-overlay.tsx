"use client";

// Full-screen swap celebration: neon energy burst (canvas particles +
// shockwave rings), a self-drawing checkmark, and a generated success chime.
// Triggered from any flow (wallet / wallet-less) by dispatching
//   window.dispatchEvent(new CustomEvent("dexifier:swap-success"))
// Auto-dismisses after a few seconds or on tap/click.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const SWAP_SUCCESS_EVENT = "dexifier:swap-success";

const PRIMARY = "#13f187";
const PARTICLE_COLORS = ["#13f187", "#13f187", "#7dffce", "#ffffff", "#eafff4"];
const RING_COLOR = "19, 241, 135";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number; // 0..1
  decay: number;
  spin: number;
  angle: number;
};

type Ring = { r: number; max: number; alpha: number; width: number };

// Synthesized fallback if the mp3 can't be loaded/played.
const playFallbackChime = () => {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    // rising sparkle arpeggio
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.55);
    });
    // bass thump
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "triangle";
    bass.frequency.setValueAtTime(160, now);
    bass.frequency.exponentialRampToValueAtTime(55, now + 0.35);
    bassGain.gain.setValueAtTime(0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    bass.connect(bassGain).connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.5);
  } catch {
    /* audio is best-effort */
  }
};

const playSuccessSound = () => {
  const audio = new Audio("/sounds/swap-success.mp3");
  audio.volume = 0.75;
  audio.play().catch(() => playFallbackChime());
  audio.onerror = () => playFallbackChime();
};

const SwapSuccessOverlay = () => {
  const [visible, setVisible] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(hideTimer.current);
  }, []);

  // Canvas particle burst + shockwave rings
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    fit();
    window.addEventListener("resize", fit);

    const cx = () => canvas.width / 2;
    const cy = () => canvas.height / 2;

    const particles: Particle[] = [];
    const count = reduced ? 0 : 160;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (3 + Math.random() * 11) * dpr;
      particles.push({
        x: cx(),
        y: cy(),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2 * dpr,
        size: (1.5 + Math.random() * 3.5) * dpr,
        color: PARTICLE_COLORS[(Math.random() * PARTICLE_COLORS.length) | 0],
        life: 1,
        decay: 0.006 + Math.random() * 0.012,
        spin: (Math.random() - 0.5) * 0.3,
        angle: Math.random() * Math.PI,
      });
    }
    const rings: Ring[] = reduced
      ? []
      : [0, 1, 2].map((i) => ({
          r: 10 * dpr,
          max: (260 + i * 120) * dpr,
          alpha: 0.55 - i * 0.15,
          width: (3 - i * 0.7) * dpr,
        }));

    const gravity = 0.12 * dpr;
    const drag = 0.985;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // shockwave rings
      for (const ring of rings) {
        if (ring.alpha <= 0.01) continue;
        ring.r += (ring.max - ring.r) * 0.06 + 2 * dpr;
        ring.alpha *= 0.965;
        ctx.beginPath();
        ctx.arc(cx(), cy(), ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${RING_COLOR}, ${ring.alpha})`;
        ctx.lineWidth = ring.width;
        ctx.stroke();
      }

      // particles
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) continue;
        alive = true;
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        p.life -= p.decay;
        const a = Math.max(p.life, 0);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * dpr;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      if (alive || rings.some((r) => r.alpha > 0.01)) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", fit);
    };
  }, [visible]);

  // Listen for the celebration trigger
  useEffect(() => {
    const onSuccess = () => {
      setVisible(true);
      playSuccessSound();
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 4600);
    };
    window.addEventListener(SWAP_SUCCESS_EVENT, onSuccess);
    return () => {
      window.removeEventListener(SWAP_SUCCESS_EVENT, onSuccess);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="swap-success"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35 } }}
          onClick={dismiss}
        >
          <canvas ref={canvasRef} className="absolute inset-0 size-full pointer-events-none" />
          <motion.div
            className="relative flex flex-col items-center gap-5 px-6 text-center pointer-events-none"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 220 }}
          >
            {/* self-drawing checkmark */}
            <svg
              viewBox="0 0 120 120"
              className="size-28 md:size-36 drop-shadow-[0_0_25px_rgba(19,241,135,0.65)]"
            >
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={PRIMARY}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="327"
                strokeDashoffset="327"
                className="animate-[draw-ring_0.7s_ease-out_forwards]"
              />
              <path
                d="M38 62 L54 78 L84 46"
                fill="none"
                stroke={PRIMARY}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="70"
                strokeDashoffset="70"
                className="animate-[draw-check_0.45s_ease-out_0.55s_forwards]"
              />
            </svg>
            <div>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold uppercase tracking-[0.25em] text-glow">
                Swap Complete
              </h2>
              <p className="mt-3 text-sm md:text-base uppercase tracking-[0.2em] text-white/60">
                Funds are on their way
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SwapSuccessOverlay;
