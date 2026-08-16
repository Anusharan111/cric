import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Character } from "../types";
import { CHARACTERS } from "../data/characters";
import { API_BASE } from "../config";
import Pusher from "pusher-js";
import { Copy, Check, Users, Play, LogOut, Crown } from "lucide-react";
import { sfx } from "../utils/audio";
import GuessCharacterMode from "../components/party/GuessCharacterMode";
import GuessImposterMode from "../components/party/GuessImposterMode";

interface AnimePartyGamesProps {
  onExit: () => void;
}

type GamePhase = "lobby-create" | "lobby-join" | "lobby-wait" | "playing-gc" | "playing-imp";

interface PlayerInfo {
  id: string;
  name: string;
}

export default function AnimePartyGames({ onExit }: AnimePartyGamesProps) {
  const [phase, setPhase] = useState<GamePhase>("lobby-create");
  const [myName, setMyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"guess-character" | "guess-imposter">("guess-character");

  // Game state for this player
  const [myCharacter, setMyCharacter] = useState<Character | null>(null);
  const [otherPlayersChars, setOtherPlayersChars] = useState<{ name: string; character: Character; socketId: string }[]>([]);
  const [myCardRevealed, setMyCardRevealed] = useState(false);

  // Imposter specific
  const [imposterVotes, setImposterVotes] = useState<Record<string, string>>({}); // voterId -> accusedName
  const [revealedImposter, setRevealedImposter] = useState<{ name: string; character: Character } | null>(null);
  const [civiliansCharacter, setCiviliansCharacter] = useState<Character | null>(null);
  const [impCharId, setImpCharId] = useState<string | null>(null);
  const [civCharId, setCivCharId] = useState<string | null>(null);

  // Character filter pool
  const [characterPool, setCharacterPool] = useState<Character[]>(CHARACTERS);
  const [category, setCategory] = useState<"all" | "choose">("all");
  const [selectedAnimes, setSelectedAnimes] = useState<string[]>([]);
  const [animeSearchQuery, setAnimeSearchQuery] = useState("");
  const [isAnimeDropdownOpen, setIsAnimeDropdownOpen] = useState(false);
  const [animeList, setAnimeList] = useState<string[]>([]);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const isHostRef = useRef(false);
  const mySocketIdRef = useRef<string | null>(null);
  const playersRef = useRef<PlayerInfo[]>([]);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    // Fetch characters pool to build unique anime list
    const fetchPool = async () => {
      let pool = [...CHARACTERS];
      try {
        const res = await fetch(`${API_BASE}/api/characters`);
        if (res.ok) pool = await res.json();
      } catch (e) { /* fallback */ }
      setCharacterPool(pool);
      
      const labels = new Set<string>();
      for (const char of pool) {
        if (char.anime) labels.add(char.anime);
      }
      setAnimeList(Array.from(labels).sort());
    };
    fetchPool();
  }, []);

  const ensurePusher = useCallback(async (name: string) => {
    if (pusherRef.current) return pusherRef.current;
    const res = await fetch(`${API_BASE}/api/pusher/config`);
    const config = await res.json();
    const pusher = new Pusher(config.key, {
      cluster: config.cluster,
      authEndpoint: `${API_BASE}/api/pusher/auth`,
      auth: { params: { username: name } },
    });
    pusherRef.current = pusher;
    return pusher;
  }, []);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusherRef.current?.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }
    pusherRef.current?.disconnect();
    pusherRef.current = null;
  }, []);

  const handleExit = useCallback(() => {
    cleanup();
    onExit();
  }, [cleanup, onExit]);

  const subscribeToChannel = useCallback((pusher: Pusher, rid: string, side: "host" | "player", name: string) => {
    const channelName = `presence-party-${rid.toUpperCase()}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      mySocketIdRef.current = pusher.connection.socket_id;
      const allMembers: PlayerInfo[] = [];
      members.each((m: any) => {
        allMembers.push({ id: m.id, name: m.info?.name || "Player" });
      });
      setPlayers(allMembers);
      setRoomId(rid);
      setPhase("lobby-wait");
    });

    channel.bind("pusher:member_added", (member: any) => {
      sfx.playSelect();
      setPlayers(prev => [...prev, { id: member.id, name: member.info?.name || "Player" }]);
    });

    channel.bind("pusher:member_removed", (member: any) => {
      setPlayers(prev => prev.filter(p => p.id !== member.id));
    });

    // HOST receives this — Pusher doesn't echo client events to sender, so host applies state locally too
    channel.bind("client-party-game-started", (data: any) => {
      applyGameStart(data, pusher.connection.socket_id);
    });

    channel.bind("client-party-vote", ({ voterId, accusedName }: any) => {
      setImposterVotes(prev => ({ ...prev, [voterId]: accusedName }));
    });

    channel.bind("client-party-reveal", ({ imposterSocketId, civCharId, impCharId }: any) => {
      const idMap = new Map(CHARACTERS.map(c => [c.id, c]));
      const imposterPlayer = playersRef.current.find(p => p.id === imposterSocketId);
      const impChar = idMap.get(impCharId) || null;
      const civChar = idMap.get(civCharId) || null;
      if (imposterPlayer && impChar && civChar) {
        setCiviliansCharacter(civChar);
        setRevealedImposter({ name: imposterPlayer.name, character: impChar });
      }
    });

    // Any player receives this when host ends the game — everyone goes back to lobby
    channel.bind("client-party-end-game", () => {
      setPhase("lobby-wait");
      setMyCharacter(null);
      setOtherPlayersChars([]);
      setImposterVotes({});
      setRevealedImposter(null);
      setCiviliansCharacter(null);
      setCivCharId(null);
      setImpCharId(null);
      setMyCardRevealed(false);
    });

    // Player receives this when another player reveals their card
    channel.bind("client-party-reveal-member-card", ({ targetSocketId }: any) => {
      if (targetSocketId === pusher.connection.socket_id) {
        setMyCardRevealed(true);
        sfx.playCorrect();
      }
    });
  }, []);

  const applyGameStart = (data: any, mySocketId: string) => {
    const { mode, assignments, civCharId, impCharId } = data;
    const idMap = new Map(CHARACTERS.map(c => [c.id, c]));
    setMyCardRevealed(false);

    if (mode === "guess-character") {
      // assignments: [{socketId, charId, playerName}]
      const myAssignment = assignments.find((a: any) => a.socketId === mySocketId);
      const myChar = myAssignment ? idMap.get(myAssignment.charId) || null : null;
      const others = assignments
        .filter((a: any) => a.socketId !== mySocketId)
        .map((a: any) => ({ name: a.playerName, character: idMap.get(a.charId)!, socketId: a.socketId }))
        .filter((o: any) => o.character);

      setMyCharacter(myChar);
      setOtherPlayersChars(others);
      setPhase("playing-gc");
    } else {
      // imposter mode
      const myAssignment = assignments.find((a: any) => a.socketId === mySocketId);
      const civChar = idMap.get(civCharId) || null;
      const impChar = idMap.get(impCharId) || null;
      const myChar = myAssignment?.isImposter ? impChar : civChar;

      setMyCharacter(myChar);
      // Store IDs for reveal
      setCivCharId(civCharId);
      setImpCharId(impCharId);
      setOtherPlayersChars(assignments
        .filter((a: any) => a.socketId !== mySocketId)
        .map((a: any) => ({ name: a.playerName, character: myChar!, socketId: a.socketId })));
      setCiviliansCharacter(civChar);
      setRevealedImposter(null);
      setImposterVotes({});
      setPhase("playing-imp");
    }
    sfx.playCorrect();
  };

  const handleCreateRoom = async () => {
    if (!myName.trim()) { setLobbyError("Please enter your name."); return; }
    setLobbyError(null);
    const rid = Math.random().toString(36).substring(2, 7).toUpperCase();
    const pusher = await ensurePusher(myName.trim());
    if (!pusher) return;
    setIsHost(true);
    isHostRef.current = true;
    subscribeToChannel(pusher, rid, "host", myName.trim());
  };

  const handleJoinRoom = async () => {
    if (!myName.trim()) { setLobbyError("Please enter your name."); return; }
    if (!joinCode.trim()) { setLobbyError("Please enter a room code."); return; }
    setLobbyError(null);
    const pusher = await ensurePusher(myName.trim());
    if (!pusher) return;
    subscribeToChannel(pusher, joinCode.trim().toUpperCase(), "player", myName.trim());
  };

  const handleStartGame = async () => {
    if (!channelRef.current || !roomId) return;
    const currentPlayers = playersRef.current;
    if (currentPlayers.length < 2) { setLobbyError("Need at least 2 players to start."); return; }

    let pool = [...characterPool];
    if (category === "choose" && selectedAnimes.length > 0) {
      const selectedKeys = selectedAnimes.map((a) => a.trim().toLowerCase());
      pool = pool.filter((c) => c.anime && selectedKeys.some(key => c.anime.trim().toLowerCase().includes(key)));
    }

    if (selectedMode === "guess-character") {
      if (pool.length < currentPlayers.length) {
        setLobbyError(`Not enough characters in selected anime pool (${pool.length} available) for all players (${currentPlayers.length} players).`);
        return;
      }
    } else {
      if (pool.length < 2) {
        setLobbyError("Need at least 2 characters in selected anime pool for Guess Imposter.");
        return;
      }
    }

    setLobbyError(null);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    if (selectedMode === "guess-character") {
      const assignments = currentPlayers.map((p, i) => ({
        socketId: p.id,
        playerName: p.name,
        charId: (shuffled[i] || shuffled[i % shuffled.length]).id,
      }));

      const payload = { mode: "guess-character", assignments };
      channelRef.current.trigger("client-party-game-started", payload);
      // Host applies locally
      applyGameStart(payload, pusherRef.current!.connection.socket_id);
    } else {
      const localCivCharId = shuffled[0].id;
      const localImpCharId = shuffled[1].id;
      const imposterIdx = Math.floor(Math.random() * currentPlayers.length);
      const assignments = currentPlayers.map((p, i) => ({
        socketId: p.id,
        playerName: p.name,
        isImposter: i === imposterIdx,
      }));
      const payload = { mode: "guess-imposter", assignments, civCharId: localCivCharId, impCharId: localImpCharId };
      channelRef.current.trigger("client-party-game-started", payload);
      applyGameStart(payload, pusherRef.current!.connection.socket_id);
    }
  };

  const handleVote = (accusedName: string) => {
    if (!channelRef.current || !pusherRef.current) return;
    const voterId = pusherRef.current.connection.socket_id;
    channelRef.current.trigger("client-party-vote", { voterId, accusedName });
    setImposterVotes(prev => ({ ...prev, [voterId]: accusedName }));
  };

  const handleRevealImposter = (imposterSocketId: string) => {
    if (!channelRef.current || !civCharId || !impCharId) return;
    channelRef.current.trigger("client-party-reveal", { imposterSocketId, civCharId, impCharId });
    // Apply locally for host
    const idMap = new Map(CHARACTERS.map(c => [c.id, c]));
    const imposterPlayer = players.find(p => p.id === imposterSocketId);
    const impChar = idMap.get(impCharId) || null;
    const civChar = idMap.get(civCharId) || null;
    if (imposterPlayer && impChar && civChar) {
      setCiviliansCharacter(civChar);
      setRevealedImposter({ name: imposterPlayer.name, character: impChar });
    }
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const backToLobby = () => {
    setPhase("lobby-wait");
    setMyCharacter(null);
    setOtherPlayersChars([]);
    setImposterVotes({});
    setRevealedImposter(null);
    setCiviliansCharacter(null);
    setCivCharId(null);
    setImpCharId(null);
    setMyCardRevealed(false);
  };

  const handleRevealPlayerCard = (targetSocketId: string) => {
    if (!channelRef.current) return;
    channelRef.current.trigger("client-party-reveal-member-card", { targetSocketId });
  };

  // Host calls this to end the current round and return everyone to lobby
  const handleEndGame = () => {
    if (!channelRef.current) return;
    // Trigger for all other players
    channelRef.current.trigger("client-party-end-game", {});
    // Apply locally for host (Pusher doesn't echo client events to sender)
    backToLobby();
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-start py-6 px-3 bg-[#050816] text-white">
      <AnimatePresence mode="wait">

        {/* ---- INITIAL SCREEN: CREATE OR JOIN ---- */}
        {(phase === "lobby-create") && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black italic tracking-wider text-white">🎭 PARTY GAMES</h1>
              <p className="text-slate-400 text-sm">Online multiplayer — play from any device</p>
            </div>

            <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={myName}
                  onChange={e => setMyName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={20}
                  className="mt-1 w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {lobbyError && (
                <p className="text-sm text-red-400 font-medium">{lobbyError}</p>
              )}

              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition"
              >
                <Crown className="w-5 h-5" /> CREATE ROOM
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-white/10" />
                <span className="text-slate-600 text-xs font-bold">OR</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code..."
                  maxLength={5}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition uppercase font-mono tracking-widest text-center"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 transition shadow-lg"
                >
                  JOIN
                </button>
              </div>
            </div>

            <button onClick={handleExit} className="w-full text-slate-500 hover:text-white text-sm flex items-center justify-center gap-2 transition">
              <LogOut className="w-4 h-4" /> Back to Main Menu
            </button>
          </motion.div>
        )}

        {/* ---- LOBBY WAITING ROOM ---- */}
        {phase === "lobby-wait" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center">
              <h1 className="text-3xl font-black italic tracking-wider text-white">LOBBY</h1>
            </div>

            {/* Room Code */}
            <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Room Code</p>
                <p className="text-4xl font-black tracking-[0.3em] text-white font-mono mt-1">{roomId}</p>
              </div>
              <button onClick={copyCode} className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Players list */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players ({players.length})
                </h3>
              </div>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-xl border border-white/5">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-yellow-400" : "bg-emerald-400"} animate-pulse`} />
                    <span className="text-white font-medium">{p.name}</span>
                    {i === 0 && <span className="ml-auto text-[10px] font-black text-yellow-400 uppercase tracking-wider">HOST</span>}
                  </div>
                ))}
                {players.length < 2 && (
                  <p className="text-slate-600 text-xs text-center py-2">Waiting for more players to join...</p>
                )}
              </div>
            </div>

            {/* Mode selector — host only */}
            {isHost && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Game Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["guess-character", "guess-imposter"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`p-4 rounded-xl text-left border-2 transition-all text-sm font-bold ${
                        selectedMode === mode
                          ? mode === "guess-character"
                            ? "bg-violet-900/30 border-violet-500 text-violet-300"
                            : "bg-rose-900/30 border-rose-500 text-rose-300"
                          : "bg-slate-900 border-white/10 text-slate-400"
                      }`}
                    >
                      {mode === "guess-character" ? "🎭 Guess Character" : "🕵️ Guess Imposter"}
                    </button>
                  ))}
                </div>

                {/* Character Pool Filter */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Character Pool Filter</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setCategory("all");
                        setSelectedAnimes([]);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        category === "all"
                          ? "border-violet-500 bg-violet-500/10 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                          : "border-neutral-800 bg-neutral-900/30 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      🌐 All Anime
                    </button>
                    <button
                      onClick={() => setCategory("choose")}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        category === "choose"
                          ? "border-violet-500 bg-violet-500/10 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                          : "border-neutral-800 bg-neutral-900/30 text-neutral-400 hover:border-neutral-700"
                      }`}
                    >
                      🎯 Choose Anime
                    </button>
                  </div>

                  {category === "choose" && (
                    <div className="space-y-2 pt-1 relative animate-fadeIn">
                      <input
                        type="text"
                        value={animeSearchQuery}
                        onFocus={() => setIsAnimeDropdownOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsAnimeDropdownOpen(false), 200);
                        }}
                        onChange={(e) => setAnimeSearchQuery(e.target.value)}
                        placeholder="Select or search anime…"
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-violet-500 focus:outline-none cursor-pointer"
                      />
                      {isAnimeDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                          {animeList
                            .filter((a) => !animeSearchQuery.trim() || a.toLowerCase().includes(animeSearchQuery.toLowerCase()))
                            .map((anime) => (
                              <button
                                key={anime}
                                onMouseDown={() => {
                                  if (!selectedAnimes.includes(anime)) {
                                    setSelectedAnimes((prev) => [...prev, anime]);
                                  }
                                  setAnimeSearchQuery("");
                                  setIsAnimeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-xs font-mono hover:bg-violet-500/15 transition-colors cursor-pointer ${
                                  selectedAnimes.includes(anime) ? "text-violet-400 bg-violet-500/10" : "text-slate-200"
                                }`}
                              >
                                {anime}
                              </button>
                            ))}
                          {animeList.filter((a) => !animeSearchQuery.trim() || a.toLowerCase().includes(animeSearchQuery.toLowerCase())).length === 0 && (
                            <p className="px-3.5 py-2 text-[10px] text-neutral-500 font-mono">No anime found matching "{animeSearchQuery}"</p>
                          )}
                        </div>
                      )}
                      {selectedAnimes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedAnimes.map((anime) => (
                            <span
                              key={anime}
                              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 border border-violet-500/30 px-2.5 py-1 rounded-lg animate-fadeIn"
                            >
                              🎯 {anime}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAnimes((prev) => prev.filter((a) => a !== anime));
                                }}
                                className="hover:text-red-400 font-bold font-sans cursor-pointer transition-colors"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAnimes([]);
                              setAnimeSearchQuery("");
                            }}
                            className="text-[9px] font-mono text-slate-400 hover:text-red-400 transition-colors cursor-pointer self-center ml-1"
                          >
                            ✕ clear all
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Play className="w-5 h-5" fill="currentColor" /> START GAME
                </button>
              </div>
            )}

            {!isHost && (
              <p className="text-center text-slate-500 text-sm animate-pulse">Waiting for the host to start the game...</p>
            )}

            <button onClick={handleExit} className="w-full text-slate-500 hover:text-white text-sm flex items-center justify-center gap-2 transition">
              <LogOut className="w-4 h-4" /> Leave Room
            </button>
          </motion.div>
        )}

        {/* ---- GUESS CHARACTER GAME ---- */}
        {phase === "playing-gc" && myCharacter && (
          <motion.div
            key="playing-gc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <GuessCharacterMode
              myCharacter={myCharacter}
              otherPlayers={otherPlayersChars}
              isHost={isHost}
              myCardRevealed={myCardRevealed}
              onRevealPlayer={handleRevealPlayerCard}
              onEndGame={handleEndGame}
            />
          </motion.div>
        )}

        {/* ---- GUESS IMPOSTER GAME ---- */}
        {phase === "playing-imp" && myCharacter && (
          <motion.div
            key="playing-imp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <GuessImposterMode
              myCharacter={myCharacter}
              players={players}
              mySocketId={pusherRef.current?.connection.socket_id || ""}
              isHost={isHost}
              votes={imposterVotes}
              revealedImposter={revealedImposter}
              civiliansCharacter={civiliansCharacter}
              onVote={handleVote}
              onReveal={handleRevealImposter}
              onEndGame={handleEndGame}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
