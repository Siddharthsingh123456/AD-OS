import { useEffect, useRef, useState } from "react";

const canObserve = () =>
  typeof window !== "undefined" &&
  "IntersectionObserver" in window &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Fades and lifts its children in once, the first time they scroll into view. Renders visible when motion is reduced or unsupported. */
export default function Reveal({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => !canObserve());
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return (
    <Tag ref={ref} className={`${className} reveal${seen ? " in" : ""}`} {...rest}>
      {children}
    </Tag>
  );
}
