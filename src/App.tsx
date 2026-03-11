import { FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { PlatformRoute, RiotProfileResponse, SearchFormState } from "./types";

const platformValues = [
  "na1",
  "br1",
  "la1",
  "la2",
  "euw1",
  "eun1",
  "tr1",
  "ru",
  "me1",
  "kr",
  "jp1",
  "oc1",
  "sg2",
  "ph2",
  "th2",
  "tw2",
  "vn2"
] as const satisfies readonly PlatformRoute[];

const platformOptions: Array<{
  value: PlatformRoute;
  label: string;
  region: string;
}> = [
  { value: "na1", label: "North America", region: "Americas" },
  { value: "br1", label: "Brazil", region: "Americas" },
  { value: "la1", label: "LAN", region: "Americas" },
  { value: "la2", label: "LAS", region: "Americas" },
  { value: "euw1", label: "EU West", region: "Europe" },
  { value: "eun1", label: "EU Nordic & East", region: "Europe" },
  { value: "tr1", label: "Turkey", region: "Europe" },
  { value: "ru", label: "Russia", region: "Europe" },
  { value: "me1", label: "Middle East", region: "Europe" },
  { value: "kr", label: "Korea", region: "Asia" },
  { value: "jp1", label: "Japan", region: "Asia" },
  { value: "oc1", label: "Oceania", region: "SEA" },
  { value: "sg2", label: "Singapore", region: "SEA" },
  { value: "ph2", label: "Philippines", region: "SEA" },
  { value: "th2", label: "Thailand", region: "SEA" },
  { value: "tw2", label: "Taiwan", region: "SEA" },
  { value: "vn2", label: "Vietnam", region: "SEA" }
];

const searchSchema = z.object({
  gameName: z.string().min(1, "Enter a Riot game name."),
  tagLine: z.string().min(1, "Enter a Riot tag line."),
  platform: z.enum(platformValues)
});

const rawSections = [
  { key: "account", label: "Account" },
  { key: "summoner", label: "Summoner" },
  { key: "ranked", label: "Ranked" },
  { key: "masteryTop", label: "Mastery" },
  { key: "matchIds", label: "Match IDs" },
  { key: "matches", label: "Matches" }
] as const satisfies ReadonlyArray<{ key: keyof RiotProfileResponse["raw"]; label: string }>;

const defaultForm: SearchFormState = {
  gameName: "",
  tagLine: "",
  platform: "na1"
};

const storageKey = "riot-profile-explorer:last-search";

async function fetchProfile(form: SearchFormState) {
  const params = new URLSearchParams({
    gameName: form.gameName,
    tagLine: form.tagLine,
    platform: form.platform,
    matchCount: "5"
  });
  const response = await fetch(`/api/profile?${params.toString()}`);
  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "Request failed.";
    throw new Error(message);
  }

  return payload as RiotProfileResponse;
}

