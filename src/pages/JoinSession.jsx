import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [joined, setJoined] = useState(false);

  async function join(teamChoice) {
    const { data: session } = await supabase.from("sessions").select("*").eq("code", code).single();
    if (!session) return alert("Session not found!");
    await supabase.from("players").insert([{ name, team: teamChoice, session_code: code }]);
    setTeam(teamChoice);
    setJoined(true);
  }

  async function movePaddle(direction) {
    if (!joined) return;
    await supabase
      .from("players")
      .update({
        paddle_y: direction === "up" ? supabase.rpc("decrease_paddle_y") : supabase.rpc("increase_paddle_y"),
      })
      .eq("session_code", code)
      .eq("team", team);
  }

  if (!joined)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0015] text-white">
        <h1 className="text-3xl mb-4 text-pink-400">Join Pong Battle</h1>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-2 rounded text-black mb-4"
        />
        <div className="flex gap-4">
          <button
            onClick={() => join("blue")}
            disabled={!name}
            className="px-6 py-3 bg-blue-600 rounded"
          >
            Join Blue
          </button>
          <button
            onClick={() => join("red")}
            disabled={!name}
            className="px-6 py-3 bg-red-600 rounded"
          >
            Join Red
          </button>
        </div>
      </div>
    );

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen ${
        team === "blue" ? "bg-blue-900" : "bg-red-900"
      }`}
    >
      <h2 className="text-white text-2xl mb-6">Control your paddle</h2>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => movePaddle("up")}
          className="bg-white text-black px-12 py-8 rounded-lg active:scale-95"
        >
          ▲
        </button>
        <button
          onClick={() => movePaddle("down")}
          className="bg-white text-black px-12 py-8 rounded-lg active:scale-95"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
