import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  Globe,
  X,
  Check,
  Search,
  Users,
  Swords,
  Shield,
  Flag,
} from "lucide-react";
import { getCountries, getAllPlayers } from "../utils/cricketData";

interface DraftPoolSettingsProps {
  globalCountries: string[];
  setGlobalCountries: (countries: string[]) => void;
  p1AllowedCountries: string[];
  setP1AllowedCountries: (countries: string[]) => void;
  p2AllowedCountries: string[];
  setP2AllowedCountries: (countries: string[]) => void;
}

interface DraftPoolSummaryProps {
  globalCountries: string[];
  p1AllowedCountries: string[];
  p2AllowedCountries: string[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  "India": "🇮🇳",
  "Pakistan": "🇵🇰",
  "Afghanistan": "🇦🇫",
  "Sri Lanka": "🇱🇰",
  "Nepal": "🇳🇵",
  "West Indies": "🏝️",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Canada": "🇨🇦",
  "Bangladesh": "🇧🇩",
  "Australia": "🇦🇺",
  "Ireland": "🇮🇪",
  "New Zealand": "🇳🇿",
  "South Africa": "🇿🇦",
  "United Arab Emirates": "🇦🇪",
  "Hong Kong": "🇭🇰",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"
};

const getFlag = (country: string) => COUNTRY_FLAGS[country] || "🌍";

interface NationPickerModalProps {
  title: string;
  subtitle: string;
  accent: "gold" | "green" | "red";
  available: string[];
  selected: string[];
  onToggle: (country: string) => void;
  onSetAll: () => void;
  onSelectAll?: () => void;
  onClose: () => void;
}

const ACCENTS: Record<"gold" | "green" | "red", { chip: string; glow: string; label: string }> = {
  gold: {
    chip: "bg-cricket-dark border-cricket-gold/60 text-cricket-gold",
    glow: "shadow-[0_0_10px_rgba(251,191,36,0.3)]",
    label: "text-cricket-gold",
  },
  green: {
    chip: "bg-cricket-green/15 border-cricket-green/60 text-cricket-light",
    glow: "shadow-[0_0_10px_rgba(34,197,94,0.35)]",
    label: "text-cricket-light",
  },
  red: {
    chip: "bg-cricket-red/15 border-cricket-red/60 text-cricket-red",
    glow: "shadow-[0_0_10px_rgba(239,68,68,0.35)]",
    label: "text-cricket-red",
  },
};

const NationPickerModal: React.FC<NationPickerModalProps> = ({
  title,
  subtitle,
  accent,
  available,
  selected,
  onToggle,
  onSetAll,
  onSelectAll,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const accentCfg = ACCENTS[accent];
  const filtered = available.filter(c => c.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 90, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 90, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-lg max-h-[80vh] overflow-hidden rounded-t-2xl sm:rounded-2xl cricket-panel flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-cricket-gold/10 bg-black/30">
          <div>
            <h4 className="text-xs font-black text-cricket-cream tracking-widest uppercase flex items-center gap-2">
              <Flag className={`w-4 h-4 ${accentCfg.label}`} />
              {title}
            </h4>
            <p className="text-[8px] font-mono text-cricket-gold/60 mt-0.5 uppercase tracking-widest">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-cricket-cream/60 hover:text-cricket-cream transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + quick actions */}
        <div className="px-4 pt-3 space-y-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-cricket-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search nations…"
              className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-[11px] font-mono text-cricket-cream placeholder:text-cricket-cream/30 focus:border-cricket-gold/60 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onSetAll}
                className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  selected.length === 0
                    ? "border-cricket-gold/60 bg-cricket-green/20 text-cricket-cream shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                    : "border-white/10 bg-white/5 text-cricket-cream/60 hover:bg-white/10"
                }`}
              >
                {selected.length === 0 && <Check className="w-3 h-3 inline mr-1" />}
                All
              </button>
              {onSelectAll && selected.length > 0 && (
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-cricket-cream/60 hover:bg-white/10 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Select All
                </button>
              )}
            </div>
            <span className="text-[9px] font-mono text-cricket-cream/50">
              <span className={selected.length > 0 ? "text-cricket-gold font-black" : ""}>{selected.length}</span>
              {" / "}{available.length} selected
            </span>
          </div>
        </div>

        {/* Chip grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(country => {
              const isSelected = selected.includes(country);
              return (
                <motion.button
                  key={country}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => onToggle(country)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? `${accentCfg.chip} ${accentCfg.glow}`
                      : "bg-black/30 border-white/10 text-cricket-cream/70 hover:border-cricket-gold/40 hover:text-cricket-cream"
                  }`}
                >
                  <span className="text-[14px] leading-none">{getFlag(country)}</span>
                  <span>{country}</span>
                  {isSelected && <Check className="w-3 h-3 text-cricket-gold" />}
                </motion.button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-[10px] font-mono text-cricket-cream/40 py-3">
                No nations match "{query}"
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-cricket-gold/10 bg-black/30 flex items-center justify-between gap-3">
          <p className="text-[9px] font-mono text-cricket-cream/40">
            {selected.length === 0
              ? "🌍 All nations enabled"
              : `${selected.length} nation${selected.length > 1 ? "s" : ""} enabled`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cricket-green to-cricket-light hover:from-cricket-light hover:to-cricket-green text-cricket-cream text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cricket-green/25 transition-all cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ────────────────────────── PLAYER RESTRICTION CARD ────────────────────────── */

const PlayerRestrictionCard: React.FC<{
  label: string;
  accent: "green" | "red";
  selected: string[];
  globalCount: number;
  eligibleCount: number;
  onToggleChip: (country: string) => void;
  onOpenSelector: () => void;
}> = ({ label, accent, selected, globalCount, eligibleCount, onToggleChip, onOpenSelector }) => {
  const accentBadge = accent === "green"
    ? "bg-cricket-green/15 border-cricket-green/40 text-cricket-light"
    : "bg-cricket-red/15 border-cricket-red/40 text-cricket-red";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4 space-y-3 backdrop-blur-md transition-colors hover:border-cricket-gold/25">
      <div className={`absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r ${accent === "green" ? "from-cricket-green via-cricket-gold to-cricket-green" : "from-cricket-red/70 via-cricket-gold/50 to-cricket-red/70"}`} />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[11px] font-black text-cricket-cream tracking-widest uppercase flex items-center gap-1.5">
            <Users className={`w-3.5 h-3.5 ${accent === "green" ? "text-cricket-light" : "text-cricket-red"}`} />
            {label}
          </h4>
          <p className="text-[8px] font-mono text-cricket-cream/40 uppercase tracking-widest mt-0.5">Draft Restrictions</p>
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-mono font-black ${accentBadge}`}>
          {eligibleCount} players
        </span>
      </div>

      <div className="min-h-[44px] rounded-lg border border-white/5 bg-black/40 p-2">
        {selected.length === 0 ? (
          <div className="h-[44px] flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold text-cricket-cream/60">
            <Globe className="w-3 h-3 text-cricket-gold/70" />
            All Global Nations
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selected.map(country => (
              <motion.span
                key={country}
                layout
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cricket-dark/80 border border-cricket-gold/30 text-[10px] font-bold text-cricket-cream shadow-[0_0_8px_rgba(251,191,36,0.15)]"
              >
                <span className="text-[13px] leading-none">{getFlag(country)}</span>
                <span>{country}</span>
                <button
                  type="button"
                  onClick={() => onToggleChip(country)}
                  className="ml-0.5 text-cricket-cream/40 hover:text-cricket-red transition-colors cursor-pointer"
                  aria-label={`Remove ${country}`}
                >
                  ✕
                </button>
              </motion.span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSelector}
        className={`w-full py-2 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
          accent === "green"
            ? "border-cricket-green/40 bg-cricket-green/10 text-cricket-light hover:bg-cricket-green/20 hover:border-cricket-green/70"
            : "border-cricket-red/40 bg-cricket-red/10 text-cricket-red hover:bg-cricket-red/20 hover:border-cricket-red/70"
        }`}
      >
        <Flag className="w-3 h-3" />
        Select Nations
        <ChevronDown className="w-3 h-3" />
      </button>
      <p className="text-[8px] font-mono text-cricket-cream/30 text-center -mt-1">
        {selected.length === 0
          ? `Eligible from all ${globalCount} Global Pool nations`
          : `Only these ${selected.length} of ${globalCount} nations appear in ${label}'s cards`}
      </p>
    </div>
  );
};