function formatRankedLabel(queueType: string) {
  return queueType
    .replace("RANKED_", "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

export function App() {
  const [form, setForm] = useState<SearchFormState>(defaultForm);
  const [activeRawSection, setActiveRawSection] =
    useState<(typeof rawSections)[number]["key"]>("account");
  const [data, setData] = useState<RiotProfileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = searchSchema.partial().parse(JSON.parse(saved));
      setForm((current) => ({
        ...current,
        ...parsed
      }));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  const selectedPlatform = useMemo(
    () => platformOptions.find((option) => option.value === form.platform) ?? platformOptions[0],
    [form.platform]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = searchSchema.safeParse(form);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid search.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetchProfile(parsed.data);
      setData(response);
      setStatus("idle");
      window.localStorage.setItem(storageKey, JSON.stringify(parsed.data));
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown request failure.");
    }
  }

  const rawPayload = data?.raw[activeRawSection] ?? null;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">League Intelligence Console</p>
          <h1>Search any Riot ID, then inspect the clean view and the raw payload underneath it.</h1>
          <p className="hero__lede">
            This app keeps your Riot API key on the server, resolves the account route for you, and surfaces profile,
            ranked, mastery, and recent match data in one place.
          </p>
        </div>
        <div className="hero__rail">
          <div className="metric-card">
            <span className="metric-card__label">Primary Route</span>
            <strong>{selectedPlatform.label}</strong>
            <span>{selectedPlatform.value.toUpperCase()}</span>
          </div>
          <div className="metric-card">
            <span className="metric-card__label">Regional Cluster</span>
            <strong>{selectedPlatform.region}</strong>
            <span>Auto-mapped for account and match APIs</span>
          </div>
        </div>
      </section>

      <section className="panel panel--form">
        <div className="panel__header">
          <h2>Player lookup</h2>
          <p>Use the Riot ID pair plus the platform route where the summoner actually plays.</p>
        </div>
        <form className="lookup-form" onSubmit={handleSubmit}>
          <label>
            <span>Game name</span>
            <input
              value={form.gameName}
              onChange={(event) => setForm((current) => ({ ...current, gameName: event.target.value }))}
              placeholder="Doublelift"
            />
          </label>
          <label>
            <span>Tag line</span>
            <input
              value={form.tagLine}
              onChange={(event) => setForm((current) => ({ ...current, tagLine: event.target.value }))}
              placeholder="NA1"
            />
          </label>
          <label>
            <span>Platform</span>
            <select
              value={form.platform}
              onChange={(event) =>
                setForm((current) => ({ ...current, platform: event.target.value as PlatformRoute }))
              }
            >
              {platformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Pulling data..." : "Inspect profile"}
          </button>
        </form>
        <div className="panel__footnote">
          <span>Need a key first?</span>
          <code>RIOT_API_KEY</code>
          <span>belongs in your local `.env` file before you run the proxy.</span>
        </div>
        {errorMessage ? <p className="message--error">{errorMessage}</p> : null}
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel__header">
            <h2>Structured profile view</h2>
            <p>The UI below is shaped from the live response, but the raw payload is preserved separately.</p>
          </div>
          {data ? (
            <div className="stack">
              <div className="identity-card">
                <div>
                  <p className="identity-card__name">
                    {data.summary.account.gameName}
                    <span>#{data.summary.account.tagLine}</span>
                  </p>
                  <p className="identity-card__subline">PUUID: {data.summary.account.puuid}</p>
                </div>
                <div className="identity-card__stats">
                  <div>
                    <span>Summoner level</span>
                    <strong>{data.summary.summoner?.summonerLevel ?? "Unavailable"}</strong>
                  </div>
                  <div>
                    <span>Profile icon</span>
                    <strong>{data.summary.summoner?.profileIconId ?? "Unavailable"}</strong>
                  </div>
                </div>
              </div>

              <section className="subpanel">
                <div className="subpanel__header">
                  <h3>Ranked queues</h3>
                  <span>{data.summary.ranked.length || 0} entries</span>
                </div>
                {data.summary.ranked.length ? (
                  <div className="rank-grid">
                    {data.summary.ranked.map((entry) => {
                      const games = entry.wins + entry.losses;
                      const winRate = games > 0 ? Math.round((entry.wins / games) * 100) : 0;
                      return (
                        <article className="rank-card" key={entry.leagueId + entry.queueType}>
                          <p>{formatRankedLabel(entry.queueType)}</p>
                          <strong>
                            {entry.tier} {entry.rank}
                          </strong>
                          <span>{entry.leaguePoints} LP</span>
                          <span>
                            {entry.wins}W / {entry.losses}L
                          </span>
                          <span>{winRate}% WR</span>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-state">No ranked entries returned for this player.</p>
                )}
              </section>

              <section className="subpanel">
                <div className="subpanel__header">
                  <h3>Top mastery slice</h3>
                  <span>{data.summary.masteryTop.length || 0} champions</span>
                </div>
                {data.summary.masteryTop.length ? (
                  <div className="mastery-list">
                    {data.summary.masteryTop.map((entry) => (
                      <article className="mastery-card" key={entry.championId}>
                        <strong>Champion ID {entry.championId}</strong>
                        <span>Level {entry.championLevel}</span>
                        <span>{entry.championPoints.toLocaleString()} points</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No mastery payload returned for this player.</p>
                )}
              </section>

              <section className="subpanel">
                <div className="subpanel__header">
                  <h3>Recent match sample</h3>
                  <span>{data.raw.matches.length} loaded matches</span>
                </div>
                {data.raw.matches.length ? (
                  <div className="match-list">
                    {data.raw.matches.map((match) => {
                      const participant = match.data.info?.participants?.find(
                        (entry) =>
                          entry.riotIdGameName?.toLowerCase() === data.summary.account.gameName.toLowerCase() &&
                          entry.riotIdTagline?.toLowerCase() === data.summary.account.tagLine.toLowerCase()
                      );
                      return (
                        <article className="match-card" key={match.id}>
                          <div className="match-card__header">
                            <strong>{match.id}</strong>
                            <span>{match.data.info?.gameMode ?? "Unknown mode"}</span>
                          </div>
                          <div className="match-card__meta">
                            <span>{formatDuration(match.data.info?.gameDuration)}</span>
                            <span>
                              {match.data.info?.gameCreation
                                ? new Date(match.data.info.gameCreation).toLocaleString()
                                : "Unknown start"}
                            </span>
                          </div>
                          {participant ? (
                            <div className="match-card__result">
                              <strong>{participant.championName ?? "Unknown champion"}</strong>
                              <span>
                                {participant.kills}/{participant.deaths}/{participant.assists}
                              </span>
                              <span>{participant.win ? "Victory" : "Defeat"}</span>
                            </div>
                          ) : (
                            <p className="empty-state">Participant row could not be matched from this payload.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="empty-state">No match details were returned.</p>
                )}
              </section>

              {data.errors.length ? (
                <section className="subpanel subpanel--warning">
                  <div className="subpanel__header">
                    <h3>Partial failures</h3>
                    <span>{data.errors.length} endpoints</span>
                  </div>
                  <ul className="error-list">
                    {data.errors.map((entry) => (
                      <li key={`${entry.endpoint}-${entry.status}`}>
                        {entry.endpoint} returned HTTP {entry.status}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">
              Run a search to populate the profile view. The app will retain your last Riot ID locally in the browser.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="panel__header">
            <h2>Raw JSON inspector</h2>
            <p>Switch between each backend response segment and inspect the exact structure the UI received.</p>
          </div>
          <div className="tab-strip" role="tablist" aria-label="Raw response sections">
            {rawSections.map((section) => (
              <button
                key={section.key}
                type="button"
                className={section.key === activeRawSection ? "tab-strip__tab is-active" : "tab-strip__tab"}
                onClick={() => setActiveRawSection(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="json-frame">
            <pre>{JSON.stringify(rawPayload, null, 2)}</pre>
          </div>
        </article>
      </section>
    </main>
  );
}
