"use client";

export type Tab = "scorer" | "matches" | "stats";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "scorer", label: "Scorer", icon: "🏏" },
  { id: "matches", label: "Matches", icon: "📋" },
  { id: "stats", label: "Stats", icon: "📊" },
];

export default function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={tab === t.id ? "active" : ""}
          onClick={() => {
            setTab(t.id);
            window.scrollTo(0, 0);
          }}
        >
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
