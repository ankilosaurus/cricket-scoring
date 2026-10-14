export type BallEvent = {
  type: "run" | "wicket" | "wide" | "noball" | "bye" | "legbye";
  runs: number;
  label: string;
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
};

export type PlayerStats = {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
};

export type Innings = {
  runs: number;
  wickets: number;
  balls: number;
  events: BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  battingOrder: string[];
  needsNewBatsman: boolean;
  needsNewBowler: boolean;
};

export type Match = {
  id: string;
  teamA: string;
  teamB: string;
  playersA: PlayerStats[];
  playersB: PlayerStats[];
  overs: number;
  battingFirst: "A" | "B";
  innings: [Innings, Innings];
  currentInnings: 0 | 1;
  status: "setup" | "select-openers" | "live" | "finished";
  winner?: string;
};

export type MatchSummary = {
  id: string;
  teamA: string;
  teamB: string;
  winner?: string;
  status: Match["status"];
  updatedAt: string;
};
