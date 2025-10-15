import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  async function createSession() {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    const { error } = await supabase.from("sessions").insert([{ code }]);
    setLoading(false);

    if (error) {
      alert("Error creating session!");
      console.error(error);
      return;
    }

    // inițializează game_state
    await supabase.from("game_state").insert([{ session_code: code, status: "waiting" }]);

    setSessionCode(code);
    setCreated(true);
  }

  async function startGame() {
    const { error } = await supabase
      .from("game_state")
      .update({
        status: "started",
        question: "What is 2 + 2?",
        updated_at: new Date().toISOString(),
      })
      .eq("session_code", sessionCode);

    if (error) {
      console.error("Error starting game:", error);
      alert("Could not start game");
    } else {
      setGameStarted(true);
    }
  }

  // ascultă jucători în timp real
  useEffect(() => {
  const channel = supabase
    .channel("players-channel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "players" },
      (payload) => {
        console.log("🧠 Player joined:", payload.new);
        setPlayers((prev) => [...prev, payload.new]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {!created ? (
        <>
          <h1 className="text-5xl font-bold text-primary mb-8">MiniMadness 🕹️</h1>
          <button
            onClick={createSession}
            disabled={loading}
            className={`px-8 py-4 text-lg rounded-xl transition ${
              loading ? "bg-gray-400" : "bg-primary hover:bg-secondary"
            }`}
          >
            {loading ? "Creating..." : "Start Session"}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-3xl mb-4 text-secondary font-semibold">Scan to Join!</h2>
          <QRCodeCanvas
            value={`https://minimadness.vercel.app/join/${sessionCode}`}
            size={200}
          />
          <p className="mt-6 text-lg">
            Session Code: <b className="text-primary">{sessionCode}</b>
          </p>

          <div className="mt-8 text-center">
            <h3 className="text-2xl font-bold mb-2">Players Joined:</h3>
            {players.length === 0 ? (
              <p>No players yet...</p>
            ) : (
              <ul>
                {players.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            )}
          </div>

          {!gameStarted && players.length > 0 && (
            <button
              onClick={startGame}
              className="mt-6 px-8 py-4 text-lg bg-green-500 text-white rounded-xl hover:bg-green-600"
            >
              Start Game
            </button>
          )}

          {gameStarted && (
            <p className="mt-4 text-xl text-green-600 font-semibold">
              ✅ Game Started! Waiting for players...
            </p>
          )}
        </>
      )}
    </div>
  );
}
