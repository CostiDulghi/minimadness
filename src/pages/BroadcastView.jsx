import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import CountdownScreen from "./CountdownScreen";
import QuizGame from "./QuizGame";
import PongGame from "./PongGame";
import { gsap } from "gsap";

export default function BroadcastView() {
  const { code } = useParams();
  const [status, setStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const containerRef = useRef();

  // 🌀 animare generală la schimbare de status
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 1.05, filter: "blur(6px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" }
    );
  }, [status]);

  // 🧩 realtime state
  useEffect(() => {
    if (!code) return;
    const gameChannel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
        (payload) => setStatus(payload.new.status)
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

  useEffect(() => {
    if (!code) return;
    const playerChannel = supabase
      .channel(`players-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_code=eq.${code}` },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("session_code", code);
          setPlayers(data || []);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(playerChannel);
  }, [code]);

  // 🧠 Render logic
  if (status === "countdown")
    return (
      <div ref={containerRef}>
        <CountdownScreen
          onFinish={async () => {
            await supabase
              .from("game_state")
              .update({ status: "quiz" })
              .eq("session_code", code);
          }}
        />
      </div>
    );

  if (status === "quiz")
    return (
      <div ref={containerRef}>
        <QuizGame
          sessionCode={code}
          onFinish={async () => {
            await supabase
              .from("game_state")
              .update({ status: "pong" })
              .eq("session_code", code);
          }}
        />
      </div>
    );

  if (status === "pong") return <PongGame sessionCode={code} />;

  // 🟢 waiting screen
  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-center min-h-screen text-white text-center relative overflow-hidden bg-gradient-to-br from-[#100018] via-[#0c0025] to-[#100018]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1),transparent_70%)] animate-pulse"></div>

      <QRCodeCanvas value={`https://minimadness.vercel.app/join/${code}`} size={260} />
      <h1 className="mt-6 text-4xl font-extrabold text-pink-400">
        Session Code: <span className="text-white">{code}</span>
      </h1>

      <div className="flex gap-12 text-xl font-semibold mt-4">
        <div className="text-blue-400">🟦 Blue: {players.filter((p) => p.team === "blue").length}</div>
        <div className="text-red-400">🟥 Red: {players.filter((p) => p.team === "red").length}</div>
      </div>
      <p className="mt-4 text-gray-400">Total Players: {players.length}</p>
    </div>
  );
}
