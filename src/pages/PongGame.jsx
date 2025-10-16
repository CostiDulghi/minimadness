// pages/PongGame.jsx
import { useEffect, useRef } from "react";

export default function PongGame({ width=560, height=360 }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    let ball={x:width*0.8,y:height*0.2,dx:3,dy:2}, L=height*0.35, R=height*0.65;
    const loop = () => {
      ctx.fillStyle = "#140024"; ctx.fillRect(0,0,width,height);
      // paddles
      ctx.fillStyle="#2b5fff"; ctx.fillRect(18, L-30, 10, 60);
      ctx.fillStyle="#ff2b2b"; ctx.fillRect(width-28, R-30, 10, 60);
      // ball
      ctx.beginPath(); ctx.fillStyle="#fff"; ctx.arc(ball.x, ball.y, 6, 0, Math.PI*2); ctx.fill();
      // move
      ball.x += ball.dx; ball.y += ball.dy;
      if (ball.y<6 || ball.y>height-6) ball.dy*=-1;
      if (ball.x<28 && ball.y>L-30 && ball.y<L+30) ball.dx*=-1;
      if (ball.x>width-28 && ball.y>R-30 && ball.y<R+30) ball.dx*=-1;
      requestAnimationFrame(loop);
    };
    const id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [width,height]);

  return <canvas ref={ref} width={width} height={height} className="rounded-xl shadow-2xl"/>;
}
