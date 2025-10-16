import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentGame, setCurrentGame] = useState("pong");

  async function createSession() {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    await supabase.from("sessions").insert([{ code }]);
    await supabase.from("game_state").insert([{ session_code: code, current_game: "pong" }]);
    setSessionCode(code);
    setCreated(true);
  }

  // countdown logic
  async function startGame() {
    setCountdown(5);
    await supabase
      .from("game_state")
      .update({ status: "countdown", start_time: new Date().toISOString() })
      .eq("session_code", sessionCode);

    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c === 1) {
          clearInterval(interval);
          launchGame();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function launchGame() {
    setGameStarted(true);
    await supabase
      .from("game_state")
      .update({ status: "running" })
      .eq("session_code", sessionCode);
  }

  // realtime jucători
  useEffect(() => {
    const sub = supabase
      .channel("players")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players" },
        (payload) => setPlayers((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {!created ? (
        <>
          <h1 className="text-4xl mb-6 text-pink-400">MiniMadness 🕹️</h1>
          <button
            onClick={createSession}
            className="px-8 py-4 bg-pink-600 rounded hover:bg-pink-700"
          >
            Create Session
          </button>
        </>
      ) : (
        <>
          <QRCodeCanvas value={`https://minimadness.vercel.app/join/${sessionCode}`} size={180} />
          <p className="mt-4">Session Code: {sessionCode}</p>

          {!gameStarted && countdown === 0 && (
            <>
              <h3 className="mt-6 text-lg">Players joined: {players.length}</h3>
              <button
                onClick={startGame}
                className="mt-4 px-6 py-3 bg-green-500 rounded hover:bg-green-600"
              >
                Start Game
              </button>
            </>
          )}

          {countdown > 0 && (
            <h2
              className="text-7xl font-bold text-pink-400 animate-pulse transition-transform"
              style={{ transform: `scale(${1 + countdown * 0.1})` }}
            >
              {countdown}
            </h2>
          )}

          {gameStarted && (
            <div className="mt-8 w-full flex justify-center">
              {/* 🔽 aici integrezi minigame-ul actual */}
              <iframe
                title="PongGame"
                src={`/minigames/${currentGame}?session=${sessionCode}`}
                className="border-none w-[700px] h-[400px] rounded-lg"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
