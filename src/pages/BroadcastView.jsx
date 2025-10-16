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
import { gamingQuestions } from "../data/questions";

export default function BroadcastView() {
  const { code } = useParams();
  const [status, setStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const containerRef = useRef();

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" });
  }, [status]);

  // realtime game_state
  useEffect(() => {
    if (!code) return;

    const channel = supabase
      .channel(`game-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
        (payload) => {
          const s = payload.new;
          setStatus(s.status);
          setCurrentQuestion(s.current_question ?? 0);
          setCorrectAnswer(s.correct_answer ?? null);
          setBlueScore(s.blue_score ?? 0);
          setRedScore(s.red_score ?? 0);
        }
      )
      .subscribe();

    (async () => {
      const { data: state } = await supabase.from("game_state").select("*").eq("session_code", code).single();
      if (state) {
        setStatus(state.status);
        setCurrentQuestion(state.current_question ?? 0);
        setCorrectAnswer(state.correct_answer ?? null);
        setBlueScore(state.blue_score ?? 0);
        setRedScore(state.red_score ?? 0);
      }
      const { data: sess } = await supabase.from("sessions").select("*").eq("code", code).single();
      if (sess) setSessionInfo(sess);
    })();

    return () => supabase.removeChannel(channel);
  }, [code]);

  // realtime players
  useEffect(() => {
    if (!code) return;
    const channel = supabase
      .channel(`players-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_code=eq.${code}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("session_code", code);
          setPlayers(data || []);
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [code]);

  // After the SINGLE opening countdown → start first quiz with deadline
  async function startQuestion() {
    const deadline = new Date(Date.now() + 10000).toISOString(); // 10s
    await supabase
      .from("game_state")
      .update({ status: "quiz", question_deadline: deadline, correct_answer: null })
      .eq("session_code", code);
  }

  // When quiz ends (timer or broadcast onFinish) → compute team scores + show results
  async function showResults() {
    const q = gamingQuestions[currentQuestion];
    const correct = q.c;

    const { data: answers } = await supabase
      .from("answers")
      .select("*")
      .eq("session_code", code)
      .eq("question_index", currentQuestion);

    const blueDelta = (answers || []).filter(a => a.team === "blue").reduce((s, a) => s + a.score, 0);
    const redDelta = (answers || []).filter(a => a.team === "red").reduce((s, a) => s + a.score, 0);

    const { data: state } = await supabase
      .from("game_state")
      .select("blue_score, red_score")
      .eq("session_code", code)
      .single();

    const newBlue = (state?.blue_score || 0) + blueDelta;
    const newRed = (state?.red_score || 0) + redDelta;

    await supabase
      .from("game_state")
      .update({ status: "results", correct_answer: correct, blue_score: newBlue, red_score: newRed })
      .eq("session_code", code);
  }

  // Next question: NO countdown between questions, go straight to next quiz after results pause
  async function nextQuestion() {
    if (currentQuestion + 1 >= gamingQuestions.length) {
      await supabase.from("game_state").update({ status: "pong" }).eq("session_code", code);
      return;
    }

    const nextIndex = currentQuestion + 1;
    const deadline = new Date(Date.now() + 10000).toISOString(); // 10s for next question

    await supabase
      .from("game_state")
      .update({
        status: "quiz",
        current_question: nextIndex,
        question_deadline: deadline,
        correct_answer: null,
      })
      .eq("session_code", code);
  }

  // UI
  if (status === "countdown") {
    return (
      <div ref={containerRef}>
        <CountdownScreen onFinish={startQuestion} />
      </div>
    );
  }

  if (status === "quiz") {
    return (
      <div ref={containerRef}>
        <QuizGame sessionCode={code} isBroadcast onFinish={showResults} />
      </div>
    );
  }

  if (status === "results") {
    const q = gamingQuestions[currentQuestion];
    return (
      <div ref={containerRef}>
        <ResultsScreen
          sessionCode={code}
          currentQuestion={currentQuestion}
          questionText={q.q}
          options={q.a}
          correctAnswer={q.c}
          blueScore={blueScore}
          redScore={redScore}
          blueName={sessionInfo?.team_blue_name || "Blue"}
          redName={sessionInfo?.team_red_name || "Red"}
          onNext={nextQuestion}
        />
      </div>
    );
  }

  if (status === "pong") {
    return <PongGame sessionCode={code} />;
  }

  // Waiting
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
        <div className="text-blue-400">🟦 {sessionInfo?.team_blue_name || "Blue"}: {players.filter((p) => p.team === "blue").length}</div>
        <div className="text-red-400">🟥 {sessionInfo?.team_red_name || "Red"}: {players.filter((p) => p.team === "red").length}</div>
      </div>

      <p className="mt-4 text-gray-400">Waiting for players and start signal...</p>
    </div>
  );
}
