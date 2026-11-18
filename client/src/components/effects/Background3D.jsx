import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { isLowPower } from "../../lib/perf";

// Where the lattice sits and how loud it is, per kind of page.
function scene(path) {
  if (path.startsWith("/app")) return { x: 0.5, y: 0.52, k: 1.2, a: 0.3 };
  if (path === "/login" || path === "/register") return { x: 0.27, y: 0.5, k: 0.95, a: 0.85 };
  if (path === "/") return { x: 0.74, y: 0.47, k: 1, a: 1 };
  return { x: 0.84, y: 0.4, k: 0.8, a: 0.55 };
}

const HOT = 20,
  GA = Math.PI * (3 - Math.sqrt(5));
const clamp = (v) => Math.max(0, Math.min(1, v));

// A sphere of nodes: 20 bright ones are the modules, wired to one glowing core (the shared AI brain).
function build(N) {
  let seed = 11;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const nodes = Array.from({ length: N }, (_, i) => {
    const y = 1 - (i / (N - 1)) * 2,
      r = Math.sqrt(1 - y * y),
      t = GA * i,
      k = 0.8 + rnd() * 0.4;
    return { x: Math.cos(t) * r * k, y: y * k, z: Math.sin(t) * r * k, px: 0, py: 0, d: 0 };
  });
  const hot = Array.from({ length: HOT }, (_, k) => Math.floor(((k + 0.5) * N) / HOT));
  const seen = new Set(),
    edges = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2])
      .filter(([j]) => j !== i)
      .sort((p, q) => p[1] - q[1])
      .slice(0, 3)
      .forEach(([j]) => {
        const key = i < j ? i + "-" + j : j + "-" + i;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  const packets = Array.from({ length: Math.round(N / 11) }, () => ({
    h: Math.floor(rnd() * HOT),
    t: rnd(),
    v: 0.1 + rnd() * 0.18,
    out: rnd() > 0.5,
  }));
  return { nodes, hot, edges, packets };
}

export default function Background3D() {
  const canvas = useRef(null);
  const { pathname } = useLocation();
  const target = useRef(scene(pathname));
  target.current = scene(pathname);

  useEffect(() => {
    const c = canvas.current,
      ctx = c.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Low-power devices get fewer nodes, no floor grid, a 1x canvas and ~30 fps; everyone else gets the full scene.
    const lite = isLowPower();
    const { nodes, hot, edges, packets } = build(lite ? 80 : 170);
    const cur = { ...target.current };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let w = 0,
      h = 0,
      raf = 0,
      timer = 0,
      last = performance.now(),
      t = 0,
      spin = 0.6;

    const size = () => {
      const dpr = lite ? 1 : Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(0);
    };

    function draw(dt) {
      t += dt;
      const e = reduce ? 1 : Math.min(1, dt * 2.5),
        tg = target.current,
        wide = w > 900;
      cur.x += ((wide ? tg.x : 0.5) - cur.x) * e;
      cur.y += (tg.y - cur.y) * e;
      cur.k += (tg.k - cur.k) * e;
      cur.a += ((wide ? tg.a : tg.a * 0.7) - cur.a) * e;
      const m = Math.min(1, dt * 3);
      mouse.x += (mouse.tx - mouse.x) * m;
      mouse.y += (mouse.ty - mouse.y) * m;
      if (!reduce) spin += dt * 0.11;
      const a = cur.a,
        R = Math.min(w * 0.55, h) * 0.42 * cur.k,
        F = R * 3.4,
        X0 = w * cur.x,
        Y0 = h * cur.y;
      const ry = spin + mouse.x * 0.5 + (reduce ? 0 : window.scrollY * 0.0005),
        rx = 0.32 + mouse.y * 0.28;
      const cY = Math.cos(ry),
        sY = Math.sin(ry),
        cX = Math.cos(rx),
        sX = Math.sin(rx);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      // perspective floor, scrolling toward the viewer
      if (a > 0.05 && !lite) {
        const H = h * 0.6 + mouse.y * 14,
          fy = R * 1.1,
          step = R * 0.55,
          vx = w * 0.5 - mouse.x * 18,
          fa = a * 0.5;
        const sp = (z) => F / (F + z);
        const s0 = sp(-R * 0.9),
          s1 = sp(R * 9);
        for (let i = -14; i <= 14; i++) {
          ctx.strokeStyle = `rgba(95,212,184,${0.12 * fa * (1 - Math.abs(i) / 16)})`;
          ctx.beginPath();
          ctx.moveTo(vx + i * step * s0, H + fy * s0);
          ctx.lineTo(vx + i * step * s1, H + fy * s1);
          ctx.stroke();
        }
        const off = (t * R * 0.1) % step;
        for (let z = -R * 0.9 - off + step; z < R * 9; z += step) {
          const s = sp(z);
          ctx.strokeStyle = `rgba(95,212,184,${0.2 * fa * Math.min(1, s * 1.1)})`;
          ctx.beginPath();
          ctx.moveTo(vx - 14 * step * s, H + fy * s);
          ctx.lineTo(vx + 14 * step * s, H + fy * s);
          ctx.stroke();
        }
      }

      // project the lattice
      const sMin = F / (F + R * 1.2),
        sMax = F / (F - R * 1.2);
      for (const n of nodes) {
        const x1 = n.x * cY + n.z * sY,
          z1 = -n.x * sY + n.z * cY;
        const y2 = n.y * cX - z1 * sX,
          z2 = n.y * sX + z1 * cX,
          s = F / (F + z2 * R);
        n.px = X0 + x1 * R * s;
        n.py = Y0 + y2 * R * s;
        n.d = clamp((s - sMin) / (sMax - sMin));
      }
      for (const [i, j] of edges) {
        const A = nodes[i],
          B = nodes[j],
          d = (A.d + B.d) / 2;
        ctx.strokeStyle = `rgba(95,212,184,${(0.04 + 0.32 * d * d) * a})`;
        ctx.beginPath();
        ctx.moveTo(A.px, A.py);
        ctx.lineTo(B.px, B.py);
        ctx.stroke();
      }
      for (const i of hot) {
        const A = nodes[i];
        ctx.strokeStyle = `rgba(255,181,71,${(0.03 + 0.16 * A.d) * a})`;
        ctx.beginPath();
        ctx.moveTo(A.px, A.py);
        ctx.lineTo(X0, Y0);
        ctx.stroke();
      }
      const hotSet = new Set(hot);
      nodes.forEach((n, i) => {
        if (hotSet.has(i)) return;
        ctx.fillStyle = `rgba(214,242,235,${(0.15 + 0.7 * n.d) * a})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, 0.7 + 1.7 * n.d, 0, 6.2832);
        ctx.fill();
      });
      hot.forEach((i, k) => {
        const n = nodes[i],
          r = (1.6 + 2.6 * n.d) * (1 + 0.2 * Math.sin(t * 2 + k));
        ctx.fillStyle = `rgba(255,181,71,${0.16 * (0.4 + n.d) * a})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, r * 3.2, 0, 6.2832);
        ctx.fill();
        ctx.fillStyle = `rgba(255,196,107,${(0.5 + 0.5 * n.d) * a})`;
        ctx.beginPath();
        ctx.arc(n.px, n.py, r, 0, 6.2832);
        ctx.fill();
      });

      // the core
      const pr = R * 0.55 * (1 + 0.04 * Math.sin(t * 1.6));
      const g = ctx.createRadialGradient(X0, Y0, 0, X0, Y0, pr);
      g.addColorStop(0, `rgba(255,214,150,${0.6 * a})`);
      g.addColorStop(0.25, `rgba(255,181,71,${0.22 * a})`);
      g.addColorStop(0.6, `rgba(95,212,184,${0.08 * a})`);
      g.addColorStop(1, "rgba(95,212,184,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(X0, Y0, pr, 0, 6.2832);
      ctx.fill();

      // data moving between modules and the core
      for (const p of packets) {
        if (!reduce) {
          p.t += dt * p.v;
          if (p.t > 1) {
            p.t = 0;
            p.h = Math.floor(Math.random() * HOT);
            p.out = Math.random() > 0.5;
          }
        }
        const A = nodes[hot[p.h]],
          u = p.out ? 1 - p.t : p.t;
        ctx.fillStyle = `rgba(255,236,200,${0.95 * a * (0.35 + 0.65 * A.d)})`;
        ctx.beginPath();
        ctx.arc(A.px + (X0 - A.px) * u, A.py + (Y0 - A.py) * u, 1.8, 0, 6.2832);
        ctx.fill();
      }
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (lite && now - last < 33) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
    };
    const start = () => {
      if (reduce) {
        timer = setInterval(() => draw(0), 400);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
    const onMove = (e) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };
    const onVis = () => (document.hidden ? stop() : start());

    size();
    start();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="bg3d" aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
