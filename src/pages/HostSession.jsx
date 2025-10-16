import { useState, useEffect, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const canvasRef = useRef(null);
  const [state, setState] = useState({
    ball_x: 50,
    ball_y: 50,
    ball_dx: 1,
    ball_dy: 1,
    blue_score: 0,
    red_score: 0,
  });
  const [paddles, setPaddles] = useState({ blue: 50, red: 50 });

  async function createSession() {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    await supabase.from("sessions").insert([{ code }]);
    await supabase.from("game_state").insert([{ session_code: code }]);
    setSessionCode(code);
    setCreated(true);
  }

  useEffect(() => {
    if (!created) return;

    // ascultă mișcări jucători
    const channel = supabase
      .channel("paddle-moves")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `session_code=eq.${sessionCode}` },
        (payload) => {
          const updated = payload.new;
          setPaddles((prev) => ({
            ...prev,
            [updated.team]: updated.paddle_y,
          }));
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [created, sessionCode]);

  // logică de mișcare a mingii
  useEffect(() => {
    if (!created) return;
    const ctx = canvasRef.current.getContext("2d");
    let frame;

    const animate = () => {
      ctx.clearRect(0, 0, 800, 500);
      ctx.fillStyle = "white";
      ctx.fillRect(395, 0, 10, 500);

      // desenează mingea
      ctx.beginPath();
      ctx.arc(state.ball_x, state.ball_y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();

      // desenează barele
      ctx.fillStyle = "blue";
      ctx.fillRect(20, paddles.blue * 4, 10, 80);
      ctx.fillStyle = "red";
      ctx.fillRect(770, paddles.red * 4, 10, 80);

      // scor
      ctx.font = "24px Arial";
      ctx.fillText(state.blue_score, 360, 30);
      ctx.fillText(state.red_score, 420, 30);

      // mișcare mingii
      let newX = state.ball_x + state.ball_dx * 3;
      let newY = state.ball_y + state.ball_dy * 3;

      // coliziuni sus/jos
      if (newY < 10 || newY > 490) state.ball_dy *= -1;

      // coliziune cu bare
      if (newX < 40 && Math.abs(newY - paddles.blue * 4 - 40) < 50) state.ball_dx *= -1;
      if (newX > 760 && Math.abs(newY - paddles.red * 4 - 40) < 50) state.ball_dx *= -1;

      // scor
      if (newX < 0) {
        state.red_score += 1;
        newX = 400;
        newY = 250;
      }
      if (newX > 800) {
        state.blue_score += 1;
        newX = 400;
        newY = 250;
      }

      setState({ ...state, ball_x: newX, ball_y: newY });
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paddles, created]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      {!created ? (
        <>
          <h1 className="text-4xl mb-6 text-pink-400">Team Pong Arena</h1>
          <button
            onClick={createSession}
            className="px-8 py-4 bg-pink-600 rounded hover:bg-pink-700"
          >
            Create Session
          </button>
        </>
      ) : (
        <>
          <QRCodeCanvas value={`https://minimadness.vercel.app/join/${sessionCode}`} size={160} />
          <p className="mt-4">Session Code: {sessionCode}</p>
          <canvas
            ref={canvasRef}
            width="800"
            height="500"
            className="border border-gray-600 mt-8"
          />
        </>
      )}
    </div>
  );
}
