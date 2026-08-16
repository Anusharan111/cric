import React from "react";
import TeamSlots from "../common/TeamSlots";
import CharacterImage from "../common/CharacterImage";
import { Plus, LogIn, AlertCircle, RefreshCw, Play, ArrowRight, ArrowRight as ArrowR, ArrowRight as Arrow } from "lucide-react";
import { Flame, Computer, Users, Globe } from "lucide-react";
import { getSuggestions } from "../../utils/draftPool";

/**
 * Game Hub component – renders the setup UI after the landing page.
 * All required state and callbacks are passed via props (any) for simplicity.
 */
export default function GameHub(props: any) {
  const {
    setSelectedGameHubMode,
    setView,
    gameMode,
    setGameMode,
    player1Name,
    setPlayer1Name,
    player2Name,
    setPlayer2Name,
    setOnlineAction,
    onlineAction,
    setOnlineRoomId,
    isWaitingForOpponent,
    joinOnlineRoom,
    createOnlineRoom,
    setJoinRoomId,
    onlineRoomId,
    resetOnlineLobby,
    setIsStartingGame,
    setCategory,
    setSelectedAnimes,
    setAnimeSearchQuery,
    importStarterAllAnimeCasts,
    selectedAnimes,
    isAnimeDropdownOpen,
    setIsAnimeDropdownOpen,
    animeList,
    animeSearchQuery,
    hottestSpotlight,
    totalCharacters,
    setShowAbout,
    importCastForAnime,
    ...rest
  } = props;

  // The original JSX is reproduced below with minimal modifications – all variables are resolved from props.
  return (
    <div className="pt-4">
      {/* Back button to Hub */}
      <div className="max-w-5xl mx-auto flex justify-start pb-4 w-full">
        <button
          onClick={() => setSelectedGameHubMode("hub")}
          className="px-4 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs font-bold text-neutral-300 hover:text-white hover:border-violet-500/40 transition duration-200 cursor-pointer flex items-center gap-2"
        >
          ← Back to Game Hub
        </button>
      </div>

      {/* GAME SETUP MATRIX */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
        {/* Setup Controls */}
        <div className="rounded-3xl border border-neutral-800/80 mirror-panel p-5 sm:p-8 flex flex-col justify-between space-y-6 sm:space-y-8 relative overflow-hidden shadow-2xl">
          <div className="space-y-5">
            <div className="flex border-b border-white/5 pb-4 items-center gap-2.5">
              <Flame className="w-5 h-5 text-violet-400" />
              <h2 className="text-base sm:text-lg font-black uppercase text-white font-mono tracking-wider">
                STADIUM MATCH REGISTRATION
              </h2>
            </div>

            {/* Mode selectors */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                SELECT BATTLE DESIGN
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                <button
                  onClick={() => {
                    setGameMode("vs-ai");
                    setPlayer2Name("Smart AI");
                    setOnlineAction(null);
                  }}
                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${gameMode === "vs-ai"
                    ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                    : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                  }`}
                >
                  <Computer className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">P1 VS AI</p>
                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Solo Bot</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setGameMode("local-2p");
                    setPlayer2Name("Hype Guest");
                    setOnlineAction(null);
                  }}
                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${gameMode === "local-2p"
                    ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                    : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                  }`}
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">LOCAL 2P</p>
                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Pass & Play</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setGameMode("online-2p");
                    setOnlineAction(null);
                  }}
                  className={`p-3 sm:p-4 rounded-xl border flex flex-col items-center gap-1.5 sm:gap-2 text-center transition-all cursor-pointer ${gameMode === "online-2p"
                    ? "border-violet-500 bg-violet-950/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                    : "border-neutral-900 bg-neutral-900/20 text-neutral-400 hover:border-neutral-800"
                  }`}
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide">ONLINE 2P</p>
                    <p className="text-[8px] sm:text-[9px] font-mono text-neutral-500 mt-0.5">Play Online</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Online room creation/join UI */}
            {gameMode === "online-2p" && !onlineRoomId && (
              <div className="space-y-4 p-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 animate-fadeIn">
                {!onlineAction ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOnlineAction("create")}
                      className="py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Create Room
                    </button>
                    <button
                      onClick={() => setOnlineAction("join")}
                      className="py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" /> Join Room
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-violet-300 uppercase tracking-widest">
                        {onlineAction === "create" ? "Configure your room" : "Enter room details"}
                      </p>
                      <button
                        onClick={() => setOnlineAction(null)}
                        className="text-[9px] font-mono text-neutral-500 hover:text-white uppercase transition-colors cursor-pointer"
                      >
                        ← Back
                      </button>
                    </div>
                    {onlineAction === "join" && (
                      <div className="relative">
                        <input
                          type="text"
                          value={props.joinRoomId}
                          onChange={(e) => props.setJoinRoomId(e.target.value)}
                          placeholder="ROOM CODE"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 px-3 text-[10px] text-white font-mono font-bold focus:border-violet-500 focus:outline-none uppercase"
                        />
                        <button
                          onClick={joinOnlineRoom}
                          className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    )}
                    {onlineAction === "create" && (
                      <button
                        onClick={createOnlineRoom}
                        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Initialize &amp; Generate Room
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Waiting for opponent UI */}
            {onlineRoomId && props.isWaitingForOpponent && (
              <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-center space-y-3">
                <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Room Created! Share code with friend</p>
                <div className="flex items-center justify-center gap-3">
                  <h3 className="text-3xl font-black text-white tracking-widest">{onlineRoomId}</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(onlineRoomId).catch(() => {});
                    }}
                    className="text-[9px] font-mono text-emerald-400 border border-emerald-500/30 rounded-lg px-2 py-1 hover:bg-emerald-500/10 transition-all cursor-pointer"
                    title="Copy room code"
                  >
                    Copy
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 text-[9px] text-neutral-500 uppercase font-mono animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Waiting for opponent...
                </div>
                <button 
                  onClick={() => {
                    if (props.channelRef?.current) {
                      props.channelRef.current.trigger("client-room-cancelled", {});
                    }
                    resetOnlineLobby();
                    setGameMode("vs-ai");
                  }}
                  className="text-[9px] text-red-400 hover:underline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Anime filter UI */}
            {(gameMode !== "online-2p" || props.onlineAction === "create" || (onlineRoomId && props.onlineSide === "p1")) && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase flex items-center gap-2">
                  CHARACTER POOL FILTER
                  <input
                    type="checkbox"
                    id="chk-all-anime"
                    checked={props.allAnime}
                    onChange={(e) => {
                      props.setAllAnime(e.target.checked);
                      if (e.target.checked) {
                        props.setCategory("all");
                        props.setSelectedAnimes([]);
                        props.setAnimeSearchQuery("");
                        props.importStarterAllAnimeCasts();
                      } else {
                        props.setCategory("choose");
                      }
                    }}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                  <label htmlFor="chk-all-anime" className="text-xs font-mono text-slate-300 cursor-pointer">
                    All Anime
                  </label>
                </label>

                {!props.allAnime && props.category === "choose" && (
                  <div className="space-y-2">
                    {/* Draft Quality Indicator */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold ${props.draftQuality === "excellent" || props.draftQuality === "good" ? "text-green-400" : props.draftQuality === "recommended" ? "text-yellow-400" : props.draftQuality === "limited" ? "text-orange-400" : "text-red-400"}`}>
                          {props.getDraftQualityLabel(props.draftQuality)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">Pool</span>
                      </div>
                      <div className="h-2 flex-1 bg-neutral-800 rounded-full overflow-hidden max-w-[150px]">
                        <div
                          className={`h-full rounded-full transition-all ${props.draftQuality === "excellent" || props.draftQuality === "good" ? "bg-green-500" : props.draftQuality === "recommended" ? "bg-yellow-500" : props.draftQuality === "limited" ? "bg-orange-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, (props.selectedAnimeCharacterCount / 100) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Suggestions when pool < 50 */}
                    {props.selectedAnimeCharacterCount < props.MIN_RECOMMENDED_POOL && props.selectedAnimes.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[9px] font-mono text-amber-300">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertCircle className="w-3 h-3" />
                          <span>Limited Character Variety ({props.selectedAnimeCharacterCount}/{props.MIN_RECOMMENDED_POOL})</span>
                        </div>
                        <p className="text-slate-400 mb-2">Add these anime for better variety:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {getSuggestions(props.animeCounts, props.selectedAnimes, 3).map(({ anime, count }) => (
                              <button
                                key={anime}
                                onClick={() => {
                                  props.setSelectedAnimes((prev: string[]) => [...prev, anime]);
                                  props.importCastForAnime(anime).catch(console.warn);
                                }}
                                className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg hover:border-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer text-[9px] font-mono"
                              >
                                +{anime}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    <input
                      id="inp-anime-search"
                      type="text"
                      value={props.animeSearchQuery}
                      onFocus={() => props.setIsAnimeDropdownOpen(true)}
                      onBlur={() => {
                        setTimeout(() => props.setIsAnimeDropdownOpen(false), 200);
                      }}
                        onChange={(e) => props.setAnimeSearchQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const query = props.animeSearchQuery.trim(); if (query) { const match = props.animeList.find((a: string) => a.toLowerCase() === query.toLowerCase()); if (match && !props.selectedAnimes.includes(match)) { props.setSelectedAnimes((prev: string[]) => [...prev, match]); props.importCastForAnime(match).catch(console.warn); } props.setAnimeSearchQuery(''); props.setIsAnimeDropdownOpen(false); } } } }
                      placeholder="Select or search anime… e.g. Naruto, Bleach"
                      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                    />
                     {props.isAnimeDropdownOpen && props.animeSearchQuery.trim().length >= 2 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                        {props.animeList
                          .filter((a: string) => a.toLowerCase().startsWith(props.animeSearchQuery.trim().toLowerCase()))
                          .map((anime: string) => (
                            <button
                              key={anime}
                              onMouseDown={() => {
                                if (!props.selectedAnimes.includes(anime)) {
                                  props.setSelectedAnimes((prev: string[]) => [...prev, anime]);
                                  props.importCastForAnime(anime).catch((error: any) => console.warn("Auto import failed", error));
                                }
                                props.setAnimeSearchQuery("");
                                props.setIsAnimeDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs font-mono hover:bg-purple-500/15 transition-colors cursor-pointer flex items-center justify-between ${props.selectedAnimes.includes(anime) ? "text-purple-400 bg-purple-500/10" : "text-slate-200"}`}
                            >
                              <span>{anime}</span>
                              <span className="text-[9px] font-mono text-slate-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                                
                              </span>
                            </button>
                          ))}
                        {props.animeList.filter((a: string) => !props.animeSearchQuery.trim() || a.toLowerCase().includes(props.animeSearchQuery.toLowerCase())).length === 0 && (
                          <p className="px-3.5 py-2 text-[10px] text-neutral-500 font-mono">No anime found matching "{props.animeSearchQuery}"</p>
                        )}
                      </div>
                    )}
                    {props.selectedAnimes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {props.selectedAnimes.map((anime: string) => (
                          <span
                            key={anime}
                            className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2.5 py-1 rounded-lg"
                          >
                            🎯 {anime} <span className="text-[9px] text-slate-400"></span>
                            <button
                              type="button"
                              onClick={() => props.setSelectedAnimes((prev: string[]) => prev.filter((a) => a !== anime))}
                              className="hover:text-red-400 font-bold font-sans cursor-pointer transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            props.setSelectedAnimes([]);
                            props.setAnimeSearchQuery("");
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
            )}

            {/* Player name inputs */}
            {(gameMode !== "online-2p" || props.onlineAction !== null) && (
              <div className="space-y-3 pt-2 animate-fadeIn">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                    PLAYER 1 SIGNATURE CALL
                  </label>
                  <input
                    id="inp-p1-name"
                    type="text"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    placeholder="Fighter 1 Name"
                    maxLength={16}
                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
                  />
                </div>
                {gameMode === "local-2p" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                      PLAYER 2 SIGNATURE CALL
                    </label>
                    <input
                      id="inp-p2-name"
                      type="text"
                      value={player2Name}
                      onChange={(e) => setPlayer2Name(e.target.value)}
                      placeholder="Fighter 2 Name"
                      maxLength={16}
                      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Validation warnings */}
            {props.category === "choose" && !props.allAnime && props.selectedAnimes.length === 0 && (
              <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl font-mono text-[10px] font-bold leading-normal mt-4 shadow-sm animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please select at least one anime before starting the game.</span>
              </div>
            )}
            {props.category === "choose" && !props.allAnime && props.selectedAnimes.length > 0 && props.selectedAnimeCharacterCount < props.ABSOLUTE_MIN && (
              <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl font-mono text-[10px] font-bold leading-normal mt-4 shadow-sm animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Need at least {props.ABSOLUTE_MIN} characters to start. Current pool: {props.selectedAnimeCharacterCount}.</span>
              </div>
            )}

            {/* Start button */}
            {(gameMode !== "online-2p" || (onlineRoomId && props.onlineSide === "p1")) && (
              props.isMobile ? (
                <button
                  id="btn-start-battle-mobile"
                  onClick={() => props.startNewGame(gameMode)}
                  disabled={!props.canStartDraft}
                  className={`w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-black transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer ${!props.canStartDraft
                    ? "bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-50 shadow-none scale-100"
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.45)] active:scale-95"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" /> ENTER DRAFTING ARENA <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  id="btn-start-battle"
                  onClick={() => props.startNewGame(gameMode)}
                  disabled={!props.canStartDraft}
                  className={`w-full py-4 rounded-xl text-xs uppercase tracking-[0.2em] font-black transition-all flex items-center justify-center gap-2 mt-6 cursor-pointer ${!props.canStartDraft
                    ? "bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-50 shadow-none scale-100"
                    : "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.45)] active:scale-95"
                  }`}
                >
                  <Play className="w-4 h-4 fill-white" /> ENTER DRAFTING ARENA <ArrowRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Spotlight Roster Card */}
        <div className="rounded-3xl border border-neutral-800/85 mirror-panel p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20 filter blur-xl scale-75" style={{ background: hottestSpotlight.themeColor }} />
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <p className="text-[10px] font-mono text-violet-400 tracking-widest uppercase font-black">
                FEATURED SPOTLIGHT CARDS
              </p>
              <span className="text-[9px] font-mono bg-neutral-900 border border-white/5 px-2 py-0.5 rounded text-neutral-400 flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: "10s" }} /> Rotating roster
              </span>
            </div>
            <div className="flex gap-4 items-center">
              <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden border shrink-0 shadow-lg" style={{ borderColor: `${hottestSpotlight.themeColor}44` }}>
                <CharacterImage
                  url={hottestSpotlight.image}
                  name={hottestSpotlight.name}
                  fallbackUrl={hottestSpotlight.malfallbackUrl}
                  themeColor={hottestSpotlight.themeColor}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-1.5 left-2">
                  <p className="text-[10px] font-black truncate max-w-[80px] text-white">{hottestSpotlight.name}</p>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2 min-w-0">
                <span className="text-[8px] font-mono font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase">
                  {hottestSpotlight.rarity}
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate">{hottestSpotlight.name}</h3>
                <p className="text-[10px] text-neutral-400 font-mono uppercase truncate">{hottestSpotlight.anime}</p>
                <p className="text-xs text-neutral-400 leading-relaxed max-w-sm line-clamp-2">
                  {hottestSpotlight.description}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-neutral-900/30 border border-white/5 p-3 rounded-xl font-mono text-[10px]">
              <div>
                <span className="text-neutral-500">RARITY CLASS</span>
                <p className="text-base sm:text-lg font-black text-white">{hottestSpotlight.rarity}</p>
              </div>
              <div>
                <span className="text-neutral-500">SIGNATURE MANIFESTO</span>
                <p className="text-xs font-bold text-violet-400 mt-1 truncate">{hottestSpotlight.quote ? `"${hottestSpotlight.quote}"` : "Absolute Dominance"}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-3.5 mt-4 sm:mt-6 text-center">
            <p className="text-[9px] font-mono uppercase text-neutral-500 tracking-widest">
              DATABASE STATUS: {totalCharacters} HEROES SYNCED SUCCESSFULLY
            </p>
          </div>
        </div>
      </div>

      {/* HOW TO PLAY */}
      <div className="max-w-5xl mx-auto space-y-4 px-1 sm:px-0">
        <h3 className="text-xs font-mono tracking-[0.2em] text-neutral-400 uppercase text-center font-bold">
          COVENANT BATTLE RULES
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4.5">
          <div className="p-4 rounded-2xl border border-neutral-900 bg-neutral-950/40 text-center space-y-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-violet-400 mx-auto font-mono text-xs font-bold shadow-sm">
              1
            </div>
            <h4 className="text-xs font-bold text-white uppercase">DRAFT SELECTION</h4>
            <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
              Draft random characters one by one. Check overall stats before picking!
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-neutral-900 bg-neutral-950/40 text-center space-y-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-red-400 mx-auto font-mono text-xs font-bold shadow-sm">
              2
            </div>
            <h4 className="text-xs font-bold text-white uppercase">THE STRATEGIC CANCEL</h4>
            <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
              Only 1 SKIP is allowed. Skip low power candidates, but beware: your next option is mandatory!
            </p>
          </div>
          <div className="p-4 rounded-2xl border border-neutral-900 bg-neutral-950/40 text-center space-y-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 mx-auto font-mono text-xs font-bold shadow-sm">
              3
            </div>
            <h4 className="text-xs font-bold text-white uppercase">TACTICAL SHOWDOWN</h4>
            <p className="text-[10.5px] text-neutral-400 leading-relaxed font-sans">
              After all 11 positions are filled, every role matchup is scored using fit, stats, experience, and team balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
