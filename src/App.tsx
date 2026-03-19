import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import DataObjectRounded from "@mui/icons-material/DataObjectRounded";
import FilterAltRounded from "@mui/icons-material/FilterAltRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import TimelineRounded from "@mui/icons-material/TimelineRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  createTheme,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import type {
  ApiCallSummary,
  MatchParticipant,
  MatchRecord,
  PlatformRoute,
  RiotEndpointError,
  RiotProfileResponse,
  SearchFormState,
} from "./types";

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
  "vn2",
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
  { value: "vn2", label: "Vietnam", region: "SEA" },
];

const matchCountOptions = [20, 50, 80] as const;

const searchSchema = z.object({
  gameName: z.string().trim().min(1, "Enter a Riot game name."),
  tagLine: z.string().trim().min(1, "Enter a Riot tag line."),
  platform: z.enum(platformValues),
  matchCount: z.number().int().min(1).max(80),
});

const rawSections = [
  { key: "account", label: "Account by Riot ID" },
  { key: "accountByPuuid", label: "Account by PUUID" },
  { key: "summoner", label: "Summoner" },
  { key: "ranked", label: "Ranked" },
  { key: "masteryTop", label: "Top mastery" },
  { key: "masteryScore", label: "Mastery score" },
  { key: "challenges", label: "Challenges" },
  { key: "status", label: "Platform status" },
  { key: "matchIds", label: "Match IDs" },
  { key: "matches", label: "Match details" },
  { key: "timelines", label: "Timelines" },
] as const satisfies ReadonlyArray<{
  key: keyof RiotProfileResponse["raw"];
  label: string;
}>;

type PageView = "desk" | "payload";

type ModeOption = {
  key: string;
  label: string;
  note: string;
  count: number;
};

type MatchInsight = {
  match: MatchRecord;
  participant?: MatchParticipant;
  modeKey: string;
  modeLabel: string;
  modeNote: string;
};

type ChampionCatalogResponse = {
  version: string;
  locale: string;
  champions: Array<{
    id: number;
    key: string;
    slug: string;
    name: string;
  }>;
};

const defaultForm: SearchFormState = {
  gameName: "",
  tagLine: "",
  platform: "na1",
  matchCount: 80,
};

const storageKey = "riot-profile-explorer:last-search";

const queueLabels: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  700: "Clash",
  1700: "Arena",
  1710: "Arena",
  1810: "Swarm",
  1900: "URF",
};

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#536d82" },
    secondary: { main: "#7d8f86" },
    background: { default: "#f5f2ea", paper: "#fdfaf3" },
    text: { primary: "#1f2733", secondary: "#5d6775" },
    success: { main: "#5d8570" },
    warning: { main: "#8d8660" },
    error: { main: "#a36f74" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
    h1: {
      fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
      lineHeight: 0.95,
      letterSpacing: "-0.06em",
      fontWeight: 700,
    },
    h2: {
      fontSize: "1.3rem",
      lineHeight: 1,
      letterSpacing: "-0.04em",
      fontWeight: 700,
    },
    h3: { fontSize: "0.96rem", letterSpacing: "0.02em", fontWeight: 700 },
    overline: { letterSpacing: "0.22em", fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          backgroundColor: "#f5f2ea",
          backgroundImage: [
            "radial-gradient(circle at 12% 0%, rgba(83, 109, 130, 0.08), transparent 22%)",
            "radial-gradient(circle at 88% 0%, rgba(125, 143, 134, 0.08), transparent 24%)",
            "linear-gradient(180deg, #fbf8f2 0%, #f5f2ea 42%, #eeeadf 100%)",
          ].join(", "),
        },
        "*": { boxSizing: "border-box" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", borderRadius: "10px", fontWeight: 700 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: "999px" },
      },
    },
  },
});

const ruleColor = "rgba(93, 103, 117, 0.18)";

async function fetchProfile(form: SearchFormState, signal: AbortSignal) {
  const params = new URLSearchParams({
    gameName: form.gameName,
    tagLine: form.tagLine,
    platform: form.platform,
    matchCount: String(form.matchCount),
  });
  const response = await fetch(`/api/profile?${params.toString()}`, { signal });
  const payload = await response.json();

  if (!response.ok && !payload?.summary?.account) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : "Request failed.";
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
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
}

function formatError(error: RiotEndpointError) {
  const detail =
    typeof error.detail === "object" &&
    error.detail !== null &&
    "message" in error.detail
      ? String(error.detail.message)
      : "Request failed.";
  return `${error.endpoint} returned HTTP ${error.status}: ${detail}`;
}

