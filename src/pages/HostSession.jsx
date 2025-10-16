import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { Gamepad2 } from "lucide-react";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function createSession() {
    setLoading(true);
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    await supabase.from("sessions").insert([{ code }]);
    await supabase.from("game_state").insert([{ session_code: code, status: "waiting" }]);
    setSessionCode(code);
    setLoading(false);
  }

  if (!sessionCode)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white">
        <div className="text-center">
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
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#12002e] via-[#0a001a] to-[#12002e] text-white text-center">
      <QRCodeCanvas value={`https://minimadness.vercel.app/join/${sessionCode}`} size={220} />
      <p className="mt-6 text-lg">
        Session Code: <b className="text-pink-400">{sessionCode}</b>
      </p>
      <p className="mt-2 text-gray-400">Waiting for players...</p>
    </div>
  );
}
