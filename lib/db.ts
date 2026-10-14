import { neon } from "@neondatabase/serverless";

function dbUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    // Vercel marketplace stores use a prefixed name, e.g. CRICKET_SCORE_STORE_POSTGRES_URL
    process.env.CRICKET_SCORE_STORE_POSTGRES_URL ||
    process.env.CRICKET_SCORE_STORE_DATABASE_URL ||
    process.env.CRICKET_SCORE_STORE_POSTGRES_PRISMA_URL ||
    null
  );
}

export function isDbConfigured(): boolean {
  return dbUrl() !== null;
}

// Lazily created so importing this module never throws when no DB is configured.
let client: ReturnType<typeof neon> | null = null;
export function db() {
  const url = dbUrl();
  if (!url) throw new Error("Database not configured (DATABASE_URL missing)");
  if (!client) client = neon(url);
  return client;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  overs INT NOT NULL,
  batting_first CHAR(1) NOT NULL,
  status TEXT NOT NULL,
  winner TEXT,
  current_innings INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS players (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  team CHAR(1) NOT NULL,
  name TEXT NOT NULL,
  runs INT NOT NULL DEFAULT 0,
  balls INT NOT NULL DEFAULT 0,
  fours INT NOT NULL DEFAULT 0,
  sixes INT NOT NULL DEFAULT 0,
  "out" BOOLEAN NOT NULL DEFAULT FALSE,
  balls_bowled INT NOT NULL DEFAULT 0,
  runs_conceded INT NOT NULL DEFAULT 0,
  wickets INT NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, player_id)
);
CREATE TABLE IF NOT EXISTS ball_events (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  innings_no INT NOT NULL,
  seq INT NOT NULL,
  type TEXT NOT NULL,
  runs INT NOT NULL,
  label TEXT NOT NULL,
  striker_id TEXT,
  non_striker_id TEXT,
  bowler_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ball_events_match ON ball_events(match_id, innings_no, seq);
CREATE INDEX IF NOT EXISTS idx_matches_updated ON matches(updated_at DESC);
`;

let schemaReady = false;
export async function ensureSchema() {
  if (schemaReady) return;
  const sql = db();
  for (const stmt of SCHEMA.split(";")) {
    const q = stmt.trim();
    if (q) await sql(q);
  }
  schemaReady = true;
}
