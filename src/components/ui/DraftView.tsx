import React from "react";
import { motion, AnimatePresence } from "motion/react";
import TeamSlots from "../common/TeamSlots";
import PitchStage from "../common/PitchStage";
import { RoleId, SlottedTeam, Stadium, MatchType } from "../../types";
import { Zap, Sparkles } from "lucide-react";

type DraftViewProps = {
  p1AllowedCountries: string[];
  p2AllowedCountries: string[];
  isMobile: boolean;
  isMobileDraft: boolean;
  isMobileOnlineDraft: boolean;
  ownOnlineSide: string | null; // "p1" | "p2" | null
  ownOnlineName: string;
  opponentOnlineName: string;
  ownOnlineSlots: SlottedTeam;
  opponentOnlineSlots: SlottedTeam;
  ownOnlineSkipUsed: boolean;
  opponentOnlineSkipUsed: boolean;
  isDraggingActive: boolean;
  activeTurn: "p1" | "p2";
  p1SkipUsed: boolean;
  p2SkipUsed: boolean;
  p1Slots: SlottedTeam;
  p2Slots: SlottedTeam;
  player1Name: string;
  player2Name: string;
  gameMode: string;
  onlineSide: string | null;
  aiIsProcessing: boolean;
  handleSlotSelect: (roleId: RoleId) => void;
  renderDraftCardArea: () => React.ReactElement;
  onSkip: () => void;
  captainRoleId: { p1: RoleId | null; p2: RoleId | null };
  viceCaptainRoleId: { p1: RoleId | null; p2: RoleId | null };
  wicketkeeperRoleId: { p1: RoleId | null; p2: RoleId | null };
  onSetCaptain: (team: "p1" | "p2", roleId: RoleId) => void;
  onSetViceCaptain: (team: "p1" | "p2", roleId: RoleId) => void;
  onSetWicketkeeper: (team: "p1" | "p2", roleId: RoleId) => void;
  onClearCaptain: (team: "p1" | "p2") => void;
  onClearViceCaptain: (team: "p1" | "p2") => void;
  onClearWicketkeeper: (team: "p1" | "p2") => void;
  awaitingCaptaincy?: boolean;
  stadium?: Stadium | null;
  matchType?: MatchType;
  isCardFlipped: boolean;
  activeCharacter: any;
  poolExhausted: boolean;
};

const SkipStrip: React.FC<{
  used: boolean;
  interactive: boolean;
  onSkip: () => void;
}> = ({ used, interactive, onSkip }) => {
  if (used) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-red-500/25 bg-black/85 px-3 py-2.5 mt-2.5">
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          <Zap className="w-3 h-3 text-red-500/40" /> Tactical Skip
        </span>
        <span className="text-[8px] font-mono font-black uppercase tracking-widest text-red-400/60">Used</span>
      </div>
    );
  }

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onSkip}
        className="mt-2.5 w-full flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all hover:bg-red-500/20 hover:border-red-500/50 active:scale-[0.97] cursor-pointer"
      >
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
          <Zap className="w-3 h-3" /> Use Tactical Skip
        </span>
        <span className="flex items-center gap-1.5 text-[8px] font-mono font-black uppercase tracking-widest text-red-400 animate-pulse">
          <span className="w-1 h-1 rounded-full bg-red-400" /> Active
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 opacity-70">
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
        <Zap className="w-3 h-3" /> Tactical Skip
      </span>
      <span className="text-[8px] font-mono font-black uppercase tracking-widest text-slate-500">Ready</span>
    </div>
  );
};

