import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { gsap } from "gsap";

export default function WaitingScreen({ message = "Waiting for next round..." }) {
  const containerRef = useRef();
  const bgRef = useRef();

  useEffect(() => {
    // fade-in + ușor bounce
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
    );

    // pulse pe fundal infinit
    gsap.to(bgRef.current, {
      scale: 1.1,
      opacity: 0.9,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white text-center overflow-hidden"
    >
      {/* efect puls fundal */}
      <div
        ref={bgRef}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1),transparent_70%)]"
      ></div>

      {/* conținut */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        <h2 className="text-2xl font-semibold text-pink-300">{message}</h2>
        <p className="text-gray-400 text-sm">
          The host is reviewing results and preparing the next round...
        </p>
      </div>
    </div>
  );
}
