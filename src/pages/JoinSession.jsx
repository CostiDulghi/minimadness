import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");

  async function joinSession() {
    setLoading(true);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .single();

    if (sessionError || !session) {
      alert("Session not found!");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("players")
      .insert([{ session_code: code, name }]);

    setLoading(false);

    if (error) {
      alert("Error joining session!");
      console.error(error);
      return;
    }

    setJoined(true);
  }

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
          filter: `session_code=eq.${code}`,
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

  if (joined && question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-3xl font-bold text-primary mb-6">
          🧠 Question:
        </h2>
        <p className="text-2xl font-semibold mb-8">{question}</p>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-3xl font-bold text-green-500">✅ Joined!</h2>
        <p className="mt-4 text-lg">Welcome, <b>{name}</b> 👋</p>
        <p className="mt-2 text-gray-600">Waiting for the host to start...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold text-primary mb-8">Join MiniMadness 🕹️</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        className="border-2 border-gray-300 rounded-lg p-3 text-lg text-center mb-4"
      />

      <button
        onClick={joinSession}
        disabled={loading || !name}
        className={`px-8 py-4 text-lg rounded-xl transition ${
          loading ? "bg-gray-400 text-dark" : "bg-primary text-dark hover:bg-secondary"
        }`}
      >
        {loading ? "Joining..." : "Join"}
      </button>
    </div>
  );
}
