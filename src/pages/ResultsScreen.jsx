import { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { gsap } from "gsap";

export default function ResultsScreen({
  sessionCode,
  currentQuestion,
  correctAnswer,
  blueName = "Blue",
  redName = "Red",
  onNext,
}) {
  const [roundScores, setRoundScores] = useState({ blue: 0, red: 0 });
  const [totalScores, setTotalScores] = useState({ blue: 0, red: 0 });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef();

  useEffect(() => {
    async function loadResults() {
      setLoading(true);

      // 1️⃣ Răspunsuri curente
      const { data: answers, error } = await supabase
        .from("answers")
        .select("team, score")
        .eq("session_code", sessionCode)
        .eq("question_index", currentQuestion);

      if (error) {
        console.error("Error loading answers:", error);
        setLoading(false);
        return;
      }

      const avg = (arr) =>
        arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

      const blueScores = answers.filter((a) => a.team === "blue").map((a) => a.score);
      const redScores = answers.filter((a) => a.team === "red").map((a) => a.score);

      const blueAvg = avg(blueScores);
      const redAvg = avg(redScores);

      setRoundScores({ blue: blueAvg, red: redAvg });

      // 2️⃣ Actualizăm scorurile totale
      const { data: session } = await supabase
        .from("sessions")
        .select("blue_total, red_total")
        .eq("code", sessionCode)
        .single();

      const blueTotal = (session?.blue_total || 0) + blueAvg;
      const redTotal = (session?.red_total || 0) + redAvg;

      setTotalScores({ blue: blueTotal, red: redTotal });

      await supabase
        .from("sessions")
        .update({
          blue_total: blueTotal,
          red_total: redTotal,
        })
        .eq("code", sessionCode);

      // 3️⃣ Persistăm scorurile și răspunsul corect în game_state (reziliență la refresh)
      await supabase
        .from("game_state")
        .update({
          correct_answer: correctAnswer,
          blue_score: blueAvg,
          red_score: redAvg,
        })
        .eq("session_code", sessionCode);

      setLoading(false);
    }

    loadResults();
  }, [sessionCode, currentQuestion]);

  // 🌀 Animații GSAP
  useEffect(() => {
    if (!loading && containerRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        ".correct-answer",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
      )
        .fromTo(
          ".score-card",
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.25, ease: "power3.out" },
          "-=0.2"
        )
        .fromTo(
          ".next-btn",
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
          "-=0.1"
        );
    }
  }, [loading]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0015] text-white text-xl">
        Calculating results...
      </div>
    );

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white overflow-hidden"
    >
      {/* Răspuns corect */}
      <h1 className="text-4xl font-extrabold text-green-400 mb-3 correct-answer">
        ✅ Correct Answer:
      </h1>
      <h2 className="text-6xl font-bold text-pink-400 mb-12 drop-shadow-[0_0_20px_rgba(255,100,200,0.6)] correct-answer">
        {correctAnswer || "?"}
      </h2>

      {/* Scoruri */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-12">
        <div className="score-card bg-blue-900/40 rounded-2xl px-10 py-6 text-center shadow-lg border border-blue-700/40 backdrop-blur-md">
          <h3 className="text-3xl font-bold text-blue-300 mb-2">🟦 {blueName}</h3>
          <p className="text-lg text-gray-300">
            Round Score:{" "}
            <span className="text-white font-semibold">{roundScores.blue}</span>
          </p>
          <p className="text-lg text-gray-300">
            Total:{" "}
            <span className="text-white font-semibold">{totalScores.blue}</span>
          </p>
        </div>

        <div className="score-card bg-red-900/40 rounded-2xl px-10 py-6 text-center shadow-lg border border-red-700/40 backdrop-blur-md">
          <h3 className="text-3xl font-bold text-red-300 mb-2">🟥 {redName}</h3>
          <p className="text-lg text-gray-300">
            Round Score:{" "}
            <span className="text-white font-semibold">{roundScores.red}</span>
          </p>
          <p className="text-lg text-gray-300">
            Total:{" "}
            <span className="text-white font-semibold">{totalScores.red}</span>
          </p>
        </div>
      </div>

      {/* Buton Next */}
      <button
        onClick={onNext}
        className="next-btn mt-8 px-10 py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-lg font-semibold shadow-[0_0_25px_rgba(255,0,150,0.4)] hover:shadow-[0_0_35px_rgba(255,0,150,0.7)] transition-all duration-300"
      >
        Next Round →
      </button>
    </div>
  );
}
