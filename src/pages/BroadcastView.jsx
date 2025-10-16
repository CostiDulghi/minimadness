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

  // 🔄 animare smooth la fiecare schimbare de status
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, scale: 1.05 },
      { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }
    );
  }, [status]);

  // 🧠 ascultare realtime game_state
  useEffect(() => {
  if (!code) return;

  const channel = supabase
    .channel(`game-${code}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "game_state", filter: `session_code=eq.${code}` },
      (payload) => {
        setStatus(payload.new.status);
        setCurrentQuestion(payload.new.current_question || 0);
        if (payload.new.correct_answer) setCorrectAnswer(payload.new.correct_answer); // 🔥 realtime refresh
      }
    )
    .subscribe();

  // 🔹 Citim starea inițială asincron
  (async () => {
    const { data: state } = await supabase
      .from("game_state")
      .select("*")
      .eq("session_code", code)
      .single();

    if (state) {
      setStatus(state.status);
      setCurrentQuestion(state.current_question || 0);
      if (state.correct_answer) setCorrectAnswer(state.correct_answer); // 👈 persistă răspunsul corect
    }

    const { data: sess } = await supabase
      .from("sessions")
      .select("*")
      .eq("code", code)
      .single();

    if (sess) setSessionInfo(sess);
  })();

  return () => supabase.removeChannel(channel);
}, [code]);

  // 👥 ascultare realtime players
  useEffect(() => {
    if (!code) return;
    const channel = supabase
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
    return () => supabase.removeChannel(channel);
  }, [code]);

  // 🧩 când countdown-ul s-a terminat → start quiz
  async function startQuestion() {
  const deadline = new Date(Date.now() + 10000).toISOString();
  await supabase
    .from("game_state")
    .update({
      status: "quiz",
      question_deadline: deadline,
    })
    .eq("session_code", code);
}



  // 🧮 calculează scoruri și merge la results
  async function showResults() {
  const { gamingQuestions } = await import("../data/questions");
  const q = gamingQuestions[currentQuestion];
  setCorrectAnswer(q.c);

  await supabase
  .from("game_state")
  .update({
    status: "results",
  })
  .eq("session_code", code);



  // așteaptă 2s și verifică dacă există răspunsuri
  setTimeout(async () => {
    const { data: answers } = await supabase
      .from("answers")
      .select("*")
      .eq("session_code", code)
      .eq("question_index", currentQuestion);

    if (!answers || answers.length === 0) {
      // fallback fără răspunsuri
      await supabase
        .from("game_state")
        .update({ status: "results" })
        .eq("session_code", code);
      return;
    }

    // scoruri pe echipe
    const blueScore = answers
      .filter((a) => a.team === "blue")
      .reduce((s, a) => s + a.score, 0);
    const redScore = answers
      .filter((a) => a.team === "red")
      .reduce((s, a) => s + a.score, 0);

    await supabase
      .from("game_state")
      .update({
        status: "results",
        blue_score: blueScore,
        red_score: redScore,
      })
      .eq("session_code", code);
  }, 2000);
}


  // ⏭️ întrebare următoare sau Pong
  async function nextQuestion() {
    const { gamingQuestions } = await import("../data/questions");
    if (currentQuestion + 1 >= gamingQuestions.length) {
      await supabase
        .from("game_state")
        .update({ status: "pong" })
        .eq("session_code", code);
      return;
    }

    // intermission → countdown → quiz
    await supabase
      .from("game_state")
      .update({ status: "intermission" })
      .eq("session_code", code);

    setTimeout(async () => {
      await supabase
        .from("game_state")
        .update({
          status: "countdown",
          current_question: currentQuestion + 1,
        })
        .eq("session_code", code);
    }, 3000);
  }

  // 🎮 UI logic
  if (status === "countdown")
  return (
    <div ref={containerRef}>
      <CountdownScreen
        duration={5}
        label="Get ready... the round is starting!"
        onFinish={startQuestion}
      />
    </div>
  );


  if (status === "quiz")
    return (
      <div ref={containerRef}>
        <QuizGame sessionCode={code} isBroadcast onFinish={showResults} />
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

  if (status === "intermission")
    return <CountdownScreen duration={5} label="Next round starting in..." onFinish={startQuestion} />;

  if (status === "pong")
    return <PongGame sessionCode={code} />;

  // 🕓 ecran inițial
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

      <p className="mt-4 text-gray-400">Waiting for players and start signal...</p>
    </div>
  );
}
