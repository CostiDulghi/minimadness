import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { Gamepad2, MonitorPlay, PlayCircle } from "lucide-react";
import { gsap } from "gsap";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const containerRef = useRef();

  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
    );
  }, []);

  async function createSession() {
    try {
      setLoading(true);
      const code = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()
        .replace(/0|O/g, "X");

      const { error } = await supabase.from("sessions").insert([{ code }]);
      if (error) throw error;

      await supabase
        .from("game_state")
        .insert([{ session_code: code, status: "waiting", join_locked: false }]);

      setSessionCode(code);
      setCreated(true);
    } catch (e) {
      console.error(e);
      alert("Error creating session!");
    } finally {
      setLoading(false);
    }
  }

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
    return () => supabase.removeChannel(channel);
  }, [sessionCode]);

  if (!created)
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#15002a] via-[#0a001a] to-[#15002a] text-white relative overflow-hidden"
      >
        <h1 className="text-5xl font-bold text-pink-400 mb-10 flex items-center gap-3">
          MiniMadness <Gamepad2 className="text-pink-500 w-12 h-12" />
        </h1>

        <button
          onClick={createSession}
          disabled={loading}
          className="px-12 py-5 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 shadow hover:scale-105 transition-all"
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </div>
    );

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen text-white text-center bg-gradient-to-br from-[#15002a] via-[#0a001a] to-[#15002a]"
    >
      <QRCodeCanvas
        value={`https://minimadness.vercel.app/join/${sessionCode}`}
        size={220}
      />
      <h2 className="mt-8 text-3xl font-bold text-pink-400">
        Session Code: <span className="text-white">{sessionCode}</span>
      </h2>

      <div className="mt-6 text-lg font-semibold">
        Blue: {players.filter((p) => p.team === "blue").length} | Red:{" "}
        {players.filter((p) => p.team === "red").length}
      </div>

      <div className="flex gap-6 mt-10">
        <button
          onClick={() =>
            window.open(`/broadcast/${sessionCode}`, "_blank", "noopener,noreferrer")
          }
          className="flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105 transition-all"
        >
          <MonitorPlay className="w-5 h-5" /> Open Broadcast
        </button>

        <button
          onClick={async () => {
            const { error } = await supabase
              .from("game_state")
              .update({
                status: "countdown",
                current_question: 0,
                join_locked: true,
              })
              .eq("session_code", sessionCode);

            if (error) alert("Error starting game");
          }}
          className="flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105 transition-all"
        >
          <PlayCircle className="w-5 h-5" /> Start Game
        </button>
      </div>
    </div>
  );
}
