// pages/ResultsScreen.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResultsScreen({ sessionCode, onNext }) {
  const [team, setTeam] = useState({ blue:0, red:0 });
  const [top, setTop] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('answers')
        .select('player_name,team,points')
        .eq('session_code', sessionCode);

      const byPlayer = new Map();
      let blue=0, red=0;
      (data||[]).forEach(r => {
        if (r.team==='blue') blue += r.points; else red += r.points;
        byPlayer.set(r.player_name, (byPlayer.get(r.player_name)||0) + r.points);
      });
      setTeam({ blue, red });
      setTop([...byPlayer.entries()]
        .sort((a,b)=>b[1]-a[1])
        .slice(0,10)
        .map(([name,score])=>({name,score})));
    })();
  }, [sessionCode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#14002a] to-[#0b0015] text-white">
      <h2 className="text-3xl mb-6">Round Results</h2>
      <div className="flex gap-10 text-2xl mb-6">
        <div className="text-blue-400">Blue: <b>{team.blue}</b></div>
        <div className="text-red-400">Red: <b>{team.red}</b></div>
      </div>
      <div className="w-[90%] max-w-[560px] bg-black/30 rounded-xl p-4">
        <h3 className="text-xl mb-3 text-pink-400">Top 10 Players</h3>
        <ol className="space-y-1">
          {top.map((p,i)=>(
            <li key={p.name} className="flex justify-between">
              <span>{i+1}. {p.name}</span>
              <span className="font-semibold">{p.score} pts</span>
            </li>
          ))}
        </ol>
      </div>
      <button onClick={onNext} className="mt-6 px-6 py-3 rounded bg-pink-600 hover:bg-pink-700">
        Continue to Pong
      </button>
    </div>
  );
}
