import { useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gamepad2 } from "lucide-react";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  async function join(team) {
    if (joined) return;
    setLoading(true);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code?.toUpperCase())
      .single();

    if (sessionError || !session) {
      alert("Session not found!");
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("name", name)
      .eq("session_code", code?.toUpperCase());

    if (existing && existing.length > 0) {
      setJoined(true);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("players")
      .insert([{ name, team, session_code: code?.toUpperCase() }]);

    if (error) {
      console.error(error);
      alert("Error joining session");
    } else {
      setJoined(true);
    }
    setLoading(false);
  }

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e]">
        <h2 className="text-3xl font-bold text-pink-400">✅ Joined!</h2>
        <p className="mt-4 text-gray-300">
          Waiting for the game to start...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white">
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
  );
}
