import { useState } from "react";
import { gamingQuestions } from "../data/questions";

export default function QuizGame({ onFinish, sessionCode }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const question = gamingQuestions[index];

  const handleAnswer = (option) => {
    setSelected(option);
    setTimeout(() => {
      if (index + 1 < gamingQuestions.length) {
        setIndex(index + 1);
        setSelected("");
      } else {
        onFinish();
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white">
      <h2 className="text-3xl text-pink-400 mb-6">{question.question}</h2>
      <div className="grid grid-cols-2 gap-4 w-[60%]">
        {question.options.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            className={`px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
              selected === opt
                ? opt === question.answer
                  ? "bg-green-500 scale-105"
                  : "bg-red-500 scale-95"
                : "bg-purple-700 hover:bg-purple-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="mt-6 text-gray-400 text-sm">
        Question {index + 1} of {gamingQuestions.length}
      </p>
    </div>
  );
}
