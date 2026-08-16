import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Pusher from "pusher-js";
import { CricketPlayer } from "../types";
import { getAllPlayers, getCountries, getPlayersByCountry } from "../utils/cricketData";
import { API_BASE } from "../config";
import { sfx } from "../utils/audio";

import GWLobby from "../components/guesswho/GWLobby";
import GWCharacterGrid from "../components/guesswho/GWCharacterGrid";
import GWSecretCard from "../components/guesswho/GWSecretCard";
import GWGuessModal from "../components/guesswho/GWGuessModal";
import GWGameOver from "../components/guesswho/GWGameOver";
import CricketCharacterCard from "../components/common/CricketCharacterCard";
import { Search, Target, LogOut, Flag } from "lucide-react";

interface QuestionEntry {
  question: string;
  answer: "yes" | "no" | null;
  askedBy: "p1" | "p2";
}

interface CricketGuessWhoGameProps {
  onExit: () => void;
}

const COUNTRIES = getCountries();
const ALL_PLAYERS = getAllPlayers();

export default function CricketGuessWhoGame({ onExit }: CricketGuessWhoGameProps) {
  const [phase, setPhase] = useState<"lobby" | "playing" | "gameover">("lobby");

  const [roomId, setRoomId] = useState<string | null>(null);
  const [mySide, setMySide] = useState<"p1" | "p2" | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [myName, setMyName] = useState("Player");
  const [opponentName, setOpponentName] = useState("Opponent");

  const [grid, setGrid] = useState<CricketPlayer[]>([]);
  const [opponentGrid, setOpponentGrid] = useState<CricketPlayer[]>([]);
  const [mySecret, setMySecret] = useState<CricketPlayer | null>(null);
  const [p1Secret, setP1Secret] = useState<CricketPlayer | null>(null);
  const [p2Secret, setP2Secret] = useState<CricketPlayer | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [currentTurn, setCurrentTurn] = useState<"p1" | "p2">("p1");
  const [questions, setQuestions] = useState<QuestionEntry[]>([]);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [showGuessModal, setShowGuessModal] = useState(false);

  const [gameResult, setGameResult] = useState<{
    won: boolean;
    mySecret: CricketPlayer;
    opponentSecret: CricketPlayer;
  } | null>(null);

  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const roomIdRef = useRef<string | null>(null);
  const mySideRef = useRef<"p1" | "p2" | null>(null);
  const phaseRef = useRef<"lobby" | "playing" | "gameover">("lobby");
  const selectedCountriesRef = useRef<string[]>([]);
  const p2CountriesRef = useRef<string[]>([]);

  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { mySideRef.current = mySide; }, [mySide]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { selectedCountriesRef.current = selectedCountries; }, [selectedCountries]);

  useEffect(() => {
    if (mySide === "p2" && phase === "lobby" && channelRef.current) {
      try {
        channelRef.current.trigger("client-gw-country-selected", { countries: selectedCountries });
      } catch (err) {
        console.warn("Could not send country selection:", err);
      }
    }
  }, [selectedCountries, mySide, phase]);

  const ensurePusher = useCallback(async (playerName: string) => {
    if (pusherRef.current) return pusherRef.current;

    console.log("Fetching Pusher config for Cricket Guess Who...");
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
        params: { username: playerName },
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

    const channelName = `presence-cricket-gw-room-${rid.toUpperCase()}`;
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
          
          console.log("P2 already in room, starting game shortly.");
          setTimeout(() => triggerGameStart(channel, rid, playerName, p2Name), 1500);
        }
      } else {
        setRoomId(rid);
        roomIdRef.current = rid;
        setMySide("p2");
        mySideRef.current = "p2";
        setIsWaiting(true);
        setTimeout(() => {
          try {
            channel.trigger("client-gw-country-selected", { countries: selectedCountriesRef.current });
          } catch (err) {
            console.warn("Could not send country selection:", err);
          }
        }, 300);
      }
    });

    channel.bind("pusher:member_added", (member: any) => {
      console.log("Member joined:", member.id, member.info);
      if (side === "p1") {
        const p2Name = member.info?.name || "Player 2";
        setTimeout(() => triggerGameStart(channel, rid, playerName, p2Name), 1500);
      }
    });

    channel.bind("client-gw-country-selected", ({ countries }: any) => {
      console.log("P2 country selection received:", countries);
      p2CountriesRef.current = Array.isArray(countries) ? countries : [];
    });

    channel.bind("client-gw-game-started", ({ roomId: roomIdentifier, p1Name, p2Name, p1GridIds, p2GridIds, p1SecretId, p2SecretId }: any) => {
      console.log("client-gw-game-started received:", { roomIdentifier, p1Name, p2Name });
      setRoomId(roomIdentifier);
      roomIdRef.current = roomIdentifier;

      const idMap = new Map(ALL_PLAYERS.map(c => [c.id, c]));
      const resolvedP1Grid = (p1GridIds as string[]).map(id => idMap.get(id)).filter(Boolean) as CricketPlayer[];
      const resolvedP2Grid = (p2GridIds as string[]).map(id => idMap.get(id)).filter(Boolean) as CricketPlayer[];
      const resolvedP1Secret = idMap.get(p1SecretId) || null;
      const resolvedP2Secret = idMap.get(p2SecretId) || null;

      const myCurrentSide = mySideRef.current;
      setMyName(myCurrentSide === "p1" ? p1Name : p2Name);
      setOpponentName(myCurrentSide === "p1" ? p2Name : p1Name);
      setGrid(myCurrentSide === "p1" ? resolvedP1Grid : resolvedP2Grid);
      setOpponentGrid(myCurrentSide === "p1" ? resolvedP2Grid : resolvedP1Grid);
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

    channel.bind("client-gw-guess-result", ({ correct, guesserSide, p1SecretId, p2SecretId }: any) => {
      const iAmGuesser = guesserSide === mySideRef.current;
      const won = iAmGuesser ? correct : !correct;

      if (won) {
        sfx.playVictory();
      } else {
        sfx.playWrong();
      }

      const idMap = new Map(ALL_PLAYERS.map(c => [c.id, c]));
      const resolvedP1Secret = idMap.get(p1SecretId);
      const resolvedP2Secret = idMap.get(p2SecretId);

      const mySecretChar = (mySideRef.current === "p1" ? resolvedP1Secret : resolvedP2Secret) || p1Secret || p2Secret;
      const opponentSecretChar = (mySideRef.current === "p1" ? resolvedP2Secret : resolvedP1Secret) || p2Secret || p1Secret;

      setGameResult({
        won,
        mySecret: mySecretChar as CricketPlayer,
        opponentSecret: opponentSecretChar as CricketPlayer,
      });
      setPhase("gameover");
    });

    channel.bind("client-gw-room-cancelled", () => {
      alert("Room was cancelled.");
      handleExit();
    });

    channel.bind("pusher:member_removed", (member: any) => {
      console.log("Member left:", member.id, member.info);
      if (phaseRef.current === "playing" || phaseRef.current === "gameover") {
        alert("Opponent disconnected!");
        handleExit();
      }
    });
  }, [handleExit]);

  const triggerGameStart = (channel: any, rid: string, p1Name: string, p2Name: string) => {
    const p1Countries = selectedCountriesRef.current;
    const p2Countries = p2CountriesRef.current;

    const poolFor = (countries: string[]) =>
      countries.length > 0 ? ALL_PLAYERS.filter(p => countries.includes(p.country)) : [...ALL_PLAYERS];

    const p1Grid = [...poolFor(p1Countries)].sort(() => Math.random() - 0.5).slice(0, 24);
    const p2Grid = [...poolFor(p2Countries)].sort(() => Math.random() - 0.5).slice(0, 24);

    const p1Secret = p1Grid[Math.floor(Math.random() * p1Grid.length)];
    const p2Secret = p2Grid[Math.floor(Math.random() * p2Grid.length)];

    const payload = {
      roomId: rid,
      p1Name,
      p2Name,
      p1GridIds: p1Grid.map(c => c.id),
      p2GridIds: p2Grid.map(c => c.id),
      p1SecretId: p1Secret.id,
      p2SecretId: p2Secret.id,
    };

    setTimeout(() => {
      channel.trigger("client-gw-game-started", payload);

      setMyName(p1Name);
      setOpponentName(p2Name);
      setGrid(p1Grid);
      setOpponentGrid(p2Grid);
      setP1Secret(p1Secret);
      setP2Secret(p2Secret);
      setMySecret(p1Secret);
      setCurrentTurn("p1");
      setIsWaiting(false);
      setPhase("playing");
      sfx.playCorrect();
    }, 500);
  };

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
    setOpponentGrid([]);
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
    setSelectedCountries([]);
    p2CountriesRef.current = [];
  };

  const isMyTurn = currentTurn === mySide;

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country) 
        : [...prev, country]
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-6 px-3 bg-cricket-dark text-cricket-cream">
      <AnimatePresence mode="wait">
        {phase === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-lg"
          >
            <div className="text-center space-y-2 mb-6">
              <h1 className="text-4xl font-black italic tracking-wider text-cricket-cream cricket-glow-text">🏏 CRICKET GUESS WHO</h1>
              <p className="text-cricket-gold/80 text-sm">Online multiplayer — play from any device</p>
            </div>

            <div className="cricket-panel rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cricket-gold/80 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={myName}
                  onChange={e => setMyName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  className="mt-1 w-full bg-cricket-dark border border-cricket-gold/20 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition"
                />
              </div>

              {lobbyError && (
                <p className="text-sm text-cricket-red font-medium">{lobbyError}</p>
              )}

              <div className="space-y-3 pt-2 border-t border-cricket-gold/10">
                <p className="text-xs font-bold text-cricket-gold/80 uppercase tracking-wider">Select Countries (Optional)</p>
                <p className="text-[10px] text-cricket-gold/50">Leave empty for World XI pool. Select countries to limit the player pool.</p>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map(country => {
                    const info = getCountryInfo(country);
                    return (
                      <button
                        key={country}
                        onClick={() => toggleCountry(country)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          selectedCountries.includes(country)
                            ? "bg-cricket-gold/20 border-cricket-gold/40 text-cricket-gold shadow-[0_0_10px_rgba(212,168,23,0.3)]"
                            : "bg-cricket-dark border-cricket-gold/10 text-cricket-cream/70 hover:border-cricket-gold/30 hover:bg-cricket-green/20"
                        }`}
                      >
                        <span className="text-base">{info.flag}</span>
                        <span>{country}</span>
                        <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded">({info.count})</span>
                      </button>
                    );
                  })}
                </div>
                {selectedCountries.length > 0 && (
                  <button
                    onClick={() => setSelectedCountries([])}
                    className="text-[10px] font-mono text-cricket-red/80 hover:text-cricket-red transition-colors cursor-pointer self-center"
                  >
                    ✕ clear all
                  </button>
                )}
              </div>

              <button
                onClick={() => handleCreateRoom(myName)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition"
              >
                <Flag className="w-5 h-5" /> CREATE ROOM
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-cricket-gold/10" />
                <span className="text-cricket-gold/40 text-xs font-bold">OR</span>
                <div className="flex-1 border-t border-cricket-gold/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomId || ""}
                  onChange={e => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code..."
                  maxLength={8}
                  className="flex-1 bg-cricket-dark border border-cricket-gold/20 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition uppercase font-mono tracking-widest text-center"
                />
                <button
                  onClick={() => handleJoinRoom(roomId || "", myName)}
                  className="px-5 py-3 rounded-xl bg-cricket-red hover:bg-cricket-red/80 text-cricket-cream font-bold flex items-center gap-2 transition shadow-lg shadow-cricket-red/30"
                >
                  JOIN
                </button>
              </div>
            </div>

            <button onClick={handleExit} className="w-full mt-4 text-cricket-gold/60 hover:text-cricket-cream text-sm flex items-center justify-center gap-2 transition">
              <LogOut className="w-4 h-4" /> Back to Main Menu
            </button>
          </motion.div>
        )}

        {phase === "playing" && mySecret && (
          <motion.div
            key="playing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-7xl space-y-4"
          >
            <div className="flex justify-between items-center cricket-panel rounded-xl p-4 border border-cricket-gold/10">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-cricket-gold" />
                <span className="text-xs text-cricket-gold/60">
                  <strong className="text-cricket-cream">{myName}</strong>
                  <span className="text-cricket-gold/40 mx-1.5">vs</span>
                  <strong className="text-cricket-cream">{opponentName}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                  isMyTurn
                    ? "bg-cricket-green/40 border-cricket-gold/40 text-cricket-gold animate-pulse"
                    : "bg-cricket-dark border-cricket-gold/10 text-cricket-gold/50"
                }`}>
                  {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </span>
                <button
                  onClick={handleExit}
                  className="text-xs text-cricket-gold/50 hover:text-cricket-cream transition flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" /> Quit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="order-2 lg:order-1 lg:col-span-8">
                <GWCharacterGrid
                  characters={grid}
                  eliminatedIds={eliminatedIds}
                  onEliminate={handleEliminate}
                  onRestore={handleRestore}
                  disabled={false}
                />
              </div>

              <div className="order-1 lg:order-2 lg:col-span-4 flex flex-col gap-4">
                <GWSecretCard character={mySecret} />
                
                <button
                  onClick={() => setShowGuessModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cricket-red to-red-600 hover:from-red-600 hover:to-red-700 text-cricket-cream font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cricket-red/30 transition duration-300 transform hover:scale-[1.02] border border-cricket-red/30"
                >
                  <Target className="w-4 h-4" />
                  MAKE A GUESS
                </button>
              </div>
            </div>
          </motion.div>
        )}

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

      <AnimatePresence>
        {showGuessModal && (
          <GWGuessModal
            characters={opponentGrid}
            candidateLabel={opponentName && opponentGrid.length > 0
              ? `Possible players for ${opponentName}'s secret (${Array.from(new Set(opponentGrid.map(p => p.country))).join(", ")})`
              : undefined}
            eliminatedIds={eliminatedIds}
            onGuess={handleGuess}
            onCancel={() => setShowGuessModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function getCountryInfo(country: string) {
  const players = getPlayersByCountry(country);
  return {
    flag: players[0]?.flag || "🏏",
    count: players.length,
  };
}