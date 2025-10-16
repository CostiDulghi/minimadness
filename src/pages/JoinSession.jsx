import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);

  async function joinSession() {
    const { data: session } = await supabase.from("sessions").select("*").eq("code", code).single();
    if (!session) return alert("Session not found!");

    await supabase.from("players").insert([{ session_code: code, name, score: 0 }]);
    setJoined(true);
  }

  // ascultă schimbări la game_state
  useEffect(() => {
    if (!joined) return;
    const channel = supabase
      .channel("game-state")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
        (payload) => {
          const newQ = payload.new.question;
          setQuestion(newQ);
          setTimeLeft(15);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [joined]);

  // timer local
  useEffect(() => {
    if (!question) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [question]);

  async function submitAnswer() {
    if (!answer) return;
    await supabase.from("answers").insert([{ session_code: code, player_name: name, answer }]);
    setAnswer("");
  }

  if (!joined)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0015] text-white">
        <h1 className="text-3xl mb-6 text-pink-400">Join MiniMadness</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="px-4 py-2 rounded text-black mb-4"
        />
        <button
          onClick={joinSession}
          className="bg-pink-600 px-6 py-2 rounded hover:bg-pink-700"
          disabled={!name}
        >
          Join
        </button>
      </div>
    );

  if (!question)
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-[#0B0015]">
        Waiting for host to start...
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0015] text-white">
      <h2 className="text-2xl text-pink-400 mb-4">🧠 Question:</h2>
      <p className="text-xl mb-4">{question}</p>
      <p className="text-yellow-400 mb-2">⏳ {timeLeft}s</p>
      <input
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="px-4 py-2 rounded text-black mb-3"
        placeholder="Your answer..."
      />
      <button
        onClick={submitAnswer}
        disabled={!answer || timeLeft === 0}
        className="bg-pink-600 px-6 py-2 rounded hover:bg-pink-700"
      >
        Submit
      </button>
    </div>
  );
}
