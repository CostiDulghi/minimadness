import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Loader2 } from "lucide-react";

export default function CreateSession() {
  const [blueName, setBlueName] = useState("Blue");
  const [redName, setRedName] = useState("Red");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function createSession() {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    // ✅ 1. Creează sesiunea
    const { error: sessionError } = await supabase.from("sessions").insert([
      {
        code,
        team_blue_name: blueName,
        team_red_name: redName,
        blue_total: 0,
        red_total: 0,
      },
    ]);

    if (sessionError) {
      alert("Error creating session!");
      console.error(sessionError);
      setLoading(false);
      return;
    }

    // ✅ 2. Inițializează game_state
    await supabase.from("game_state").insert([
      {
        session_code: code,
        status: "waiting",
        current_question: 0,
        question_deadline: null,
      },
    ]);

    setLoading(false);
    navigate(`/broadcast/${code}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0015] text-white">
      <h1 className="text-4xl font-extrabold text-pink-400 mb-8">
        Create Game Session
      </h1>

      <div className="flex flex-col gap-4 w-[300px]">
        <input
          type="text"
          value={blueName}
          onChange={(e) => setBlueName(e.target.value)}
          placeholder="Blue Team Name"
          className="p-3 rounded-lg text-black text-center"
        />
        <input
          type="text"
          value={redName}
          onChange={(e) => setRedName(e.target.value)}
          placeholder="Red Team Name"
          className="p-3 rounded-lg text-black text-center"
        />
      </div>

      <button
        onClick={createSession}
        disabled={loading}
        className="mt-8 px-8 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="animate-spin w-5 h-5" />}
        {loading ? "Creating..." : "Create Session"}
      </button>
    </div>
  );
}
