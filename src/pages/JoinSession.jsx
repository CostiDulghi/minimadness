import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gamepad2 } from "lucide-react";

export default function JoinSession() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  // 🔹 Funcție pentru a intra într-o echipă
  async function join(team) {
    if (joined) return;
    setLoading(true);

    const sessionCode = code?.toUpperCase();

    // verifică dacă sesiunea există
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", sessionCode)
      .single();

    if (sessionError || !session) {
      alert("Session not found!");
      setLoading(false);
      return;
    }

    // verifică dacă numele e deja folosit în acea sesiune
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("name", name)
      .eq("session_code", sessionCode);

    if (existing && existing.length > 0) {
      setJoined(true);
      setLoading(false);
      return;
    }

    // inserează playerul
    const { error } = await supabase
      .from("players")
      .insert([{ name, team, session_code: sessionCode }]);

    if (error) {
      console.error(error);
      alert("Error joining session");
    } else {
      setJoined(true);
      localStorage.setItem("mm_name", name);
      localStorage.setItem("mm_team", team);
    }
    setLoading(false);
  }

  // 🔄 Ascultă statusul jocului (live din Supabase)
  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_state",
          filter: `session_code=eq.${code}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          console.log("📡 Game state for player:", newStatus);

          // dacă hostul dă start, trece la countdown
          if (newStatus === "countdown") {
            navigate(`/countdown/${code}`);
          }
        }
      )
      .subscribe();

    // verificare inițială (în caz că playerul intră după start)
    (async () => {
      const { data } = await supabase
        .from("game_state")
        .select("status")
        .eq("session_code", code)
        .single();

      if (data?.status === "countdown") navigate(`/countdown/${code}`);
    })();

    return () => supabase.removeChannel(channel);
  }, [code, navigate]);

  // 🔹 UI pentru player
  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e]">
        <h2 className="text-3xl font-bold text-pink-400">✅ Joined!</h2>
        <p className="mt-4 text-gray-300">Waiting for the game to start...</p>
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
