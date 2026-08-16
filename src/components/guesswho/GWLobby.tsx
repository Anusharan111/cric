import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  Users,
  Plus,
  LogIn,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface GWLobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onBack: () => void;
  isWaiting: boolean;
  roomId: string | null;
  mySide: "p1" | "p2" | null;
  error: string | null;
}

export default function GWLobby({
  onCreateRoom,
  onJoinRoom,
  onBack,
  isWaiting,
  roomId,
  mySide,
  error,
}: GWLobbyProps) {
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!playerName.trim()) return;
    onCreateRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    onJoinRoom(joinRoomId.trim(), playerName.trim());
  };

  return (
    <div className="w-full max-w-lg mx-auto p-6 nexus-glass rounded-2xl border border-violet-500/20 text-white shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 mb-8 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
              <Search className="w-6 h-6 text-fuchsia-400 flex-shrink-0" />
              ANIME GUESS WHO
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Deduce your opponent's secret character
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition duration-200 text-slate-300 flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            {isWaiting ? "Cancel" : "Back"}
          </button>
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        <AnimatePresence mode="wait">
          {/* Waiting State */}
          {isWaiting && roomId ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {mySide === "p2" ? (
                /* P2: Connected, waiting for host to start */
                <div className="text-center space-y-5 py-4">
                  <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Connected to Room!
                  </div>
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                      Room Code
                    </p>
                    <span className="text-2xl font-mono font-bold tracking-[0.3em] text-emerald-300">
                      {roomId}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="relative">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                      <div className="absolute inset-0 w-8 h-8 rounded-full bg-emerald-500/20 animate-ping" />
                    </div>
                    <p className="text-sm text-slate-400">
                      Waiting for host to start the game...
                    </p>
                  </div>
                </div>
              ) : (
                /* P1: Host waiting for opponent */
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 text-fuchsia-400 text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    Room Created!
                  </div>

                  {/* Room ID Display */}
                  <div className="bg-slate-950/80 border border-violet-500/30 rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      Share this Room Code
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl font-mono font-bold tracking-[0.3em] text-violet-300">
                        {roomId}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 transition duration-200"
                        title="Copy Room ID"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-violet-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Waiting Spinner */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                      <div className="absolute inset-0 w-8 h-8 rounded-full bg-violet-500/20 animate-ping" />
                    </div>
                    <p className="text-sm text-slate-400">
                      Waiting for opponent to join...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : mode === "select" ? (
            /* Mode Selection */
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Player Name Input */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500 transition placeholder:text-slate-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    if (!playerName.trim()) return;
                    setMode("create");
                  }}
                  disabled={!playerName.trim()}
                  className="p-5 rounded-xl bg-slate-900/60 hover:bg-violet-950/40 border border-violet-500/20 hover:border-violet-500/50 flex flex-col items-center gap-2.5 transition duration-300 transform hover:-translate-y-1 disabled:opacity-30 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
                >
                  <Plus className="w-8 h-8 text-violet-400 group-hover:scale-110 transition duration-300" />
                  <span className="text-sm font-bold text-white">
                    Create Room
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Host a new game
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (!playerName.trim()) return;
                    setMode("join");
                  }}
                  disabled={!playerName.trim()}
                  className="p-5 rounded-xl bg-slate-900/60 hover:bg-fuchsia-950/40 border border-fuchsia-500/20 hover:border-fuchsia-500/50 flex flex-col items-center gap-2.5 transition duration-300 transform hover:-translate-y-1 disabled:opacity-30 disabled:hover:translate-y-0 disabled:cursor-not-allowed group"
                >
                  <LogIn className="w-8 h-8 text-fuchsia-400 group-hover:scale-110 transition duration-300" />
                  <span className="text-sm font-bold text-white">
                    Join Room
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Enter a room code
                  </span>
                </button>
              </div>
            </motion.div>
          ) : mode === "create" ? (
            /* Create Room Confirmation */
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center py-2">
                <Users className="w-10 h-10 text-violet-400 mx-auto mb-3" />
                <p className="text-slate-300 text-sm">
                  Creating room as{" "}
                  <span className="text-violet-400 font-bold">
                    {playerName}
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMode("select")}
                  className="flex-1 flex items-center justify-center gap-1 text-slate-400 hover:text-white transition text-sm py-2.5 rounded-lg border border-white/10 hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-violet-500/20 transition duration-300 transform hover:scale-105"
                >
                  <Plus className="w-4 h-4" /> Create
                </button>
              </div>
            </motion.div>
          ) : (
            /* Join Room */
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Room Code
                </label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter room code..."
                  maxLength={10}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-white/10 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-fuchsia-500 transition placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setMode("select")}
                  className="flex-1 flex items-center justify-center gap-1 text-slate-400 hover:text-white transition text-sm py-2.5 rounded-lg border border-white/10 hover:bg-white/5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleJoin}
                  disabled={!joinRoomId.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-fuchsia-500/20 transition duration-300 transform hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <LogIn className="w-4 h-4" /> Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
