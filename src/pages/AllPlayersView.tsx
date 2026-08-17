import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import CharacterCard from "../components/common/CharacterCard";
import { Character } from "../types";
import { getAllPlayers, getCountries } from "../utils/cricketData";

// Convert CricketPlayer to Character with cricketData populated
function toCharacter(cricketPlayer: any): Character {
  return {
    id: cricketPlayer.id,
    name: cricketPlayer.name,
    anime: "CRICKET",
    image: cricketPlayer.image || "/logo.png",
    themeColor: "#d9a94a",
    malFallbackUrl: "",
    stats: { strength: 50, speed: 50, iq: 50, defense: 50, magic: 50 },
    overallPower: cricketPlayer.overallPower || 50,
    rarity: cricketPlayer.rarity,
    description: cricketPlayer.description || "",
    quote: cricketPlayer.quote,
    signatureEmoji: cricketPlayer.signatureEmoji || "🏏",
    cricketData: cricketPlayer,
  };
}

interface AllPlayersViewProps {
  onExit: () => void;
}

export default function AllPlayersView({ onExit }: AllPlayersViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "country" | "rarity" | "power">("name");

  const countries = useMemo(() => getCountries(), []);
  const cricketPlayers = useMemo(() => getAllPlayers(), []);
  const characters = useMemo(() => cricketPlayers.map(toCharacter), [cricketPlayers]);

  const filteredCharacters = useMemo(() => {
    let result = [...characters];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) =>
        c.name.toLowerCase().includes(term) ||
        c.cricketData?.country?.toLowerCase().includes(term)
      );
    }

    if (selectedCountry !== "all") {
      result = result.filter((c) => c.cricketData?.country === selectedCountry);
    }

    if (selectedRarity !== "all") {
      result = result.filter((c) => c.rarity === selectedRarity);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "country":
          return (a.cricketData?.country || "").localeCompare(b.cricketData?.country || "");
        case "rarity":
          const rarityOrder = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
          return (rarityOrder[a.rarity as keyof typeof rarityOrder] ?? 4) -
                 (rarityOrder[b.rarity as keyof typeof rarityOrder] ?? 4);
        case "power":
          return (b.overallPower || 0) - (a.overallPower || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [searchTerm, selectedCountry, selectedRarity, sortBy, characters]);

  return (
    <div className="min-h-screen bg-[#07100d] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgba(9,20,26,0.9)] backdrop-blur-2xl border-b border-white/10 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> BACK
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cricket-cream via-cricket-gold to-cricket-light">
              All Players
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-0.5">
              {filteredCharacters.length} / {characters.length} Players
            </p>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs font-bold text-slate-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition duration-200 cursor-pointer"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-black/20 border border-white/5 rounded-2xl animate-slideDown">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/20"
                />
              </div>
              <div className="flex gap-2 sm:flex-1">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/20 appearance-none bg-no-repeat bg-right pr-10"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 0.75rem center" }}
                >
                  <option value="all">All Countries</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="w-40 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/20 appearance-none bg-no-repeat bg-right pr-10"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 0.75rem center" }}
                >
                  <option value="all">All Rarities</option>
                  <option value="Legendary">Legendary</option>
                  <option value="Epic">Epic</option>
                  <option value="Rare">Rare</option>
                  <option value="Common">Common</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-40 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:outline-none focus:border-nexus-cyan/50 focus:ring-1 focus:ring-nexus-cyan/20 appearance-none bg-no-repeat bg-right pr-10"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 0.75rem center" }}
                >
                  <option value="name">Sort: Name</option>
                  <option value="country">Sort: Country</option>
                  <option value="rarity">Sort: Rarity</option>
                  <option value="power">Sort: Power</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Player Grid */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5"
            role="list"
            aria-label="Player cards"
          >
            {filteredCharacters.map((character) => (
              <div key={character.id} className="group" role="listitem">
                <CharacterCard
                  character={character}
                  isFlipped={false}
                  isCompact={false}
                  sizeClass="w-[160px] h-[286px] sm:w-[180px] sm:h-[320px]"
                  portraitClass="h-[175px] sm:h-[200px]"
                />
              </div>
            ))}
          </div>

          {filteredCharacters.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg font-mono uppercase tracking-wider mb-2">No players found</p>
              <p className="text-sm">Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}