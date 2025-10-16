import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import CountdownScreen from "./CountdownScreen";
import PieTimer from "../components/PieTimer";
import { gamingQuestions } from "../data/questions";
import PongGame from "./PongGame";
import ResultsScreen from "./ResultsScreen"

const QUESTION_MS = 15000;

export default function HostSession() {
  const [phase, setPhase] = useState("lobby"); // lobby|countdown|quiz|results|pong
  const [sessionCode, setSessionCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [qIndex, setQIndex] = useState(0);

  async function createSession() {
    const code = Math.random().toString(36).slice(2,7).toUpperCase();
    await supabase.from("sessions").insert([{ code }]);
    await supabase.from("game_state").upsert({
      session_code: code, status:"waiting", current_game:"quiz", current_question:0, join_locked:false
    });
    setSessionCode(code);
  }

  // load + realtime players (filtrat pe sesiune)
  useEffect(() => {
    if (!sessionCode) return;
    supabase.from('players').select('*').eq('session_code', sessionCode).then(({data})=>setPlayers(data||[]));
    const ch = supabase.channel(`p-${sessionCode}`).on('postgres_changes', {
      event:'INSERT', schema:'public', table:'players', filter:`session_code=eq.${sessionCode}`
    }, (p)=> setPlayers(prev=>[...prev,p.new])).subscribe();
    return ()=> supabase.removeChannel(ch);
  }, [sessionCode]);

  // lock scroll în afara lobby
  useEffect(() => {
    document.body.classList.toggle('no-scroll', phase!=='lobby');
    return () => document.body.classList.remove('no-scroll');
  }, [phase]);

  const start = async () => {
    setPhase("countdown");
    await supabase.from('game_state').update({status:'countdown', join_locked:true})
      .eq('session_code', sessionCode);
  };

  const startQuiz = async () => {
    setPhase("quiz");
    setQIndex(0);
    await supabase.from('game_state').update({
      status:'running', current_game:'quiz', current_question:0
    }).eq('session_code', sessionCode);
  };

  // când expiră timpul unei întrebări → avansează sau trece la results
  const handleQuestionEnd = async () => {
    if (qIndex+1 < gamingQuestions.length) {
      setQIndex(qIndex+1);
      await supabase.from('game_state').update({ current_question:qIndex+1 })
        .eq('session_code', sessionCode);
    } else {
      setPhase('results');
    }
  };

  return (
    <>
      {/* overlay code + count */}
      {sessionCode && phase!=='lobby' && (
        <div className="fixed top-3 left-3 text-xs text-white/70 z-50">
          <div>Code: <b>{sessionCode}</b></div>
          <div>Players: <b>{players.length}</b></div>
        </div>
      )}

      {(!sessionCode) && (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <button onClick={createSession} className="px-8 py-4 rounded bg-pink-600 hover:bg-pink-700">
            Create Session
          </button>
        </div>
      )}

      {(sessionCode && phase==='lobby') && (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
          <QRCodeCanvas value={`https://minimadness.vercel.app/join/${sessionCode}`} size={180}/>
          <p className="mt-3">Session Code: <b>{sessionCode}</b></p>
          <p className="text-sm text-gray-300">Players joined: {players.length}</p>
          <button onClick={start} className="mt-6 px-8 py-4 rounded bg-pink-600 hover:bg-pink-700">
            Start Game
          </button>
        </div>
      )}

      {phase==='countdown' && (
        <CountdownScreen onFinish={startQuiz}/>
      )}

      {phase==='quiz' && (
        <div className="flex flex-col items-center justify-center min-h-screen
                        bg-gradient-to-br from-[#0b0015] via-[#120024] to-[#0b0015] text-white">
          <h2 className="text-3xl text-pink-400 mb-6">{gamingQuestions[qIndex].q}</h2>
          {/* timer plăcintă pe host (același timp ca la player) */}
          <PieTimer keySeed={qIndex} ms={QUESTION_MS} onDone={handleQuestionEnd}/>
          <p className="mt-4 text-sm text-gray-400">Question {qIndex+1} / {gamingQuestions.length}</p>
        </div>
      )}

      {phase==='results' && <ResultsScreen sessionCode={sessionCode} onNext={()=>setPhase('pong')} />}

      {phase==='pong' && (
        <div className="flex items-center justify-center min-h-screen bg-black">
          {/* teren mic într-un card */}
          <div className="bg-[#15002a] rounded-2xl p-4 shadow-xl">
            <PongGame width={560} height={360}/>
          </div>
        </div>
      )}
    </>
  );
}