const DraftView: React.FC<DraftViewProps> = ({
  isMobile,
  isMobileDraft,
  isMobileOnlineDraft,
  ownOnlineSide,
  ownOnlineName,
  opponentOnlineName,
  ownOnlineSlots,
  opponentOnlineSlots,
  ownOnlineSkipUsed,
  opponentOnlineSkipUsed,
  isDraggingActive,
  activeTurn,
  p1SkipUsed,
  p2SkipUsed,
  p1Slots,
  p2Slots,
  player1Name,
  player2Name,
  gameMode,
  onlineSide,
  p1AllowedCountries,
  p2AllowedCountries,
  aiIsProcessing,
  handleSlotSelect,
  renderDraftCardArea,
  onSkip,
  captainRoleId,
  viceCaptainRoleId,
  wicketkeeperRoleId,
  onSetCaptain,
  onSetViceCaptain,
  onSetWicketkeeper,
  onClearCaptain,
  onClearViceCaptain,
  onClearWicketkeeper,
  awaitingCaptaincy = false,
  stadium = null,
  matchType = "T20I" as MatchType,
  isCardFlipped = false,
  activeCharacter = null,
  poolExhausted = false,
}) => {
  const sideCanAct =
    (gameMode !== "online-2p" || onlineSide === activeTurn) &&
    !(gameMode === "vs-ai" && activeTurn === "p2") &&
    !aiIsProcessing;
  const cInteractive = sideCanAct && !captainRoleId[activeTurn];
  const vcInteractive = sideCanAct && !viceCaptainRoleId[activeTurn];
  const wkInteractive = sideCanAct && !wicketkeeperRoleId[activeTurn];
  // When awaitingCaptaincy, both panels must be interactive so both players can assign C/VC/WK
  const p1PanelInteractive = awaitingCaptaincy
    ? !(gameMode === "online-2p" && onlineSide === "p2") && !aiIsProcessing
    : activeTurn === "p1" && !(gameMode === "online-2p" && onlineSide === "p2") && !aiIsProcessing;
  const p2PanelInteractive = awaitingCaptaincy
    ? gameMode !== "vs-ai" && !(gameMode === "online-2p" && onlineSide === "p1") && !aiIsProcessing
    : activeTurn === "p2" && gameMode !== "vs-ai" && !(gameMode === "online-2p" && onlineSide === "p1") && !aiIsProcessing;

  const CaptainIcons: React.FC<{ cInteractive: boolean; vcInteractive: boolean; wkInteractive: boolean }> = ({ cInteractive, vcInteractive, wkInteractive }) => (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <div
        draggable={cInteractive}
        onDragStart={(e) => {
          if (!cInteractive) { e.preventDefault(); return; }
          e.dataTransfer.setData("application/x-captain", "1");
          e.dataTransfer.effectAllowed = "move";
        }}
        title={cInteractive ? "Drag to a player slot to name the CAPTAIN" : "Captain already locked for this team"}
        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-black text-sm sm:text-base font-black flex items-center justify-center shadow-[0_0_14px_rgba(251,191,36,0.6)] border-2 border-amber-200 ${cInteractive ? "cursor-grab active:cursor-grabbing hover:scale-110" : "opacity-40 cursor-not-allowed"} transition-transform`}
      >
        C
      </div>
      <div
        draggable={vcInteractive}
        onDragStart={(e) => {
          if (!vcInteractive) { e.preventDefault(); return; }
          e.dataTransfer.setData("application/x-vice-captain", "1");
          e.dataTransfer.effectAllowed = "move";
        }}
        title={vcInteractive ? "Drag to a player slot to name the VICE CAPTAIN" : "Vice captain already locked for this team"}
        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-[0_0_14px_rgba(203,213,225,0.5)] border-2 border-white ${vcInteractive ? "cursor-grab active:cursor-grabbing hover:scale-110" : "opacity-40 cursor-not-allowed"} transition-transform`}
      >
        VC
      </div>
      <div
        draggable={wkInteractive}
        onDragStart={(e) => {
          if (!wkInteractive) { e.preventDefault(); return; }
          e.dataTransfer.setData("application/x-wicketkeeper", "1");
          e.dataTransfer.effectAllowed = "move";
        }}
        title={wkInteractive ? "Drag to a player slot to name the WICKETKEEPER" : "Wicketkeeper already locked for this team"}
        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-black text-[9px] sm:text-[10px] font-black flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.5)] border-2 border-emerald-200 ${wkInteractive ? "cursor-grab active:cursor-grabbing hover:scale-110" : "opacity-40 cursor-not-allowed"} transition-transform`}
      >
        WK
      </div>
      <span className="text-[7px] sm:text-[8px] font-mono text-slate-500 uppercase tracking-widest">
        Drag roles onto a player slot
      </span>
    </div>
  );

  return (
    <motion.div
      key="draft"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={isMobileDraft ? "flex min-h-0 w-full h-full flex-col" : "h-full min-h-0"}
    >
      {isMobileDraft ? (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-1.5 overflow-hidden touch-none">
          <div className="h-[54px] w-full flex-shrink-0 px-1">
<TeamSlots
                  playerName={opponentOnlineName}
                  allowedCountries={ownOnlineSide === "p1" ? p2AllowedCountries : p1AllowedCountries}
                  slots={opponentOnlineSlots}
                  skipUsed={opponentOnlineSkipUsed}
                  activeTurn={activeTurn !== ownOnlineSide}
                  layout="compact-horizontal-top"
                  isMobile={true}
                  slotSide={ownOnlineSide === "p2" ? "p1" : "p2"}
                />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_38vw] gap-2 overflow-hidden">
              <div className="relative min-w-0 overflow-hidden h-full min-h-0">
                <PitchStage stadium={stadium} matchType={matchType} isCompact className="absolute inset-0 z-0" />
                <div className="absolute inset-0 z-[1] opacity-5 pointer-events-none">
                  <div className="h-px w-full bg-nexus-cyan absolute top-1/4 animate-pulse" />
                  <div className="h-px w-full bg-nexus-blue absolute top-3/4 animate-pulse delay-500" />
                </div>
                <div className="absolute top-[12px] left-[calc(50%+30px)] -translate-x-1/2 z-30 w-full max-w-[280px] flex flex-col items-center">
                  <div className="mb-1 flex-shrink-0 scale-[0.85]">
                    <CaptainIcons cInteractive={cInteractive} vcInteractive={vcInteractive} wkInteractive={wkInteractive} />
                  </div>
                  {renderDraftCardArea()}
                </div>
              </div>

              <div className="min-h-0 min-w-[136px] overflow-hidden">
                <TeamSlots
                  playerName={ownOnlineName}
                  allowedCountries={ownOnlineSide === "p1" ? p1AllowedCountries : p2AllowedCountries}
                  slots={ownOnlineSlots}
                  skipUsed={ownOnlineSkipUsed}
                  activeTurn={activeTurn === ownOnlineSide}
                  onSlotSelect={activeTurn === ownOnlineSide ? handleSlotSelect : undefined}
                  isDraggingActive={isDraggingActive && activeTurn === ownOnlineSide}
                  layout="compact-vertical"
                  isMobile={true}
                  isLarge={true}
                  slotSide={ownOnlineSide === "p2" ? "p2" : "p1"}
                  captainRoleId={ownOnlineSide === "p2" ? captainRoleId.p2 : captainRoleId.p1}
                  viceCaptainRoleId={ownOnlineSide === "p2" ? viceCaptainRoleId.p2 : viceCaptainRoleId.p1}
                  wicketkeeperRoleId={ownOnlineSide === "p2" ? wicketkeeperRoleId.p2 : wicketkeeperRoleId.p1}
                  onSetCaptain={(r) => onSetCaptain(ownOnlineSide === "p2" ? "p2" : "p1", r)}
                  onSetViceCaptain={(r) => onSetViceCaptain(ownOnlineSide === "p2" ? "p2" : "p1", r)}
                  onSetWicketkeeper={(r) => onSetWicketkeeper(ownOnlineSide === "p2" ? "p2" : "p1", r)}
                  onClearCaptain={() => onClearCaptain(ownOnlineSide === "p2" ? "p2" : "p1")}
                  onClearViceCaptain={() => onClearViceCaptain(ownOnlineSide === "p2" ? "p2" : "p1")}
                  onClearWicketkeeper={() => onClearWicketkeeper(ownOnlineSide === "p2" ? "p2" : "p1")}
                  awaitingCaptaincy={awaitingCaptaincy}
                />
              </div>
            </div>
          </div>
) : (
        <div className="grid lg:grid-cols-12 gap-5 lg:gap-6 items-stretch h-full min-h-0">
          {/* Left: P1 Roster */}
          <div className="lg:col-span-4 flex flex-col min-h-0">
            <TeamSlots
              playerName={player1Name}
              slots={p1Slots}
              skipUsed={p1SkipUsed}
              activeTurn={activeTurn === "p1" && !aiIsProcessing}
              onSlotSelect={(gameMode !== "online-2p" || onlineSide === "p1") ? handleSlotSelect : undefined}
              isDraggingActive={isDraggingActive && (gameMode !== "online-2p" || onlineSide === "p1")}
              hideSkipIndicator
              slotSide="p1"
              slotClass="h-[clamp(120px,15vh,160px)]"
              captainRoleId={captainRoleId.p1}
              viceCaptainRoleId={viceCaptainRoleId.p1}
              wicketkeeperRoleId={wicketkeeperRoleId.p1}
              onSetCaptain={(r) => onSetCaptain("p1", r)}
              onSetViceCaptain={(r) => onSetViceCaptain("p1", r)}
              onSetWicketkeeper={(r) => onSetWicketkeeper("p1", r)}
              onClearCaptain={() => onClearCaptain("p1")}
              onClearViceCaptain={() => onClearViceCaptain("p1")}
              onClearWicketkeeper={() => onClearWicketkeeper("p1")}
              captaincyInteractive={p1PanelInteractive}
              awaitingCaptaincy={awaitingCaptaincy}
            />
            <SkipStrip
              used={p1SkipUsed}
              interactive={activeTurn === "p1" && !aiIsProcessing && !(gameMode === "online-2p" && onlineSide !== "p1")}
              onSkip={onSkip}
            />
          </div>

          {/* Center: Continuous Cricketverse Arena */}
          <div className="lg:col-span-4 relative h-full min-h-0 overflow-hidden">
            <PitchStage stadium={stadium} matchType={matchType} className="absolute inset-0 z-0" />
            <div className="absolute inset-0 z-[1] opacity-5 pointer-events-none">
              <div className="h-px w-full bg-nexus-cyan absolute top-1/4 animate-pulse" />
              <div className="h-px w-full bg-nexus-blue absolute top-3/4 animate-pulse delay-500" />
            </div>
            <div className="absolute top-[12px] left-[calc(50%+30px)] -translate-x-1/2 z-30 w-full max-w-[280px]">
              {renderDraftCardArea()}
            </div>
            <div className="absolute top-[220px] left-1/2 -translate-x-1/2 z-20 w-full max-w-[300px] px-2 pointer-events-none">
              <AnimatePresence mode="wait">
                {isCardFlipped && activeCharacter && !poolExhausted && !aiIsProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center gap-1.5 py-2 select-none"
                  >
                    <div className="flex items-center justify-center gap-2 animate-pulse">
                      <span className="relative">
                        <span className="absolute inset-0 bg-gradient-to-r from-nexus-cyan/30 via-nexus-blue/30 to-nexus-cyan/30 blur-xl animate-ping" />
                        <Sparkles className="w-4 h-4 text-nexus-cyan relative z-10" />
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-nexus-cyan font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-shadow-neon">
                        CLICK TO DECRYPT
                      </span>
                      <Sparkles className="w-4 h-4 text-nexus-cyan" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest text-center">
                      Identify your next tactical asset
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: P2 Roster */}
          <div className="lg:col-span-4 flex flex-col min-h-0">
            <TeamSlots
              playerName={player2Name}
              allowedCountries={p2AllowedCountries}
              isAI={gameMode === "vs-ai"}
              slots={p2Slots}
              skipUsed={p2SkipUsed}
              activeTurn={activeTurn === "p2"}
              onSlotSelect={(gameMode === "local-2p" || (gameMode === "online-2p" && onlineSide === "p2")) ? handleSlotSelect : undefined}
              isDraggingActive={isDraggingActive && (gameMode === "local-2p" || (gameMode === "online-2p" && onlineSide === "p2"))}
              hideSkipIndicator
              slotSide="p2"
              slotClass="h-[clamp(120px,15vh,160px)]"
              captainRoleId={captainRoleId.p2}
              viceCaptainRoleId={viceCaptainRoleId.p2}
              wicketkeeperRoleId={wicketkeeperRoleId.p2}
              onSetCaptain={(r) => onSetCaptain("p2", r)}
              onSetViceCaptain={(r) => onSetViceCaptain("p2", r)}
              onSetWicketkeeper={(r) => onSetWicketkeeper("p2", r)}
              onClearCaptain={() => onClearCaptain("p2")}
              onClearViceCaptain={() => onClearViceCaptain("p2")}
              onClearWicketkeeper={() => onClearWicketkeeper("p2")}
              captaincyInteractive={p2PanelInteractive}
              awaitingCaptaincy={awaitingCaptaincy}
            />
            <SkipStrip
              used={p2SkipUsed}
              interactive={gameMode !== "vs-ai" && activeTurn === "p2" && !(gameMode === "online-2p" && onlineSide !== "p2")}
              onSkip={onSkip}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DraftView;
