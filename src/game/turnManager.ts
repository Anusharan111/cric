export type GameMode = "duel" | "team" | "party";

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

/**
 * Setup game teams based on the list of player names and mode.
 */
export function buildTeams(
  playerNames: string[],
  mode: GameMode
): { players: Player[]; teams: Team[] } {
  const players: Player[] = playerNames.map((name, idx) => ({
    id: `p_${idx}`,
    name: name.trim() || `Player ${idx + 1}`,
  }));

  const teams: Team[] = [];

  if (mode === "duel") {
    // 1v1 Duel: each player is their own team
    players.forEach((p, idx) => {
      teams.push({
        id: `t_${p.id}`,
        name: p.name,
        playerIds: [p.id],
      });
    });
  } else if (mode === "party") {
    // Party/FFA: each player is their own team/competitor
    players.forEach((p) => {
      teams.push({
        id: `t_${p.id}`,
        name: p.name,
        playerIds: [p.id],
      });
    });
  } else {
    // Team mode: split into Team Crimson and Team Cobalt
    const team1Players: string[] = [];
    const team2Players: string[] = [];

    players.forEach((p, idx) => {
      if (idx % 2 === 0) {
        team1Players.push(p.id);
      } else {
        team2Players.push(p.id);
      }
    });

    teams.push({
      id: "t_crimson",
      name: "Team Crimson",
      playerIds: team1Players,
    });
    teams.push({
      id: "t_cobalt",
      name: "Team Cobalt",
      playerIds: team2Players,
    });
  }

  return { players, teams };
}

/**
 * Gets the next player's turn index.
 * Under "strict rotation":
 * - FFA/Duel: rotates through all players.
 * - Team mode: rotates teams first (Team A -> Team B -> Team A), and rotates the active player within each team.
 */
export interface TurnState {
  currentTeamIdx: number;
  // Track the current player index for each team
  teamPlayerIndices: { [teamId: string]: number };
}

export function getInitialTurnState(teams: Team[]): TurnState {
  const teamPlayerIndices: { [teamId: string]: number } = {};
  teams.forEach((t) => {
    teamPlayerIndices[t.id] = 0;
  });
  return {
    currentTeamIdx: 0,
    teamPlayerIndices,
  };
}

export function advanceTurn(
  teams: Team[],
  currentState: TurnState
): TurnState {
  const nextTeamIdx = (currentState.currentTeamIdx + 1) % teams.length;
  const currentTeam = teams[currentState.currentTeamIdx];

  // Advance the player index inside the team that just went
  const nextTeamPlayerIndices = { ...currentState.teamPlayerIndices };
  const currentIdx = nextTeamPlayerIndices[currentTeam.id] || 0;
  nextTeamPlayerIndices[currentTeam.id] =
    (currentIdx + 1) % currentTeam.playerIds.length;

  return {
    currentTeamIdx: nextTeamIdx,
    teamPlayerIndices: nextTeamPlayerIndices,
  };
}

export function getActivePlayerId(
  teams: Team[],
  turnState: TurnState
): string {
  const currentTeam = teams[turnState.currentTeamIdx];
  if (!currentTeam || currentTeam.playerIds.length === 0) return "";
  const playerIdx = turnState.teamPlayerIndices[currentTeam.id] || 0;
  return currentTeam.playerIds[playerIdx];
}
