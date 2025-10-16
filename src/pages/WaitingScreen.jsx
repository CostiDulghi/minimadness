import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Loader2 } from "lucide-react";

export default function WaitingScreen({ message = "Please wait..." }) {
  const containerRef = useRef();
  const dotsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Fade-in
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.97 },
      { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
    );

    // Pulse the dots
    dotsRef.current.forEach((dot, i) => {
      gsap.to(dot, {
        opacity: 0.3,
        yoyo: true,
        repeat: -1,
        delay: i * 0.2,
        duration: 0.6,
        ease: "sine.inOut",
      });
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white text-center overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1),transparent_70%)] blur-2xl pointer-events-none"></div>

      <Loader2 className="w-14 h-14 text-pink-400 animate-spin mb-6 drop-shadow-[0_0_20px_rgba(255,100,200,0.5)]" />

      <h2 className="text-3xl font-bold text-pink-300 mb-3">{message}</h2>

      <div className="flex gap-2 justify-center mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            ref={(el) => (dotsRef.current[i] = el)}
            className="w-3 h-3 rounded-full bg-pink-400"
          ></div>
        ))}
      </div>
    </div>
  );
}
