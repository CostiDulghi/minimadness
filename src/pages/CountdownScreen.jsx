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
            onComplete: onFinish,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onFinish]);

  useEffect(() => {
    if (count > 0) {
      // flare efect pe fundal
      gsap.fromTo(
        bgRef.current,
        { scale: 1, opacity: 0.2 },
        {
          scale: 1.2,
          opacity: 0.8,
          duration: 0.4,
          ease: "power2.inOut",
          yoyo: true,
          repeat: 1,
        }
      );
      // efect pe număr
      gsap.fromTo(
        countRef.current,
        { scale: 0, opacity: 0 },
        {
          scale: 1.5,
          opacity: 1,
          duration: 0.5,
          ease: "elastic.out(1, 0.5)",
        }
      );
    }
  }, [count]);

  return (
    <div
      ref={bgRef}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#24002a] via-black to-[#17003a] overflow-hidden"
    >
      <h1
        ref={countRef}
        className="text-[12rem] font-extrabold text-pink-400 drop-shadow-[0_0_50px_rgba(255,100,200,0.8)]"
      >
        {count}
      </h1>
    </div>
  );
}
