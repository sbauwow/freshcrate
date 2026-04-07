"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/learn-content";

export function CrateQuiz({
  questions,
  slug,
}: {
  questions: QuizQuestion[];
  slug: string;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (questions.length === 0) return null;

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0;

  function select(qi: number, ci: number) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qi]: ci }));
  }

  function handleSubmit() {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitted(true);

    // Persist quiz completion to localStorage alongside crate progress
    try {
      const key = "freshcrate:mini-crates:quiz";
      const raw = localStorage.getItem(key);
      const data: Record<string, number> = raw ? JSON.parse(raw) : {};
      data[slug] = score;
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignore
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
  }

  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="border border-[#6f6f6f] bg-[#dddddd] rounded p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-bold text-fm-text">
          📝 Quick Quiz
        </h2>
        {submitted && (
          <span className="text-[12px] font-mono font-bold">
            {score}/{questions.length} correct
            {score === questions.length ? " — perfect!" : ""}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {questions.map((q, qi) => {
          const picked = answers[qi];
          const isCorrect = submitted && picked === q.correct;
          const isWrong = submitted && picked !== undefined && picked !== q.correct;

          return (
            <div key={qi}>
              <p className="text-[13px] font-bold text-fm-text mb-2">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.choices.map((choice, ci) => {
                  const isSelected = picked === ci;
                  const isAnswer = submitted && ci === q.correct;

                  let style =
                    "border-fm-border bg-white/80 hover:border-fm-green/50 cursor-pointer";
                  if (submitted) {
                    style = "border-fm-border bg-white/40 cursor-default";
                    if (isAnswer)
                      style =
                        "border-green-500 bg-green-50 font-bold cursor-default";
                    if (isSelected && !isAnswer)
                      style =
                        "border-red-400 bg-red-50 cursor-default";
                  } else if (isSelected) {
                    style =
                      "border-fm-green bg-fm-green/10 font-bold cursor-pointer";
                  }

                  return (
                    <button
                      key={ci}
                      onClick={() => select(qi, ci)}
                      className={`block w-full text-left px-3 py-2 text-[12px] rounded border transition-colors ${style}`}
                    >
                      <span className="font-mono text-fm-text-light mr-2">
                        {String.fromCharCode(65 + ci)}.
                      </span>
                      {choice}
                      {submitted && isAnswer && (
                        <span className="ml-2 text-green-700">✓</span>
                      )}
                      {submitted && isSelected && !isAnswer && (
                        <span className="ml-2 text-red-600">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {submitted && (isCorrect || isWrong) && (
                <p className="text-[11px] text-fm-text-light mt-1.5 pl-1 italic">
                  {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className={`text-[12px] font-mono px-4 py-1.5 rounded border transition-colors cursor-pointer ${
              allAnswered
                ? "bg-fm-green text-white border-fm-green hover:bg-fm-green/80"
                : "bg-white/60 text-fm-text-light border-fm-border cursor-not-allowed"
            }`}
          >
            Check Answers
          </button>
        ) : (
          <button
            onClick={reset}
            className="text-[12px] font-mono px-4 py-1.5 rounded border border-fm-border bg-white text-fm-text hover:border-fm-green hover:text-fm-green transition-colors cursor-pointer"
          >
            Try Again
          </button>
        )}
        {!submitted && !allAnswered && (
          <span className="text-[10px] text-fm-text-light">
            Answer all {questions.length} questions to submit
          </span>
        )}
      </div>
    </div>
  );
}
