"use client";

import { useState, useEffect, useCallback } from "react";

type BallEvent = {
  type: "run" | "wicket" | "wide" | "noball" | "bye" | "legbye";
  runs: number;
  label: string;
};

type Innings = {
  runs: number;
  wickets: number;
  balls: number;
  events: BallEvent[];
};

type Match = {
  teamA: string;
  teamB: string;
  overs: number;
  battingFirst: "A" | "B";
  innings: [Innings, Innings];
  currentInnings: 0 | 1;
  status: "setup" | "live" | "finished";
  winner?: string;
};

const emptyInnings = (): Innings => ({
  runs: 0,
  wickets: 0,
  balls: 0,
  events: [],
});

const defaultMatch = (): Match => ({
  teamA: "Team A",
  teamB: "Team B",
  overs: 5,
  battingFirst: "A",
  innings: [emptyInnings(), emptyInnings()],
  currentInnings: 0,
  status: "setup",
});

function oversString(balls: number): string {
  const o = Math.floor(balls / 6);
  const b = balls % 6;
  return `${o}.${b}`;
}

function runRate(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  return ((runs / balls) * 6).toFixed(2);
}

export default function Home() {
  const [match, setMatch] = useState<Match>(defaultMatch);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [overs, setOvers] = useState(5);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cricket-match");
      if (raw) {
        const parsed = JSON.parse(raw) as Match;
        setMatch(parsed);
        setTeamA(parsed.teamA);
        setTeamB(parsed.teamB);
        setOvers(parsed.overs);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("cricket-match", JSON.stringify(match));
  }, [match, loaded]);

  const innings = match.innings[match.currentInnings];
  const maxBalls = match.overs * 6;
  const isAllOut = innings.wickets >= 10;
  const isOversDone = innings.balls >= maxBalls;
  const inningsOver = isAllOut || isOversDone;

  const battingTeam =
    match.currentInnings === 0
      ? match.battingFirst === "A"
        ? match.teamA
        : match.teamB
      : match.battingFirst === "A"
        ? match.teamB
        : match.teamA;

  const bowlingTeam =
    battingTeam === match.teamA ? match.teamB : match.teamA;

  const startMatch = () => {
    setMatch({
      teamA: teamA.trim() || "Team A",
      teamB: teamB.trim() || "Team B",
      overs,
      battingFirst: "A",
      innings: [emptyInnings(), emptyInnings()],
      currentInnings: 0,
      status: "live",
    });
  };

  const addEvent = useCallback(
    (event: BallEvent) => {
      if (match.status !== "live" || inningsOver) return;

      setMatch((prev) => {
        const inn = { ...prev.innings[prev.currentInnings] };
        inn.events = [...inn.events, event];
        inn.runs += event.runs;

        const isLegal =
          event.type === "run" ||
          event.type === "wicket" ||
          event.type === "bye" ||
          event.type === "legbye";

        if (isLegal) {
          inn.balls += 1;
        }
        if (event.type === "wicket") {
          inn.wickets += 1;
        }

        const newInnings = [...prev.innings] as [Innings, Innings];
        newInnings[prev.currentInnings] = inn;

        if (prev.currentInnings === 1) {
          const target = prev.innings[0].runs + 1;
          if (inn.runs >= target) {
            const winner =
              prev.battingFirst === "A" ? prev.teamB : prev.teamA;
            return {
              ...prev,
              innings: newInnings,
              status: "finished",
              winner,
            };
          }
          const nowAllOut = inn.wickets >= 10;
          const nowOversDone = inn.balls >= prev.overs * 6;
          if (nowAllOut || nowOversDone) {
            const firstRuns = prev.innings[0].runs;
            let winner: string | undefined;
            if (inn.runs > firstRuns) {
              winner =
                prev.battingFirst === "A" ? prev.teamB : prev.teamA;
            } else if (inn.runs < firstRuns) {
              winner =
                prev.battingFirst === "A" ? prev.teamA : prev.teamB;
            } else {
              winner = "Tie";
            }
            return {
              ...prev,
              innings: newInnings,
              status: "finished",
              winner,
            };
          }
        }

        return { ...prev, innings: newInnings };
      });
    },
    [match.status, inningsOver]
  );

  const startSecondInnings = () => {
    setMatch((prev) => ({
      ...prev,
      currentInnings: 1,
    }));
  };

  const undo = () => {
    setMatch((prev) => {
      const inn = { ...prev.innings[prev.currentInnings] };
      if (inn.events.length === 0) return prev;
      const last = inn.events[inn.events.length - 1];
      inn.events = inn.events.slice(0, -1);
      inn.runs -= last.runs;
      const isLegal =
        last.type === "run" ||
        last.type === "wicket" ||
        last.type === "bye" ||
        last.type === "legbye";
      if (isLegal) inn.balls = Math.max(0, inn.balls - 1);
      if (last.type === "wicket") inn.wickets = Math.max(0, inn.wickets - 1);

      const newInnings = [...prev.innings] as [Innings, Innings];
      newInnings[prev.currentInnings] = inn;
      return {
        ...prev,
        innings: newInnings,
        status: "live",
        winner: undefined,
      };
    });
  };

  const reset = () => {
    localStorage.removeItem("cricket-match");
    setMatch(defaultMatch());
    setTeamA("Team A");
    setTeamB("Team B");
    setOvers(5);
  };

  if (!loaded) {
    return (
      <div className="container" style={{ paddingTop: 48, textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  if (match.status === "setup") {
    return (
      <div className="container">
        <h1>🏏 Cricket Scorer</h1>
        <div className="card">
          <div className="form-group">
            <label>Team A (bats first)</label>
            <input
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="Team A"
            />
          </div>
          <div className="form-group">
            <label>Team B</label>
            <input
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="Team B"
            />
          </div>
          <div className="form-group">
            <label>Overs per innings</label>
            <select
              value={overs}
              onChange={(e) => setOvers(Number(e.target.value))}
            >
              {[1, 2, 3, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} overs
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={startMatch}>
            Start Match
          </button>
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          Simple ball-by-ball scoring · Saves in browser
        </p>
      </div>
    );
  }

  if (match.status === "finished") {
    const first = match.innings[0];
    const second = match.innings[1];
    const firstTeam =
      match.battingFirst === "A" ? match.teamA : match.teamB;
    const secondTeam =
      match.battingFirst === "A" ? match.teamB : match.teamA;

    return (
      <div className="container">
        <h1>🏏 Match Over</h1>
        <div className="card score-display">
          <div style={{ fontSize: "1.25rem", marginBottom: 8 }}>
            {match.winner === "Tie" ? "It's a Tie!" : `${match.winner} wins!`}
          </div>
          <div className="score-meta">
            {firstTeam}: {first.runs}/{first.wickets} ({oversString(first.balls)})
          </div>
          <div className="score-meta">
            {secondTeam}: {second.runs}/{second.wickets} ({oversString(second.balls)})
          </div>
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={reset}>
          New Match
        </button>
      </div>
    );
  }

  const target =
    match.currentInnings === 1 ? match.innings[0].runs + 1 : null;
  const needed =
    target !== null ? Math.max(0, target - innings.runs) : null;
  const ballsLeft = maxBalls - innings.balls;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="badge">
          Innings {match.currentInnings + 1} · {match.overs} ov
        </span>
        <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }} onClick={reset}>
          Reset
        </button>
      </div>

      <div className="card score-display">
        <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 4 }}>
          {battingTeam} batting
        </div>
        <div className="score-big">
          {innings.runs}/{innings.wickets}
        </div>
        <div className="score-meta">
          Overs {oversString(innings.balls)} · RR {runRate(innings.runs, innings.balls)}
        </div>
        {target !== null && (
          <div className="score-meta" style={{ marginTop: 8, color: "var(--accent)" }}>
            Need {needed} off {ballsLeft} balls · Target {target}
          </div>
        )}
        <div className="score-meta" style={{ marginTop: 4 }}>
          vs {bowlingTeam}
        </div>
      </div>

      <div className="card">
        <h2>This over</h2>
        <div className="history">
          {(() => {
            const ballsInOver = innings.balls % 6;
            const display: BallEvent[] = [];
            let count = 0;
            for (let i = innings.events.length - 1; i >= 0; i--) {
              display.unshift(innings.events[i]);
              const e = innings.events[i];
              if (
                e.type === "run" ||
                e.type === "wicket" ||
                e.type === "bye" ||
                e.type === "legbye"
              ) {
                count++;
                if (count >= (ballsInOver === 0 && innings.balls > 0 ? 6 : ballsInOver)) break;
              }
            }
            if (display.length === 0) {
              return <span style={{ color: "var(--muted)" }}>No balls yet</span>;
            }
            return display.map((e, i) => (
              <span
                key={i}
                className={`history-ball ${
                  e.type === "wicket"
                    ? "wicket"
                    : e.runs >= 4
                      ? "boundary"
                      : e.type === "wide" || e.type === "noball"
                        ? "extra"
                        : ""
                }`}
              >
                {e.label}
              </span>
            ));
          })()}
        </div>
      </div>

      {inningsOver && match.currentInnings === 0 ? (
        <div className="card">
          <p style={{ marginBottom: 12 }}>
            First innings complete: {innings.runs}/{innings.wickets}
          </p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={startSecondInnings}>
            Start 2nd Innings (chase {innings.runs + 1})
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Runs</h2>
            <div className="grid-runs">
              {[0, 1, 2, 3, 4, 6].map((r) => (
                <button
                  key={r}
                  disabled={inningsOver}
                  onClick={() =>
                    addEvent({ type: "run", runs: r, label: String(r) })
                  }
                >
                  {r}
                </button>
              ))}
              <button
                className="btn-danger"
                disabled={inningsOver}
                onClick={() =>
                  addEvent({ type: "wicket", runs: 0, label: "W" })
                }
                style={{ gridColumn: "span 2" }}
              >
                Wicket
              </button>
            </div>
            <div className="grid-extras">
              <button
                className="btn-warn"
                disabled={inningsOver}
                onClick={() =>
                  addEvent({ type: "wide", runs: 1, label: "Wd" })
                }
              >
                Wide (+1)
              </button>
              <button
                className="btn-warn"
                disabled={inningsOver}
                onClick={() =>
                  addEvent({ type: "noball", runs: 1, label: "Nb" })
                }
              >
                No Ball (+1)
              </button>
              <button
                className="btn-blue"
                disabled={inningsOver}
                onClick={() =>
                  addEvent({ type: "bye", runs: 1, label: "B1" })
                }
              >
                Bye (+1)
              </button>
              <button
                className="btn-blue"
                disabled={inningsOver}
                onClick={() =>
                  addEvent({ type: "legbye", runs: 1, label: "Lb1" })
                }
              >
                Leg Bye (+1)
              </button>
            </div>
          </div>

          <div className="actions">
            <button
              className="btn btn-secondary"
              disabled={innings.events.length === 0}
              onClick={undo}
            >
              Undo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
