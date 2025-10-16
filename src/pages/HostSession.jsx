import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";

export default function HostSession() {
  const [sessionCode, setSessionCode] = useState("");
  const [created, setCreated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [question, setQuestion] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  // Exemple întrebări/minigame-uri
  const questions = [
    { type: "quiz", question: "What is 2 + 2?", correct_answer: "4" },
    { type: "quiz", question: "Capital of France?", correct_answer: "Paris" },
    { type: "minigame", question: "Raise your hand if you love coding!" },
    { type: "quiz", question: "What color is the sky?", correct_answer: "Blue" },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  async function createSession() {
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();

    const { error } = await supabase.from("sessions").insert([{ code }]);
    if (!error) {
      await supabase.from("game_state").insert([{ session_code: code, status: "waiting" }]);
      setSessionCode(code);
      setCreated(true);
    } else {
      alert("Error creating session!");
      console.error(error);
    }
    setLoading(false);
  }

  async function startGame() {
    const firstQ = questions[0];
    await supabase
      .from("game_state")
      .update({
        status: "started",
        question: firstQ.question,
        updated_at: new Date().toISOString(),
      })
      .eq("session_code", sessionCode);

    setQuestion(firstQ.question);
    setGameStarted(true);
    setTimeLeft(15);
  }

  // Timp per întrebare
  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameStarted, timeLeft]);

  // Când timpul expiră -> mergi la următoarea întrebare
  useEffect(() => {
    if (timeLeft === 0 && gameStarted) {
      nextQuestion();
    }
  }, [timeLeft]);

  async function nextQuestion() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setGameStarted(false);
      return;
    }
    const nextQ = questions[nextIndex];
    setCurrentIndex(nextIndex);
    setQuestion(nextQ.question);
    setTimeLeft(15);
    await supabase
      .from("game_state")
      .update({
        question: nextQ.question,
        updated_at: new Date().toISOString(),
      })
      .eq("session_code", sessionCode);
  }

  // Ascultă jucători live
  useEffect(() => {
    const channel = supabase
      .channel("players-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "players" },
        (payload) => setPlayers((prev) => [...prev, payload.new])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Ascultă răspunsurile
  useEffect(() => {
    const channel = supabase
      .channel("answers-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "answers" },
        async (payload) => {
          const ans = payload.new;
          setAnswers((prev) => [...prev, ans]);

          const q = questions[currentIndex];
          if (q.type === "quiz" && ans.answer.trim().toLowerCase() === q.correct_answer.toLowerCase()) {
            await supabase.rpc("increment_player_score", {
              player_name_input: ans.player_name,
              session_code_input: sessionCode,
            });
          }

          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("session_code", sessionCode)
            .order("score", { ascending: false });
          setLeaderboard(data || []);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [currentIndex, sessionCode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-[#0B0015]">
      {!created ? (
        <>
          <h1 className="text-5xl font-bold text-pink-500 mb-8">MiniMadness 🕹️</h1>
          <button
            onClick={createSession}
            disabled={loading}
            className={`px-8 py-4 text-lg rounded-xl transition ${
              loading ? "bg-gray-400" : "bg-pink-600 hover:bg-pink-700"
            }`}
          >
            {loading ? "Creating..." : "Start Session"}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-3xl mb-4 text-yellow-400">Scan to Join!</h2>
          <QRCodeCanvas value={`https://minimadness.vercel.app/join/${sessionCode}`} size={200} />
          <p className="mt-4 text-lg">
            Session Code: <b className="text-pink-400">{sessionCode}</b>
          </p>

          {!gameStarted && (
            <>
              <h3 className="text-2xl mt-6">Players Joined: {players.length}</h3>
              {players.length > 0 && (
                <button
                  onClick={startGame}
                  className="mt-6 px-8 py-4 text-lg bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Start Game
                </button>
              )}
            </>
          )}

          {gameStarted && (
            <>
              <h2 className="text-2xl mt-6 text-pink-400">🧠 Question:</h2>
              <p className="text-xl mb-4">{question}</p>
              <p className="text-yellow-400 text-lg">⏳ {timeLeft}s</p>

              <h3 className="text-2xl mt-6 text-pink-400">🏆 Leaderboard</h3>
              <ol className="text-left mt-2">
                {leaderboard.map((p, i) => (
                  <li key={p.id}>
                    {i + 1}. {p.name} — {p.score} pts
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </div>
  );
}
