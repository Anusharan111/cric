# Graph Report - .  (2026-08-10)

## Corpus Check
- 72 files · ~212,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 397 nodes · 773 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 18

## God Nodes (most connected - your core abstractions)
1. `Character` - 27 edges
2. `App()` - 17 edges
3. `compilerOptions` - 16 edges
4. `CricketPlayer` - 15 edges
5. `RoleId` - 13 edges
6. `SlottedTeam` - 12 edges
7. `CharacterImage()` - 11 edges
8. `getRarityConfig()` - 11 edges
9. `scripts` - 10 edges
10. `SoundEffects` - 10 edges

## Surprising Connections (you probably didn't know these)
- `GameHub()` --calls--> `getSuggestions()`  [EXTRACTED]
  src/components/layout/GameHub.tsx → src/utils/draftPool.ts
- `App()` --calls--> `getRoleFitScore()`  [EXTRACTED]
  src/App.tsx → src/utils/roleUtils.ts
- `CharacterCardProps` --references--> `Character`  [EXTRACTED]
  src/components/common/CharacterCard.tsx → src/types.ts
- `CricketCharacterCardProps` --references--> `CricketPlayer`  [EXTRACTED]
  src/components/common/CricketCharacterCard.tsx → src/types.ts
- `RoleIconProps` --references--> `RoleId`  [EXTRACTED]
  src/components/common/RoleIcon.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (20 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (43): App(), AppHistoryState, BattleDuel, CINEMATIC_ROLE_ORDER, findCharacterForDuel(), GameHubMode, generateLocalBattleReport(), getCharacterPower() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (29): CricketCharacterCard(), CricketCharacterCardProps, GWCharacterGrid(), GWCharacterGridProps, GWGameOver(), GWGameOverProps, RevealCard(), GWGuessModal() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (33): FinalWinner(), FinalWinnerProps, GuessInput(), GuessInputProps, PlayerSetup(), PlayerSetupProps, QuestionBoard(), QuestionBoardProps (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (17): CharacterCard(), CharacterCardProps, GuessCharacterMode(), GuessCharacterModeProps, GuessImposterMode(), GuessImposterModeProps, PlayerInfo, PartyGameMode (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (21): CharacterImage(), CharacterImageProps, RoleIcon(), RoleIconProps, TeamSlots(), TeamSlotsProps, GameHub(), DeployModal() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (34): dotenv, express, @google/genai, lucide-react, motion, dependencies, dotenv, express (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (28): api, dist, DOM, DOM.Iterable, ES2022, node_modules, scratch, server.ts (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (22): ALL_PLAYERS, COUNTRIES, CricketPartyGames(), CricketPartyGamesProps, GamePhase, getCountryInfo(), PlayerInfo, computeGameStats() (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (23): autoprefixer, esbuild, gh-pages, devDependencies, autoprefixer, esbuild, gh-pages, tailwindcss (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.16
Nodes (15): CHARACTERS, buildApiUrl(), fetchFromAPI(), filterLocalPool(), pickFromPool(), pullRandomCharacter(), getBalancedCharacterPool(), getRequiredRarityForTeam() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (8): deriveStats(), favToColor(), favToRarity(), MALPortalProps, MyAnimeListPortal(), RARITY_GLOW, RARITY_GRADIENT, SUMMON_PHASES

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (6): LeafConfig, LeafField(), LEAVES, LandingPage(), LandingPageProps, MODES

### Community 13 - "Community 13"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, rewrites

## Knowledge Gaps
- **112 isolated node(s):** `name`, `private`, `version`, `homepage`, `type` (+107 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Character` connect `Community 3` to `Community 0`, `Community 1`, `Community 4`, `Community 9`, `Community 11`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SoundEffects` connect `Community 10` to `Community 3`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `sfx` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07164404223227752 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11414141414141414 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._