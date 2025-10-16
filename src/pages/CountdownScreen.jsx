import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

export default function CountdownScreen({ onFinish }) {
  const [count, setCount] = useState(5);
  const countRef = useRef();
  const bgRef = useRef();

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          gsap.to(countRef.current, {
            scale: 3,
            opacity: 0,
            duration: 0.6,
            onComplete: () => setTimeout(() => onFinish?.(), 300),
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (count > 0) {
      gsap.fromTo(
        bgRef.current,
        { opacity: 0.4, scale: 1 },
        {
          opacity: 0.8,
          scale: 1.15,
          duration: 0.5,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1,
        }
      );
      gsap.fromTo(
        countRef.current,
        { scale: 0, opacity: 0 },
        {
          scale: 1.6,
          opacity: 1,
          duration: 0.6,
          ease: "elastic.out(1, 0.5)",
        }
      );
    }
  }, [count]);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#0b0015]">
      <div
        ref={bgRef}
        className="absolute w-[160%] h-[160%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,50,200,0.25),transparent_70%)] blur-3xl"
      ></div>
      <h1
        ref={countRef}
        className="text-[18rem] font-extrabold text-pink-400 drop-shadow-[0_0_60px_rgba(255,100,200,0.8)] select-none"
      >
        {count}
      </h1>
    </div>
  );
}
