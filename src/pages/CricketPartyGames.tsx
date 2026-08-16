import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CricketPlayer } from "../types";
import { getAllPlayers, getCountries, getPlayersByCountry } from "../utils/cricketData";
import { API_BASE } from "../config";
import Pusher from "pusher-js";
import { Copy, Check, Users, Play, LogOut, Eye, EyeOff, Crown, AlertTriangle, StopCircle } from "lucide-react";
import { sfx } from "../utils/audio";
import CricketCharacterCard from "../components/common/CricketCharacterCard";

interface CricketPartyGamesProps {
  onExit: () => void;
}

type GamePhase = "lobby" | "lobby-wait" | "playing-gc" | "playing-imp";

interface PlayerInfo {
  id: string;
  name: string;
}

const ALL_PLAYERS = getAllPlayers();
const ID_MAP = new Map(ALL_PLAYERS.map((p) => [p.id, p]));
const COUNTRIES = getCountries();

export default function CricketPartyGames({ onExit }: CricketPartyGamesProps) {
  const [phase, setPhase] = useState<GamePhase>("lobby");

  // ── Room state ──
  const [myName, setMyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Setup options (host picks) ──
  const [selectedMode, setSelectedMode] = useState<"guess-character" | "guess-imposter">("guess-character");
  const [category, setCategory] = useState<"all" | "choose">("all");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // ── Game state (synced via Pusher) ──
  const [myCharacter, setMyCharacter] = useState<CricketPlayer | null>(null);
  const [otherPlayersChars, setOtherPlayersChars] = useState<{ name: string; character: CricketPlayer; socketId: string }[]>([]);
  const [myCardRevealed, setMyCardRevealed] = useState(false);
  const [myCardPeeked, setMyCardPeeked] = useState(false);

  // Imposter
  const [imposterVotes, setImposterVotes] = useState<Record<string, string>>({});
  const [revealedImposter, setRevealedImposter] = useState<{ name: string; character: CricketPlayer } | null>(null);
  const [civiliansCharacter, setCiviliansCharacter] = useState<CricketPlayer | null>(null);
  const [accusedName, setAccusedName] = useState<string | null>(null);
  const [civCharId, setCivCharId] = useState<string | null>(null);
  const [impCharId, setImpCharId] = useState<string | null>(null);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  const isHostRef = useRef(false);
  const myMemberIdRef = useRef<string | null>(null);
  const playersRef = useRef<PlayerInfo[]>([]);
  const impSocketIdRef = useRef<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { playersRef.current = players; }, [players]);

  const ensurePusher = useCallback(async (name: string) => {
    if (pusherRef.current) return pusherRef.current;
    const res = await fetch(`${API_BASE}/api/pusher/config`);
    const config = await res.json();
    if (!config.key || !config.cluster) {
      alert("Multiplayer is offline: credentials not configured on the server.");
      return null;
    }
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

  useEffect(() => () => cleanup(), [cleanup]);

  const applyGameStart = (data: any, myMemberId: string | null) => {
    const { mode, assignments, civCharId, impCharId } = data;
    setMyCardRevealed(false);
    setMyCardPeeked(false);

    if (mode === "guess-character") {
      const myAssignment = assignments.find((a: any) => a.socketId === myMemberId);
      const myChar = myAssignment ? ID_MAP.get(myAssignment.charId) || null : null;
      const others = assignments
        .filter((a: any) => a.socketId !== myMemberId)
        .map((a: any) => ({ name: a.playerName, character: ID_MAP.get(a.charId)!, socketId: a.socketId }))
        .filter((o: any) => o.character);
      setMyCharacter(myChar);
      setOtherPlayersChars(others);
      setPhase("playing-gc");
    } else {
      const myAssignment = assignments.find((a: any) => a.socketId === myMemberId);
      const civChar = ID_MAP.get(civCharId) || null;
      const impChar = ID_MAP.get(impCharId) || null;
      const myChar = myAssignment?.isImposter ? impChar : civChar;

      setMyCharacter(myChar);
      setCivCharId(civCharId);
      setImpCharId(impCharId);
      setOtherPlayersChars(assignments
        .filter((a: any) => a.socketId !== myMemberId)
        .map((a: any) => ({ name: a.playerName, character: civChar!, socketId: a.socketId }))
        .filter((o: any) => o.character));
      setCiviliansCharacter(civChar);
      setRevealedImposter(null);
      setAccusedName(null);
      setImposterVotes({});
      setPhase("playing-imp");
    }
    sfx.playCorrect();
  };

  const subscribeToChannel = useCallback((pusher: Pusher, rid: string, side: "host" | "player", name: string) => {
    const channelName = `presence-cparty-${rid.toUpperCase()}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      let selfId: string | null = null;
      const allMembers: PlayerInfo[] = [];
      members.each((m: any) => {
        allMembers.push({ id: m.id, name: m.info?.name || "Player" });
        if (m.id === members.me?.id) selfId = m.id;
        if (m.info?.name === name) selfId = m.id;
      });
      if (!selfId) selfId = name;
      myMemberIdRef.current = selfId;
      setMyMemberId(selfId);
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

    // Game start — host applies locally too (Pusher doesn't echo client events to sender)
    channel.bind("client-party-game-started", (data: any) => {
      applyGameStart(data, myMemberIdRef.current);
    });

    channel.bind("client-party-vote", ({ voterId, accusedName }: any) => {
      setImposterVotes(prev => ({ ...prev, [voterId]: accusedName }));
    });

    channel.bind("client-party-reveal", ({ accusedSocketId, imposterSocketId, civCharId, impCharId }: any) => {
      const imposterPlayer = playersRef.current.find(p => p.id === imposterSocketId);
      const accused = playersRef.current.find(p => p.id === accusedSocketId);
      const impChar = ID_MAP.get(impCharId) || null;
      const civChar = ID_MAP.get(civCharId) || null;
      if (imposterPlayer && impChar && civChar) {
        setCiviliansCharacter(civChar);
        setRevealedImposter({ name: imposterPlayer.name, character: impChar });
        setAccusedName(accused ? accused.name : null);
      }
    });

    // Everyone returns to the waiting room when the host ends the round
    channel.bind("client-party-end-game", () => {
      setPhase("lobby-wait");
      setMyCharacter(null);
      setOtherPlayersChars([]);
      setImposterVotes({});
      setRevealedImposter(null);
      setCiviliansCharacter(null);
      setAccusedName(null);
      setCivCharId(null);
      setImpCharId(null);
      setMyCardRevealed(false);
      setMyCardPeeked(false);
    });

    // A player receives this when another player reveals their card
    channel.bind("client-party-reveal-member-card", ({ targetSocketId }: any) => {
      if (targetSocketId === myMemberIdRef.current) {
        setMyCardRevealed(true);
        sfx.playCorrect();
      }
    });
  }, []);

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

    let pool = [...ALL_PLAYERS];
    if (category === "choose" && selectedCountries.length > 0) {
      pool = pool.filter(c => selectedCountries.includes(c.country));
    }

    if (selectedMode === "guess-character") {
      if (pool.length < currentPlayers.length) {
        setLobbyError(`Not enough players in selected country pool (${pool.length} available) for all players (${currentPlayers.length} players).`);
        return;
      }
    } else {
      if (pool.length < 2) {
        setLobbyError("Need at least 2 players in the selected country pool for Guess Imposter.");
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
      applyGameStart(payload, myMemberIdRef.current);
    } else {
      const localCivCharId = shuffled[0].id;
      const localImpCharId = shuffled[1].id;
      const imposterIdx = Math.floor(Math.random() * currentPlayers.length);
      impSocketIdRef.current = currentPlayers[imposterIdx].id;
      const assignments = currentPlayers.map((p, i) => ({
        socketId: p.id,
        playerName: p.name,
        isImposter: i === imposterIdx,
      }));
      const payload = { mode: "guess-imposter", assignments, civCharId: localCivCharId, impCharId: localImpCharId };
      channelRef.current.trigger("client-party-game-started", payload);
      applyGameStart(payload, myMemberIdRef.current);
    }
  };

  const handleVote = (accusedName: string) => {
    if (!channelRef.current) return;
    const voterId = myMemberIdRef.current || "";
    channelRef.current.trigger("client-party-vote", { voterId, accusedName });
    setImposterVotes(prev => ({ ...prev, [voterId]: accusedName }));
  };

  const handleRevealImposter = (accusedSocketId: string) => {
    if (!channelRef.current || !civCharId || !impCharId) return;
    const imposterSocketId = impSocketIdRef.current || accusedSocketId;
    channelRef.current.trigger("client-party-reveal", { accusedSocketId, imposterSocketId, civCharId, impCharId });
    // Apply locally for host
    const imposterPlayer = playersRef.current.find(p => p.id === imposterSocketId);
    const accused = playersRef.current.find(p => p.id === accusedSocketId);
    const impChar = ID_MAP.get(impCharId) || null;
    const civChar = ID_MAP.get(civCharId) || null;
    if (imposterPlayer && impChar && civChar) {
      setCiviliansCharacter(civChar);
      setRevealedImposter({ name: imposterPlayer.name, character: impChar });
      setAccusedName(accused ? accused.name : null);
    }
  };

  const handleRevealPlayerCard = (targetSocketId: string) => {
    if (!channelRef.current) return;
    channelRef.current.trigger("client-party-reveal-member-card", { targetSocketId });
  };

  // Host ends the current round and returns everyone to the waiting room
  const handleEndGame = () => {
    if (!channelRef.current) return;
    channelRef.current.trigger("client-party-end-game", {});
    setPhase("lobby-wait");
    setMyCharacter(null);
    setOtherPlayersChars([]);
    setImposterVotes({});
    setRevealedImposter(null);
    setCiviliansCharacter(null);
    setAccusedName(null);
    setCivCharId(null);
    setImpCharId(null);
    setMyCardRevealed(false);
    setMyCardPeeked(false);
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const filteredCountries = COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearchQuery.toLowerCase())
  );

  const myMemberIdFinal = myMemberId || "";
  const voteCount = Object.keys(imposterVotes).length;
  const voteTally: Record<string, number> = {};
  Object.values(imposterVotes).forEach(name => {
    voteTally[name as string] = (voteTally[name as string] || 0) + 1;
  });
  const topVoted = Object.entries(voteTally).sort((a, b) => b[1] - a[1])[0];
  const civiliansWin = accusedName !== null && revealedImposter !== null && accusedName === revealedImposter.name;

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-start py-6 px-3 text-cricket-cream">
      <AnimatePresence mode="wait">

        {/* ══════════ CREATE / JOIN ROOM ══════════ */}
        {phase === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black italic tracking-wider text-cricket-cream cricket-glow-text">🏏 CRICKET PARTY GAMES</h1>
              <p className="text-cricket-gold/70 text-sm">Online multiplayer — play from any device</p>
            </div>

            <div className="cricket-panel rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cricket-gold/70 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  value={myName}
                  onChange={e => setMyName(e.target.value)}
                  placeholder="Enter your name..."
                  maxLength={16}
                  className="mt-1 w-full bg-cricket-dark border border-cricket-green/40 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition"
                />
              </div>

              {lobbyError && <p className="text-sm text-cricket-red font-medium">{lobbyError}</p>}

              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition cursor-pointer active:scale-[0.98]"
              >
                <Crown className="w-5 h-5" /> CREATE GAME
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-cricket-gold/10" />
                <span className="text-cricket-gold/50 text-xs font-bold">OR</span>
                <div className="flex-1 border-t border-cricket-gold/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code..."
                  maxLength={5}
                  className="flex-1 bg-cricket-dark border border-cricket-red/40 rounded-xl px-4 py-3 text-cricket-cream focus:outline-none focus:border-cricket-gold transition uppercase font-mono tracking-widest text-center"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-5 py-3 rounded-xl bg-cricket-red hover:bg-red-700 text-cricket-cream font-bold flex items-center gap-2 transition shadow-lg cursor-pointer"
                >
                  JOIN
                </button>
              </div>
            </div>

            <button onClick={handleExit} className="w-full text-cricket-gold/60 hover:text-cricket-cream text-sm flex items-center justify-center gap-2 transition cursor-pointer">
              <LogOut className="w-4 h-4" /> Back to Main Menu
            </button>
          </motion.div>
        )}

        {/* ══════════ WAITING ROOM ══════════ */}
        {phase === "lobby-wait" && (
          <motion.div
            key="lobby-wait"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center">
              <h1 className="text-3xl font-black italic tracking-wider text-cricket-cream">🏏 PARTY LOBBY</h1>
            </div>

            {/* Room Code */}
            <div className="cricket-panel rounded-2xl p-5 flex items-center justify-between border border-cricket-green/30">
              <div>
                <p className="text-xs text-cricket-gold/60 font-bold uppercase tracking-wider">Room Code</p>
                <p className="text-4xl font-black tracking-[0.3em] text-cricket-cream font-mono mt-1">{roomId}</p>
              </div>
              <button onClick={copyCode} className="p-3 rounded-xl bg-cricket-green/10 border border-cricket-green/30 text-cricket-gold hover:bg-cricket-green/20 transition cursor-pointer">
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            {/* Players list */}
            <div className="cricket-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-cricket-gold flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players ({players.length})
                </h3>
              </div>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-cricket-dark px-4 py-2.5 rounded-xl border border-cricket-gold/10">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-cricket-gold" : "bg-cricket-green"} animate-pulse`} />
                    <span className="text-cricket-cream font-medium">{p.name}</span>
                    {i === 0 && <span className="ml-auto text-[10px] font-black text-cricket-gold uppercase tracking-wider">HOST</span>}
                  </div>
                ))}
                {players.length < 2 && (
                  <p className="text-cricket-gold/40 text-xs text-center py-2">Waiting for more players to join...</p>
                )}
              </div>
            </div>

            {/* Setup — host only */}
            {isHost && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-cricket-gold/70 uppercase tracking-wider">Game Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  {(["guess-character", "guess-imposter"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMode(mode)}
                      className={`p-4 rounded-xl text-left border-2 transition-all text-sm font-bold cursor-pointer ${
                        selectedMode === mode
                          ? mode === "guess-character"
                            ? "bg-cricket-green/20 border-cricket-green text-cricket-gold shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                            : "bg-cricket-red/20 border-cricket-red text-cricket-red shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          : "bg-cricket-dark border-cricket-gold/10 text-cricket-gold/70 hover:border-cricket-gold/30"
                      }`}
                    >
                      {mode === "guess-character" ? "🏏 Guess Player" : "🕵️ Guess Imposter"}
                    </button>
                  ))}
                </div>

                {/* Player Pool Filter */}
                <div className="space-y-2 pt-2 border-t border-cricket-gold/5">
                  <p className="text-xs font-bold text-cricket-gold/60 uppercase tracking-wider">Player Pool Filter</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setCategory("all"); setSelectedCountries([]); }}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        category === "all"
                          ? "border-cricket-green bg-cricket-green/10 text-cricket-gold shadow-[0_0_15px_rgba(34,197,94,0.25)]"
                          : "border-cricket-gold/10 bg-cricket-dark/30 text-cricket-gold/70 hover:border-cricket-gold/30"
                      }`}
                    >
                      🌍 World XI
                    </button>
                    <button
                      onClick={() => setCategory("choose")}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer ${
                        category === "choose"
                          ? "border-cricket-green bg-cricket-green/10 text-cricket-gold shadow-[0_0_15px_rgba(34,197,94,0.25)]"
                          : "border-cricket-gold/10 bg-cricket-dark/30 text-cricket-gold/70 hover:border-cricket-gold/30"
                      }`}
                    >
                      🎯 Choose Countries
                    </button>
                  </div>

                  {category === "choose" && (
                    <div className="space-y-2 pt-1 relative animate-fadeIn">
                      <input
                        type="text"
                        value={countrySearchQuery}
                        onFocus={() => setIsCountryDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsCountryDropdownOpen(false), 200)}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                        placeholder="Select or search countries…"
                        className="w-full bg-cricket-dark/50 border border-cricket-gold/10 rounded-xl py-2.5 px-3.5 text-xs text-cricket-cream font-mono font-bold focus:border-cricket-gold focus:outline-none cursor-pointer"
                      />
                      {isCountryDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-cricket-dark border border-cricket-gold/10 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                          {filteredCountries.map((country) => {
                            const info = {
                              flag: getPlayersByCountry(country)[0]?.flag || "🏏",
                              count: getPlayersByCountry(country).length,
                            };
                            return (
                              <button
                                key={country}
                                onMouseDown={() => {
                                  if (!selectedCountries.includes(country)) {
                                    setSelectedCountries((prev) => [...prev, country]);
                                  }
                                  setCountrySearchQuery("");
                                  setIsCountryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-xs font-mono hover:bg-cricket-green/15 transition-colors cursor-pointer ${
                                  selectedCountries.includes(country) ? "text-cricket-gold bg-cricket-green/10" : "text-cricket-cream"
                                }`}
                              >
                                <span className="text-base">{info.flag}</span> {country} <span className="text-cricket-gold/50">({info.count})</span>
                              </button>
                            );
                          })}
                          {filteredCountries.length === 0 && (
                            <p className="px-3.5 py-2 text-[10px] text-cricket-gold/40 font-mono">No countries found matching "{countrySearchQuery}"</p>
                          )}
                        </div>
                      )}
                      {selectedCountries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedCountries.map((country) => (
                            <span
                              key={country}
                              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-cricket-gold bg-cricket-green/10 border border-cricket-green/30 px-2.5 py-1 rounded-lg animate-fadeIn"
                            >
                              🌍 {country}
                              <button
                                type="button"
                                onClick={() => toggleCountry(country)}
                                className="hover:text-cricket-red font-bold font-sans cursor-pointer transition-colors"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => { setSelectedCountries([]); setCountrySearchQuery(""); }}
                            className="text-[9px] font-mono text-cricket-gold/60 hover:text-cricket-red transition-colors cursor-pointer self-center ml-1"
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
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green disabled:opacity-40 disabled:cursor-not-allowed text-cricket-cream font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition cursor-pointer"
                >
                  <Play className="w-5 h-5" fill="currentColor" /> START GAME
                </button>
              </div>
            )}

            {!isHost && (
              <p className="text-center text-cricket-gold/50 text-sm animate-pulse">Waiting for the host to start the game...</p>
            )}

            <button onClick={handleExit} className="w-full text-cricket-gold/60 hover:text-cricket-cream text-sm flex items-center justify-center gap-2 transition cursor-pointer">
              <LogOut className="w-4 h-4" /> Leave Room
            </button>
          </motion.div>
        )}

        {/* ══════════ GUESS PLAYER (online) ══════════ */}
        {phase === "playing-gc" && myCharacter && (
          <motion.div
            key="playing-gc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[80vh] space-y-6 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cricket-panel rounded-xl p-4 border border-cricket-gold/10">
                <div>
                  <h2 className="text-2xl font-black italic tracking-wider text-cricket-cream">🏏 GUESS PLAYER</h2>
                  <p className="text-cricket-gold/60 text-sm">Your card is hidden from YOU — the other player reveals it when you guess right!</p>
                </div>
                <div>
                  {isHost ? (
                    <button
                      onClick={handleEndGame}
                      className="px-4 py-2 rounded-lg bg-cricket-red/20 border border-cricket-red/40 text-cricket-red hover:bg-cricket-red/40 hover:text-cricket-cream transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
                    >
                      <StopCircle className="w-3.5 h-3.5" /> End Game
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-cricket-dark border border-cricket-gold/10 text-cricket-gold/50 text-[10px] uppercase font-bold font-mono">
                      Waiting for host...
                    </span>
                  )}
                </div>
              </div>

              <p className="text-center text-[10px] font-mono text-cricket-gold/50 uppercase tracking-widest border border-cricket-gold/10 bg-black/20 rounded-full px-4 py-2 animate-pulse max-w-lg mx-auto">
                🎤 Ask yes / no questions — then let the other player reveal your card
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* My card — hidden from me */}
                <div className="flex flex-col items-center gap-3">
                  <div className="px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest bg-cricket-green/15 border-cricket-green/40 text-cricket-light">
                    Your card
                  </div>
                  <div className="relative select-none w-full max-w-[280px]">
                    <div className="pointer-events-none">
                      <CricketCharacterCard player={myCharacter} isFlipped={!myCardRevealed} />
                    </div>
                    <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
                      <span className="bg-cricket-dark/90 text-cricket-cream border border-cricket-gold/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                        {myCardRevealed
                          ? <span className="text-cricket-light">✓ Card Revealed — You are {myCharacter.flag} {myCharacter.name}!</span>
                          : <span className="text-cricket-gold/40">Card Hidden — don't look!</span>}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-cricket-gold/40 text-center -mt-1">
                    {myCardRevealed
                      ? "You now know who you are!"
                      : "The other player reveals this once you guess correctly"}
                  </p>
                </div>

                {/* Other players' cards — visible to me */}
                {otherPlayersChars.map((other) => (
                  <div key={other.socketId} className="flex flex-col items-center gap-3">
                    <div className="px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest bg-cricket-red/15 border-cricket-red/40 text-cricket-red">
                      {other.name}'s card
                    </div>
                    <div className="relative select-none w-full max-w-[280px]">
                      <CricketCharacterCard player={other.character} isFlipped={false} />
                      <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
                        <span className="bg-cricket-dark/90 text-cricket-cream border border-cricket-gold/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                          <span className="text-cricket-gold/70">{other.character.flag} {other.character.name}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevealPlayerCard(other.socketId)}
                      className={`w-full max-w-[280px] py-2.5 rounded-xl border text-xs font-black tracking-wider transition-all flex items-center justify-center gap-2 bg-cricket-green text-cricket-dark border-cricket-green hover:bg-cricket-light shadow-md cursor-pointer active:scale-95`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Reveal for {other.name}
                    </button>
                    <p className="text-[9px] font-mono text-cricket-gold/40 text-center -mt-1">
                      Reveal {other.name}'s card once they guess correctly
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════ GUESS IMPOSTER (online) ══════════ */}
        {phase === "playing-imp" && myCharacter && (
          <motion.div
            key="playing-imp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="w-full max-w-4xl mx-auto flex flex-col min-h-[80vh] p-4 gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cricket-panel rounded-xl p-4 border border-cricket-gold/10">
                <div>
                  <h2 className="text-2xl font-black italic tracking-wider text-cricket-cream">🕵️ GUESS IMPOSTER</h2>
                  <p className="text-cricket-gold/60 text-sm">Discuss, then vote on who you think is the Imposter!</p>
                </div>
                <div>
                  {isHost ? (
                    <button
                      onClick={handleEndGame}
                      className="px-4 py-2 rounded-lg bg-cricket-red/20 border border-cricket-red/40 text-cricket-red hover:bg-cricket-red/40 hover:text-cricket-cream transition flex items-center gap-2 text-xs font-bold shadow-md cursor-pointer"
                    >
                      <StopCircle className="w-3.5 h-3.5" /> End Game
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-cricket-dark border border-cricket-gold/10 text-cricket-gold/50 text-[10px] uppercase font-bold font-mono">
                      Waiting for host...
                    </span>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {revealedImposter && civiliansCharacter ? (
                  <motion.div
                    key="reveal"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`${civiliansWin ? "bg-cricket-green/20 border-cricket-green/40" : "bg-cricket-red/30 border-cricket-red/30"} border rounded-2xl p-6 text-center space-y-4 flex-1`}
                  >
                    <Crown className={`w-10 h-10 mx-auto ${civiliansWin ? "text-cricket-gold" : "text-cricket-red"}`} />
                    <h3 className="text-2xl font-black uppercase tracking-wider text-cricket-cream">
                      {civiliansWin
                        ? `🎉 ${revealedImposter.name} was the Imposter — Civilians win!`
                        : accusedName
                          ? `The Imposter escaped! ${accusedName} was innocent.`
                          : "The Imposter got away!"}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-8">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-cricket-gold/60 text-xs font-bold uppercase">Everyone had</span>
                        <div className="scale-90 opacity-80">
                          <CricketCharacterCard player={civiliansCharacter} isFlipped={false} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-cricket-green/15 border border-cricket-green/40 text-cricket-light text-[10px] font-black uppercase tracking-widest">
                          Civilians
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-cricket-red text-xs font-bold uppercase">Imposter had</span>
                        <div className="shadow-[0_0_40px_rgba(239,68,68,0.4)] rounded-2xl">
                          <CricketCharacterCard player={revealedImposter.character} isFlipped={false} />
                        </div>
                        <span className="px-3 py-1 rounded-full bg-cricket-red/15 border border-cricket-red/40 text-cricket-red text-[10px] font-black uppercase tracking-widest">
                          Imp: {revealedImposter.name}
                        </span>
                      </div>
                    </div>
                    {isHost && (
                      <button
                        onClick={handleEndGame}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cricket-green/30 transition cursor-pointer mx-auto active:scale-95"
                      >
                        <Play className="w-4 h-4" fill="currentColor" /> Next Game
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 flex-1">
                    {/* My character card — tap to peek */}
                    <div className="cricket-panel rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                      <div
                        onClick={() => { setMyCardPeeked(prev => !prev); sfx.playSelect(); }}
                        className="cursor-pointer select-none relative shrink-0 transition-transform active:scale-95"
                      >
                        <div className="pointer-events-none">
                          <CricketCharacterCard player={myCharacter} isFlipped={!myCardPeeked} />
                        </div>
                        <div className="absolute inset-x-0 bottom-6 flex justify-center z-30 pointer-events-none">
                          <span className="bg-cricket-dark/90 text-cricket-cream border border-cricket-gold/10 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                            {myCardPeeked ? <EyeOff className="w-3.5 h-3.5 text-cricket-red" /> : <Eye className="w-3.5 h-3.5 text-cricket-light" />}
                            {myCardPeeked ? "Tap to Hide" : "Tap to Reveal"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 text-center sm:text-left flex-1">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold font-mono ${myCardPeeked ? "bg-cricket-green/10 border-cricket-green/30 text-cricket-light" : "bg-cricket-dark border-cricket-gold/10 text-cricket-gold/60"}`}>
                          {myCardPeeked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {myCardPeeked ? "CARD REVEALED" : "CARD HIDDEN"}
                        </div>

                        <h3 className="text-2xl font-black text-cricket-cream">
                          {myCardPeeked ? `${myCharacter.flag} ${myCharacter.name}` : "Your Player is Hidden"}
                        </h3>
                        <p className="text-cricket-gold/50 text-sm">{myCardPeeked ? `${myCharacter.country} • ${myCharacter.role}` : "???"}</p>

                        <p className="text-cricket-gold/60 text-sm leading-relaxed max-w-xl">
                          {myCardPeeked ? (
                            <>
                              You revealed your player! Discuss with the group — give subtle hints, but don't say the name! Tap the card again to hide it.
                            </>
                          ) : (
                            <>
                              Tap your card to peek. Keep it hidden from players near you! Give subtle hints about your player, and figure out who has a different player.
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Voting */}
                    <div className="cricket-panel rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-cricket-gold/70 uppercase tracking-wider">Vote for the Imposter</h3>
                        <span className="text-xs text-cricket-gold/50 font-bold">{voteCount}/{players.length} voted</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {players.map(p => {
                          const isMe = p.id === myMemberIdFinal;
                          const myVote = Object.entries(imposterVotes).find(([voterId]) => voterId === myMemberIdFinal)?.[1] || null;
                          const tally = voteTally[p.name] || 0;
                          const hasVotedForThis = myVote === p.name;

                          return (
                            <button
                              key={p.id}
                              onClick={() => !isMe && !myVote && handleVote(p.name)}
                              disabled={!!myVote || isMe}
                              className={`relative p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                isMe
                                  ? "border-cricket-gold/10 bg-cricket-dark/30 opacity-40 cursor-not-allowed"
                                  : hasVotedForThis
                                    ? "border-cricket-red bg-cricket-red/30"
                                    : myVote
                                      ? "border-cricket-gold/10 bg-cricket-dark opacity-60"
                                      : "border-cricket-gold/10 bg-cricket-dark hover:border-cricket-red/50 hover:bg-cricket-red/20"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-cricket-cream">{p.name}</span>
                                {tally > 0 && (
                                  <span className="text-xs font-black text-cricket-red bg-cricket-red/20 px-2 py-0.5 rounded-full border border-cricket-red/40">
                                    {tally} vote{tally > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              {isMe && <span className="text-xs text-cricket-gold/40">(You)</span>}
                              {hasVotedForThis && (
                                <span className="text-[10px] font-black text-cricket-red uppercase tracking-wider block mt-1">Your vote ✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {isHost && voteCount > 0 && topVoted && (
                        <button
                          onClick={() => {
                            const topPlayer = players.find(p => p.name === topVoted[0]);
                            if (!topPlayer) return;
                            handleRevealImposter(topPlayer.id);
                            sfx.playShowdown();
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-cricket-red to-orange-600 hover:from-red-600 hover:to-orange-500 text-cricket-cream font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          REVEAL IMPOSTER ({topVoted[0]} — {topVoted[1]} votes)
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}