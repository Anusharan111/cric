import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RATING_ANIME_NAMES } from "../../utils/ratingDataset";

interface AnimeSearchProps {
  onSelectAnime: (animeName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedAnimes?: string[];
  animeList: string[];
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-500/30 text-amber-300 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function AnimeSearch({
  onSelectAnime,
  placeholder = "Search anime…",
  disabled = false,
  selectedAnimes = [],
  animeList,
}: AnimeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number>();

  const searchIndex = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const anime of [...RATING_ANIME_NAMES, ...animeList]) {
      const key = anime.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(anime);
      }
    }
    return merged;
  }, [animeList]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleItemClick(results[highlightedIndex]);
        }
        break;
      case "Escape":
        closeDropdown();
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setHighlightedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(() => {
      const q = value.trim().toLowerCase();
      const matches = q
        ? searchIndex.filter((anime) => anime.toLowerCase().includes(q)).slice(0, 10)
        : [];
      setResults(matches);
      setIsOpen(matches.length > 0);
    }, 300);
  };

  const handleItemClick = (animeName: string) => {
    onSelectAnime(animeName);
    setQuery("");
    closeDropdown();
  };

  const handleBlur = () => {
    setTimeout(closeDropdown, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:border-purple-500 focus:outline-none cursor-pointer disabled:opacity-50"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="anime-search-results"
      />

      {isOpen && results.length > 0 && (
        <div
          id="anime-search-results"
          className="absolute z-20 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl max-h-60 overflow-y-auto shadow-2xl"
          role="listbox"
        >
          {results.map((anime, index) => {
            const isAdded = selectedAnimes.includes(anime);
            return (
              <button
                key={anime}
                type="button"
                onMouseDown={() => handleItemClick(anime)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                  index === highlightedIndex
                    ? "bg-violet-500/15 text-violet-400"
                    : "text-slate-200 hover:bg-violet-500/10"
                }`}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                <span className="text-xs font-mono font-bold truncate">
                  {highlightMatch(anime, query)}
                  {isAdded && (
                    <span className="ml-1.5 text-[8px] font-mono text-emerald-400 uppercase">✓ added</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-center">
          <p className="text-[10px] text-neutral-500 font-mono">
            No anime found matching "{query}"
          </p>
        </div>
      )}
    </div>
  );
}