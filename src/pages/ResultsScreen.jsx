import { useEffect, useState } from "react";
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

  useEffect(() => {
    async function loadResults() {
      setLoading(true);

      // 1️⃣ Luăm răspunsurile pentru întrebarea curentă
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

      // 2️⃣ Actualizăm totalurile din sesiune
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

      setLoading(false);
    }

    loadResults();
  }, [sessionCode, currentQuestion]);

  useEffect(() => {
    gsap.fromTo(
      ".score-card",
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.2 }
    );
  }, [roundScores]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0015] text-white">
        <p className="text-xl">Calculating results...</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white">
      <h1 className="text-4xl font-extrabold text-green-400 mb-2">
        ✅ Correct Answer:
      </h1>
      <h2 className="text-5xl font-bold text-pink-400 mb-10">{correctAnswer}</h2>

      {/* Round results */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-12">
        <div className="score-card bg-blue-900/40 rounded-2xl px-8 py-6 text-center shadow-lg border border-blue-700/40">
          <h3 className="text-3xl font-bold text-blue-300 mb-2">
            🟦 {blueName}
          </h3>
          <p className="text-lg text-gray-300">
            Round Score:{" "}
            <span className="text-white font-semibold">{roundScores.blue}</span>
          </p>
          <p className="text-lg text-gray-300">
            Total:{" "}
            <span className="text-white font-semibold">{totalScores.blue}</span>
          </p>
        </div>

        <div className="score-card bg-red-900/40 rounded-2xl px-8 py-6 text-center shadow-lg border border-red-700/40">
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

      <button
        onClick={onNext}
        className="mt-6 px-8 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-lg font-semibold transition-all duration-300"
      >
        Next Round
      </button>
    </div>
  );
}
