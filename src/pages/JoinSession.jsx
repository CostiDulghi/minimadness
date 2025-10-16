import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    // rejoin dacă jucătorul e deja în sesiune
    const stored = localStorage.getItem("player_name");
    if (stored) {
      setName(stored);
      setJoined(true);
    }
  }, []);

  async function join(teamChoice) {
    const { data: gameState } = await supabase
      .from("game_state")
      .select("status")
      .eq("session_code", code)
      .single();

    if (gameState.status !== "waiting")
      return alert("Game already started. Please wait for the next one.");

    await supabase
      .from("players")
      .insert([{ name, team: teamChoice, score: 0, session_code: code }]);
    localStorage.setItem("player_name", name);
    setTeam(teamChoice);
    setJoined(true);
  }

  useEffect(() => {
    const sub = supabase
      .channel("game-state")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
        (payload) => setStatus(payload.new.status)
      )
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [code]);

  if (!joined)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0015] text-white">
        <h1 className="text-4xl mb-6 text-pink-400">Join MiniMadness 🕹️</h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="px-4 py-2 rounded text-black mb-4"
        />
        <div className="flex gap-4">
          <button
            onClick={() => join("blue")}
            disabled={!name}
            className="bg-blue-600 px-6 py-3 rounded"
          >
            Join Blue
          </button>
          <button
            onClick={() => join("red")}
            disabled={!name}
            className="bg-red-600 px-6 py-3 rounded"
          >
            Join Red
          </button>
        </div>
      </div>
    );

  // status în funcție de faza jocului
  if (status === "countdown")
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-5xl text-pink-400 animate-pulse">
        Get Ready...
      </div>
    );

  if (status === "running")
    return (
      <iframe
        title="PlayerGame"
        src={`/playergame/${code}?name=${name}&team=${team}`}
        className="w-full h-screen border-none"
      />
    );

  return (
    <div className="flex items-center justify-center min-h-screen text-white">
      Waiting for the host...
    </div>
  );
}
