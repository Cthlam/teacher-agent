"use client";

import React, { useState } from "react";
import { X, CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { Quiz, QuizQuestion } from "@/types";

interface QuizModalProps {
  quiz: Quiz;
  onClose: () => void;
}

type AnswerState = "unanswered" | "correct" | "wrong";

export default function QuizModal({ quiz, onClose }: QuizModalProps) {
  const questions: QuizQuestion[] = quiz.questions;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (answerState !== "unanswered") return;
    setSelectedOption(idx);

    const isCorrect = idx === current.correctIndex;
    setAnswerState(isCorrect ? "correct" : "wrong");
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setAnswerState("unanswered");
    } else {
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswerState("unanswered");
    setScore(0);
    setFinished(false);
  };

  const percentage = Math.round((score / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bg-secondary border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-text-primary font-semibold text-sm">{quiz.title}</h2>
            {!finished && (
              <p className="text-text-muted text-xs mt-0.5">
                Question {currentIdx + 1} of {questions.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {finished ? (
          /* Results screen */
          <div className="px-5 py-8 text-center">
            <div className="text-6xl mb-4">
              {percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : "📚"}
            </div>
            <h3 className="text-text-primary font-bold text-xl mb-1">
              {percentage >= 80
                ? "Excellent!"
                : percentage >= 60
                ? "Good job!"
                : "Keep learning!"}
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              You scored{" "}
              <span
                className={clsx(
                  "font-bold",
                  percentage >= 80
                    ? "text-accent-green"
                    : percentage >= 60
                    ? "text-accent-orange"
                    : "text-accent-red"
                )}
              >
                {score}/{questions.length} ({percentage}%)
              </span>
            </p>

            {/* Score bar */}
            <div className="w-full bg-bg-tertiary rounded-full h-2 mb-6">
              <div
                className={clsx(
                  "h-2 rounded-full transition-all duration-1000",
                  percentage >= 80
                    ? "bg-accent-green"
                    : percentage >= 60
                    ? "bg-accent-orange"
                    : "bg-accent-red"
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-border-light transition-colors text-sm"
              >
                <RotateCcw size={14} />
                Try again
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/20 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/30 transition-colors text-sm"
              >
                <Trophy size={14} />
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Question screen */
          <div className="px-5 py-5">
            {/* Progress bar */}
            <div className="w-full bg-bg-tertiary rounded-full h-1 mb-5">
              <div
                className="h-1 rounded-full bg-accent-blue transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            <p className="text-text-primary text-sm font-medium mb-5 leading-relaxed">
              {current.question}
            </p>

            <div className="space-y-2 mb-5">
              {current.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOpt = idx === current.correctIndex;
                let optionClass = "border-border text-text-secondary hover:border-border-light hover:text-text-primary";

                if (answerState !== "unanswered") {
                  if (isCorrectOpt) {
                    optionClass = "border-accent-green bg-accent-green/10 text-accent-green";
                  } else if (isSelected && !isCorrectOpt) {
                    optionClass = "border-accent-red bg-accent-red/10 text-accent-red";
                  } else {
                    optionClass = "border-border text-text-muted opacity-50";
                  }
                } else if (isSelected) {
                  optionClass = "border-accent-blue bg-accent-blue/10 text-text-primary";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={answerState !== "unanswered"}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left text-sm transition-all",
                      optionClass,
                      answerState === "unanswered" && "cursor-pointer"
                    )}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0">
                      {answerState !== "unanswered" && isCorrectOpt ? (
                        <CheckCircle2 size={14} />
                      ) : answerState !== "unanswered" && isSelected && !isCorrectOpt ? (
                        <XCircle size={14} />
                      ) : (
                        String.fromCharCode(65 + idx)
                      )}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answerState !== "unanswered" && (
              <div
                className={clsx(
                  "rounded-lg p-3 mb-4 text-xs leading-relaxed animate-fade-in",
                  answerState === "correct"
                    ? "bg-accent-green/10 border border-accent-green/20 text-accent-green"
                    : "bg-accent-red/10 border border-accent-red/20 text-accent-red"
                )}
              >
                <span className="font-semibold">
                  {answerState === "correct" ? "Correct! " : "Not quite. "}
                </span>
                {current.explanation}
              </div>
            )}

            {answerState !== "unanswered" && (
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-blue/20 border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/30 transition-colors text-sm font-medium animate-fade-in"
              >
                {currentIdx < questions.length - 1 ? (
                  <>Next question <ChevronRight size={14} /></>
                ) : (
                  <>See results <Trophy size={14} /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
