import React, { useState, useEffect, useRef } from "react";
import { Send, Zap } from "lucide-react";

interface GuessInputProps {
  onSubmitGuess: (guess: string) => void;
  activePlayerName: string;
  disabled: boolean;
  isStealPhase: boolean;
}

export default function GuessInput({
  onSubmitGuess,
  activePlayerName,
  disabled,
  isStealPhase,
}: GuessInputProps) {
  const [guess, setGuess] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when turn changes
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activePlayerName, disabled, isStealPhase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || disabled) return;
    onSubmitGuess(guess);
    setGuess("");
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 rounded-xl bg-slate-900/60 border border-cricket-green/10 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-400">
          {isStealPhase ? (
            <span className="text-yellow-400 font-extrabold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 animate-pulse" /> STEAL OPPORTUNITY:
            </span>
          ) : (
            "CURRENT GUESSER:"
          )}
        </span>
        <span className="text-sm font-black text-cricket-light">
          {activePlayerName}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={disabled}
          placeholder={
            disabled
              ? "Waiting..."
              : isStealPhase
              ? "Type one final team guess to steal the points!"
              : "Type your cricket guess here..."
          }
          className="flex-1 px-4 py-2.5 rounded-lg bg-slate-950 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cricket-green focus:ring-1 focus:ring-cricket-green disabled:opacity-55 disabled:cursor-not-allowed transition"
        />
        <button
          type="submit"
          disabled={disabled || !guess.trim()}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-white text-sm font-bold flex items-center gap-1.5 shadow-md shadow-cricket-green/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <span>Submit</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
