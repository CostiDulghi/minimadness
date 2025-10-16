import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import CountdownScreen from "./CountdownScreen";
import QuizGame from "./QuizGame";
import ResultsScreen from "./ResultsScreen";
import WaitingScreen from "./WaitingScreen";
import PongGame from "./PongGame";
import { gsap } from "gsap";

export default function BroadcastView() {
  const { code } = useParams();
  const [status, setStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const containerRef = useRef();

  // 🌀 animație smooth la schimbare de status
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 1.05, filter: "blur(6px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" }
    );
  }, [status]);

  // 🧠 ascultă game_state realtime
  useEffect(() => {
    if (!code) return;

    const gameChannel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
        (payload) => {
          setStatus(payload.new.status);
          setCurrentQuestion(payload.new.current_question);
        }
      )
      .subscribe();

    (async () => {
      const { data: state } = await supabase
        .from("game_state")
        .select("*")
        .eq("session_code", code)
        .single();
      if (state) {
        setStatus(state.status);
        setCurrentQuestion(state.current_question);
      }

      const { data: sess } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", code)
        .single();
      if (sess) setSessionInfo(sess);
    })();

    return () => supabase.removeChannel(gameChannel);
  }, [code]);

  // 👥 ascultă jucători realtime
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

  // 🚀 Start automat când există jucători
  useEffect(() => {
    if (status !== "waiting") return;
    if (players.filter((p) => p.team === "blue").length > 0 &&
        players.filter((p) => p.team === "red").length > 0) {
      // dacă avem minim 1 jucător în fiecare echipă → pornim countdown
      startCountdown();
    }
  }, [players, status]);

  // ⏳ Countdown automat
  async function startCountdown() {
    await supabase
      .from("game_state")
      .update({ status: "countdown", current_question: 0 })
      .eq("session_code", code);
  }

  // 🧠 Start întrebare
  async function startQuestion() {
    const deadline = new Date(Date.now() + 10000).toISOString(); // 10s
    await supabase
      .from("game_state")
      .update({
        status: "quiz",
        question_deadline: deadline,
      })
      .eq("session_code", code);
  }

  // 🧮 După timer → results
  async function showResults() {
    const { gamingQuestions } = await import("../data/questions");
    const q = gamingQuestions[currentQuestion];
    setCorrectAnswer(q.c);

    await supabase
      .from("game_state")
      .update({ status: "calculating" })
      .eq("session_code", code);

    // mic delay pt efect cinematic
    setTimeout(async () => {
      await supabase
        .from("game_state")
        .update({ status: "results" })
        .eq("session_code", code);
    }, 2000);
  }

  // ⏭️ Next question
  async function nextQuestion() {
    const { gamingQuestions } = await import("../data/questions");
    if (currentQuestion + 1 >= gamingQuestions.length) {
      await supabase
        .from("game_state")
        .update({ status: "pong" })
        .eq("session_code", code);
      return;
    }

    await supabase
      .from("game_state")
      .update({
        status: "countdown",
        current_question: currentQuestion + 1,
      })
      .eq("session_code", code);
  }

  // 🧠 Render logic
  if (status === "countdown")
    return (
      <div ref={containerRef}>
        <CountdownScreen onFinish={startQuestion} />
      </div>
    );

  if (status === "quiz")
    return (
      <div ref={containerRef}>
        <QuizGame
          sessionCode={code}
          isBroadcast
          onFinish={showResults}
        />
      </div>
    );

  if (status === "calculating")
    return <WaitingScreen message="Calculating team scores..." />;

  if (status === "results")
    return (
      <div ref={containerRef}>
        <ResultsScreen
          sessionCode={code}
          currentQuestion={currentQuestion}
          correctAnswer={correctAnswer}
          blueName={sessionInfo?.team_blue_name || "Blue"}
          redName={sessionInfo?.team_red_name || "Red"}
          onNext={nextQuestion}
        />
      </div>
    );

  if (status === "pong") return <PongGame sessionCode={code} />;

  // 🕓 Waiting screen inițial
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
        <div className="text-blue-400">
          🟦 {sessionInfo?.team_blue_name || "Blue"}:{" "}
          {players.filter((p) => p.team === "blue").length}
        </div>
        <div className="text-red-400">
          🟥 {sessionInfo?.team_red_name || "Red"}:{" "}
          {players.filter((p) => p.team === "red").length}
        </div>
      </div>

      <p className="mt-4 text-gray-400">
        Waiting for players to join both teams...
      </p>
    </div>
  );
}
