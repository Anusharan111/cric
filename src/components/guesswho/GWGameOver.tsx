import React from "react";
import { motion } from "motion/react";
import {
  Trophy,
  Skull,
  MessageCircle,
  RotateCcw,
  Home,
  Sparkles,
  Star,
} from "lucide-react";
import { CricketPlayer } from "../../types";
import { getRarityConfig, getRoleBadge } from "../../utils/cricketStats";
import CricketCharacterCard from "../../components/common/CricketCharacterCard";

interface GWGameOverProps {
  won: boolean;
  mySecret: CricketPlayer;
  opponentSecret: CricketPlayer;
  myName: string;
  opponentName: string;
  questionsAsked: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

function RevealCard({
  character,
  label,
  delay,
}: {
  character: CricketPlayer;
  label: string;
  delay: number;
}) {
  const config = getRarityConfig(character.rarity);
  const roleBadge = getRoleBadge(character.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      className="flex-1 min-w-0"
    >
      <p className="text-[10px] uppercase tracking-[0.15em] text-cricket-gold/50 font-semibold mb-2 text-center">
        {label}
      </p>
      <div className="rounded-xl overflow-hidden border border-cricket-gold/10 bg-cricket-dark/60 shadow-xl cricket-card">
        <CricketCharacterCard player={character} isFlipped={false} isCompact={false} showFullStats={false} />
      </div>
    </motion.div>
  );
}

export default function GWGameOver({
  won,
  mySecret,
  opponentSecret,
  myName,
  opponentName,
  questionsAsked,
  onPlayAgain,
  onExit,
}: GWGameOverProps) {
  return (
    <div className="w-full max-w-xl mx-auto p-6 cricket-glass rounded-2xl border border-cricket-gold/20 text-cricket-cream shadow-2xl relative overflow-hidden">
      <div
        className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[80px] ${
          won ? "bg-cricket-green/15" : "bg-cricket-red/15"
        }`}
      />
      <div
        className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[80px] ${
          won ? "bg-cricket-gold/15" : "bg-cricket-dark/10"
        }`}
      />

      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.6,
            type: "spring",
            damping: 15,
            stiffness: 200,
          }}
          className="text-center"
        >
          <motion.div
            animate={
              won
                ? {
                    rotate: [0, -5, 5, -3, 3, 0],
                    scale: [1, 1.1, 1],
                  }
                : {}
            }
            transition={{ duration: 1.2, delay: 0.3 }}
            className="inline-block"
          >
            {won ? (
              <Trophy className="w-16 h-16 text-cricket-gold mx-auto mb-3 drop-shadow-[0_0_20px_rgba(212,168,23,0.5)]" />
            ) : (
              <Skull className="w-16 h-16 text-cricket-red mx-auto mb-3 drop-shadow-[0_0_20px_rgba(196,30,58,0.4)]" />
            )}
          </motion.div>

          <h2
            className={`text-4xl sm:text-5xl font-black tracking-wider ${
              won
                ? "bg-gradient-to-r from-cricket-gold via-yellow-400 to-cricket-gold bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(212,168,23,0.4)]"
                : "bg-gradient-to-r from-cricket-red via-red-500 to-rose-500 bg-clip-text text-transparent"
            }`}
          >
            {won ? "VICTORY!" : "DEFEAT"}
          </h2>
          <p className="text-sm text-cricket-gold/50 mt-2">
            {won
              ? `${myName} correctly guessed the secret player!`
              : `${opponentName} outsmarted you this time.`}
          </p>

          {won && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center mt-2"
            >
              <Sparkles className="w-4 h-4 text-cricket-gold/60" />
            </motion.div>
          )}
        </motion.div>

        <div className="flex gap-4">
          <RevealCard
            character={mySecret}
            label="Your Secret Player"
            delay={0.4}
          />
          <RevealCard
            character={opponentSecret}
            label="Opponent's Secret"
            delay={0.6}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-6 py-3 px-4 rounded-xl bg-cricket-dark/60 border border-cricket-gold/5"
        >
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4 text-cricket-gold" />
            <span className="text-cricket-gold/50">Questions Asked:</span>
            <span className="font-bold text-cricket-gold">
              {questionsAsked}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex gap-3"
        >
          <button
            onClick={onExit}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-cricket-gold/10 hover:bg-white/5 text-cricket-gold/60 hover:text-cricket-cream text-sm font-medium transition duration-200"
          >
            <Home className="w-4 h-4" />
            Back to Hub
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-dark font-bold text-sm shadow-lg shadow-cricket-green/20 transition duration-300 transform hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </motion.div>
      </div>
    </div>
  );
}