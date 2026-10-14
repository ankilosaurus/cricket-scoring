"use client";

import { useEffect, useState } from "react";
import type { Match, MatchSummary } from "../../lib/types";
import { oversStr } from "../../lib/helpers";
import Scorecard from "../Scorecard";

function scoreLine(h: MatchSummary): string {
  const t1 = h.battingFirst === "A" ? h.teamA : h.teamB;
  const t2 = h.battingFirst === "A" ? h.teamB : h.teamA;
  const s1 = `${t1} ${h.inns1.runs}/${h.inns1.wickets} (${oversStr(h.inns1.balls)})`;
  if (h.inns2.balls === 0 && h.inns2.runs === 0) return s1;
  return `${s1} vs ${t2} ${h.inns2.runs}/${h.inns2.wickets} (${oversStr(h.inns2.balls)})`;
}

function resultLine(h: MatchSummary): string {
  if (h.status === "finished") {
    if (!h.winner) return "Finished";
    return h.winner === "Tie" ? "Match tied" : `${h.winner} won`;
  }
  if (h.status === "live") return "Live now";
  return h.status.replace("-", " ");
}

export default function MatchesTab({
  dbOn,
  onResume,
}: {
  dbOn: boolean;
  onResume: (m: Match) => void;
}) {
  const [history, setHistory] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = () => {
    if (!dbOn) return;
    setLoading(true);
    setError("");
    fetch("/api/matches")
      .then((r) => r.json())
      .then((j) => {
        if (j && j.ok) setHistory(j.matches as MatchSummary[]);
        else setError("Couldn't load matches.");
      })
      .catch(() => setError("Couldn't load matches."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbOn]);

  const openMatch = async (id: string) => {
    setError("");
    try {
      const r = await fetch(`/api/matches/${id}`);
      const j = await r.json();
      if (j && j.ok && j.match) {
        setSelected(j.match as Match);
        window.scrollTo(0, 0);
      } else {
        setError("Couldn't open that match.");
      }
    } catch {
      setError("Couldn't open that match.");
    }
  };

  if (!dbOn) {
    return (
      <div className="container">
        <h1>Matches</h1>
        <div className="card">
          <p style={{ color: "var(--muted)" }}>
            Connect a database to see your match results here. Finished matches
            back up automatically once cloud backup is on.
          </p>
        </div>
      </div>
    );
  }

  if (selected) {
    const h: MatchSummary = {
      id: selected.id,
      teamA: selected.teamA,
      teamB: selected.teamB,
      winner: selected.winner,
      status: selected.status,
      updatedAt: new Date().toISOString(),
      battingFirst: selected.battingFirst,
      inns1: {
        runs: selected.innings[0].runs,
        wickets: selected.innings[0].wickets,
        balls: selected.innings[0].balls,
      },
      inns2: {
        runs: selected.innings[1].runs,
        wickets: selected.innings[1].wickets,
        balls: selected.innings[1].balls,
      },
    };
    const resumable = selected.status === "live" || selected.status === "select-openers";
    return (
      <div className="container">
        <button className="back-btn" onClick={() => { setSelected(null); setShowCard(false); }}>
          ‹ All matches
        </button>
        <h1 style={{ textAlign: "left" }}>
          {selected.teamA} vs {selected.teamB}
        </h1>
        <div className="card score-display">
          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{scoreLine(h)}</div>
          <div className="score-meta">{resultLine(h)}</div>
        </div>
        <button
          className="btn btn-secondary"
          style={{ width: "100%", marginBottom: 8 }}
          onClick={() => setShowCard(true)}
        >
          View full scorecard
        </button>
        {resumable && (
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => onResume(selected)}
          >
            Resume scoring
          </button>
        )}
        {showCard && <Scorecard match={selected} onClose={() => setShowCard(false)} />}
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Matches</h1>
      {error ? (
        <div className="card">
          <p style={{ color: "var(--danger)" }}>{error}</p>
          <button className="btn btn-secondary" style={{ width: "100%", marginTop: 8 }} onClick={loadHistory}>
            Retry
          </button>
        </div>
      ) : loading && history.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)" }}>Loading matches…</p>
        </div>
      ) : history.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--muted)" }}>
            No matches yet. Score a game in the Scorer tab and it'll show up here.
          </p>
        </div>
      ) : (
        history.map((h) => (
          <button key={h.id} className="list-row" onClick={() => openMatch(h.id)}>
            <div style={{ fontWeight: 700 }}>
              {h.teamA} vs {h.teamB}
            </div>
            <div style={{ fontSize: "0.9rem", marginTop: 2 }}>{scoreLine(h)}</div>
            <div style={{ color: h.status === "live" ? "var(--accent)" : "var(--muted)", fontSize: "0.8rem", marginTop: 2 }}>
              {resultLine(h)} · {new Date(h.updatedAt).toLocaleDateString()}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
