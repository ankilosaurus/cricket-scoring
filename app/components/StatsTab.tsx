"use client";

import { useEffect, useState } from "react";
import type { PlayerAgg } from "../../lib/types";

const fmt = (n: number, d = 1) => n.toFixed(d);

function avg(p: PlayerAgg): string {
  return p.dismissals > 0 ? fmt(p.runs / p.dismissals, 2) : "—";
}
function sr(p: PlayerAgg): string {
  return p.balls > 0 ? fmt((p.runs / p.balls) * 100) : "—";
}
function econ(p: PlayerAgg): string {
  return p.ballsBowled > 0 ? fmt((p.runsConceded / p.ballsBowled) * 6, 2) : "—";
}
function overs(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export default function StatsTab({ dbOn }: { dbOn: boolean }) {
  const [players, setPlayers] = useState<PlayerAgg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"bat" | "bowl">("bat");

  useEffect(() => {
    if (!dbOn) return;
    setLoading(true);
    setError("");
    fetch("/api/stats/players")
      .then((r) => r.json())
      .then((j) => {
        if (j && j.ok) setPlayers(j.players as PlayerAgg[]);
        else setError("Couldn't load stats.");
      })
      .catch(() => setError("Couldn't load stats."))
      .finally(() => setLoading(false));
  }, [dbOn]);

  if (!dbOn) {
    return (
      <div className="container">
        <h1>Stats</h1>
        <div className="card">
          <p style={{ color: "var(--muted)" }}>
            Connect a database to see career stats across all your matches.
          </p>
        </div>
      </div>
    );
  }

  const batters = [...players]
    .filter((p) => p.balls > 0)
    .sort((a, b) => b.runs - a.runs);
  const bowlers = [...players]
    .filter((p) => p.ballsBowled > 0)
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);

  return (
    <div className="container">
      <h1>Player stats</h1>
      <div className="seg">
        <button className={view === "bat" ? "active" : ""} onClick={() => setView("bat")}>
          Batting
        </button>
        <button className={view === "bowl" ? "active" : ""} onClick={() => setView("bowl")}>
          Bowling
        </button>
      </div>
      {error ? (
        <div className="card">
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      ) : loading && players.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)" }}>Loading stats…</p>
        </div>
      ) : view === "bat" ? (
        <div className="card">
          {batters.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No batting data yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>Player</th><th>M</th><th>Runs</th><th>Avg</th>
                    <th>SR</th><th>4s</th><th>6s</th>
                  </tr>
                </thead>
                <tbody>
                  {batters.map((p) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.matches}</td>
                      <td>{p.runs}</td>
                      <td>{avg(p)}</td>
                      <td>{sr(p)}</td>
                      <td>{p.fours}</td>
                      <td>{p.sixes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {bowlers.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No bowling data yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>Player</th><th>M</th><th>Wkts</th><th>Econ</th>
                    <th>Overs</th><th>Runs</th>
                  </tr>
                </thead>
                <tbody>
                  {bowlers.map((p) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.matches}</td>
                      <td>{p.wickets}</td>
                      <td>{econ(p)}</td>
                      <td>{overs(p.ballsBowled)}</td>
                      <td>{p.runsConceded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.8rem" }}>
        Career totals across all saved matches
      </p>
    </div>
  );
}
