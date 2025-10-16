import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { Gamepad2 } from "lucide-react";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);

  // 🟢 Creează sesiunea
  async function createSession() {
    try {
      setLoading(true);
      const code = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()
        .replace(/0|O/g, "X");

      const { error } = await supabase.from("sessions").insert([{ code }]);
      if (error) {
        alert("Error creating session!");
        console.error(error);
        return;
      }

      await supabase
        .from("game_state")
        .insert([{ session_code: code, status: "waiting", join_locked: false }]);

      setSessionCode(code);
      setCreated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // 🟢 Ascultă realtime jucătorii pentru sesiunea curentă
  useEffect(() => {
    if (!sessionCode) return;

    const channel = supabase
      .channel(`players-${sessionCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `session_code=eq.${sessionCode}`,
        },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("session_code", sessionCode);
          setPlayers(data || []);
        }
      )
      .subscribe();

    // Cleanup la demontare
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode]);

  // 🟣 UI-ul înainte de creare
  if (!created)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white">
        <h1 className="text-5xl font-bold text-pink-400 mb-8 flex justify-center items-center gap-2">
          MiniMadness <Gamepad2 className="text-pink-500 w-10 h-10" />
        </h1>
        <button
          onClick={createSession}
          disabled={loading}
          className="px-10 py-5 bg-pink-600 hover:bg-pink-700 rounded-xl text-lg font-semibold transition-all shadow-lg hover:scale-105"
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </div>
    );

  // 🟣 UI după creare
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white text-center">
      <QRCodeCanvas
        value={`https://minimadness.vercel.app/join/${sessionCode}`}
        size={220}
      />
      <p className="mt-6 text-lg">
        Session Code: <b className="text-pink-400">{sessionCode}</b>
      </p>

      <div className="mt-8">
        <h3 className="text-2xl text-pink-400 mb-4">Players Joined:</h3>
        <div className="flex gap-16 justify-center">
          <div>
            <h4 className="text-blue-400 font-semibold mb-2">Team Blue</h4>
            <ul>
              {players
                .filter((p) => p.team === "blue")
                .map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
            </ul>
          </div>
          <div>
            <h4 className="text-red-400 font-semibold mb-2">Team Red</h4>
            <ul>
              {players
                .filter((p) => p.team === "red")
                .map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-gray-400 text-sm">
          Total players: {players.length}
        </p>
      </div>
    </div>
  );
}
