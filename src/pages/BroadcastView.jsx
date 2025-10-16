import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import CountdownScreen from "./CountdownScreen";
import QuizGame from "./QuizGame";
import PongGame from "./PongGame";

export default function BroadcastView() {
  const { code } = useParams();
  const [players, setPlayers] = useState([]);
  const [status, setStatus] = useState("waiting");

  // 🔄 Ascultă lista jucătorilor live
  useEffect(() => {
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
        console.log("🎮 Game status update:", payload.new.status);
        if (payload.new?.status) setStatus(payload.new.status);
      }
    )
    .subscribe();

  // Fetch initial
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


  // 🎮 Ascultă schimbarea statusului de joc
  useEffect(() => {
    const channel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_state",
          filter: `session_code=eq.${code}`,
        },
        (payload) => {
          if (payload.new?.status) setStatus(payload.new.status);
        }
      )
      .subscribe();

    // Fetch initial
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

  // 🧩 Redare în funcție de status
  if (status === "countdown")
  return <CountdownScreen onFinish={() => {
    supabase.from("game_state")
      .update({ status: "quiz" })
      .eq("session_code", code);
  }} />;

if (status === "quiz")
  return <QuizGame onFinish={() => {
    supabase.from("game_state")
      .update({ status: "pong" })
      .eq("session_code", code);
  }} sessionCode={code} />;

if (status === "pong")
  return <PongGame sessionCode={code} />;


  // 🟣 Ecran de așteptare (fallback default)
return (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#100018] via-[#0c0025] to-[#100018] text-white text-center relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,255,0.1),transparent_70%)] animate-pulse"></div>

    <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
      <QRCodeCanvas
        value={`https://minimadness.vercel.app/join/${code}`}
        size={260}
        bgColor="#12002e"
        fgColor="#ff66cc"
      />

      <h1 className="mt-4 text-4xl font-extrabold text-pink-400 tracking-wide">
        Session Code: <span className="text-white">{code}</span>
      </h1>

      <div className="flex gap-12 text-xl font-semibold mt-4">
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

      <p className="mt-4 text-gray-400 text-lg tracking-widest">
        Total Players: {players.length}
      </p>
    </div>
  </div>
);
}