function normalizeText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function formatCompactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value)}%`;
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return value.toFixed(digits);
}
function formatLastPlayed(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function getChampionName(
  championId: number,
  championNames: Record<number, string>,
) {
  return championNames[championId] ?? `Champion ${championId}`;
}

async function fetchChampionCatalog(signal: AbortSignal) {
  const response = await fetch("/api/champions", { signal });
  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : "Unable to load champion catalog.";
    throw new Error(message);
  }

  return payload as ChampionCatalogResponse;
}
function getPageFromHash(): PageView {
  if (typeof window === "undefined") {
    return "desk";
  }

  return window.location.hash === "#payload" ? "payload" : "desk";
}

function setPageHash(view: PageView) {
  if (typeof window === "undefined") {
    return;
  }

  const nextHash = view === "payload" ? "#payload" : "#desk";
  window.history.replaceState(null, "", nextHash);
}

function findParticipant(
  match: RiotProfileResponse["raw"]["matches"][number],
  account: RiotProfileResponse["summary"]["account"],
) {
  return match.data.info?.participants?.find((entry) => {
    if (entry.puuid && entry.puuid === account.puuid) {
      return true;
    }

    return (
      normalizeText(entry.riotIdGameName) === normalizeText(account.gameName) &&
      normalizeText(entry.riotIdTagline) === normalizeText(account.tagLine)
    );
  });
}

function getModeDescriptor(match: MatchRecord) {
  const queueId = match.data.info?.queueId;
  const gameMode = match.data.info?.gameMode;
  const mapId = match.data.info?.mapId;

  if (typeof queueId === "number" && queueLabels[queueId]) {
    return {
      key: `queue:${queueId}`,
      label: queueLabels[queueId],
      note: `Queue ${queueId}`,
    };
  }

  if (gameMode === "ARAM" && typeof queueId === "number" && queueId !== 450) {
    return {
      key: `queue:${queueId}`,
      label: "ARAM Variant",
      note: `Queue ${queueId}${mapId ? ` on map ${mapId}` : ""}`,
    };
  }

  if (typeof queueId === "number") {
    return {
      key: `queue:${queueId}`,
      label: gameMode ? `${gameMode}` : `Queue ${queueId}`,
      note: `Queue ${queueId}${mapId ? ` on map ${mapId}` : ""}`,
    };
  }

  return {
    key: `mode:${gameMode ?? "unknown"}`,
    label: gameMode ?? "Unknown mode",
    note: mapId ? `Map ${mapId}` : "No queue metadata",
  };
}

function NavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      variant="text"
      sx={{
        color: active ? "text.primary" : "text.secondary",
        px: 0,
        py: 0.5,
        minWidth: 0,
        borderRadius: 0,
        borderBottom: active
          ? "2px solid currentColor"
          : "2px solid transparent",
        fontWeight: active ? 700 : 600,
        justifyContent: "flex-start",
      }}
    >
      {label}
    </Button>
  );
}

function StatColumn({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Box sx={{ minWidth: 0, pr: 2 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "clamp(1.7rem, 2.8vw, 2.6rem)",
          lineHeight: 1,
          letterSpacing: "-0.05em",
          fontWeight: 700,
          mt: 0.4,
        }}
      >
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6 }}>
        {note}
      </Typography>
    </Box>
  );
}

function SectionBand({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ borderTop: `1px solid ${ruleColor}`, py: 3.2 }}>
      <Stack spacing={2.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography variant="h2">{title}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.55, maxWidth: 760 }}
            >
              {subtitle}
            </Typography>
          </Box>
          {action}
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}

function EndpointLine({
  call,
  active,
  onClick,
}: {
  call: ApiCallSummary;
  active: boolean;
  onClick: () => void;
}) {
  const tone = !call.ok
    ? "error.main"
    : call.key === "matches" || call.key === "timelines"
      ? "secondary.main"
      : "primary.main";

  return (
    <Button
      onClick={onClick}
      variant="text"
      sx={{
        width: "100%",
        justifyContent: "space-between",
        px: 0,
        py: 1.2,
        borderRadius: 0,
        borderBottom: `1px solid ${alpha("#5d6775", 0.12)}`,
        color: "text.primary",
        textAlign: "left",
      }}
    >
      <Stack spacing={0.3} sx={{ minWidth: 0, textAlign: "left" }}>
        <Typography
          variant="subtitle2"
          sx={{ color: active ? tone : "text.primary" }}
        >
          {call.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {call.endpoint}
        </Typography>
      </Stack>
      <Stack alignItems="flex-end" spacing={0.2} sx={{ ml: 2 }}>
        <Typography variant="caption" sx={{ color: tone }}>
          {call.returned ?? 0}/{call.requested ?? call.returned ?? 0}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          HTTP {call.status}
        </Typography>
      </Stack>
    </Button>
  );
}

export function App() {
  const [form, setForm] = useState<SearchFormState>(defaultForm);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [data, setData] = useState<RiotProfileResponse | null>(null);
  const [activeRawSection, setActiveRawSection] =
    useState<(typeof rawSections)[number]["key"]>("account");
  const [pageView, setPageView] = useState<PageView>(getPageFromHash);
  const [activeMode, setActiveMode] = useState("all");
  const [championNames, setChampionNames] = useState<Record<number, string>>(
    {},
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<SearchFormState>;
      setForm((current) => ({
        ...current,
        gameName:
          typeof parsed.gameName === "string"
            ? parsed.gameName
            : current.gameName,
        tagLine:
          typeof parsed.tagLine === "string" ? parsed.tagLine : current.tagLine,
        platform:
          typeof parsed.platform === "string" &&
          platformValues.includes(parsed.platform as PlatformRoute)
            ? (parsed.platform as PlatformRoute)
            : current.platform,
        matchCount:
          typeof parsed.matchCount === "number" &&
          Number.isFinite(parsed.matchCount)
            ? Math.min(Math.max(parsed.matchCount, 1), 80)
            : current.matchCount,
      }));
    } catch {
      // Ignore invalid local storage.
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setPageView(getPageFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!data) {
      setActiveMode("all");
      return;
    }

    const options = new Set<string>(["all"]);
    for (const match of data.raw.matches) {
      if (!match.ok) {
        continue;
      }
      options.add(getModeDescriptor(match).key);
    }

    if (!options.has(activeMode)) {
      setActiveMode("all");
    }
  }, [activeMode, data]);

  useEffect(() => {
    const controller = new AbortController();

    fetchChampionCatalog(controller.signal)
      .then((catalog) => {
        const lookup = Object.fromEntries(
          catalog.champions.map((entry) => [entry.id, entry.name]),
        ) as Record<number, string>;
        setChampionNames(lookup);
      })
      .catch(() => {
        // Fallback to champion ids if static catalog lookup fails.
      });

    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, []);

  const selectedPlatform = useMemo(
    () =>
      platformOptions.find((entry) => entry.value === form.platform) ??
      platformOptions[0],
    [form.platform],
  );

  const matchInsights = useMemo(() => {
    if (!data) {
      return [] as MatchInsight[];
    }

    return data.raw.matches
      .filter((entry) => entry.ok)
      .map((match) => {
        const descriptor = getModeDescriptor(match);
        return {
          match,
          participant: findParticipant(match, data.summary.account),
          modeKey: descriptor.key,
          modeLabel: descriptor.label,
          modeNote: descriptor.note,
        } satisfies MatchInsight;
      });
  }, [data]);

  const modeOptions = useMemo(() => {
    const groups = new Map<string, ModeOption>();

    for (const entry of matchInsights) {
      const existing = groups.get(entry.modeKey);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(entry.modeKey, {
          key: entry.modeKey,
          label: entry.modeLabel,
          note: entry.modeNote,
          count: 1,
        });
      }
    }

    return [
      {
        key: "all",
        label: "All loaded modes",
        note: `${matchInsights.length} detailed matches currently loaded`,
        count: matchInsights.length,
      },
      ...Array.from(groups.values()).sort(
        (left, right) => right.count - left.count,
      ),
    ];
  }, [matchInsights]);

  const filteredInsights = useMemo(() => {
    if (activeMode === "all") {
      return matchInsights;
    }

    return matchInsights.filter((entry) => entry.modeKey === activeMode);
  }, [activeMode, matchInsights]);

  const stats = useMemo(() => {
    const sample = filteredInsights.length ? filteredInsights : matchInsights;
    const loaded = sample.length;
    const wins = sample.filter((entry) => entry.participant?.win).length;
    const totalKills = sample.reduce(
      (sum, entry) => sum + (entry.participant?.kills ?? 0),
      0,
    );
    const totalAssists = sample.reduce(
      (sum, entry) => sum + (entry.participant?.assists ?? 0),
      0,
    );
    const totalDeaths = sample.reduce(
      (sum, entry) => sum + (entry.participant?.deaths ?? 0),
      0,
    );
    const totalDamage = sample.reduce(
      (sum, entry) =>
        sum + (entry.participant?.totalDamageDealtToChampions ?? 0),
      0,
    );
    const totalGold = sample.reduce(
      (sum, entry) => sum + (entry.participant?.goldEarned ?? 0),
      0,
    );
    const peakKills = sample.reduce(
      (max, entry) => Math.max(max, entry.participant?.kills ?? 0),
      0,
    );

    return {
      loaded,
      winRate: loaded ? (wins / loaded) * 100 : null,
      avgKda: loaded
        ? (totalKills + totalAssists) / Math.max(totalDeaths, 1)
        : null,
      avgDamage: loaded ? totalDamage / loaded : null,
      avgGold: loaded ? totalGold / loaded : null,
      peakKills,
    };
  }, [filteredInsights, matchInsights]);

  const rankedEntries = data?.summary.ranked ?? [];
  const masteryEntries = useMemo(
    () =>
      [...(data?.summary.masteryTop ?? [])].sort(
        (left, right) => right.lastPlayTime - left.lastPlayTime,
      ),
    [data],
  );
  const masteryPointsShown = masteryEntries.reduce(
    (sum, entry) => sum + entry.championPoints,
    0,
  );
  const matchDetailErrors =
    data?.errors.filter((entry) =>
      entry.endpoint.startsWith("match-v5 detail"),
    ) ?? [];
  const timelineErrors =
    data?.errors.filter((entry) =>
      entry.endpoint.startsWith("match-v5 timeline"),
    ) ?? [];
  const matchIdsError = data?.errors.find(
    (entry) => entry.endpoint === "match-v5 ids",
  );
  const rankedError = data?.errors.find(
    (entry) => entry.endpoint === "league-v4",
  );
  const masteryError = data?.errors.find(
    (entry) => entry.endpoint === "champion-mastery-v4 top",
  );
  const challengesError = data?.errors.find(
    (entry) => entry.endpoint === "challenges-v1",
  );
  const rawPayload = data
    ? data.raw[activeRawSection]
    : { message: "Run a search to inspect the full backend payload." };
  const activeCall = data?.meta.apiCalls.find(
    (entry) => entry.key === activeRawSection,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = searchSchema.safeParse({
      gameName: form.gameName,
      tagLine: form.tagLine,
      platform: form.platform,
      matchCount: form.matchCount,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid Riot ID.");
      setStatus("error");
      return;
    }

    const nextForm = {
      ...parsed.data,
      gameName: parsed.data.gameName.trim(),
      tagLine: parsed.data.tagLine.trim(),
    } satisfies SearchFormState;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setForm(nextForm);
    setStatus("loading");
    setError("");

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextForm));
      const payload = await fetchProfile(nextForm, controller.signal);
      setData(payload);
      setStatus("success");
      setActiveRawSection("account");
      setActiveMode("all");
    } catch (requestError) {
      if (controller.signal.aborted) {
        return;
      }

      setData(null);
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Request failed.",
      );
    }
  }

  function handlePageChange(nextView: PageView) {
    setPageView(nextView);
    setPageHash(nextView);
  }

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4.5 } }}>
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={{ xs: 2, lg: 4 }}
            justifyContent="space-between"
          >
            <Stack spacing={2.2} sx={{ minWidth: { lg: 340 } }}>
              <Stack direction="row" spacing={2.2}>
                <NavButton
                  active={pageView === "desk"}
                  label="Profile Desk"
                  onClick={() => handlePageChange("desk")}
                />
                <NavButton
                  active={pageView === "payload"}
                  label="Payload Lab"
                  onClick={() => handlePageChange("payload")}
                />
              </Stack>
            </Stack>
          </Stack>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              borderTop: `1px solid ${ruleColor}`,
              borderBottom: `1px solid ${ruleColor}`,
              py: 2.4,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0))",
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", lg: "flex-end" }}
              >
                <TextField
                  fullWidth
                  label="Game name"
                  value={form.gameName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gameName: event.target.value,
                    }))
                  }
                />
                <TextField
                  fullWidth
                  label="Tag line"
                  value={form.tagLine}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tagLine: event.target.value,
                    }))
                  }
                />
                <TextField
                  select
                  label="Platform"
                  value={form.platform}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      platform: event.target.value as PlatformRoute,
                    }))
                  }
                  sx={{ minWidth: { lg: 220 } }}
                >
                  {platformOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label} ({option.value})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="History depth"
                  value={String(form.matchCount)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      matchCount: Number(event.target.value),
                    }))
                  }
                  sx={{ minWidth: { lg: 140 } }}
                >
                  {matchCountOptions.map((count) => (
                    <MenuItem key={count} value={count}>
                      {count} matches
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  startIcon={<SearchRounded />}
                  sx={{ minHeight: 56, px: 2.4 }}
                >
                  Inspect profile
                </Button>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`${selectedPlatform.label} / ${selectedPlatform.region}`}
                  variant="outlined"
                />
                <Chip
                  label={`Up to ${form.matchCount} match details`}
                  variant="outlined"
                />
                <Chip label="Timeline samples included" variant="outlined" />
                <Chip
                  label="Raw payload moved to Payload Lab"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </Box>

          {status === "loading" ? <LinearProgress color="secondary" /> : null}
          {status === "error" && error ? (
            <Alert severity="error">{error}</Alert>
          ) : null}

          {pageView === "desk" ? (
            <Stack spacing={0}>
              <SectionBand
                title="Identity and headline stats"
                subtitle="Bigger numbers first, then the supporting detail. The metric rail tracks the active mode filter when one is selected."
                action={
                  data ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        icon={<SportsEsportsRounded />}
                        label={`${data.meta.matchCountLoaded} loaded matches`}
                        variant="outlined"
                      />
                      <Chip
                        icon={<TimelineRounded />}
                        label={`${data.meta.timelineCountLoaded} timeline samples`}
                        variant="outlined"
                      />
                    </Stack>
                  ) : undefined
                }
              >
                {data ? (
                  <Stack spacing={3}>
                    <Box
                      sx={{
                        borderTop: `1px solid ${alpha("#5d6775", 0.16)}`,
                        pt: 2.1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "grid",
                          gap: 2,
                          gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            lg: "repeat(6, minmax(0, 1fr))",
                          },
                        }}
                      >
                        <StatColumn
                          label="Win rate"
                          value={formatPercent(stats.winRate)}
                          note={
                            filteredInsights.length && activeMode !== "all"
                              ? "Current mode filter"
                              : "Across loaded history"
                          }
                        />
                        <StatColumn
                          label="Average KDA"
                          value={formatDecimal(stats.avgKda)}
                          note="Kills plus assists over deaths"
                        />
                        <StatColumn
                          label="Average damage"
                          value={formatCompactNumber(stats.avgDamage)}
                          note="Champion damage per match"
                        />
                        <StatColumn
                          label="Average gold"
                          value={formatCompactNumber(stats.avgGold)}
                          note="Gold earned per match"
                        />
                        <StatColumn
                          label="Peak kills"
                          value={
                            stats.peakKills ? String(stats.peakKills) : "--"
                          }
                          note="Highest kill total in loaded matches"
                        />
                        <StatColumn
                          label="Mastery score"
                          value={formatCompactNumber(data.summary.masteryScore)}
                          note="Account-wide mastery score endpoint"
                        />
                      </Box>
                    </Box>
                  </Stack>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Run a lookup to populate the profile desk. This view is now
                    optimized for loaded stats and mode-filtered history rather
                    than placeholder cards.
                  </Alert>
                )}
              </SectionBand>

              <Box
                sx={{
                  display: "grid",
                  gap: { xs: 0, lg: 4 },
                  gridTemplateColumns: {
                    xs: "1fr",
                    lg: "minmax(0, 1.55fr) minmax(280px, 0.8fr)",
                  },
                  alignItems: "start",
                }}
              >
                <Box>
                  <SectionBand
                    title="Ranked ledger"
                    subtitle="Read the queue context like a ledger, not a set of summary cards."
                  >
                    {data ? (
                      rankedError ? (
                        <Alert severity="warning">
                          {formatError(rankedError)}
                        </Alert>
                      ) : rankedEntries.length ? (
                        <Stack
                          divider={
                            <Divider
                              flexItem
                              sx={{ borderColor: alpha("#5d6775", 0.14) }}
                            />
                          }
                        >
                          {rankedEntries.map((entry) => {
                            const totalGames = entry.wins + entry.losses;
                            const winRate = totalGames
                              ? Math.round((entry.wins / totalGames) * 100)
                              : 0;

                            return (
                              <Box
                                key={`${entry.queueType}-${entry.leagueId}`}
                                sx={{
                                  display: "grid",
                                  gap: 1.4,
                                  py: 1.6,
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "minmax(180px, 1.1fr) repeat(4, minmax(0, 0.7fr))",
                                  },
                                }}
                              >
                                <Box>
                                  <Typography variant="h3">
                                    {formatRankedLabel(entry.queueType)}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 0.35 }}
                                  >
                                    {entry.tier} {entry.rank} Â·{" "}
                                    {entry.leaguePoints} LP
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Wins
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {entry.wins}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Losses
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {entry.losses}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Games
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {totalGames}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Win rate
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {winRate}%
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          No ranked entries returned for this player.
                        </Alert>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Ranked entries appear here after a successful lookup.
                      </Typography>
                    )}
                  </SectionBand>

                  <SectionBand
                    title="Mastery and challenge spikes"
                    subtitle="Use the mastery endpoints plus Riot challenges to surface the bigger long-term numbers without resorting to decorative tiles."
                  >
                    {data ? (
                      <Stack spacing={2.1}>
                        <Box
                          sx={{
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: {
                              xs: "repeat(2, minmax(0, 1fr))",
                              md: "repeat(4, minmax(0, 1fr))",
                            },
                          }}
                        >
                          <StatColumn
                            label="Top mastery total"
                            value={formatCompactNumber(masteryPointsShown)}
                            note={`${masteryEntries.length} champions in the top slice`}
                          />
                          <StatColumn
                            label="Challenge level"
                            value={formatCompactNumber(
                              data.summary.challenges?.level,
                            )}
                            note="From Riot challenges player data"
                          />
                          <StatColumn
                            label="Challenge points"
                            value={formatCompactNumber(
                              data.summary.challenges?.current,
                            )}
                            note="Current total points"
                          />
                          <StatColumn
                            label="Percentile"
                            value={formatPercent(
                              data.summary.challenges?.percentile,
                            )}
                            note="If the endpoint returned it"
                          />
                        </Box>

                        {masteryError ? (
                          <Alert severity="warning">
                            {formatError(masteryError)}
                          </Alert>
                        ) : null}
                        {challengesError ? (
                          <Alert severity="warning">
                            {formatError(challengesError)}
                          </Alert>
                        ) : null}

                        {masteryEntries.length ? (
                          <Stack
                            divider={
                              <Divider
                                flexItem
                                sx={{ borderColor: alpha("#5d6775", 0.14) }}
                              />
                            }
                          >
                            {masteryEntries.map((entry) => (
                              <Box
                                key={entry.championId}
                                sx={{
                                  display: "grid",
                                  gap: 1.1,
                                  py: 1.2,
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "minmax(220px, 1.1fr) minmax(140px, 0.8fr) repeat(3, minmax(0, 0.6fr))",
                                  },
                                }}
                              >
                                <Box>
                                  <Typography variant="h3">
                                    {getChampionName(
                                      entry.championId,
                                      championNames,
                                    )}
                                  </Typography>
                                  <Box
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Last played{" "}
                                      {formatLastPlayed(entry.lastPlayTime)}
                                    </Typography>
                                  </Box>
                                </Box>

                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Level
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {entry.championLevel}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Points
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {entry.championPoints.toLocaleString()}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Share
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {masteryPointsShown
                                      ? `${Math.round((entry.championPoints / masteryPointsShown) * 100)}%`
                                      : "--"}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        ) : null}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Mastery and challenge data will populate here after a
                        lookup.
                      </Typography>
                    )}
                  </SectionBand>

                  <SectionBand
                    title="Match history workbench"
                    subtitle="Load deeper history, then switch the ledger by queue or mode. ARAM Mayhem should split out here if Riot exposes it as a distinct queue in the loaded match set."
                    action={
                      data ? (
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                        >
                          <TextField
                            select
                            size="small"
                            label="Mode filter"
                            value={activeMode}
                            onChange={(event) =>
                              setActiveMode(event.target.value)
                            }
                            sx={{ minWidth: 220 }}
                          >
                            {modeOptions.map((option) => (
                              <MenuItem key={option.key} value={option.key}>
                                {option.label} ({option.count})
                              </MenuItem>
                            ))}
                          </TextField>
                          <Button
                            variant="outlined"
                            startIcon={<DataObjectRounded />}
                            onClick={() => handlePageChange("payload")}
                          >
                            Open payload lab
                          </Button>
                        </Stack>
                      ) : undefined
                    }
                  >
                    {data ? (
                      <Stack spacing={1.6}>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Chip
                            icon={<FilterAltRounded />}
                            label={`${filteredInsights.length} visible rows`}
                            variant="outlined"
                          />
                          <Chip
                            icon={<QueryStatsRounded />}
                            label={`${data.meta.matchCountLoaded}/${data.query.matchCount} details loaded`}
                            variant="outlined"
                          />
                          <Chip
                            icon={<TimelineRounded />}
                            label={`${data.meta.timelineCountLoaded} timeline payloads`}
                            variant="outlined"
                          />
                        </Stack>

                        {matchIdsError ? (
                          <Alert severity="warning">
                            {formatError(matchIdsError)}
                          </Alert>
                        ) : null}
                        {matchDetailErrors.length ? (
                          <Alert severity="warning">
                            {matchDetailErrors.length} match detail request(s)
                            failed. The ledger shows the successful rows; the
                            payload lab keeps the full request coverage.
                          </Alert>
                        ) : null}
                        {timelineErrors.length ? (
                          <Alert severity="warning">
                            {timelineErrors.length} timeline request(s) failed.
                            This is common when Riot rate limits deeper history
                            pulls.
                          </Alert>
                        ) : null}

                        {filteredInsights.length ? (
                          <Stack
                            divider={
                              <Divider
                                flexItem
                                sx={{ borderColor: alpha("#5d6775", 0.14) }}
                              />
                            }
                          >
                            {filteredInsights.map((entry) => {
                              const participant = entry.participant;
                              const resultColor = participant?.win
                                ? "success.main"
                                : "error.main";
                              const cs =
                                (participant?.totalMinionsKilled ?? 0) +
                                (participant?.neutralMinionsKilled ?? 0);

                              return (
                                <Box
                                  key={entry.match.id}
                                  sx={{
                                    py: 1.5,
                                    display: "grid",
                                    gap: 1.4,
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      xl: "minmax(200px, 1fr) minmax(120px, 0.6fr) minmax(100px, 0.55fr) minmax(120px, 0.7fr) minmax(110px, 0.65fr) minmax(110px, 0.65fr) minmax(130px, 0.8fr)",
                                    },
                                    alignItems: "start",
                                  }}
                                >
                                  <Box>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      alignItems="center"
                                      flexWrap="wrap"
                                      useFlexGap
                                    >
                                      <Typography variant="h3">
                                        {entry.modeLabel}
                                      </Typography>
                                      <Chip
                                        label={
                                          entry.match.data.info?.queueId
                                            ? `Queue ${entry.match.data.info.queueId}`
                                            : entry.modeNote
                                        }
                                        size="small"
                                        variant="outlined"
                                      />
                                    </Stack>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mt: 0.35 }}
                                    >
                                      {entry.match.data.info?.gameCreation
                                        ? new Date(
                                            entry.match.data.info.gameCreation,
                                          ).toLocaleString()
                                        : "Unknown start"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Champion
                                    </Typography>
                                    <Typography variant="subtitle2">
                                      {participant?.championName ?? "Unknown"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Duration
                                    </Typography>
                                    <Typography variant="subtitle2">
                                      {formatDuration(
                                        entry.match.data.info?.gameDuration,
                                      )}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      K / D / A
                                    </Typography>
                                    <Typography variant="subtitle2">
                                      {participant
                                        ? `${participant.kills}/${participant.deaths}/${participant.assists}`
                                        : "Unavailable"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Damage
                                    </Typography>
                                    <Typography variant="subtitle2">
                                      {formatCompactNumber(
                                        participant?.totalDamageDealtToChampions,
                                      )}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Gold / CS
                                    </Typography>
                                    <Typography variant="subtitle2">
                                      {formatCompactNumber(
                                        participant?.goldEarned,
                                      )}{" "}
                                      / {cs || "--"}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Result
                                    </Typography>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        color: participant
                                          ? resultColor
                                          : "text.primary",
                                      }}
                                    >
                                      {participant
                                        ? participant.win
                                          ? "Victory"
                                          : "Defeat"
                                        : "Unmatched"}
                                    </Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Alert severity="info" variant="outlined">
                            No matches for the current mode filter. Try
                            switching back to all loaded modes.
                          </Alert>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        The match workbench will appear here after a lookup.
                      </Typography>
                    )}
                  </SectionBand>
                </Box>

                <Box
                  sx={{
                    borderLeft: { lg: `1px solid ${ruleColor}` },
                    pl: { lg: 3 },
                  }}
                >
                  <SectionBand
                    title="Request coverage"
                    subtitle="This side rail tracks how much of the Riot surface actually landed in the response, without dumping JSON into the main desk."
                  >
                    {data ? (
                      <Stack>
                        {data.meta.apiCalls.map((call) => (
                          <EndpointLine
                            key={call.key}
                            call={call}
                            active={call.key === activeRawSection}
                            onClick={() => {
                              setActiveRawSection(call.key);
                              handlePageChange("payload");
                            }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Endpoint coverage will populate here after the first
                        successful search.
                      </Typography>
                    )}
                  </SectionBand>

                  <SectionBand
                    title="Field notes"
                    subtitle="A few higher-signal notes about what the loaded data is actually telling you."
                  >
                    {data ? (
                      <Stack spacing={1.4}>
                        <Box>
                          <Typography variant="subtitle2">
                            Summoner level
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCompactNumber(
                              data.summary.summoner?.summonerLevel,
                            )}
                            . This comes from the platform-scoped summoner
                            endpoint, not the account endpoint.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">
                            History depth
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Requested {data.query.matchCount} recent matches and
                            resolved {data.meta.matchCountLoaded} full match
                            details. That is the deepest slice currently kept on
                            the desk.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">
                            ARAM vs ARAM Mayhem
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Riot positions ARAM Mayhem as a separate
                            limited-time queue with Augments rather than
                            standard ARAM. Queue metadata for new modes can lag
                            in developer docs, so this app groups by returned
                            queue ID first and only falls back to generic
                            gameMode labels.
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2">
                            Partial failures
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {data.errors.length
                              ? `${data.errors.length} endpoint issue(s) are still attached to this profile pull. They remain inspectable in the payload lab instead of being hidden.`
                              : "No endpoint failures were recorded in this pull."}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Field notes appear after a successful lookup.
                      </Typography>
                    )}
                  </SectionBand>

                  {data?.errors.length ? (
                    <SectionBand
                      title="Partial failures"
                      subtitle="Backend trouble stays visible. Nothing here is silently swallowed."
                    >
                      <Stack spacing={1}>
                        {data.errors.map((entry) => (
                          <Alert
                            key={`${entry.endpoint}-${entry.status}`}
                            severity="warning"
                            icon={<WarningAmberRounded fontSize="inherit" />}
                          >
                            {formatError(entry)}
                          </Alert>
                        ))}
                      </Stack>
                    </SectionBand>
                  ) : null}
                </Box>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={0}>
              <SectionBand
                title="Payload lab"
                subtitle="Every endpoint gets its own lane. This is where the raw Riot payload belongs, along with request coverage and the bigger endpoint story."
                action={
                  data ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        icon={<AutoAwesomeRounded />}
                        label={`${data.meta.apiCalls.length} endpoint groups`}
                        variant="outlined"
                      />
                      <Chip
                        icon={<DataObjectRounded />}
                        label={activeCall?.label ?? "Raw payload"}
                        variant="outlined"
                      />
                    </Stack>
                  ) : undefined
                }
              >
                {data ? (
                  <Box
                    sx={{
                      display: "grid",
                      gap: { xs: 3, lg: 4 },
                      gridTemplateColumns: {
                        xs: "1fr",
                        lg: "minmax(280px, 0.8fr) minmax(0, 1.4fr)",
                      },
                    }}
                  >
                    <Box>
                      <Stack spacing={0}>
                        {data.meta.apiCalls.map((call) => (
                          <EndpointLine
                            key={call.key}
                            call={call}
                            active={call.key === activeRawSection}
                            onClick={() => setActiveRawSection(call.key)}
                          />
                        ))}
                      </Stack>
                    </Box>

                    <Stack spacing={2.1}>
                      <Box
                        sx={{ borderBottom: `1px solid ${ruleColor}`, pb: 1.6 }}
                      >
                        <Typography variant="h2">
                          {activeCall?.label ?? "Raw payload"}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.55 }}
                        >
                          {activeCall
                            ? `${activeCall.endpoint} Â· HTTP ${activeCall.status} Â· ${activeCall.returned ?? 0} payload item(s) returned`
                            : "Select an endpoint lane to inspect the exact JSON returned by the backend."}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 2,
                          gridTemplateColumns: {
                            xs: "repeat(2, minmax(0, 1fr))",
                            md: "repeat(4, minmax(0, 1fr))",
                          },
                        }}
                      >
                        <StatColumn
                          label="Requested matches"
                          value={data.meta.matchCountRequested.toString()}
                          note="History depth asked of match-v5"
                        />
                        <StatColumn
                          label="Loaded details"
                          value={data.meta.matchCountLoaded.toString()}
                          note="Successful full match payloads"
                        />
                        <StatColumn
                          label="Timelines"
                          value={data.meta.timelineCountLoaded.toString()}
                          note="Timeline sample payloads returned"
                        />
                        <StatColumn
                          label="Failures"
                          value={data.errors.length.toString()}
                          note="Across all endpoint groups in this pull"
                        />
                      </Box>

                      <Box
                        sx={{
                          minHeight: 540,
                          border: `1px solid ${alpha("#5d6775", 0.16)}`,
                          backgroundColor: alpha("#ffffff", 0.46),
                          px: 2,
                          py: 1.8,
                          overflow: "auto",
                        }}
                      >
                        <Typography
                          component="pre"
                          sx={{
                            m: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: "text.primary",
                            fontFamily:
                              '"Cascadia Code", "Consolas", monospace',
                          }}
                        >
                          {JSON.stringify(rawPayload, null, 2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Run a lookup first. The payload lab now tracks account,
                    summoner, ranked, mastery, challenges, platform status,
                    match IDs, match details, and timeline samples on separate
                    endpoint lanes.
                  </Alert>
                )}
              </SectionBand>
            </Stack>
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
