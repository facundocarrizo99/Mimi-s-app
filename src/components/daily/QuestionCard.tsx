"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import type { DailyQuestionWithDetails, QuestionCategory } from "@/types/database";

interface QuestionCardProps {
  dailyQuestion: DailyQuestionWithDetails;
  currentUserId: string;
  index: number;
  onAnswer: (dailyQuestionId: string, text: string) => Promise<void>;
}

export function QuestionCard({
  dailyQuestion,
  currentUserId,
  index,
  onAnswer,
}: QuestionCardProps) {
  const [answerText, setAnswerText] = useState(() => {
    const existing = dailyQuestion.answers.find(
      (a) => a.user_id === currentUserId
    );
    return existing?.text || "";
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    dailyQuestion.answers.some((a) => a.user_id === currentUserId)
  );

  // Sync submitted state when answers arrive via props (e.g. after refetch)
  useEffect(() => {
    if (dailyQuestion.answers.some((a) => a.user_id === currentUserId)) {
      setSubmitted(true);
    }
  }, [dailyQuestion.answers, currentUserId]);

  const myAnswer = dailyQuestion.answers.find(
    (a) => a.user_id === currentUserId
  );

  const category = dailyQuestion.question?.category as QuestionCategory;

  async function handleSubmit() {
    if (!answerText.trim()) return;
    setSubmitting(true);
    await onAnswer(dailyQuestion.id, answerText);
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <Card delay={index * 0.08} className="relative">
      {/* Category badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${getCategoryColor(category)}`}
        >
          {getCategoryLabel(category)}
        </span>
        <span className="text-textmuted text-xs">
          {dailyQuestion.position}/7
        </span>
      </div>

      {/* Question */}
      <p className="font-serif text-lg text-textprimary leading-relaxed mb-5">
        {dailyQuestion.question?.text}
      </p>

      {/* Answer area */}
      {!submitted ? (
        <div>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Your words here..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 text-textprimary placeholder:text-textmuted focus:outline-none focus:ring-2 focus:ring-rose/30 transition resize-none text-sm"
          />
          <div className="flex justify-end mt-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !answerText.trim()}
              size="sm"
            >
              {submitting ? "Saving..." : "Share"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* My answer */}
          <div className="rounded-xl bg-blush/30 p-4">
            <p className="text-xs text-textmuted mb-1">You wrote</p>
            <p className="text-sm text-textprimary leading-relaxed">
              {myAnswer?.text || answerText}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
