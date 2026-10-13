"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import type { BallEvent, Match, PlayerStats, Innings } from "../lib/types";
import {
  makePlayer, emptyInnings, oversStr, runRate, upd, rebuildStats,
} from "../lib/helpers";
import Scorecard from "./Scorecard";

export default function Home() {
  const [match, setMatch] = useState<Match>({
    teamA: "Team A", teamB: "Team B", playersA: [], playersB: [],
    overs: 5, battingFirst: "A", innings: [emptyInnings(), emptyInnings()],
    currentInnings: 0, status: "setup",
  });
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [overs, setOvers] = useState(5);
  const [playersAText, setPlayersAText] = useState("");
  const [playersBText, setPlayersBText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [selStriker, setSelStriker] = useState("");
  const [selNonStriker, setSelNonStriker] = useState("");
  const [selBowler, setSelBowler] = useState("");
  const [selNewBat, setSelNewBat] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cricket-match-v2");
      if (raw) {
        const p = JSON.parse(raw) as Match;
        setMatch(p); setTeamA(p.teamA); setTeamB(p.teamB); setOvers(p.overs);
        setPlayersAText(p.playersA.map((x) => x.name).join("\n"));
        setPlayersBText(p.playersB.map((x) => x.name).join("\n"));
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("cricket-match-v2", JSON.stringify(match));
  }, [match, loaded]);

  const inn = match.innings[match.currentInnings];
  const maxBalls = match.overs * 6;
  const batSide = (): "A" | "B" =>
    match.currentInnings === 0 ? match.battingFirst : match.battingFirst === "A" ? "B" : "A";
  const bowlSide = (): "A" | "B" => (batSide() === "A" ? "B" : "A");
  const batPlayers = () => (batSide() === "A" ? match.playersA : match.playersB);
  const bowlPlayers = () => (bowlSide() === "A" ? match.playersA : match.playersB);
  const find = (list: PlayerStats[], id: string | null) =>
    id ? list.find((p) => p.id === id) || null : null;

  const battingTeam = batSide() === "A" ? match.teamA : match.teamB;
  const bowlingTeam = bowlSide() === "A" ? match.teamA : match.teamB;
  const striker = find(batPlayers(), inn.strikerId);
  const nonStriker = find(batPlayers(), inn.nonStrikerId);
  const bowler = find(bowlPlayers(), inn.bowlerId);
  const maxWickets = Math.max(1, batPlayers().length - 1);
  const inningsOver =
    (inn.wickets >= maxWickets || inn.balls >= maxBalls) &&
    !inn.needsNewBatsman && !inn.needsNewBowler;

  const parsePlayers = (t: string) =>
    t.split("\n").map((s) => s.trim()).filter(Boolean).map((n) => makePlayer(n));

  const startMatch = () => {
    const pa = parsePlayers(playersAText);
    const pb = parsePlayers(playersBText);
    if (pa.length < 2 || pb.length < 2) {
      alert("Add at least 2 players per team (one name per line)");
      return;
    }
    setMatch({
      teamA: teamA.trim() || "Team A", teamB: teamB.trim() || "Team B",
      playersA: pa, playersB: pb, overs, battingFirst: "A",
      innings: [emptyInnings(), emptyInnings()], currentInnings: 0, status: "select-openers",
    });
    setSelStriker(""); setSelNonStriker(""); setSelBowler("");
  };

  const confirmOpeners = () => {
    if (!selStriker || !selNonStriker || !selBowler || selStriker === selNonStriker) return;
    setMatch((prev) => {
      const i = { ...prev.innings[prev.currentInnings] };
      i.strikerId = selStriker; i.nonStrikerId = selNonStriker; i.bowlerId = selBowler;
      i.battingOrder = [selStriker, selNonStriker];
      i.needsNewBatsman = false; i.needsNewBowler = false;
      const ni = [...prev.innings] as [Innings, Innings];
      ni[prev.currentInnings] = i;
      return { ...prev, innings: ni, status: "live" };
    });
  };

  const confirmNewBat = () => {
    if (!selNewBat) return;
    setMatch((prev) => {
      const i = { ...prev.innings[prev.currentInnings] };
      i.strikerId = selNewBat;
      i.battingOrder = [...i.battingOrder, selNewBat];
      i.needsNewBatsman = false;
      const ni = [...prev.innings] as [Innings, Innings];
      ni[prev.currentInnings] = i;
      return { ...prev, innings: ni };
    });
    setSelNewBat("");
  };

  const confirmNewBowler = () => {
    if (!selBowler) return;
    setMatch((prev) => {
      const i = { ...prev.innings[prev.currentInnings] };
      i.bowlerId = selBowler; i.needsNewBowler = false;
      const ni = [...prev.innings] as [Innings, Innings];
      ni[prev.currentInnings] = i;
      return { ...prev, innings: ni };
    });
  };

  const addEvent = useCallback((event: BallEvent) => {
    setMatch((prev) => {
      if (prev.status !== "live") return prev;
      const i0 = prev.innings[prev.currentInnings];
      if (i0.needsNewBatsman || i0.needsNewBowler || !i0.strikerId || !i0.bowlerId) return prev;

      const bs = prev.currentInnings === 0 ? prev.battingFirst : prev.battingFirst === "A" ? "B" : "A";
      const bwlS = bs === "A" ? "B" : "A";
      let batP = bs === "A" ? [...prev.playersA] : [...prev.playersB];
      let bowlP = bwlS === "A" ? [...prev.playersA] : [...prev.playersB];
      const maxW = Math.max(1, batP.length - 1);

      const i = { ...i0 };
      const sid = i.strikerId!;
      const bid = i.bowlerId!;
      const ev: BallEvent = { ...event, strikerId: sid, nonStrikerId: i.nonStrikerId || undefined, bowlerId: bid };
      i.events = [...i.events, ev];
      i.runs += event.runs;

      const legal = event.type === "run" || event.type === "wicket" || event.type === "bye" || event.type === "legbye";

      if (event.type === "run" || event.type === "wicket") {
        batP = upd(batP, sid, (p) => ({
          ...p,
          runs: p.runs + (event.type === "run" ? event.runs : 0),
          balls: p.balls + 1,
          fours: p.fours + (event.runs === 4 ? 1 : 0),
          sixes: p.sixes + (event.runs === 6 ? 1 : 0),
          out: event.type === "wicket" ? true : p.out,
        }));
      }
      if (event.type === "bye" || event.type === "legbye") {
        batP = upd(batP, sid, (p) => ({ ...p, balls: p.balls + 1 }));
      }
      const br = event.type === "bye" || event.type === "legbye" ? 0 : event.runs;
      if (legal) {
        bowlP = upd(bowlP, bid, (p) => ({
          ...p, ballsBowled: p.ballsBowled + 1, runsConceded: p.runsConceded + br,
          wickets: p.wickets + (event.type === "wicket" ? 1 : 0),
        }));
        i.balls += 1;
      } else {
        bowlP = upd(bowlP, bid, (p) => ({ ...p, runsConceded: p.runsConceded + event.runs }));
      }
      if (event.type === "wicket") i.wickets += 1;

      const rot = event.type === "run" || event.type === "bye" || event.type === "legbye" ? event.runs : 0;
      if (rot % 2 === 1) { const t = i.strikerId; i.strikerId = i.nonStrikerId; i.nonStrikerId = t; }
      if (legal && i.balls % 6 === 0 && i.balls > 0) {
        const t = i.strikerId; i.strikerId = i.nonStrikerId; i.nonStrikerId = t;
        i.needsNewBowler = true;
      }
      if (event.type === "wicket" && i.wickets < maxW) {
        i.needsNewBatsman = true; i.strikerId = null;
      }

      const ni = [...prev.innings] as [Innings, Innings];
      ni[prev.currentInnings] = i;
      const playersA = bs === "A" ? batP : bowlP;
      const playersB = bs === "B" ? batP : bowlP;

      let status: Match["status"] = prev.status;
      let winner = prev.winner;
      if (prev.currentInnings === 1) {
        const target = prev.innings[0].runs + 1;
        const done = (i.wickets >= maxW || i.balls >= prev.overs * 6) && !i.needsNewBatsman && !i.needsNewBowler;
        if (i.runs >= target) {
          status = "finished";
          winner = prev.battingFirst === "A" ? prev.teamB : prev.teamA;
        } else if (done) {
          status = "finished";
          const fr = prev.innings[0].runs;
          if (i.runs > fr) winner = prev.battingFirst === "A" ? prev.teamB : prev.teamA;
          else if (i.runs < fr) winner = prev.battingFirst === "A" ? prev.teamA : prev.teamB;
          else winner = "Tie";
        }
      }
      return { ...prev, innings: ni, playersA, playersB, status, winner };
    });
  }, []);

  const undo = () => {
    setMatch((prev) => {
      const i = { ...prev.innings[prev.currentInnings] };
      if (!i.events.length) return prev;
      const last = i.events[i.events.length - 1];
      i.events = i.events.slice(0, -1);
      i.runs = Math.max(0, i.runs - last.runs);
      const legal = last.type === "run" || last.type === "wicket" || last.type === "bye" || last.type === "legbye";
      if (legal) i.balls = Math.max(0, i.balls - 1);
      if (last.type === "wicket") i.wickets = Math.max(0, i.wickets - 1);
      i.needsNewBatsman = false; i.needsNewBowler = false;

      if (i.events.length === 0) {
        i.strikerId = i.battingOrder[0] || null;
        i.nonStrikerId = i.battingOrder[1] || null;
        i.bowlerId = null;
      } else {
        const e = i.events[i.events.length - 1];
        i.strikerId = last.type === "wicket" ? (last.strikerId || null) : (e.strikerId || null);
        i.nonStrikerId = e.nonStrikerId || last.nonStrikerId || i.nonStrikerId;
        i.bowlerId = e.bowlerId || i.bowlerId;
        if (i.balls > 0 && i.balls % 6 === 0) i.needsNewBowler = true;
      }

      const ni = [...prev.innings] as [Innings, Innings];
      ni[prev.currentInnings] = i;
      const rebuilt = rebuildStats({ ...prev, innings: ni, status: "live", winner: undefined });
      return { ...rebuilt, innings: ni, status: "live", winner: undefined };
    });
  };

  const startSecond = () => {
    setMatch((prev) => ({
      ...prev, currentInnings: 1, status: "select-openers",
      innings: [prev.innings[0], emptyInnings()],
    }));
    setSelStriker(""); setSelNonStriker(""); setSelBowler("");
  };

  const reset = () => {
    localStorage.removeItem("cricket-match-v2");
    setMatch({
      teamA: "Team A", teamB: "Team B", playersA: [], playersB: [],
      overs: 5, battingFirst: "A", innings: [emptyInnings(), emptyInnings()],
      currentInnings: 0, status: "setup",
    });
    setTeamA("Team A"); setTeamB("Team B"); setOvers(5);
    setPlayersAText(""); setPlayersBText(""); setShowCard(false);
  };

  if (!loaded) {
    return <div className="container" style={{ paddingTop: 48, textAlign: "center" }}>Loading…</div>;
  }

  const taStyle: CSSProperties = {
    width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text)", borderRadius: 8, padding: 10, fontFamily: "inherit",
    fontSize: "1rem", resize: "vertical",
  };

  if (match.status === "setup") {
    return (
      <div className="container">
        <h1>🏏 Cricket Scorer</h1>
        <div className="card">
          <div className="form-group">
            <label>Team A (bats first)</label>
            <input value={teamA} onChange={(e) => setTeamA(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Team A players (one per line)</label>
            <textarea value={playersAText} onChange={(e) => setPlayersAText(e.target.value)}
              placeholder={"Virat\nRohit\nBumrah"} rows={4} style={taStyle} />
          </div>
          <div className="form-group">
            <label>Team B</label>
            <input value={teamB} onChange={(e) => setTeamB(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Team B players (one per line)</label>
            <textarea value={playersBText} onChange={(e) => setPlayersBText(e.target.value)}
              placeholder={"Babar\nRizwan\nShaheen"} rows={4} style={taStyle} />
          </div>
          <div className="form-group">
            <label>Overs</label>
            <select value={overs} onChange={(e) => setOvers(Number(e.target.value))}>
              {[1, 2, 3, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>{n} overs</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={startMatch}>Start Match</button>
        </div>
        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
          Batting & bowling stats · Saves in browser
        </p>
      </div>
    );
  }

  if (match.status === "select-openers") {
    const bp = batPlayers(); const bwp = bowlPlayers();
    return (
      <div className="container">
        <h1>Select players</h1>
        <div className="card">
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>{battingTeam} batting · {bowlingTeam} bowling</p>
          <div className="form-group">
            <label>Striker</label>
            <select value={selStriker} onChange={(e) => setSelStriker(e.target.value)}>
              <option value="">— select —</option>
              {bp.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Non-striker</label>
            <select value={selNonStriker} onChange={(e) => setSelNonStriker(e.target.value)}>
              <option value="">— select —</option>
              {bp.filter((p) => p.id !== selStriker).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Bowler</label>
            <select value={selBowler} onChange={(e) => setSelBowler(e.target.value)}>
              <option value="">— select —</option>
              {bwp.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }}
            disabled={!selStriker || !selNonStriker || !selBowler} onClick={confirmOpeners}>
            Begin Innings
          </button>
        </div>
      </div>
    );
  }

  if (match.status === "finished") {
    return (
      <div className="container">
        <h1>🏏 Match Over</h1>
        <div className="card score-display">
          <div style={{ fontSize: "1.25rem", marginBottom: 8 }}>
            {match.winner === "Tie" ? "It's a Tie!" : `${match.winner} wins!`}
          </div>
          <div className="score-meta">
            {match.battingFirst === "A" ? match.teamA : match.teamB}:{" "}
            {match.innings[0].runs}/{match.innings[0].wickets} ({oversStr(match.innings[0].balls)})
          </div>
          <div className="score-meta">
            {match.battingFirst === "A" ? match.teamB : match.teamA}:{" "}
            {match.innings[1].runs}/{match.innings[1].wickets} ({oversStr(match.innings[1].balls)})
          </div>
        </div>
        <button className="btn btn-secondary" style={{ width: "100%", marginBottom: 8 }}
          onClick={() => setShowCard(true)}>View Scorecard</button>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={reset}>New Match</button>
        {showCard && <Scorecard match={match} onClose={() => setShowCard(false)} />}
      </div>
    );
  }

  if (inn.needsNewBatsman) {
    const avail = batPlayers().filter((p) => !p.out && p.id !== inn.strikerId && p.id !== inn.nonStrikerId);
    return (
      <div className="container">
        <h1>New batsman</h1>
        <div className="card">
          <p style={{ marginBottom: 12, color: "var(--muted)" }}>Wicket! Select next batsman</p>
          <div className="form-group">
            <label>Batsman</label>
            <select value={selNewBat} onChange={(e) => setSelNewBat(e.target.value)}>
              <option value="">— select —</option>
              {avail.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={!selNewBat} onClick={confirmNewBat}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (inn.needsNewBowler && !inningsOver) {
    return (
      <div className="container">
        <h1>End of over</h1>
        <div className="card">
          <p style={{ marginBottom: 12, color: "var(--muted)" }}>
            Select next bowler · {battingTeam} {inn.runs}/{inn.wickets} ({oversStr(inn.balls)})
          </p>
          <div className="form-group">
            <label>Bowler</label>
            <select value={selBowler} onChange={(e) => setSelBowler(e.target.value)}>
              <option value="">— select —</option>
              {bowlPlayers().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.ballsBowled > 0 ? ` (${oversStr(p.ballsBowled)}-${p.runsConceded}-${p.wickets})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={!selBowler} onClick={confirmNewBowler}>
            Start next over
          </button>
        </div>
      </div>
    );
  }

  const target = match.currentInnings === 1 ? match.innings[0].runs + 1 : null;
  const needed = target !== null ? Math.max(0, target - inn.runs) : null;
  const ballsLeft = maxBalls - inn.balls;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="badge">Inn {match.currentInnings + 1} · {match.overs} ov</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={() => setShowCard(true)}>Card</button>
          <button className="btn btn-secondary" style={{ padding: "6px 10px", fontSize: "0.8rem" }}
            onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="card score-display">
        <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 4 }}>{battingTeam}</div>
        <div className="score-big">{inn.runs}/{inn.wickets}</div>
        <div className="score-meta">Overs {oversStr(inn.balls)} · RR {runRate(inn.runs, inn.balls)}</div>
        {target !== null && (
          <div className="score-meta" style={{ marginTop: 8, color: "var(--accent)" }}>
            Need {needed} off {ballsLeft} · Target {target}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.9rem" }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Striker ★</div>
            <div style={{ fontWeight: 600 }}>{striker?.name || "—"}</div>
            <div style={{ color: "var(--muted)" }}>{striker ? `${striker.runs} (${striker.balls})` : ""}</div>
          </div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Non-striker</div>
            <div style={{ fontWeight: 600 }}>{nonStriker?.name || "—"}</div>
            <div style={{ color: "var(--muted)" }}>{nonStriker ? `${nonStriker.runs} (${nonStriker.balls})` : ""}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: "0.9rem" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Bowler · </span>
          <strong>{bowler?.name || "—"}</strong>
          {bowler && bowler.ballsBowled > 0 && (
            <span style={{ color: "var(--muted)" }}> {oversStr(bowler.ballsBowled)}-{bowler.runsConceded}-{bowler.wickets}</span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>This over</h2>
        <div className="history">
          {(() => {
            const inOver = inn.balls % 6;
            const display: BallEvent[] = [];
            let c = 0;
            for (let j = inn.events.length - 1; j >= 0; j--) {
              display.unshift(inn.events[j]);
              const e = inn.events[j];
              if (e.type === "run" || e.type === "wicket" || e.type === "bye" || e.type === "legbye") {
                c++;
                if (c >= (inOver === 0 && inn.balls > 0 ? 6 : inOver)) break;
              }
            }
            if (!display.length) return <span style={{ color: "var(--muted)" }}>No balls yet</span>;
            return display.map((e, idx) => (
              <span key={idx} className={`history-ball ${
                e.type === "wicket" ? "wicket" : e.runs >= 4 ? "boundary" :
                e.type === "wide" || e.type === "noball" ? "extra" : ""
              }`}>{e.label}</span>
            ));
          })()}
        </div>
      </div>

      {inningsOver && match.currentInnings === 0 ? (
        <div className="card">
          <p style={{ marginBottom: 12 }}>First innings complete: {inn.runs}/{inn.wickets}</p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={startSecond}>
            Start 2nd Innings (chase {inn.runs + 1})
          </button>
        </div>
      ) : inningsOver ? (
        <div className="card"><p>Innings complete</p></div>
      ) : (
        <>
          <div className="card">
            <h2>Runs</h2>
            <div className="grid-runs">
              {[0, 1, 2, 3, 4, 6].map((r) => (
                <button key={r} onClick={() => addEvent({ type: "run", runs: r, label: String(r) })}>{r}</button>
              ))}
              <button className="btn-danger" onClick={() => addEvent({ type: "wicket", runs: 0, label: "W" })}
                style={{ gridColumn: "span 2" }}>Wicket</button>
            </div>
            <div className="grid-extras">
              <button className="btn-warn" onClick={() => addEvent({ type: "wide", runs: 1, label: "Wd" })}>Wide (+1)</button>
              <button className="btn-warn" onClick={() => addEvent({ type: "noball", runs: 1, label: "Nb" })}>No Ball (+1)</button>
              <button className="btn-blue" onClick={() => addEvent({ type: "bye", runs: 1, label: "B1" })}>Bye (+1)</button>
              <button className="btn-blue" onClick={() => addEvent({ type: "legbye", runs: 1, label: "Lb1" })}>Leg Bye (+1)</button>
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-secondary" disabled={!inn.events.length} onClick={undo}>Undo</button>
          </div>
        </>
      )}
      {showCard && <Scorecard match={match} onClose={() => setShowCard(false)} />}
    </div>
  );
}
