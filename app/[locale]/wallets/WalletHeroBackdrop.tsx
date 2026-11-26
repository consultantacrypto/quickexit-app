"use client";

import { useEffect, useRef, type RefObject } from "react";

type Node = { x: number; y: number; vx: number; vy: number };

/**
 * Decorative node field. Mounts after paint, so it is not on the LCP path.
 * The loop stops when the hero is offscreen or the tab is hidden.
 */
export default function WalletHeroBackdrop({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const count = mobile ? 11 : 28;
    const linkDistance = mobile ? 92 : 128;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let frame = 0;
    let alive = true;
    const nodes: Node[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nodes.length === 0) {
        for (let i = 0; i < count; i++) {
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * (mobile ? 0.18 : 0.28),
            vy: (Math.random() - 0.5) * (mobile ? 0.18 : 0.28),
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > linkDistance) continue;
          const alpha = (1 - dist / linkDistance) * 0.28;
          ctx.strokeStyle = `rgba(255, 209, 0, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const node of nodes) {
        ctx.fillStyle = "rgba(255, 244, 194, 0.72)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, mobile ? 1.2 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      if (!alive) return;
      if (!visible || document.visibilityState !== "visible") {
        frame = 0;
        return;
      }
      draw();
      frame = window.requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!alive || frame || !visible || document.visibilityState !== "visible") return;
      frame = window.requestAnimationFrame(loop);
    };

    const onResize = () => resize();
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (visible) kick();
      },
      { threshold: 0.08 },
    );

    resize();
    io.observe(root);
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("resize", onResize);
    kick();

    return () => {
      alive = false;
      if (frame) window.cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("resize", onResize);
    };
  }, [rootRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}
