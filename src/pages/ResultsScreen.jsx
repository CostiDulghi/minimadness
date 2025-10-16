import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function ResultsScreen({
  sessionCode,
  currentQuestion,
  questionText,
  options,
  correctAnswer,
  blueScore,
  redScore,
  blueName = "Blue",
  redName = "Red",
  onNext,
}) {
  const containerRef = useRef();
  const blueRef = useRef();
  const redRef = useRef();

  useEffect(() => {
    gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" });
    gsap.fromTo(blueRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.1 });
    gsap.fromTo(redRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.2 });

    const t = setTimeout(() => onNext?.(), 3000); // brief pause, then next question (no extra countdown)
    return () => clearTimeout(t);
  }, [blueScore, redScore, correctAnswer, onNext]);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen text-white text-center bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015]">
      <h2 className="text-3xl text-pink-400 mb-4">Correct answer</h2>
      <p className="text-xl text-white/90 mb-6 max-w-3xl">{questionText}</p>

      {/* Options with correct highlighted */}
      <div className="grid grid-cols-2 gap-4 w-[70%] max-w-2xl mb-10">
        {options.map((opt) => {
          const isCorrect = opt === correctAnswer;
          return (
            <div
              key={opt}
              className={`px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
                isCorrect ? "bg-green-600 border-2 border-green-300 scale-105" : "bg-purple-900/60"
              }`}
            >
              {opt}
            </div>
          );
        })}
      </div>

      {/* Team totals */}
      <div className="grid grid-cols-2 gap-8 w-[80%] max-w-3xl">
        <div ref={blueRef} className="p-6 rounded-2xl bg-blue-900/40 border border-blue-600/40 shadow">
          <div className="text-blue-300 text-xl mb-2">🟦 {blueName}</div>
          <div className="text-5xl font-extrabold">{blueScore}</div>
        </div>
        <div ref={redRef} className="p-6 rounded-2xl bg-pink-900/40 border border-pink-600/40 shadow">
          <div className="text-pink-300 text-xl mb-2">🟥 {redName}</div>
          <div className="text-5xl font-extrabold">{redScore}</div>
        </div>
      </div>

      <p className="mt-8 text-gray-400">Question #{currentQuestion + 1}</p>
    </div>
  );
}
