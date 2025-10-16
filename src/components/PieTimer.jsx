// components/PieTimer.jsx
import { useEffect, useState } from "react";

export default function PieTimer({ ms=15000, keySeed=0, onDone }) {
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    setLeft(ms);
    const t = setInterval(() => setLeft(v => {
      if (v <= 50) { clearInterval(t); onDone?.(); return 0; }
      return v-50;
    }), 50);
    return () => clearInterval(t);
  }, [ms, keySeed, onDone]);

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
