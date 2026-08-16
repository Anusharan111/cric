import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Pusher from "pusher-js";
import { Character } from "../types";
import { CHARACTERS } from "../data/characters";
import { API_BASE } from "../config";
import { sfx } from "../utils/audio";

import GWLobby from "../components/guesswho/GWLobby";
import GWCharacterGrid from "../components/guesswho/GWCharacterGrid";
import GWSecretCard from "../components/guesswho/GWSecretCard";
import GWGuessModal from "../components/guesswho/GWGuessModal";
import GWGameOver from "../components/guesswho/GWGameOver";
import { Search, Target, LogOut } from "lucide-react";

interface QuestionEntry {
  question: string;
  answer: "yes" | "no" | null;
  askedBy: "p1" | "p2";
}

interface AnimeGuessWhoGameProps {
  onExit: () => void;
}

export default function AnimeGuessWhoGame({ onExit }: AnimeGuessWhoGameProps) {
  // Phase: lobby → playing → gameover
  const [phase, setPhase] = useState<"lobby" | "playing" | "gameover">("lobby");

  // Lobby state
  const [roomId, setRoomId] = useState<string | null>(null);
  const [mySide, setMySide] = useState<"p1" | "p2" | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [myName, setMyName] = useState("Player");
  const [opponentName, setOpponentName] = useState("Opponent");

  // Game state
  const [grid, setGrid] = useState<Character[]>([]);
  const [mySecret, setMySecret] = useState<Character | null>(null);
  const [p1Secret, setP1Secret] = useState<Character | null>(null);
  const [p2Secret, setP2Secret] = useState<Character | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [currentTurn, setCurrentTurn] = useState<"p1" | "p2">("p1");
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [showGuessModal, setShowGuessModal] = useState(false);

  // Game over state
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    mySecret: Character;
    opponentSecret: Character;
  } | null>(null);

  // Pusher refs
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const roomIdRef = useRef<string | null>(null);
  const mySideRef = useRef<"p1" | "p2" | null>(null);
  const phaseRef = useRef<"lobby" | "playing" | "gameover">("lobby");

  // Keep refs in sync
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Lazy Pusher initialization
  const ensurePusher = useCallback(async (playerName: string) => {
    if (pusherRef.current) return pusherRef.current;

    console.log("Fetching Pusher config for Guess Who...");
    let key = "";
    let cluster = "";
    try {
      const res = await fetch(`${API_BASE}/api/pusher/config`);
      const config = await res.json();
      key = config.key;
      cluster = config.cluster;
    } catch (err) {
      console.error("Failed to fetch Pusher config:", err);
      alert("Multiplayer is offline: server configuration missing");
      return null;
    }

    if (!key || !cluster) {
      console.error("Pusher credentials missing in config response:", { key, cluster });
      alert("Multiplayer is offline: credentials not configured on the server.");
      return null;
    }

    const pusher = new Pusher(key, {
      cluster: cluster,
      authEndpoint: `${API_BASE}/api/pusher/auth`,
      auth: {
        params: {
          username: playerName,
        },
      },
    });

    pusherRef.current = pusher;
    return pusher;
  }, []);

  const handleExit = useCallback(() => {
    if (channelRef.current) {
      try {
        channelRef.current.trigger("client-gw-room-cancelled", {});
      } catch (err) {
        console.warn("Could not notify room cancellation:", err);
      }
      channelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
    onExit();
  }, [onExit]);

  const subscribeToChannel = useCallback((pusher: Pusher, rid: string, side: "p1" | "p2", playerName: string) => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    const channelName = `presence-gw-room-${rid.toUpperCase()}`;
    console.log(`Subscribing to channel ${channelName} as ${side}...`);
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      console.log("GW Presence subscription succeeded. Members count:", members.count);
      
      if (side === "p1") {
        setRoomId(rid);
        roomIdRef.current = rid;
        setMySide("p1");
        mySideRef.current = "p1";
        setIsWaiting(true);

        if (members.count >= 2) {
          let p2Name = "Player 2";
          members.each((member: any) => {
            if (member.id !== members.myID) {
              p2Name = member.info?.name || "Player 2";
            }
          });
          
          console.log("P2 already in room, starting game directly.");
          triggerGameStart(channel, rid, playerName, p2Name);
        }
      } else {
        setRoomId(rid);
        roomIdRef.current = rid;
        setMySide("p2");
        mySideRef.current = "p2";
        // P2 is in the room — show a "waiting for host to start" screen
        setIsWaiting(true);
      }
    });

    channel.bind("pusher:member_added", (member: any) => {
      console.log("Member joined:", member.id, member.info);
      if (side === "p1") {
        const p2Name = member.info?.name || "Player 2";
        triggerGameStart(channel, rid, playerName, p2Name);
      }
    });

    // Receive game start: resolve Character objects from IDs to avoid Pusher 10KB limit
    channel.bind("client-gw-game-started", ({ roomId: roomIdentifier, p1Name, p2Name, gridIds, p1SecretId, p2SecretId }: any) => {
      console.log("client-gw-game-started received:", { roomIdentifier, p1Name, p2Name });
      setRoomId(roomIdentifier);
      roomIdRef.current = roomIdentifier;

      const idMap = new Map(CHARACTERS.map(c => [c.id, c]));
      const resolvedGrid = (gridIds as string[]).map(id => idMap.get(id)).filter(Boolean) as Character[];
      const resolvedP1Secret = idMap.get(p1SecretId) || null;
      const resolvedP2Secret = idMap.get(p2SecretId) || null;

      const myCurrentSide = mySideRef.current;
      setMyName(myCurrentSide === "p1" ? p1Name : p2Name);
      setOpponentName(myCurrentSide === "p1" ? p2Name : p1Name);
      setGrid(resolvedGrid);
      setP1Secret(resolvedP1Secret);
      setP2Secret(resolvedP2Secret);
      setMySecret(myCurrentSide === "p1" ? resolvedP1Secret : resolvedP2Secret);
      setCurrentTurn("p1");
      setIsWaiting(false);
      setPhase("playing");
      sfx.playCorrect();
    });

    channel.bind("client-gw-question-asked", ({ question, fromSide }: any) => {
      setPendingQuestion(question);
      setQuestions((prev) => [...prev, { question, answer: null, askedBy: fromSide }]);
    });

    channel.bind("client-gw-question-answered", ({ answer, fromSide }: any) => {
      setWaitingForAnswer(false);
      if (answer === "yes") {
        sfx.playCorrect();
      } else {
        sfx.playWrong();
      }
      setQuestions((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].answer === null) {
            updated[i] = { ...updated[i], answer };
            break;
          }
        }
        return updated;
      });
      setCurrentTurn((prev) => prev === "p1" ? "p2" : "p1");
    });

    // Receive guess result: resolve Character objects from IDs
    channel.bind("client-gw-guess-result", ({ correct, guesserSide, p1SecretId, p2SecretId }: any) => {
      const iAmGuesser = guesserSide === mySideRef.current;
      const won = iAmGuesser ? correct : !correct;

      if (won) {
        sfx.playVictory();
      } else {
        sfx.playWrong();
      }

      const idMap = new Map(CHARACTERS.map(c => [c.id, c]));
      const resolvedP1Secret = idMap.get(p1SecretId);
      const resolvedP2Secret = idMap.get(p2SecretId);

      // Fall back to state values if lookup fails (shouldn't happen)
      const mySecretChar = (mySideRef.current === "p1" ? resolvedP1Secret : resolvedP2Secret) || p1Secret || p2Secret;
      const opponentSecretChar = (mySideRef.current === "p1" ? resolvedP2Secret : resolvedP1Secret) || p2Secret || p1Secret;

      setGameResult({
        won,
        mySecret: mySecretChar as Character,
        opponentSecret: opponentSecretChar as Character,
      });
      setPhase("gameover");
    });

    channel.bind("client-gw-room-cancelled", () => {
      alert("Room was cancelled.");
      handleExit();
    });

    channel.bind("pusher:member_removed", (member: any) => {
      console.log("Member left:", member.id, member.info);
      // Only alert disconnect if game was actually in progress (not during lobby handshake)
      if (phaseRef.current === "playing" || phaseRef.current === "gameover") {
        alert("Opponent disconnected!");
        handleExit();
      }
    });
  }, [handleExit]);

  const triggerGameStart = (channel: any, rid: string, p1Name: string, p2Name: string) => {
    const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5);
    const grid = shuffled.slice(0, 24);

    const secretIndices = [Math.floor(Math.random() * 24)];
    let secondIdx;
    do { secondIdx = Math.floor(Math.random() * 24); } while (secondIdx === secretIndices[0]);
    secretIndices.push(secondIdx);
    const p1Secret = grid[secretIndices[0]];
    const p2Secret = grid[secretIndices[1]];

    // Send only IDs to stay well under Pusher's 10KB client event payload limit
    const payload = {
      roomId: rid,
      p1Name,
      p2Name,
      gridIds: grid.map(c => c.id),
      p1SecretId: p1Secret.id,
      p2SecretId: p2Secret.id,
    };

    setTimeout(() => {
      // Trigger to P2 (Pusher does NOT echo to the sender)
      channel.trigger("client-gw-game-started", payload);

      // P1 applies state locally immediately
      setMyName(p1Name);
      setOpponentName(p2Name);
      setGrid(grid);
      setP1Secret(p1Secret);
      setP2Secret(p2Secret);
      setMySecret(p1Secret); // P1's secret is p1Secret
      setCurrentTurn("p1");
      setIsWaiting(false);
      setPhase("playing");
      sfx.playCorrect();
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.trigger("client-gw-room-cancelled", {});
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelRef.current.name);
      }
      pusherRef.current?.disconnect();
      pusherRef.current = null;
      channelRef.current = null;
    };
  }, []);

  // --- Lobby actions ---
  const handleCreateRoom = async (playerName: string) => {
    setMyName(playerName);
    const name = playerName.trim() || "Player 1";
    const pusher = await ensurePusher(name);
    if (!pusher) return;

    const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
    subscribeToChannel(pusher, generatedId, "p1", name);
  };

  const handleJoinRoom = async (rid: string, playerName: string) => {
    setMyName(playerName);
    const name = playerName.trim() || "Player 2";
    const pusher = await ensurePusher(name);
    if (!pusher) return;

    subscribeToChannel(pusher, rid.toUpperCase(), "p2", name);
  };

  // --- Gameplay actions ---
  const handleAskQuestion = (question: string) => {
    if (!channelRef.current || !roomIdRef.current) return;
    channelRef.current.trigger("client-gw-ask-question", { roomId: roomIdRef.current, question, fromSide: mySide! });
    setQuestions((prev) => [...prev, { question, answer: null, askedBy: mySide! }]);
    setWaitingForAnswer(true);
  };

  const handleAnswer = (answer: "yes" | "no") => {
    if (!channelRef.current || !roomIdRef.current) return;
    channelRef.current.trigger("client-gw-question-answered", { roomId: roomIdRef.current, answer, fromSide: mySide! });
    setPendingQuestion(null);
    setQuestions((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].answer === null) {
          updated[i] = { ...updated[i], answer };
          break;
        }
      }
      return updated;
    });
    setCurrentTurn((prev) => prev === "p1" ? "p2" : "p1");
  };

  const handleEliminate = (id: string) => {
    sfx.playSkip();
    setEliminatedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleRestore = (id: string) => {
    sfx.playSelect();
    setEliminatedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleGuess = (characterId: string) => {
    if (!channelRef.current || !roomIdRef.current || !p1Secret || !p2Secret) return;
    sfx.playShowdown();

    const opponentSide = mySide === "p1" ? "p2" : "p1";
    const opponentSecret = opponentSide === "p1" ? p1Secret : p2Secret;
    const correct = opponentSecret.id === characterId;

    // Send only IDs to stay under Pusher's 10KB limit
    channelRef.current.trigger("client-gw-guess-result", {
      correct,
      guesserSide: mySide,
      p1SecretId: p1Secret.id,
      p2SecretId: p2Secret.id,
    });

    const won = correct;
    setGameResult({
      won,
      mySecret: mySide === "p1" ? p1Secret : p2Secret,
      opponentSecret: mySide === "p1" ? p2Secret : p1Secret,
    });
    setPhase("gameover");
    setShowGuessModal(false);
  };

  const handlePlayAgain = () => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }
    setPhase("lobby");
    setGrid([]);
    setMySecret(null);
    setP1Secret(null);
    setP2Secret(null);
    setEliminatedIds(new Set());
    setCurrentTurn("p1");
    setQuestions([]);
    setWaitingForAnswer(false);
    setPendingQuestion(null);
    setShowGuessModal(false);
    setGameResult(null);
    setRoomId(null);
    setMySide(null);
    setIsWaiting(false);
  };


  const isMyTurn = currentTurn === mySide;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-6 px-3 text-white">
      <AnimatePresence mode="wait">
        {/* LOBBY PHASE */}
        {phase === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-lg"
          >
            <GWLobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onBack={handleExit}
              isWaiting={isWaiting}
              roomId={roomId}
              mySide={mySide}
              error={lobbyError}
            />
          </motion.div>
        )}

        {/* PLAYING PHASE */}
        {phase === "playing" && mySecret && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-7xl space-y-4"
          >
            {/* Top bar */}
            <div className="flex justify-between items-center bg-slate-950/50 px-4 py-2.5 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs text-slate-400">
                  <strong className="text-white">{myName}</strong>
                  <span className="text-slate-500 mx-1.5">vs</span>
                  <strong className="text-white">{opponentName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  isMyTurn
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 animate-pulse"
                    : "bg-slate-900 border-white/5 text-slate-500"
                }`}>
                  {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </span>
                <button
                  onClick={handleExit}
                  className="text-xs text-slate-500 hover:text-white transition flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Quit
                </button>
              </div>
            </div>

            {/* Main layout: grid + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Character Grid */}
              <div className="order-2 lg:order-1 lg:col-span-8">
                <GWCharacterGrid
                  characters={grid}
                  eliminatedIds={eliminatedIds}
                  onEliminate={handleEliminate}
                  onRestore={handleRestore}
                  disabled={false}
                />
              </div>

              {/* Right: Sidebar */}
              <div className="order-1 lg:order-2 lg:col-span-4 flex flex-col gap-4">
                {/* Secret Card */}
                <GWSecretCard character={mySecret} />

                {/* Guess Button */}
                <button
                  onClick={() => setShowGuessModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-950/30 transition duration-300 transform hover:scale-[1.02] border border-red-500/30"
                >
                  <Target className="w-4 h-4" />
                  MAKE A GUESS
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* GAME OVER PHASE */}
        {phase === "gameover" && gameResult && (
          <motion.div
            key="gameover"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-xl"
          >
            <GWGameOver
              won={gameResult.won}
              mySecret={gameResult.mySecret}
              opponentSecret={gameResult.opponentSecret}
              myName={myName}
              opponentName={opponentName}
              questionsAsked={questions.length}
              onPlayAgain={handlePlayAgain}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess Modal Overlay */}
      <AnimatePresence>
        {showGuessModal && (
          <GWGuessModal
            characters={grid}
            eliminatedIds={eliminatedIds}
            onGuess={handleGuess}
            onCancel={() => setShowGuessModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
