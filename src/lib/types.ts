export type Profile = {
  id: string;
  username: string;
  game_id: string | null;
  kart_url: string | null;
  created_at: string;
} & Partial<GameProfile>;

/** In-game Smash Karts profile, read from a profile screenshot */
export type GameProfile = {
  sk_name: string | null;
  sk_id: string | null;
  sk_level: number | null;
  sk_xp: string | null;
  sk_region: string | null;
  sk_kills: number | null;
  sk_revenge_kills: number | null;
  sk_bot_kills: number | null;
  sk_deaths: number | null;
  sk_kdr: number | null;
  sk_wins: number | null;
  sk_games: number | null;
  sk_updated_at: string | null;
};

export type PlayerStats = Profile & {
  total_kills: number;
  total_deaths: number;
  matches_played: number;
  tournaments_played: number;
  team_wins: number;
};

export type TournamentType = "solo" | "team";
export type TournamentStatus = "upcoming" | "live" | "completed";

export type Tournament = {
  id: string;
  name: string;
  type: TournamentType;
  total_matches: number;
  status: TournamentStatus;
  host_id: string;
  created_at: string;
};

export type Team = { id: string; tournament_id: string; name: string; color: string };

export type TournamentPlayer = { tournament_id: string; player_id: string; team_id: string | null };

export type Match = {
  id: string;
  tournament_id: string;
  match_number: number;
  winner_team_id: string | null;
  screenshot_url: string | null;
  entry_method: "manual" | "ai";
  played_at: string;
};

export type MatchResult = {
  match_id: string;
  player_id: string;
  kills: number;
  deaths: number;
  position: number | null;
};

/** What /api/analyze-match returns */
export type AnalyzedRow = {
  name_on_screen: string;
  kills: number;
  deaths: number | null;
  position: number | null;
  team_color: string | null;
  player_id: string | null; // matched registered player
  confidence: number; // 0..1 name-match confidence
};

export type AnalyzeResponse = {
  rows: AnalyzedRow[];
  winner_team_id: string | null;
  notes: string | null;
  model: string;
};
