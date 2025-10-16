import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PieTimer from "../components/PieTimer";
import { gamingQuestions } from "../data/questions";

const QUESTION_MS = 15000;

export default function JoinSession() {
  const { code } = useParams();
  const [name, setName] = useState(localStorage.getItem('mm_name')||"");
  const [team, setTeam] = useState(localStorage.getItem('mm_team')||"");
  const [joined, setJoined] = useState(!!localStorage.getItem('mm_joined'));
  const [state, setState] = useState({ status:'waiting', current_question:0, current_game:'quiz' });
  const q = gamingQuestions[state.current_question];

  // realtime game_state
  useEffect(() => {
    if (!code) return;
    supabase.from('game_state').select('status,current_question,current_game,join_locked')
      .eq('session_code', code).single().then(({data})=> data && setState(data));
    const ch = supabase.channel(`gs-${code}`).on('postgres_changes',{
      event:'UPDATE', schema:'public', table:'game_state', filter:`session_code=eq.${code}`
    }, (p)=> setState(p.new)).subscribe();
    return ()=> supabase.removeChannel(ch);
  }, [code]);

  async function join(t) {
    // blochează join după start
    const { data: gs } = await supabase.from('game_state').select('join_locked').eq('session_code', code).single();
    if (gs?.join_locked) { alert("Game already started."); return; }

    await supabase.from('players').insert([{ name, team:t, session_code:code }]);
    localStorage.setItem('mm_name', name);
    localStorage.setItem('mm_team', t);
    localStorage.setItem('mm_joined', '1');
    setTeam(t); setJoined(true);
  }

  // submit fără feedback; calculez puncte: corect?(50 + speedBonus): 0
  async function submitAnswer(opt, timeLeftMs) {
    const correct = q.c;
    const isCorrect = opt === correct;
    const speed = Math.max(0, Math.min(100, Math.round((timeLeftMs/QUESTION_MS)*100))); // 0..100
    const points = isCorrect ? 50 + Math.round(speed * 0.5) : 0;  // bază 50 + bonus viteză

    await supabase.from('answers').insert([{
      session_code: code,
      player_name: name,
      team,
      q_index: state.current_question,
      chosen: opt,
      correct,
      is_correct: isCorrect,
      time_left_ms: timeLeftMs,
      points
    }]);

    // nu arătăm corect/greșit; doar închidem butoanele
    setAnswered(true);
  }

  const [answered, setAnswered] = useState(false);
  useEffect(()=> setAnswered(false), [state.current_question]); // reset la întrebare nouă

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0015] text-white">
        <h1 className="text-3xl mb-6 text-pink-400">Join MiniMadness</h1>
        <input className="px-4 py-2 rounded text-black mb-4" value={name}
          onChange={e=>setName(e.target.value)} placeholder="Your name"/>
        <div className="flex gap-4">
          <button onClick={()=>join('blue')} disabled={!name} className="px-6 py-3 rounded bg-blue-600">Join Blue</button>
          <button onClick={()=>join('red')}  disabled={!name} className="px-6 py-3 rounded bg-red-600">Join Red</button>
        </div>
      </div>
    );
  }

  if (state.status==='countdown')
    return (<div className="flex items-center justify-center min-h-screen text-pink-400 text-3xl">Get ready…</div>);

  if (state.current_game==='quiz' && state.status==='running')
    return (
      <QuizPlayer
        question={q}
        qIndex={state.current_question}
        disabled={answered}
        onAnswer={submitAnswer}
      />
    );

  if (state.current_game==='pong')
    return (<div className="flex items-center justify-center min-h-screen text-white">Controller coming here…</div>);

  return (<div className="flex items-center justify-center min-h-screen text-white">Waiting…</div>);
}

function QuizPlayer({ question, qIndex, disabled, onAnswer }) {
  // păstrăm timpul rămas local, îl dăm la submit
  const [left, setLeft] = useState(15000);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0015] text-white">
      <h2 className="text-xl text-pink-400 mb-4 text-center px-6">{question.q}</h2>
      <PieTimer ms={15000} keySeed={qIndex} onDone={()=>{}} />
      <div className="grid grid-cols-2 gap-3 w-[90%] max-w-[520px] mt-6">
        {question.a.map(opt => (
          <button key={opt} disabled={disabled}
            onClick={()=>onAnswer(opt, left)}
            className={`px-4 py-3 rounded-xl text-base font-medium bg-purple-700 hover:bg-purple-600
                        disabled:opacity-50 disabled:cursor-not-allowed`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
