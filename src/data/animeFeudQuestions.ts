// Cricket Feud — Question Bank (loaded from feud.json, 300 questions)

import feudData from "../../feud.json";

export interface FeudAnswer {
  text: string;
  points: number;
}

export interface FeudQuestion {
  id: number;
  category: string;
  question: string;
  answers: FeudAnswer[];
}

export const FEUD_CATEGORIES: string[] = [
  "All",
  ...Array.from(new Set(feudData.map((board) => board.category))),
];

export type FeudCategory = (typeof FEUD_CATEGORIES)[number];

export const FEUD_QUESTIONS: FeudQuestion[] = feudData.map((board) => ({
  id: board.id,
  category: board.category,
  question: board.question,
  answers: board.answers.map((a) => ({
    text: a.answer,
    points: a.points,
  })),
}));

/** Returns a shuffled subset of questions, optionally filtered by category */
export function getShuffledQuestions(
  count: number,
  category: FeudCategory = "All"
): FeudQuestion[] {
  const pool =
    category === "All"
      ? [...FEUD_QUESTIONS]
      : FEUD_QUESTIONS.filter((q) => q.category === category);

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, Math.min(count, pool.length));
}