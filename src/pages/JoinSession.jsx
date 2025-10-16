import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gamepad2 } from "lucide-react";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function join(team) {
    setLoading(true);
    const { data: gs } = await supabase.from("game_state").select("join_locked").eq("session_code", code).single();
    if (gs?.join_locked) return alert("Game already started!");
    await supabase.from("players").insert([{ name, team, session_code: code }]);
    localStorage.setItem("mm_name", name);
    localStorage.setItem("mm_team", team);
    setLoading(false);
    window.location.reload();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.15),transparent_60%)] animate-pulse"></div>

      <div className="relative z-10 text-center px-6">
        <h1 className="text-4xl font-bold text-pink-400 mb-3 flex justify-center items-center gap-2">
          Join MiniMadness <Gamepad2 className="text-pink-500 w-8 h-8" />
        </h1>

        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-6 w-64 text-center p-3 rounded-xl bg-white/90 text-black text-lg focus:ring-2 focus:ring-pink-400 outline-none"
        />

        <div className="flex justify-center gap-6 mt-6">
          <button
            disabled={!name || loading}
            onClick={() => join("blue")}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Join Blue
          </button>
          <button
            disabled={!name || loading}
            onClick={() => join("red")}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
          >
            Join Red
          </button>
        </div>
      </div>
    </div>
  );
}
