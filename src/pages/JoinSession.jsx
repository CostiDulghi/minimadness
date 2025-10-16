import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function joinSession() {
    setLoading(true);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (sessionError || !session) {
      alert("Session not found!");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("players")
      .insert([{ session_code: code.toUpperCase(), name }]);

    setLoading(false);

    if (error) {
      alert("Error joining session!");
      console.error(error);
      return;
    }

    setJoined(true);
  }

  // ascultă modificările de stare a jocului
  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel("game-state")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `session_code=eq.${code.toUpperCase()}`,
        },
        (payload) => {
          const newState = payload.new;
          if (newState.status === "started") {
            setQuestion(newState.question);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code]);

  // trimitere răspuns
  async function submitAnswer() {
    const { error } = await supabase
      .from("answers")
      .insert([
        {
          session_code: code.toUpperCase(),
          answer,
          is_correct: answer.trim() === "4", // test simplu
        },
      ]);

    if (error) {
      alert("Error submitting answer");
      console.error(error);
    } else {
      alert("✅ Answer submitted!");
      setQuestion(null);
      setAnswer("");
    }
  }

  // 🟢 Dacă jucătorul a intrat și jocul a început -> afișează întrebarea
  if (joined && question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h2 className="text-3xl font-bold text-pink-400 mb-6 flex items-center">
          🧠 <span className="ml-2">Question:</span>
        </h2>
        <p className="text-2xl font-semibold mb-8 text-white">{question}</p>

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Your answer..."
          className="border-2 border-pink-400 rounded-lg p-3 text-lg text-center mb-4 
                     bg-white text-black focus:ring-2 focus:ring-pink-500 focus:outline-none"
        />

        <button
          onClick={submitAnswer}
          disabled={!answer}
          className="px-8 py-3 bg-pink-500 text-white rounded-lg text-lg hover:bg-pink-600"
        >
          Submit
        </button>
      </div>
    );
  }

  // 🟠 Dacă s-a alăturat dar jocul nu a început încă
  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <h2 className="text-3xl font-bold text-green-500">✅ Joined!</h2>
        <p className="mt-4 text-lg text-white">
          Welcome, <b>{name}</b> 👋
        </p>
        <p className="mt-2 text-gray-400">Waiting for the host to start...</p>
      </div>
    );
  }

  // 🔵 Formularul de join
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold text-pink-400 mb-8">Join MiniMadness 🕹️</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="border-2 border-gray-300 rounded-lg p-3 text-lg text-center mb-4 
                   bg-white text-black focus:outline-none focus:ring-2 focus:ring-pink-500"
      />

      <button
        onClick={joinSession}
        disabled={loading || !name}
        className={`px-8 py-4 text-lg rounded-xl transition ${
          loading
            ? "bg-gray-400 text-dark"
            : "bg-pink-500 text-white hover:bg-pink-600"
        }`}
      >
        {loading ? "Joining..." : "Join"}
      </button>
    </div>
  );
}
