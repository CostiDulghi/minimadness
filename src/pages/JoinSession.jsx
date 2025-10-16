import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gamepad2, Loader2 } from "lucide-react";
import CountdownScreen from "./CountdownScreen";
import QuizGame from "./QuizGame";
import PongGame from "./PongGame";
import { gsap } from "gsap";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState(localStorage.getItem("mm_name") || "");
  const [team, setTeam] = useState(localStorage.getItem("mm_team") || "");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("waiting");

  const containerRef = useRef();

  // 🌀 animare smooth la fiecare ecran
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
    }
  }, [joined, status]);

  // 🧠 ascultă statusul jocului în timp real
  useEffect(() => {
    if (!code) return;

    const gameChannel = supabase
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
          console.log("🛰 Game state:", payload.new.status);
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    (async () => {
      const { data } = await supabase
        .from("game_state")
        .select("status")
        .eq("session_code", code)
        .single();
      if (data?.status) setStatus(data.status);
    })();

    return () => supabase.removeChannel(gameChannel);
  }, [code]);

  // 🟦🟥 join echipă
  async function join(selectedTeam) {
    if (joined || loading) return;
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
      .insert([{ name, team: selectedTeam, session_code: code.toUpperCase() }]);

    if (error) {
      console.error(error);
      alert("Error joining session");
    } else {
      setJoined(true);
      setTeam(selectedTeam);
      localStorage.setItem("mm_name", name);
      localStorage.setItem("mm_team", selectedTeam);
    }

    setLoading(false);
  }

  // 🎮 schimbare automată în funcție de status
  if (status === "countdown") return <CountdownScreen />;
  if (status === "quiz") return <QuizGame sessionCode={code} />;
  if (status === "pong") return <PongGame sessionCode={code} />;

  // 💫 Ecran principal (join / waiting)
  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1),transparent_70%)] animate-pulse"></div>

      {!joined ? (
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-pink-400 mb-3 flex justify-center items-center gap-2 drop-shadow-[0_0_15px_rgba(255,100,200,0.4)]">
            Join MiniMadness <Gamepad2 className="text-pink-500 w-8 h-8" />
          </h1>

          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-6 w-64 text-center p-3 rounded-xl bg-white/90 text-black text-lg focus:ring-2 focus:ring-pink-400 outline-none shadow-md"
          />

          <div className="flex justify-center gap-6 mt-6">
            <button
              disabled={!name || loading}
              onClick={() => join("blue")}
              className={`px-8 py-3 rounded-lg font-medium text-white text-lg shadow-lg transition-all duration-300 ${
                loading
                  ? "bg-gray-500 opacity-70"
                  : "bg-gradient-to-r from-blue-600 to-blue-800 hover:scale-105 hover:shadow-blue-500/50"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin inline w-5 h-5" />
              ) : (
                "Join Blue"
              )}
            </button>
            <button
              disabled={!name || loading}
              onClick={() => join("red")}
              className={`px-8 py-3 rounded-lg font-medium text-white text-lg shadow-lg transition-all duration-300 ${
                loading
                  ? "bg-gray-500 opacity-70"
                  : "bg-gradient-to-r from-red-600 to-pink-700 hover:scale-105 hover:shadow-pink-500/50"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin inline w-5 h-5" />
              ) : (
                "Join Red"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold text-pink-400">✅ Joined!</h2>
          <p className="mt-4 text-gray-300">
            Waiting for the game to start...
          </p>

          <div className="mt-8 text-lg">
            <p>
              You’re in <b className={team === "blue" ? "text-blue-400" : "text-red-400"}>
                Team {team.toUpperCase()}
              </b>
            </p>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.05),transparent_70%)] blur-3xl"></div>
        </div>
      )}
    </div>
  );
}
