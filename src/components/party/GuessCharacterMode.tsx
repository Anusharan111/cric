import React, { useState } from "react";
import { motion } from "motion/react";
import { Character } from "../../types";
import { EyeOff, StopCircle, Eye } from "lucide-react";
import CharacterCard from "../common/CharacterCard";

interface GuessCharacterModeProps {
  myCharacter: Character;
  otherPlayers: { name: string; character: Character; socketId: string }[];
  isHost: boolean;
  myCardRevealed: boolean;
  onRevealPlayer: (socketId: string) => void;
  onEndGame: () => void;
}

export default function GuessCharacterMode({
  myCharacter,
  otherPlayers,
  isHost,
  myCardRevealed,
  onRevealPlayer,
  onEndGame,
}: GuessCharacterModeProps) {
  // Local state to keep track of other players we have requested to reveal
  const [revealedSockets, setRevealedSockets] = useState<Set<string>>(() => new Set());

  const handleRevealClick = (socketId: string) => {
    setRevealedSockets(prev => {
      const next = new Set(prev);
      next.add(socketId);
      return next;
    });
    onRevealPlayer(socketId);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[80vh] space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/50 px-6 py-4 rounded-xl border border-white/5">
        <div>
          <h2 className="text-2xl font-black italic tracking-wider text-white">🎭 GUESS CHARACTER</h2>
          <p className="text-slate-400 text-sm">Ask the others yes/no questions — figure out YOUR character!</p>
        </div>
        <div>
          {isHost ? (
            <button
              onClick={onEndGame}
              className="px-4 py-2 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/40 hover:text-white transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" /> End Game
            </button>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-slate-500 text-[10px] uppercase font-bold font-mono">
              Waiting for host...
            </span>
          )}
        </div>
      </div>

      {/* YOUR card — hidden until revealed by other players */}
      <div className="bg-violet-950/20 border border-violet-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="select-none relative shrink-0">
          <div className="pointer-events-none">
            <CharacterCard character={myCharacter} isFlipped={!myCardRevealed} />
          </div>
          {/* Overlay text prompt */}
          <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
            <span className="bg-slate-950/90 text-white border border-white/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
              {myCardRevealed ? <Eye className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500 animate-pulse" />}
              {myCardRevealed ? "Card Revealed" : "Waiting for Reveal"}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold font-mono">
            {myCardRevealed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {myCardRevealed ? "CARD REVEALED" : "CARD HIDDEN"}
          </div>

          <h3 className="text-2xl font-black text-white">
            {myCardRevealed ? `You are ${myCharacter.name}!` : "This is YOUR card — it's hidden!"}
          </h3>
          
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
            {myCardRevealed ? (
              <>
                Another player has revealed your character! You now know who you are. Discuss the results with your party group!
              </>
            ) : (
              <>
                You cannot see your own character. Ask the other players yes/no questions to figure out who you are!<br />
                <span className="text-violet-300 font-semibold">Other players will see your character and can click the "Reveal Card" button on their screen when you guess it!</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Other players' cards with Reveal buttons */}
      <div className="flex-1">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Other Players' Characters</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {otherPlayers.map((op, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="relative group flex flex-col"
            >
              <div className="relative">
                <CharacterCard character={op.character} isFlipped={false} />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg border-2 border-slate-950 z-10 whitespace-nowrap">
                  {op.name}
                </div>
              </div>
              
              {/* Reveal Button under player card */}
              <div className="mt-3 flex justify-center">
                <button
                  disabled={revealedSockets.has(op.socketId)}
                  onClick={() => handleRevealClick(op.socketId)}
                  className={`w-full py-2 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    revealedSockets.has(op.socketId)
                      ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 opacity-60 cursor-default"
                      : "bg-violet-600 text-white border-violet-500 hover:bg-violet-500 shadow-md cursor-pointer"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {revealedSockets.has(op.socketId) ? "Revealed" : `Reveal for ${op.name}`}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
