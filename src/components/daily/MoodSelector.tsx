"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";

const MOODS = [
  { emoji: "\ud83e\udd70", label: "Loved" },
  { emoji: "\ud83d\ude0a", label: "Happy" },
  { emoji: "\ud83e\udd14", label: "Thoughtful" },
  { emoji: "\ud83d\ude14", label: "Missing you" },
  { emoji: "\ud83d\ude22", label: "Sad" },
  { emoji: "\ud83d\ude34", label: "Tired" },
  { emoji: "\ud83e\udd29", label: "Excited" },
  { emoji: "\ud83d\ude0c", label: "Grateful" },
];

interface MoodSelectorProps {
  date: string;
  currentMood?: { emoji: string; reflection: string | null };
  onSubmit: (emoji: string, reflection: string) => Promise<void>;
}

export function MoodSelector({ currentMood, onSubmit }: MoodSelectorProps) {
  const [selected, setSelected] = useState(currentMood?.emoji || "");
  const [reflection, setReflection] = useState(currentMood?.reflection || "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    await onSubmit(selected, reflection);
    setSaving(false);
    setExpanded(false);
  }

  return (
    <Card className="relative overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left rounded-xl px-1 py-0.5 md3-state-layer"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-textsecondary">
            {currentMood ? "Today's mood" : "How are you feeling today?"}
          </p>
          {currentMood && (
            <span className="text-2xl">{currentMood.emoji}</span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
          >
            <div className="pt-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {MOODS.map((mood) => (
                  <button
                    key={mood.emoji}
                    onClick={() => setSelected(mood.emoji)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition-all ${
                      selected === mood.emoji
                        ? "bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)]/30 scale-105"
                        : "border-[var(--md-sys-color-outline-variant)]/35 hover:bg-[var(--md-sys-color-surface-container-high)]"
                    }`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-xs text-textmuted">{mood.label}</span>
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="A short reflection... (optional)"
                className="w-full px-3 py-2.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]/70 text-sm text-textprimary placeholder:text-textmuted transition mb-3"
              />

              <button
                onClick={handleSave}
                disabled={!selected || saving}
                className="text-sm text-[var(--md-sys-color-primary)] hover:brightness-110 disabled:text-textmuted transition"
              >
                {saving ? "Saving..." : "Save mood"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