/* ────────────────────────── DRAFT POOL SETTINGS ────────────────────────── */

export const DraftPoolSettings: React.FC<DraftPoolSettingsProps> = ({
  globalCountries,
  setGlobalCountries,
  p1AllowedCountries,
  setP1AllowedCountries,
  p2AllowedCountries,
  setP2AllowedCountries,
}) => {
  const [restrictMode, setRestrictMode] = useState(
    () => p1AllowedCountries.length > 0 || p2AllowedCountries.length > 0
  );
  const [poolExpanded, setPoolExpanded] = useState(true);
  const [restrictExpanded, setRestrictExpanded] = useState(true);
  const [poolQuery, setPoolQuery] = useState("");
  const [selectorSide, setSelectorSide] = useState<"p1" | "p2" | null>(null);

  const allCountries = getCountries();
  const allPlayers = getAllPlayers();

  // Global pool filter: [] means every nation is enabled. A full list
  // (every nation present) means none are enabled — the "deselect all" state.
  // Clicking a country from the "none" state enables just that one country.
  const poolNone = globalCountries.length === allCountries.length;

  const globalEnabled = useMemo(
    () => (globalCountries.length === 0 ? allCountries : poolNone ? [] : globalCountries),
    [globalCountries, allCountries, poolNone]
  );

  const globalPlayers = useMemo(
    () => (globalCountries.length === 0 ? allPlayers : poolNone ? [] : allPlayers.filter(p => globalCountries.includes(p.country))),
    [globalCountries, allPlayers, poolNone]
  );

  // Keep the invariant: a player can never hold a nation that is not part
  // of the Global Pool. Removing a nation from the pool prunes both players.
  useEffect(() => {
    if (globalCountries.length > 0) {
      setP1AllowedCountries(p1AllowedCountries.filter(c => globalCountries.includes(c)));
      setP2AllowedCountries(p2AllowedCountries.filter(c => globalCountries.includes(c)));
    }
  }, [globalCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  const eligibleP1 = p1AllowedCountries.length === 0
    ? globalPlayers.length
    : globalPlayers.filter(p => p1AllowedCountries.includes(p.country)).length;
  const eligibleP2 = p2AllowedCountries.length === 0
    ? globalPlayers.length
    : globalPlayers.filter(p => p2AllowedCountries.includes(p.country)).length;

  const toggleP1Country = (country: string) => {
    setP1AllowedCountries(p1AllowedCountries.includes(country)
      ? p1AllowedCountries.filter(c => c !== country)
      : [...p1AllowedCountries, country]);
  };

  const toggleP2Country = (country: string) => {
    setP2AllowedCountries(p2AllowedCountries.includes(country)
      ? p2AllowedCountries.filter(c => c !== country)
      : [...p2AllowedCountries, country]);
  };

  // Global pool filter: [] means every nation is enabled. Clicking a nation
  // while all are enabled removes just that one; returning to the full list
  // normalizes back to []. Narrowing the pool engages restriction mode.
  const togglePoolCountry = (country: string) => {
    const isAll = globalCountries.length === 0;
    const next = isAll
      ? allCountries.filter(x => x !== country)
      : poolNone
        ? [country]
        : (globalCountries.includes(country)
            ? globalCountries.filter(x => x !== country)
            : [...globalCountries, country]);
    const normalized = next.length === allCountries.length ? [] : next;
    setGlobalCountries(normalized);
  };

  const excludedCountries = allCountries.filter(c => !globalEnabled.includes(c));
  const filteredPool = allCountries.filter(c => c.toLowerCase().includes(poolQuery.trim().toLowerCase()));

  return (
    <div className="w-full font-sans space-y-3">
      {/* ───── ALL TEAM switch (mode toggle) ───── */}
      <button
        type="button"
        onClick={() => {
          if (restrictMode) {
            setGlobalCountries([]);
            setP1AllowedCountries([]);
            setP2AllowedCountries([]);
            setRestrictMode(false);
          } else {
            setRestrictMode(true);
          }
        }}
        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3.5 transition-all cursor-pointer active:scale-[0.98] ${
          restrictMode
            ? "border-cricket-gold/40 bg-gradient-to-r from-cricket-dark/90 via-black/60 to-cricket-dark/90"
            : "border-cricket-green/50 bg-gradient-to-r from-cricket-green/25 via-black/60 to-cricket-dark/90 shadow-[0_0_16px_rgba(34,197,94,0.35)]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center border flex-shrink-0 transition-colors ${
            restrictMode ? "border-cricket-gold/40 bg-black/40" : "border-cricket-green bg-cricket-green/20"
          }`}>
            <Globe className={`w-4.5 h-4.5 ${restrictMode ? "text-cricket-gold" : "text-cricket-light"}`} />
          </span>
          <div className="text-left min-w-0">
            <p className={`text-[11px] font-black uppercase tracking-widest ${restrictMode ? "text-cricket-gold" : "text-cricket-cream"}`}>
              All Team
            </p>
            <p className="text-[8px] font-mono text-cricket-cream/40 uppercase tracking-widest truncate">
              {restrictMode
                ? "Restrictions active — each player picks their own nations"
                : globalCountries.length > 0
                  ? `${globalCountries.length} nations in pool — random for both players`
                  : "Open pool — both players draw randomly from every nation"}
            </p>
          </div>
        </div>
        {/* On/Off slider */}
        <span className={`relative w-11 h-6 rounded-full border transition-colors flex-shrink-0 ${
          restrictMode ? "border-cricket-gold/40 bg-black/50" : "border-cricket-green/60 bg-cricket-green"
        }`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-cricket-cream shadow-md transition-all duration-300 ${
            restrictMode ? "left-0.5 bg-cricket-gold/80" : "left-[22px] bg-cricket-cream"
          }`} />
        </span>
      </button>

      {/* ───── PANEL 1 (slider ON): ALL TEAM + SEARCH NATIONS — random cards for both players ───── */}
      <AnimatePresence initial={false}>
        {!restrictMode && (
          <motion.div
            key="panel-all-team"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden backdrop-blur-md transition-colors hover:border-cricket-gold/25">
              {/* Panel header */}
              <button
                type="button"
                onClick={() => setPoolExpanded(!poolExpanded)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${
                    globalCountries.length > 0 ? "border-cricket-gold/50 bg-cricket-gold/15" : "border-white/10 bg-black/40"
                  }`}>
                    <Search className={`w-4 h-4 ${globalCountries.length > 0 ? "text-cricket-gold" : "text-cricket-cream/70"}`} />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-cricket-cream">
                      Search Nations
                    </p>
                    <p className="text-[8px] font-mono text-cricket-cream/40 uppercase tracking-widest truncate">
                      {globalCountries.length === 0
                        ? `All ${allCountries.length} nations in pool`
                        : poolNone
                          ? "No nations in pool"
                          : `${globalCountries.length} nation${globalCountries.length > 1 ? "s" : ""} in pool`}
                    </p>
                  </div>
                </div>
                {globalCountries.length > 0 && (
                  <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-cricket-gold text-black text-[9px] font-black flex items-center justify-center flex-shrink-0">
                    {globalCountries.length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-cricket-cream/40 flex-shrink-0 transition-transform duration-300 ${poolExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Panel body: country filter */}
              <AnimatePresence initial={false}>
                {poolExpanded && (
                  <motion.div
                    key="pool-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2.5 px-3.5 pb-3.5 pt-3 border-t border-white/5">
                      <p className={`text-[9px] font-mono uppercase tracking-widest ${globalCountries.length > 0 ? (poolNone ? "text-cricket-red/80" : "text-cricket-gold/80") : "text-cricket-cream/50"}`}>
                        {globalCountries.length === 0
                          ? `🌍 Both players draw randomly from all ${allCountries.length} nations`
                          : poolNone
                            ? "⚠️ No nations in pool — both players are locked out"
                            : `Both players draw randomly from the ${globalCountries.length} nations below`}
                      </p>

                      {/* Search input */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-cricket-gold/60 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={poolQuery}
                          onChange={(e) => setPoolQuery(e.target.value)}
                          placeholder="Filter countries…"
                          className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-[11px] font-mono text-cricket-cream placeholder:text-cricket-cream/30 focus:border-cricket-gold/60 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setGlobalCountries([])}
                            className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              globalCountries.length === 0
                                ? "border-cricket-gold/60 bg-cricket-green/20 text-cricket-cream shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                                : "border-white/10 bg-white/5 text-cricket-cream/60 hover:bg-white/10"
                            }`}
                          >
                            {globalCountries.length === 0 && <Check className="w-3 h-3 inline mr-1" />}
                            All
                          </button>
                          {!poolNone && (
                            <button
                              type="button"
                              onClick={() => setGlobalCountries(allCountries)}
                              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-cricket-cream/60 hover:bg-white/10 hover:text-cricket-red hover:border-cricket-red/40 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Deselect All
                            </button>
                          )}
                          <span className={`text-[9px] font-mono ${globalEnabled.length > 0 ? "text-cricket-gold" : "text-cricket-cream/50"}`}>
                            {globalEnabled.length} / {allCountries.length} nations
                          </span>
                        </div>
                        {excludedCountries.length > 0 && (
                          <span className="text-[8px] font-mono text-cricket-red/80 uppercase tracking-widest">
                            ✕ {excludedCountries.length} excluded
                          </span>
                        )}
                      </div>

                      {/* Country chips */}
                      <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                        {filteredPool.map(country => {
                          const inPool = globalEnabled.includes(country);
                          return (
                            <motion.button
                              key={country}
                              type="button"
                              whileTap={{ scale: 0.93 }}
                              onClick={() => togglePoolCountry(country)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                inPool
                                  ? "bg-cricket-dark border-cricket-gold text-cricket-cream shadow-[0_0_10px_rgba(251,191,36,0.35)]"
                                  : "bg-black/30 border-white/10 text-cricket-cream/50 hover:border-cricket-red/40 hover:text-cricket-red"
                              }`}
                            >
                              <span className="text-[14px] leading-none opacity-90">{getFlag(country)}</span>
                              <span>{country}</span>
                              {inPool ? (
                                <Check className="w-3 h-3 text-cricket-gold" />
                              ) : (
                                <X className="w-3 h-3 text-cricket-red/70" />
                              )}
                            </motion.button>
                          );
                        })}
                        {filteredPool.length === 0 && (
                          <p className="text-[10px] font-mono text-cricket-cream/40 py-2">
                            No nations match "{poolQuery}"
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── PANEL 2 (slider OFF): DRAFT RESTRICTIONS — each player picks their own nations ───── */}
      <AnimatePresence initial={false}>
        {restrictMode && (
          <motion.div
            key="panel-restrictions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden backdrop-blur-md transition-colors hover:border-cricket-gold/25">
              {/* Panel header */}
              <button
                type="button"
                onClick={() => setRestrictExpanded(!restrictExpanded)}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-3 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center border border-cricket-gold/40 bg-black/40 flex-shrink-0">
                    <Shield className="w-4 h-4 text-cricket-gold" />
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-cricket-gold">
                      Draft Restrictions
                    </p>
                    <p className="text-[8px] font-mono text-cricket-cream/40 uppercase tracking-widest truncate">
                      Each player only receives cards from their selected nations
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-cricket-cream/40 flex-shrink-0 transition-transform duration-300 ${restrictExpanded ? "rotate-180" : ""}`} />
              </button>

              {/* Panel body: player cards */}
              <AnimatePresence initial={false}>
                {restrictExpanded && (
                  <motion.div
                    key="restrict-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 px-3.5 pb-3.5 pt-3 border-t border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <PlayerRestrictionCard
                          label="Player 1"
                          accent="green"
                          selected={p1AllowedCountries}
                          globalCount={globalEnabled.length}
                          eligibleCount={eligibleP1}
                          onToggleChip={toggleP1Country}
                          onOpenSelector={() => setSelectorSide("p1")}
                        />
                        <PlayerRestrictionCard
                          label="Player 2"
                          accent="red"
                          selected={p2AllowedCountries}
                          globalCount={globalEnabled.length}
                          eligibleCount={eligibleP2}
                          onToggleChip={toggleP2Country}
                          onOpenSelector={() => setSelectorSide("p2")}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── P1/P2 restriction picker modal ───── */}
      <AnimatePresence>
        {selectorSide && (
          <NationPickerModal
            title={`Select Nations — ${selectorSide === "p1" ? "Player 1" : "Player 2"}`}
            subtitle="Only Global Pool nations are available"
            accent={selectorSide === "p1" ? "green" : "red"}
            available={globalEnabled}
            selected={selectorSide === "p1" ? p1AllowedCountries : p2AllowedCountries}
            onToggle={selectorSide === "p1" ? toggleP1Country : toggleP2Country}
            onSetAll={() => (selectorSide === "p1" ? setP1AllowedCountries([]) : setP2AllowedCountries([]))}
            onClose={() => setSelectorSide(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ────────────────────────── DRAFT POOL SUMMARY (placed above the start button) ────────────────────────── */

export const DraftPoolSummary: React.FC<DraftPoolSummaryProps> = ({
  globalCountries,
  p1AllowedCountries,
  p2AllowedCountries,
}) => {
  const allCountries = getCountries();
  const allPlayers = getAllPlayers();

  // A full list (every nation present) means none are enabled — the "deselect all" state.
  const poolNone = globalCountries.length === allCountries.length;

  const globalPlayers = globalCountries.length === 0
    ? allPlayers
    : poolNone
      ? []
      : allPlayers.filter(p => globalCountries.includes(p.country));

  const eligibleP1 = p1AllowedCountries.length === 0
    ? globalPlayers.length
    : globalPlayers.filter(p => p1AllowedCountries.includes(p.country)).length;
  const eligibleP2 = p2AllowedCountries.length === 0
    ? globalPlayers.length
    : globalPlayers.filter(p => p2AllowedCountries.includes(p.country)).length;

  const p1Active = p1AllowedCountries.length > 0;
  const p2Active = p2AllowedCountries.length > 0;
  const anyRestriction = globalCountries.length > 0 || p1Active || p2Active;

  const summaryLine = (name: string, active: boolean, countries: string[], eligible: number) => (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <span className={`text-[9px] font-mono uppercase tracking-widest flex-shrink-0 ${active ? "text-cricket-gold" : "text-cricket-cream/50"}`}>
        👤 {name}
      </span>
      <span className={`text-[10px] font-bold truncate ${active ? "text-cricket-gold" : "text-cricket-cream/80"}`}>
        {active ? countries.join(" + ") : "All Global Nations"}
      </span>
      <span className={`text-[9px] font-mono flex-shrink-0 ${active ? "text-cricket-light" : "text-cricket-cream/50"}`}>
        {eligible} eligible
      </span>
    </div>
  );

  return (
    <div className={`rounded-xl border p-3.5 space-y-2 backdrop-blur-md transition-colors ${
      anyRestriction
        ? "border-cricket-gold/40 bg-gradient-to-r from-cricket-dark/80 via-black/60 to-cricket-dark/80 shadow-[0_0_18px_rgba(251,191,36,0.1)]"
        : "border-white/10 bg-black/30"
    }`}>
      <div className="flex items-center gap-2">
        <Swords className="w-3.5 h-3.5 text-cricket-gold" />
        <p className="text-[10px] font-black text-cricket-gold uppercase tracking-widest">
          Draft Pool Summary
        </p>
        {anyRestriction && (
          <span className="ml-auto text-[8px] font-mono font-black uppercase tracking-widest text-cricket-red bg-cricket-red/10 border border-cricket-red/30 px-2 py-0.5 rounded-full">
            Restricted
          </span>
        )}
      </div>

      <p className="text-[10px] font-mono text-cricket-cream/80">
        <span className="text-cricket-cream/50">Global Pool:</span>{" "}
        <span className="text-cricket-gold font-bold">{globalCountries.length === 0 ? allCountries.length : poolNone ? 0 : globalCountries.length} nations</span>{" "}
        ·{" "}
        <span className="text-cricket-gold font-bold">{globalPlayers.length} players</span>
      </p>

      <div className="space-y-1 border-t border-white/5 pt-2">
        {summaryLine("Player 1", p1Active, p1AllowedCountries, eligibleP1)}
        {summaryLine("Player 2", p2Active, p2AllowedCountries, eligibleP2)}
      </div>
    </div>
  );
};