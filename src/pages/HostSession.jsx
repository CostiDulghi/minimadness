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

  // ✨ Smooth fade-in la montare
  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
    );
  }, []);

  // 🧩 Creează sesiune
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
        .insert([{ session_code: code, status: "waiting", join_locked: false, blue_score: 0, red_score: 0 }]);

      setSessionCode(code);
      setCreated(true);

      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
    } catch (e) {
      console.error(e);
      alert("Error creating session!");
    } finally {
      setLoading(false);
    }
  }

  // 👥 Ascultă jucătorii în timp real
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

  // 🌀 Fundal animat
  useEffect(() => {
    const pulse = gsap.to(".bg-pulse", {
      opacity: 0.6,
      scale: 1.2,
      duration: 4,
      ease: "power1.inOut",
      repeat: -1,
      yoyo: true,
      yoyoEase: true,
    });
    return () => pulse.kill();
  }, []);

  // 💫 UI înainte de creare
  if (!created)
    return (
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#15002a] via-[#0a001a] to-[#15002a] text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-pulse bg-[radial-gradient(circle_at_center,rgba(255,0,200,0.15),transparent_70%)] pointer-events-none"></div>
        <h1 className="text-5xl font-bold text-pink-400 mb-10 flex items-center gap-3 drop-shadow-[0_0_25px_rgba(255,100,200,0.6)]">
          MiniMadness <Gamepad2 className="text-pink-500 w-12 h-12" />
        </h1>

        <button
          onClick={createSession}
          disabled={loading}
          className="px-12 py-5 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 shadow-[0_0_20px_rgba(255,0,150,0.4)] hover:scale-105 hover:shadow-[0_0_30px_rgba(255,0,150,0.7)] transition-all duration-300"
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </div>
    );

  // 💎 UI după creare sesiune
  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen text-white text-center bg-gradient-to-br from-[#15002a] via-[#0a001a] to-[#15002a] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-pulse bg-[radial-gradient(circle_at_center,rgba(255,0,200,0.1),transparent_70%)] pointer-events-none"></div>

      <QRCodeCanvas
        value={`https://minimadness.vercel.app/join/${sessionCode}`}
        size={220}
        className="drop-shadow-[0_0_25px_rgba(255,100,200,0.5)]"
      />

      <h2 className="mt-8 text-3xl font-bold text-pink-400 tracking-wide drop-shadow-[0_0_10px_rgba(255,100,200,0.4)]">
        Session Code: <span className="text-white">{sessionCode}</span>
      </h2>

      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex gap-12 text-lg font-semibold">
          <div className="text-blue-400 flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            Blue:{" "}
            <span className="text-white">
              {players.filter((p) => p.team === "blue").length}
            </span>
          </div>
          <div className="text-red-400 flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            Red:{" "}
            <span className="text-white">
              {players.filter((p) => p.team === "red").length}
            </span>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Total Players: {players.length}
        </p>
      </div>

      <div className="flex gap-6 mt-10">
        <button
          onClick={() =>
            window.open(`/broadcast/${sessionCode}`, "_blank", "noopener,noreferrer")
          }
          className="flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl text-white 
                     bg-gradient-to-r from-purple-600 to-pink-500 shadow-[0_0_20px_rgba(255,0,150,0.4)]
                     hover:shadow-[0_0_30px_rgba(255,0,150,0.7)] hover:scale-105 transition-all duration-300"
        >
          <MonitorPlay className="w-5 h-5" /> Open Broadcast
        </button>

        <button
          onClick={async () => {
  const { error } = await supabase
    .from("game_state")
    .update({
      status: "countdown",
      countdown: 5,       // your existing column for countdown time
      current_game: "quiz", // matches your schema
      join_locked: true,
    })
    .eq("session_code", sessionCode);

  if (error) {
    console.error("❌ Error starting game:", error);
    alert("Error starting game");
  } else {
    console.log("✅ Game started!");
  }
}}

          className="flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl text-white 
             bg-gradient-to-r from-pink-500 to-red-500 shadow-[0_0_20px_rgba(255,0,100,0.4)]
             hover:shadow-[0_0_30px_rgba(255,0,100,0.7)] hover:scale-105 transition-all duration-300"
        >
          <PlayCircle className="w-5 h-5" /> Start Game
        </button>
      </div>
    </div>
  );
}
