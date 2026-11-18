import { useRef } from "react";

/** Wraps children in a card that leans toward the pointer (3D perspective tilt). */
export default function Tilt({ children, max = 7, className = "" }) {
  const ref = useRef(null);
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const move = (e) => {
    if (calm()) return;
    const el = ref.current,
      r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width,
      py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(1000px) rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg) translateZ(0)`;
    el.style.setProperty("--gx", px * 100 + "%");
    el.style.setProperty("--gy", py * 100 + "%");
  };
  const leave = () => {
    ref.current.style.transform = "";
  };
  return (
    <div ref={ref} className={"tilt " + className} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}
