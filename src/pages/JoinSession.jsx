import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Gamepad2, Loader2, Sparkles } from "lucide-react";
import CountdownScreen from "./CountdownScreen";
import QuizGame from "./QuizGame";
import WaitingScreen from "./WaitingScreen";
import { gsap } from "gsap";

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState(localStorage.getItem("mm_name") || "");
  const [team, setTeam] = useState(localStorage.getItem("mm_team") || "");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("waiting");
  const [lastScore, setLastScore] = useState(null); // scorul personal
  const containerRef = useRef();

  // 🌈 Animație globală
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
    }
  }, [status]);

  // 🧠 Ascultare realtime status
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
          console.log("🎮 Player received update:", payload.new.status);
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

    return () => supabase.removeChannel(channel);
  }, [code]);

  // 🟦🟥 Join echipă
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

  // 🧩 Afișează scorul după results
  useEffect(() => {
    if (status === "results") {
      (async () => {
        const { data } = await supabase
          .from("answers")
          .select("score")
          .eq("session_code", code)
          .eq("player", name)
          .order("id", { ascending: false })
          .limit(1);
        if (data && data.length > 0) setLastScore(data[0].score);
      })();
    }
  }, [status]);

  // ⚡️ Flow principal sincronizat cu Broadcast
  if (status === "countdown")
    return <CountdownScreen onFinish={() => {}} />;

  if (status === "quiz")
    return (
      <QuizGame
        sessionCode={code}
        playerName={name}
        team={team}
        onFinish={() => setStatus("results")}
      />
    );

  if (status === "results")
    return (
      <WaitingScreen
        message={
          lastScore === null
            ? "Calculating your score..."
            : `You scored ${lastScore} points!`
        }
      />
    );

  if (status === "pong")
    return <WaitingScreen message="Next Game starting soon..." />;

  // 💫 Ecran principal de Join
  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-br from-[#0a001a] via-[#150032] to-[#0a001a] overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.12),transparent_70%)] blur-2xl"></div>

      {!joined ? (
        <div className="relative z-10 text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-500 to-purple-500 mb-3 flex justify-center items-center gap-2 drop-shadow-[0_0_20px_rgba(255,100,200,0.6)]">
            Join <span className="text-white">MiniMadness</span>
            <Gamepad2 className="text-pink-400 w-8 h-8" />
          </h1>

          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-72 text-center p-3 rounded-xl bg-white/90 text-black text-lg focus:ring-2 focus:ring-pink-400 outline-none shadow-md"
          />

          <div className="flex justify-center gap-8 mt-8">
            <button
              disabled={!name || loading}
              onClick={() => join("blue")}
              className={`px-8 py-3 rounded-xl font-semibold text-white text-lg shadow-lg transition-all duration-300 ${
                loading
                  ? "bg-gray-500 opacity-70"
                  : "bg-gradient-to-br from-blue-600 to-blue-900 hover:scale-110 hover:shadow-blue-500/50"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin inline w-5 h-5" />
              ) : (
                "🟦 Join Blue Team"
              )}
            </button>

            <button
              disabled={!name || loading}
              onClick={() => join("red")}
              className={`px-8 py-3 rounded-xl font-semibold text-white text-lg shadow-lg transition-all duration-300 ${
                loading
                  ? "bg-gray-500 opacity-70"
                  : "bg-gradient-to-br from-red-600 to-pink-700 hover:scale-110 hover:shadow-pink-500/50"
              }`}
            >
              {loading ? (
                <Loader2 className="animate-spin inline w-5 h-5" />
              ) : (
                "🟥 Join Red Team"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center text-center">
          <h2 className="text-4xl font-bold text-pink-400 mb-3 drop-shadow-[0_0_20px_rgba(255,100,200,0.6)]">
            ✅ Joined!
          </h2>
          <p className="mt-2 text-gray-300 text-lg">
            Waiting for the game to start...
          </p>

          <div className="mt-6 text-lg">
            <p>
              You’re in{" "}
              <b
                className={team === "blue" ? "text-blue-400" : "text-red-400"}
              >
                Team {team.toUpperCase()}
              </b>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
