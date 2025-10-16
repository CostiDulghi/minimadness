import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { gamingQuestions } from "../data/questions";

export default function QuizGame({
  onFinish,
  sessionCode,
  playerName,
  team,
  isBroadcast = false,
}) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);

  // 📚 Preluăm lista de întrebări
  const questions = gamingQuestions.map((q) => ({
    question: q.q,
    options: q.a,
    answer: q.c,
  }));

  const question = questions[index];

  // 🕒 Sincronizare deadline din game_state
  useEffect(() => {
    if (!sessionCode) return;

    const channel = supabase
      .channel(`game-${sessionCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `session_code=eq.${sessionCode}`,
        },
        (payload) => {
          if (payload.new.question_deadline)
            setDeadline(payload.new.question_deadline);
        }
      )
      .subscribe();

    (async () => {
      const { data } = await supabase
        .from("game_state")
        .select("question_deadline, current_question")
        .eq("session_code", sessionCode)
        .single();

      if (data) {
        setDeadline(data.question_deadline);
        setIndex(data.current_question || 0);
      }
      setLoading(false);
    })();

    return () => supabase.removeChannel(channel);
  }, [sessionCode]);

  // 🧮 Timer sincronizat cu deadline-ul global
  useEffect(() => {
  if (!deadline) return;

  let finished = false;

  const interval = setInterval(() => {
    const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 1000);
    setTimeLeft(diff > 0 ? diff : 0);

    if (diff <= 0 && !finished) {
      finished = true;
      clearInterval(interval);

      if (!isBroadcast) handleAnswer(null, true);
      else {
        console.log("⏰ Countdown ended — showing results");
        onFinish?.();
      }
    }
  }, 250);

  return () => clearInterval(interval);
}, [deadline]);


  // 🧾 Salvare răspuns jucător
  async function handleAnswer(option, auto = false) {
    if (isLocked || isBroadcast) return; // broadcast nu salvează nimic
    setIsLocked(true);
    setSelected(option);

    const isCorrect = option === question.answer;
    const speedBonus = Math.max(0, Math.floor((timeLeft / 10) * 50));
    const score = isCorrect ? 50 + speedBonus : 0;

    await supabase.from("answers").insert([
      {
        session_code: sessionCode,
        player: playerName,
        team,
        question_index: index,
        answer: option,
        is_correct: isCorrect,
        time_left: timeLeft,
        score,
      },
    ]);

    if (auto) return; // auto = timp expirat → așteaptă broadcastul

    setTimeout(() => {
      onFinish?.(); // pentru jucători, merg la waiting screen
    }, 1000);
  }

  if (loading || !question)
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0015] text-white">
        <p className="text-lg">Loading question...</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white text-center">
      <h2 className="text-3xl text-pink-400 mb-6">{question.question}</h2>

      {/* Timer */}
      <div className="relative w-64 h-3 bg-gray-700 rounded-full overflow-hidden mb-8">
        <div
          className="absolute left-0 top-0 h-full bg-pink-500 transition-all duration-250"
          style={{ width: `${(timeLeft / 10) * 100}%` }}
        ></div>
      </div>
      <p className="text-gray-400 mb-4 text-sm">
        Time left: <span className="text-pink-300 font-semibold">{timeLeft}s</span>
      </p>

      {/* Variante */}
      <div className="grid grid-cols-2 gap-4 w-[70%] max-w-2xl">
        {question.options.map((opt) => (
          <button
            key={opt}
            disabled={isLocked || isBroadcast}
            onClick={() => handleAnswer(opt)}
            className={`px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              selected === opt
                ? opt === question.answer
                  ? "bg-green-500 scale-105"
                  : "bg-red-500 scale-95"
                : "bg-purple-700 hover:bg-purple-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <p className="mt-6 text-gray-400 text-sm">
        Question {index + 1} of {questions.length}
      </p>
    </div>
  );
}
