import type { BallEvent, Match, PlayerStats, Innings } from "./types";

export function makePlayer(name: string, id?: string): PlayerStats {
  return {
    id: id || `p_${Math.random().toString(36).slice(2, 9)}`,
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
  };
}

export function emptyInnings(): Innings {
  return {
    runs: 0,
    wickets: 0,
    balls: 0,
    events: [],
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,
    battingOrder: [],
    needsNewBatsman: false,
    needsNewBowler: false,
  };
}

export function oversStr(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function runRate(r: number, b: number) {
  return b === 0 ? "0.00" : ((r / b) * 6).toFixed(2);
}

export function economy(r: number, b: number) {
  return b === 0 ? "-" : ((r / b) * 6).toFixed(2);
}

export function strikeRate(r: number, b: number) {
  return b === 0 ? "-" : ((r / b) * 100).toFixed(1);
}

export function upd(
  list: PlayerStats[],
  id: string,
  fn: (p: PlayerStats) => PlayerStats
) {
  return list.map((p) => (p.id === id ? fn(p) : p));
}

export function rebuildStats(match: Match): Match {
  const clean = (list: PlayerStats[]) => list.map((p) => makePlayer(p.name, p.id));
  let playersA = clean(match.playersA);
  let playersB = clean(match.playersB);
  const apply = (events: BallEvent[], batSide: "A" | "B") => {
    const bowlSide = batSide === "A" ? "B" : "A";
    let batP = batSide === "A" ? playersA : playersB;
    let bowlP = bowlSide === "A" ? playersA : playersB;
    for (const e of events) {
      if (!e.strikerId || !e.bowlerId) continue;
      const legal =
        e.type === "run" ||
        e.type === "wicket" ||
        e.type === "bye" ||
        e.type === "legbye";
      if (e.type === "run" || e.type === "wicket") {
        batP = upd(batP, e.strikerId, (p) => ({
          ...p,
          runs: p.runs + (e.type === "run" ? e.runs : 0),
          balls: p.balls + 1,
          fours: p.fours + (e.runs === 4 ? 1 : 0),
          sixes: p.sixes + (e.runs === 6 ? 1 : 0),
          out: e.type === "wicket" ? true : p.out,
        }));
      }
      if (e.type === "bye" || e.type === "legbye") {
        batP = upd(batP, e.strikerId, (p) => ({ ...p, balls: p.balls + 1 }));
      }
      const br = e.type === "bye" || e.type === "legbye" ? 0 : e.runs;
      if (legal) {
        bowlP = upd(bowlP, e.bowlerId, (p) => ({
          ...p,
          ballsBowled: p.ballsBowled + 1,
          runsConceded: p.runsConceded + br,
          wickets: p.wickets + (e.type === "wicket" ? 1 : 0),
        }));
      } else {
        bowlP = upd(bowlP, e.bowlerId, (p) => ({
          ...p,
          runsConceded: p.runsConceded + e.runs,
        }));
      }
    }
    if (batSide === "A") {
      playersA = batP;
      playersB = bowlP;
    } else {
      playersA = bowlP;
      playersB = batP;
    }
  };
  if (match.innings[0].events.length) apply(match.innings[0].events, match.battingFirst);
  if (match.innings[1].events.length)
    apply(match.innings[1].events, match.battingFirst === "A" ? "B" : "A");
  return { ...match, playersA, playersB };
}
