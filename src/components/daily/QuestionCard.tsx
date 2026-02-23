"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HeartPulse } from "@/components/ui/HeartPulse";
import { getCategoryLabel, getCategoryColor } from "@/lib/questions";
import type { DailyQuestionWithDetails, QuestionCategory } from "@/types/database";

interface QuestionCardProps {
  dailyQuestion: DailyQuestionWithDetails;
  currentUserId: string;
  index: number;
  onAnswer: (dailyQuestionId: string, text: string) => Promise<void>;
  onFavorite: (dailyQuestionId: string) => Promise<void>;
}

export function QuestionCard({
  dailyQuestion,
  currentUserId,
  index,
  onAnswer,
  onFavorite,
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

  const myAnswer = dailyQuestion.answers.find(
    (a) => a.user_id === currentUserId
  );
  const partnerAnswer = dailyQuestion.answers.find(
    (a) => a.user_id !== currentUserId
  );
  const bothAnswered = myAnswer && partnerAnswer;
  const isFavorited = dailyQuestion.favorites.length > 0;

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
              {submitting ? "Saving..." : "Share with love"}
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

          {/* Partner's answer or waiting message */}
          <AnimatePresence mode="wait">
            {bothAnswered ? (
              <motion.div
                key="partner-answer"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="rounded-xl bg-lavender/30 p-4"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs text-textmuted">Your love wrote</p>
                  <HeartPulse size="sm" />
                </div>
                <p className="text-sm text-textprimary leading-relaxed">
                  {partnerAnswer?.text}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-3"
              >
                <p className="text-sm text-textmuted italic font-serif">
                  Your words are waiting for your love.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Favorite button */}
          {bothAnswered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center pt-2"
            >
              <button
                onClick={() => onFavorite(dailyQuestion.id)}
                className="text-2xl transition-transform hover:scale-110 active:scale-95"
                title={isFavorited ? "Remove from favorites" : "Save to favorites"}
              >
                <span dangerouslySetInnerHTML={{ __html: isFavorited ? "&#10084;&#65039;" : "&#9825;" }} />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </Card>
  );
}
