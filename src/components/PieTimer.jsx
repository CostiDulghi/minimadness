// components/PieTimer.jsx
import { useEffect, useState } from "react";

export default function PieTimer({ ms=15000, keySeed=0, onDone }) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
  const start = performance.now();
  let frame;
  const tick = (t) => {
    const elapsed = t - start;
    const remain = Math.max(0, ms - elapsed);
    setLeft(remain);
    if (remain > 0) frame = requestAnimationFrame(tick);
    else onDone?.();
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}, [ms, keySeed]);


  const r = 42, C = 2*Math.PI*r;
  const pct = left/ms;
  return (
    <svg width="120" height="120" className="rotate-[-90deg]">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#2a1a3a" strokeWidth="10"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#ff49a1" strokeWidth="10"
        strokeDasharray={C} strokeDashoffset={(1-pct)*C} strokeLinecap="round"/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        className="rotate-[90deg] fill-white font-semibold">{Math.ceil(left/1000)}s</text>
    </svg>
  );
}
