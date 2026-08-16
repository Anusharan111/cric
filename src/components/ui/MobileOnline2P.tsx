import React from "react";
import TeamSlots from "../common/TeamSlots";
import CharacterCard from "../common/CharacterCard";
import { SlottedTeam, RoleId } from "../../types";

interface MobileOnline2PProps {
  playerName: string;
  opponentName: string;
  playerSlots: SlottedTeam;
  opponentSlots: SlottedTeam;
  activeTurn: boolean;
  isAI?: boolean;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  onSlotSelect?: (roleId: RoleId) => void;
  onDeploy?: () => void;
  onSkip?: () => void;
}

export default function MobileOnline2P({
  playerName,
  opponentName,
  playerSlots,
  opponentSlots,
  activeTurn,
  isAI = false,
  selectedCardId,
  setSelectedCardId,
  onSlotSelect,
  onDeploy,
  onSkip,
}: MobileOnline2PProps) {
  // Placeholder character for the draft card; in real implementation this would come from game state
  const draftCharacter = {
    id: selectedCardId ?? "placeholder",
    name: "Draft Card",
    image: "https://placehold.co/300x400?text=Draft",
    rarity: "Rare",
    overallPower: 0,
    themeColor: "#ffffff",
    malFallbackUrl: "",
    stats: { strength: 0, speed: 0, defense: 0, iq: 0, magic: 0 },
    skills: [],
    anime: "",
    quote: "",
  };

  return (
    <div className="flex flex-row h-full p-2 bg-black/30 backdrop-blur-lg rounded-xl gap-3">
      {/* Left side: Central draft card area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full flex justify-center">
          <CharacterCard
            character={draftCharacter as any}
            isFlipped={false}
            activePlayerName={playerName}
            isCompact={true}
            onClickBackSide={() => {
              // No back side for draft card
            }}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onTouchDrop={(roleId) => {
              if (onSlotSelect) onSlotSelect(roleId as RoleId);
            }}
          />
        </div>
      </div>

      {/* Right side: Panels area */}
      <div className="flex-[0.8] flex flex-col gap-2 overflow-y-auto">
        {/* Opponent slots (Increased size) */}
        <div className="flex-1 min-h-[200px]">
          <TeamSlots
            playerName={opponentName}
            slots={opponentSlots}
            skipUsed={false}
            activeTurn={false}
            isAI={false}
            layout="compact-vertical"
            isMobile={true}
            isLarge={true}
          />
        </div>

        {/* Player slots (Increased size) */}
        <div className="flex-1 min-h-[200px]">
          <TeamSlots
            playerName={playerName}
            slots={playerSlots}
            skipUsed={false}
            activeTurn={activeTurn}
            isAI={isAI}
            layout="compact-vertical"
            isMobile={true}
            onSlotSelect={onSlotSelect}
            isLarge={true}
          />
        </div>

        {/* Action bar (Compact) */}
        <div className="flex justify-center gap-2 mt-1">
          <button
            className="flex-1 py-1.5 bg-nexus-cyan text-white text-xs font-bold rounded-lg shadow-md hover:bg-nexus-cyan/80 transition"
            onClick={onDeploy}
          >
            Deploy
          </button>
          <button
            className="flex-1 py-1.5 bg-nexus-purple text-white text-xs font-bold rounded-lg shadow-md hover:bg-nexus-purple/80 transition"
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
