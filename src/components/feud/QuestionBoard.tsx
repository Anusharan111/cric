import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { FeudAnswer } from "../../data/animeFeudQuestions";

interface QuestionBoardProps {
  questionText: string;
  category: string;
  answers: FeudAnswer[];
  revealedIndices: number[];
}

export default function QuestionBoard({
  questionText,
  category,
  answers,
  revealedIndices,
}: QuestionBoardProps) {
  // Family Feud standard has up to 8 answers. We display them in two columns.
  const column1 = answers.slice(0, 4);
  const column2 = answers.slice(4, 8);

  const renderCard = (answer: FeudAnswer, index: number) => {
    const isRevealed = revealedIndices.includes(index);

    return (
      <div
        key={index}
        className="w-full h-16 [perspective:1000px] cursor-default"
      >
        <motion.div
          animate={{ rotateX: isRevealed ? 180 : 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-500"
        >
          {/* Front Side: Hidden Card */}
          <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/80 border border-violet-500/30 text-white [backface-visibility:hidden] shadow-md shadow-violet-950/20">
            <span className="font-extrabold text-xl text-violet-400 bg-violet-950/80 w-8 h-8 rounded-full flex items-center justify-center border border-violet-500/20">
              {index + 1}
            </span>
            <div className="h-2 w-1/2 bg-slate-800/40 rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-violet-500/20 w-full animate-pulse" />
            </div>
            <span className="text-sm font-bold text-violet-400/50">??</span>
          </div>

          {/* Back Side: Revealed Answer */}
          <div className="absolute inset-0 flex items-center justify-between px-4 rounded-xl bg-gradient-to-r from-emerald-900 to-teal-950 border border-emerald-500/40 text-white [backface-visibility:hidden] [transform:rotateX(180deg)] shadow-md shadow-emerald-950/20">
            <span className="font-bold text-sm text-emerald-100 truncate pr-2">
              {answer.text}
            </span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="font-extrabold text-lg bg-teal-800/80 px-2.5 py-0.5 rounded-lg border border-teal-500/30 text-yellow-300">
                {answer.points}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Question Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 to-indigo-950/40 border border-violet-500/20 shadow-xl text-center relative overflow-hidden">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-indigo-500/10 rounded-full blur-2xl" />
        <span className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-[10px] uppercase font-bold tracking-widest text-violet-400">
          Category: {category}
        </span>
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-2 text-white drop-shadow-md">
          "{questionText}"
        </h3>
      </div>

      {/* Answer Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          {column1.map((ans, idx) => renderCard(ans, idx))}
        </div>
        <div className="space-y-3">
          {column2.map((ans, idx) => renderCard(ans, idx + 4))}
        </div>
      </div>
    </div>
  );
}
