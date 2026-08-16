import React, { useState } from "react";
import { Check, Play, Sparkles, X } from "lucide-react";
import { FEUD_CATEGORIES } from "../../data/animeFeudQuestions";
import { GameMode } from "../../game/turnManager";

interface PlayerSetupProps {
  onStartGame: (setup: {
    playerNames: string[];
    mode: GameMode;
    selectedCategories: string[];
    rounds: number;
  }) => void;
  onBack: () => void;
}

export default function PlayerSetup({ onStartGame, onBack }: PlayerSetupProps) {
  const [playerNames, setPlayerNames] = useState<string[]>(["Player 1", "Player 2"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["All"]);
  const [rounds, setRounds] = useState<number>(5);

  const handleNameChange = (index: number, value: string) => {
    const updated = [...playerNames];
    updated[index] = value;
    setPlayerNames(updated);
  };

  const toggleCategory = (category: string) => {
    if (category === "All") {
      setSelectedCategories(["All"]);
      return;
    }

    let next = selectedCategories.filter((item) => item !== "All");
    if (next.includes(category)) {
      next = next.filter((item) => item !== category);
      if (next.length === 0) next = ["All"];
    } else {
      next.push(category);
    }
    setSelectedCategories(next);
  };

  const handleStart = () => {
    onStartGame({
      playerNames: playerNames.map((name, index) => name.trim() || `Player ${index + 1}`),
      mode: "duel",
      selectedCategories,
      rounds,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 nexus-glass rounded-2xl border border-violet-500/20 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-600/30 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-fuchsia-400" /> ANIME FEUD
          </h2>
          <p className="text-xs text-slate-400 mt-1">Local 2-player anime quiz battle</p>
        </div>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center transition"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative z-10 space-y-6">
        <div className="grid sm:grid-cols-2 gap-3">
          {playerNames.map((name, index) => (
            <label key={index} className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                Player {index + 1}
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => handleNameChange(index, event.target.value)}
                placeholder={`Player ${index + 1}`}
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-violet-500"
              />
            </label>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-3 gap-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Categories</h3>
            <span className="text-[10px] text-slate-500">Choose one or more</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[190px] overflow-y-auto pr-1 border border-white/5 rounded-xl p-2 bg-slate-950/40">
            {FEUD_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category);
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`py-2 px-3 rounded-lg text-xs text-left border flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? "bg-fuchsia-600/30 border-fuchsia-400/80 text-white"
                      : "bg-slate-900/60 border-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{category}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider">Rounds</h3>
            <span className="text-lg font-black text-fuchsia-400">{rounds}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={rounds}
            onChange={(event) => setRounds(parseInt(event.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-6 py-3.5 rounded-xl font-black text-sm shadow-lg shadow-violet-500/20 transition active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-white" /> START 2 PLAYER FEUD
        </button>
      </div>
    </div>
  );
}
