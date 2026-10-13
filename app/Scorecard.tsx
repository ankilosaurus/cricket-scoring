"use client";

import type { Match, PlayerStats } from "../lib/types";
import { oversStr, economy, strikeRate } from "../lib/helpers";

export default function Scorecard({ match, onClose }: { match: Match; onClose: () => void }) {
  const s1 = match.battingFirst;
  const s2 = s1 === "A" ? "B" : "A";
  const t1 = s1 === "A" ? match.teamA : match.teamB;
  const t2 = s2 === "A" ? match.teamA : match.teamB;
  const p1 = s1 === "A" ? match.playersA : match.playersB;
  const p2 = s2 === "A" ? match.playersA : match.playersB;
  const i1 = match.innings[0];
  const i2 = match.innings[1];
  const bats = (order: string[], players: PlayerStats[]) => {
    const map = new Map<string, PlayerStats>();
    for (const id of order) {
      const p = players.find((x) => x.id === id);
      if (p) map.set(p.id, p);
    }
    for (const p of players) {
      if (p.balls > 0 || p.out) map.set(p.id, p);
    }
    return Array.from(map.values());
  };
  const b1 = bats(i1.battingOrder, p1);
  const b2 = bats(i2.battingOrder, p2);
  const bowl1 = p2.filter((p) => p.ballsBowled > 0);
  const bowl2 = p1.filter((p) => p.ballsBowled > 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 50,
        overflowY: "auto",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 480, margin: "24px auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Scorecard</h2>
          <button
            className="btn btn-secondary"
            style={{ padding: "4px 10px", fontSize: "0.85rem" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <InnBlock
          title={`${t1} — ${i1.runs}/${i1.wickets} (${oversStr(i1.balls)})`}
          batsmen={b1}
          bowlers={bowl1}
        />
        {(match.currentInnings >= 1 || match.status === "finished") && (
          <InnBlock
            title={`${t2} — ${i2.runs}/${i2.wickets} (${oversStr(i2.balls)})`}
            batsmen={b2}
            bowlers={bowl2}
          />
        )}
      </div>
    </div>
  );
}

function InnBlock({
  title,
  batsmen,
  bowlers,
}: {
  title: string;
  batsmen: PlayerStats[];
  bowlers: PlayerStats[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 4 }}>Batting</div>
      <table style={{ width: "100%", fontSize: "0.85rem", marginBottom: 12 }}>
        <thead>
          <tr style={{ color: "var(--muted)", textAlign: "left" }}>
            <th style={{ padding: "2px 4px" }}>Batter</th>
            <th style={{ padding: "2px 4px" }}>R</th>
            <th style={{ padding: "2px 4px" }}>B</th>
            <th style={{ padding: "2px 4px" }}>4s</th>
            <th style={{ padding: "2px 4px" }}>6s</th>
            <th style={{ padding: "2px 4px" }}>SR</th>
          </tr>
        </thead>
        <tbody>
          {batsmen.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ color: "var(--muted)" }}>
                —
              </td>
            </tr>
          ) : (
            batsmen.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "2px 4px" }}>
                  {p.name}
                  {!p.out && p.balls > 0 ? "*" : ""}
                </td>
                <td style={{ padding: "2px 4px" }}>{p.runs}</td>
                <td style={{ padding: "2px 4px" }}>{p.balls}</td>
                <td style={{ padding: "2px 4px" }}>{p.fours}</td>
                <td style={{ padding: "2px 4px" }}>{p.sixes}</td>
                <td style={{ padding: "2px 4px" }}>{strikeRate(p.runs, p.balls)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 4 }}>Bowling</div>
      <table style={{ width: "100%", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ color: "var(--muted)", textAlign: "left" }}>
            <th style={{ padding: "2px 4px" }}>Bowler</th>
            <th style={{ padding: "2px 4px" }}>O</th>
            <th style={{ padding: "2px 4px" }}>R</th>
            <th style={{ padding: "2px 4px" }}>W</th>
            <th style={{ padding: "2px 4px" }}>Econ</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ color: "var(--muted)" }}>
                —
              </td>
            </tr>
          ) : (
            bowlers.map((p) => (
              <tr key={p.id}>
                <td style={{ padding: "2px 4px" }}>{p.name}</td>
                <td style={{ padding: "2px 4px" }}>{oversStr(p.ballsBowled)}</td>
                <td style={{ padding: "2px 4px" }}>{p.runsConceded}</td>
                <td style={{ padding: "2px 4px" }}>{p.wickets}</td>
                <td style={{ padding: "2px 4px" }}>
                  {economy(p.runsConceded, p.ballsBowled)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
