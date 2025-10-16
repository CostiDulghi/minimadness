import { useState } from "react";
import { gamingQuestions } from "../data/questions";

export default function QuizGame({ onFinish, sessionCode }) {
  // 🧩 asigurare că avem format corect (compatibil cu structura ta q/a/c)
  const questions = Array.isArray(gamingQuestions) && gamingQuestions.length > 0
    ? gamingQuestions.map((q) => ({
        question: q.q,
        options: q.a,
        answer: q.c,
      }))
    : [
        {
          question: "Which company created the PlayStation console?",
          options: ["Sega", "Sony", "Nintendo", "Microsoft"],
          answer: "Sony",
        },
      ];

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const question = questions[index] || null;

  const handleAnswer = (option) => {
    setSelected(option);
    setTimeout(() => {
      if (index + 1 < questions.length) {
        setIndex(index + 1);
        setSelected("");
      } else {
        onFinish?.(); // final de quiz
      }
    }, 1000);
  };

  if (!question)
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <p>No questions available!</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0b0015] via-[#160028] to-[#0b0015] text-white">
      <h2 className="text-3xl text-pink-400 mb-6 text-center">
        {question.question}
      </h2>

      <div className="grid grid-cols-2 gap-4 w-[80%] max-w-3xl">
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
        Question {index + 1} of {questions.length}
      </p>
    </div>
  );
}
