import BoltRounded from "@mui/icons-material/BoltRounded";
import DataObjectRounded from "@mui/icons-material/DataObjectRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import PublicRounded from "@mui/icons-material/PublicRounded";
import QueryStatsRounded from "@mui/icons-material/QueryStatsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import {
  Alert,
  Avatar,
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
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  type FormEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import type {
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

const searchSchema = z.object({
  gameName: z.string().trim().min(1, "Enter a Riot game name."),
  tagLine: z.string().trim().min(1, "Enter a Riot tag line."),
  platform: z.enum(platformValues),
});

const rawSections = [
  { key: "account", label: "Account" },
  { key: "summoner", label: "Summoner" },
  { key: "ranked", label: "Ranked" },
  { key: "masteryTop", label: "Mastery" },
  { key: "matchIds", label: "Match IDs" },
  { key: "matches", label: "Matches" },
] as const satisfies ReadonlyArray<{
  key: keyof RiotProfileResponse["raw"];
  label: string;
}>;

const defaultForm: SearchFormState = {
  gameName: "",
  tagLine: "",
  platform: "na1",
};

const storageKey = "riot-profile-explorer:last-search";

const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#5f7890" },
    secondary: { main: "#8a9bb0" },
    background: {
      default: "#f6f1e8",
      paper: "#fffaf2",
    },
    error: { main: "#a96f78" },
    warning: { main: "#8f936b" },
    success: { main: "#6f8d7d" },
    text: {
      primary: "#1f2430",
      secondary: "#5f6775",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
    h1: {
      fontSize: "clamp(2rem, 4vw, 3.4rem)",
      lineHeight: 0.93,
      letterSpacing: "-0.05em",
      fontWeight: 700,
    },
    h2: {
      fontSize: "1.2rem",
      lineHeight: 1,
      letterSpacing: "-0.03em",
      fontWeight: 700,
    },
    h3: {
      fontSize: "0.98rem",
      fontWeight: 700,
    },
    overline: {
      letterSpacing: "0.18em",
      fontWeight: 700,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          backgroundColor: "#f6f1e8",
          backgroundImage: [
            "radial-gradient(circle at 14% 0%, rgba(95, 120, 144, 0.10), transparent 22%)",
            "radial-gradient(circle at 100% 0%, rgba(138, 155, 176, 0.10), transparent 24%)",
            "linear-gradient(180deg, #fbf6ee 0%, #f6f1e8 42%, #efe7db 100%)",
          ].join(", "),
        },
        "*": {
          boxSizing: "border-box",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        variant: "contained",
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "14px",
          fontWeight: 700,
          paddingInline: 18,
          paddingBlock: 11,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "14px",
          maxWidth: "100%",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 40,
          minWidth: 0,
          borderRadius: "14px",
          fontWeight: 600,
        },
      },
    },
  },
});

const sectionShellSx = {
  position: "relative",
  overflow: "hidden",
  border: "1px solid rgba(95, 103, 117, 0.16)",
  borderRadius: { xs: "16px", md: "20px" },
  backgroundColor: "rgba(255, 250, 242, 0.92)",
  px: { xs: 2, md: 3 },
  py: { xs: 2, md: 2.5 },
  "&::before": {
    content: '""',
    position: "absolute",
    insetInline: 0,
    insetBlockStart: 0,
    height: 1,
    background:
      "linear-gradient(90deg, rgba(95, 120, 144, 0.28), rgba(138, 155, 176, 0.12), transparent)",
  },
} as const;

async function fetchProfile(form: SearchFormState, signal: AbortSignal) {
  const params = new URLSearchParams({
    gameName: form.gameName,
    tagLine: form.tagLine,
    platform: form.platform,
    matchCount: "5",
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
  return `${minutes}m ${remainder}s`;
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

function findParticipant(
  match: RiotProfileResponse["raw"]["matches"][number],
  account: RiotProfileResponse["summary"]["account"]
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

type SignalItemProps = {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: "primary" | "secondary" | "warning";
};

function SignalItem({
  icon,
  label,
  value,
  note,
  tone = "primary",
}: SignalItemProps) {
  const toneColor =
    tone === "secondary"
      ? "#8a9bb0"
      : tone === "warning"
        ? "#8f936b"
        : "#5f7890";

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{ minWidth: { xs: "100%", sm: 0 } }}
    >
      <Box
        sx={{
          display: "grid",
          placeItems: "center",
          width: 34,
          height: 34,
          borderRadius: "10px",
          color: toneColor,
          backgroundColor: alpha(toneColor, 0.12),
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", letterSpacing: "0.12em" }}
        >
          {label}
        </Typography>
        <Typography variant="subtitle2">{value}</Typography>
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      </Box>
    </Stack>
  );
}

type SectionFrameProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
};

function SectionFrame({
  title,
  subtitle,
  action,
  children,
}: SectionFrameProps) {
  return (
    <Paper sx={sectionShellSx}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Box>
            <Typography variant="h2">{title}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, maxWidth: 720 }}
            >
              {subtitle}
            </Typography>
          </Box>
          {action}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}

type RawPanelProps = {
  value: (typeof rawSections)[number]["key"];
  activeValue: (typeof rawSections)[number]["key"];
  children: ReactNode;
};

function RawPanel({ value, activeValue, children }: RawPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== activeValue}
      id={`raw-panel-${value}`}
      aria-labelledby={`raw-tab-${value}`}
      sx={{ pt: 2 }}
    >
      {value === activeValue ? children : null}
    </Box>
  );
}

export function App() {
  const [form, setForm] = useState<SearchFormState>(defaultForm);
  const [activeRawSection, setActiveRawSection] =
    useState<(typeof rawSections)[number]["key"]>("account");
  const [data, setData] = useState<RiotProfileResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    try {
      const parsed = searchSchema.partial().parse(JSON.parse(saved));
      setForm((current) => ({
        ...current,
        ...parsed,
      }));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const selectedPlatform = useMemo(
    () =>
      platformOptions.find((option) => option.value === form.platform) ??
      platformOptions[0],
    [form.platform]
  );

  const rankedError =
    data?.errors.find((entry) => entry.endpoint === "league-v4") ?? null;
  const masteryError =
    data?.errors.find((entry) => entry.endpoint === "champion-mastery-v4") ??
    null;
  const summonerError =
    data?.errors.find((entry) => entry.endpoint === "summoner-v4") ?? null;
  const matchError =
    data?.errors.find((entry) => entry.endpoint === "match-v5 ids") ?? null;
  const matchDetailErrors =
    data?.errors.filter((entry) =>
      entry.endpoint.startsWith("match-v5 detail")
    ) ?? [];
  const successfulMatches = data?.raw.matches.filter((match) => match.ok) ?? [];
  const profileHealthLabel = data
    ? data.errors.length > 0
      ? `${data.errors.length} warning${data.errors.length === 1 ? "" : "s"}`
      : "All clear"
    : "Ready";
  const rawPayload = data
    ? data.raw[activeRawSection]
    : {
        message:
          "Run a search to inspect the raw payload returned by each backend segment.",
      };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = searchSchema.safeParse(form);
    if (!parsed.success) {
      setData(null);
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid search.");
      setStatus("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setForm(parsed.data);
    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetchProfile(parsed.data, controller.signal);
      setData(response);
      setStatus("idle");
      setActiveRawSection("account");
      window.localStorage.setItem(storageKey, JSON.stringify(parsed.data));
      setErrorMessage(
        response.errors.length > 0
          ? "Some Riot endpoints failed. Review the warnings below."
          : null
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setData(null);
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown request failure."
      );
    }
  }

  function handleRawSectionChange(
    _event: SyntheticEvent,
    value: (typeof rawSections)[number]["key"]
  ) {
    setActiveRawSection(value);
  }

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 } }}>
        <Stack spacing={3}>
          <Box
            sx={{
              display: "grid",
              gap: 3,
              alignItems: "start",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.25fr) minmax(320px, 0.7fr)",
              },
              pb: 2.5,
              borderBottom: "1px solid rgba(95, 103, 117, 0.14)",
            }}
          >
            <Box sx={{ maxWidth: 760 }}>
              <Typography variant="overline" color="primary.main">
                Riot Profile Explorer
              </Typography>
              <Typography variant="h1" sx={{ mt: 1 }}>
                Search live profiles and inspect the raw response without the
                usual dashboard sludge.
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mt: 1.5, maxWidth: 660 }}
              >
                One interface for Riot ID lookup, ranked context, mastery
                slices, recent matches, and the untouched JSON your UI is
                actually consuming.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                flexWrap="wrap"
                useFlexGap
                sx={{ mt: 2.25 }}
              >
                <Chip
                  icon={<SearchRounded />}
                  label="Lookup by Riot ID"
                  color="primary"
                />
                <Chip
                  icon={<QueryStatsRounded />}
                  label="Ranked, mastery, and match samples"
                  variant="outlined"
                />
                <Chip
                  icon={<DataObjectRounded />}
                  label="Tabbed raw inspector"
                  variant="outlined"
                />
              </Stack>
            </Box>

            <Paper
              sx={{
                ...sectionShellSx,
                p: { xs: 2, md: 2.25 },
                alignSelf: { xs: "stretch", lg: "end" },
              }}
            >
              <Stack
                divider={
                  <Divider
                    flexItem
                    sx={{ borderColor: "rgba(95, 103, 117, 0.12)" }}
                  />
                }
                spacing={1.5}
              >
                <SignalItem
                  icon={<PublicRounded fontSize="small" />}
                  label="Route"
                  value={selectedPlatform.label}
                  note={selectedPlatform.value.toUpperCase()}
                />
                <SignalItem
                  icon={<HubRounded fontSize="small" />}
                  label="Cluster"
                  value={selectedPlatform.region}
                  note="Account and match routing"
                  tone="secondary"
                />
                <SignalItem
                  icon={<WarningAmberRounded fontSize="small" />}
                  label="Health"
                  value={profileHealthLabel}
                  note={
                    data
                      ? `${data.errors.length} failed request(s)`
                      : "No request yet"
                  }
                  tone="warning"
                />
              </Stack>
            </Paper>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 3,
              alignItems: "start",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.2fr) minmax(420px, 0.8fr)",
              },
            }}
          >
            <Stack spacing={3}>
              <SectionFrame
                title="Player lookup"
                subtitle="Use the Riot ID pair plus the platform route where the summoner actually plays."
                action={
                  <Chip
                    icon={<BoltRounded />}
                    label={
                      status === "loading" ? "Fetching live data" : "Ready"
                    }
                    color={status === "loading" ? "secondary" : "default"}
                    variant={status === "loading" ? "filled" : "outlined"}
                  />
                }
              >
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 2,
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "minmax(0, 1fr) minmax(0, 1fr) minmax(200px, 0.8fr) auto",
                      },
                    }}
                  >
                    <TextField
                      label="Game name"
                      value={form.gameName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          gameName: event.target.value,
                        }))
                      }
                      placeholder="Doublelift"
                      fullWidth
                    />
                    <TextField
                      label="Tag line"
                      value={form.tagLine}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          tagLine: event.target.value,
                        }))
                      }
                      placeholder="NA1"
                      fullWidth
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
                      fullWidth
                    >
                      {platformOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label} ({option.value})
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      type="submit"
                      disabled={status === "loading"}
                      sx={{ minHeight: 56 }}
                    >
                      {status === "loading"
                        ? "Pulling data..."
                        : "Inspect profile"}
                    </Button>
                  </Box>
                </Box>

                {status === "loading" ? (
                  <LinearProgress sx={{ borderRadius: "6px" }} />
                ) : null}

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.2}
                  flexWrap="wrap"
                  useFlexGap
                >
                  <Chip
                    label={`${selectedPlatform.label} / ${selectedPlatform.region}`}
                    variant="outlined"
                  />
                  <Chip
                    label={
                      data
                        ? `${successfulMatches.length} detailed matches loaded`
                        : "Up to 5 recent matches per lookup"
                    }
                    variant="outlined"
                  />
                  <Chip
                    label="RIOT_API_KEY stays on the server"
                    variant="outlined"
                  />
                </Stack>

                {errorMessage ? (
                  <Alert severity={status === "error" ? "error" : "warning"}>
                    {errorMessage}
                  </Alert>
                ) : null}
              </SectionFrame>

              <SectionFrame
                title="Structured profile view"
                subtitle="Readable first, but still honest about partial failures and missing backend segments."
                action={
                  data ? (
                    <Chip
                      label={`${data.query.platform.toUpperCase()} -> ${data.query.regional.toUpperCase()}`}
                      variant="outlined"
                    />
                  ) : undefined
                }
              >
                {status === "loading" && data ? (
                  <Alert severity="info" variant="outlined">
                    Refreshing results for{" "}
                    {form.gameName || "your current search"}.
                  </Alert>
                ) : null}

                {data ? (
                  <Stack
                    spacing={2.5}
                    divider={
                      <Divider
                        flexItem
                        sx={{ borderColor: "rgba(95, 103, 117, 0.12)" }}
                      />
                    }
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gap: 2,
                        alignItems: "start",
                        gridTemplateColumns: {
                          xs: "1fr",
                          lg: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
                        },
                        pb: 0.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.75} alignItems="center">
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            bgcolor: alpha("#5f7890", 0.1),
                            color: "primary.main",
                            fontWeight: 700,
                          }}
                        >
                          {data.summary.account.gameName
                            .slice(0, 2)
                            .toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="baseline"
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Typography
                              variant="h2"
                              sx={{ fontSize: { xs: "1.6rem", md: "2rem" } }}
                            >
                              {data.summary.account.gameName}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                              #{data.summary.account.tagLine}
                            </Typography>
                          </Stack>
                          <Tooltip title={data.summary.account.puuid}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.75 }}
                            >
                              PUUID:{" "}
                              {`${data.summary.account.puuid.slice(0, 24)}...`}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </Stack>

                      <Box
                        sx={{
                          display: "grid",
                          gap: 1.25,
                          gridTemplateColumns: {
                            xs: "1fr 1fr",
                            sm: "repeat(4, minmax(0, 1fr))",
                            lg: "repeat(2, minmax(0, 1fr))",
                          },
                        }}
                      >
                        {[
                          [
                            "Summoner level",
                            String(
                              data.summary.summoner?.summonerLevel ??
                                "Unavailable"
                            ),
                          ],
                          [
                            "Profile icon",
                            String(
                              data.summary.summoner?.profileIconId ??
                                "Unavailable"
                            ),
                          ],
                          ["Platform", data.query.platform.toUpperCase()],
                          ["Cluster", data.query.regional.toUpperCase()],
                        ].map(([label, value]) => (
                          <Box key={label} sx={{ minWidth: 0 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ letterSpacing: "0.12em" }}
                            >
                              {label}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ mt: 0.35 }}>
                              {value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {summonerError ? (
                      <Alert severity="warning">
                        {formatError(summonerError)}
                      </Alert>
                    ) : null}

                    <Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                      >
                        <Box>
                          <Typography variant="h3">Ranked queues</Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.35 }}
                          >
                            Queue rows instead of isolated cards so comparison
                            is fast.
                          </Typography>
                        </Box>
                        <Chip
                          label={`${data.summary.ranked?.length ?? 0} entries`}
                          variant="outlined"
                        />
                      </Stack>
                      {rankedError ? (
                        <Alert severity="warning">
                          {formatError(rankedError)}
                        </Alert>
                      ) : data.summary.ranked?.length ? (
                        <Stack
                          divider={
                            <Divider
                              flexItem
                              sx={{ borderColor: "rgba(95, 103, 117, 0.12)" }}
                            />
                          }
                        >
                          {data.summary.ranked.map((entry) => {
                            const games = entry.wins + entry.losses;
                            const winRate =
                              games > 0
                                ? Math.round((entry.wins / games) * 100)
                                : 0;
                            return (
                              <Box
                                key={entry.leagueId + entry.queueType}
                                sx={{
                                  display: "grid",
                                  gap: 1.5,
                                  alignItems: "center",
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "minmax(200px, 1.1fr) repeat(4, minmax(0, 0.8fr))",
                                  },
                                  py: 1.2,
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
                                    {entry.tier} {entry.rank}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    LP
                                  </Typography>
                                  <Typography variant="subtitle2">
                                    {entry.leaguePoints}
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
                      )}
                    </Box>

                    <Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                      >
                        <Box>
                          <Typography variant="h3">
                            Top mastery slice
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.35 }}
                          >
                            Champion mastery presented as compact tokens rather
                            than another pile of cards.
                          </Typography>
                        </Box>
                        <Chip
                          label={`${data.summary.masteryTop?.length ?? 0} champions`}
                          variant="outlined"
                        />
                      </Stack>
                      {masteryError ? (
                        <Alert severity="warning">
                          {formatError(masteryError)}
                        </Alert>
                      ) : data.summary.masteryTop?.length ? (
                        <Stack
                          direction="row"
                          spacing={1.1}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {data.summary.masteryTop.map((entry) => (
                            <Box
                              key={entry.championId}
                              sx={{
                                minWidth: { xs: "100%", sm: 220 },
                                px: 1.4,
                                py: 1.2,
                                borderRadius: "14px",
                                border: "1px solid rgba(108, 125, 144, 0.18)",
                                backgroundColor: "rgba(108, 125, 144, 0.08)",
                              }}
                            >
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                spacing={1.5}
                                alignItems="center"
                              >
                                <Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ letterSpacing: "0.1em" }}
                                  >
                                    Champion {entry.championId}
                                  </Typography>
                                  <Typography
                                    variant="subtitle2"
                                    sx={{ mt: 0.35 }}
                                  >
                                    {entry.championPoints.toLocaleString()}{" "}
                                    points
                                  </Typography>
                                </Box>
                                <Chip
                                  label={`Lv ${entry.championLevel}`}
                                  size="small"
                                  color="secondary"
                                  variant="outlined"
                                />
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          No mastery payload returned for this player.
                        </Alert>
                      )}
                    </Box>

                    <Box>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                      >
                        <Box>
                          <Typography variant="h3">
                            Recent match sample
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.35 }}
                          >
                            Recent games shown as ledger rows with result
                            emphasis instead of boxed tiles.
                          </Typography>
                        </Box>
                        <Chip
                          label={`${successfulMatches.length} loaded matches`}
                          variant="outlined"
                        />
                      </Stack>

                      <Stack
                        spacing={1.25}
                        sx={{ mb: successfulMatches.length ? 1.25 : 0 }}
                      >
                        {matchError ? (
                          <Alert severity="warning">
                            {formatError(matchError)}
                          </Alert>
                        ) : null}
                        {matchDetailErrors.length ? (
                          <Alert severity="warning">
                            {matchDetailErrors.length} match detail request(s)
                            failed. Check the partial failures panel.
                          </Alert>
                        ) : null}
                      </Stack>

                      {successfulMatches.length ? (
                        <Stack
                          divider={
                            <Divider
                              flexItem
                              sx={{ borderColor: "rgba(95, 103, 117, 0.12)" }}
                            />
                          }
                        >
                          {successfulMatches.map((match) => {
                            const participant = findParticipant(
                              match,
                              data.summary.account
                            );
                            const resultColor = participant?.win
                              ? "#6f8d7d"
                              : "#a96f78";
                            return (
                              <Box
                                key={match.id}
                                sx={{
                                  position: "relative",
                                  py: 1.6,
                                  pl: 2.2,
                                  "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    insetInlineStart: 0,
                                    insetBlockStart: 22,
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor: participant
                                      ? resultColor
                                      : "#8a9bb0",
                                    boxShadow: `0 0 0 6px ${alpha(resultColor, participant ? 0.12 : 0.08)}`,
                                  },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "grid",
                                    gap: 1.5,
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      md: "minmax(240px, 1.2fr) repeat(4, minmax(0, 0.9fr))",
                                    },
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
                                        {match.data.info?.gameMode ??
                                          "Unknown mode"}
                                      </Typography>
                                      <Chip
                                        label={match.id}
                                        size="small"
                                        variant="outlined"
                                      />
                                    </Stack>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mt: 0.45 }}
                                    >
                                      {match.data.info?.gameCreation
                                        ? new Date(
                                            match.data.info.gameCreation
                                          ).toLocaleString()
                                        : "Unknown start"}
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
                                        match.data.info?.gameDuration
                                      )}
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
                              </Box>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Alert severity="info" variant="outlined">
                          No match details were returned.
                        </Alert>
                      )}
                    </Box>

                    {data.errors.length ? (
                      <Alert
                        severity="warning"
                        icon={<WarningAmberRounded fontSize="inherit" />}
                      >
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Partial failures
                        </Typography>
                        <Stack spacing={0.75}>
                          {data.errors.map((entry) => (
                            <Typography
                              key={`${entry.endpoint}-${entry.status}`}
                              variant="body2"
                            >
                              {formatError(entry)}
                            </Typography>
                          ))}
                        </Stack>
                      </Alert>
                    ) : null}
                  </Stack>
                ) : status === "loading" ? (
                  <Alert severity="info" variant="outlined">
                    Loading Riot profile data.
                  </Alert>
                ) : (
                  <Alert severity="info" variant="outlined">
                    Run a search to populate the profile view. The app will
                    retain your last Riot ID locally in the browser.
                  </Alert>
                )}
              </SectionFrame>
            </Stack>

            <SectionFrame
              title="Raw JSON inspector"
              subtitle="The exact backend payload stays visible as a persistent working surface while you search and compare results."
              action={
                <Chip
                  icon={<DataObjectRounded />}
                  label="Live payload"
                  variant="outlined"
                />
              }
            >
              <Box sx={{ position: { xl: "sticky" }, top: { xl: 24 } }}>
                <Tabs
                  value={activeRawSection}
                  onChange={handleRawSectionChange}
                  variant="scrollable"
                  allowScrollButtonsMobile
                  aria-label="Raw response sections"
                  sx={{
                    minHeight: 40,
                    "& .MuiTabs-flexContainer": {
                      gap: 0.75,
                    },
                    "& .MuiTabs-indicator": {
                      height: 2,
                      borderRadius: "999px",
                    },
                  }}
                >
                  {rawSections.map((section) => (
                    <Tab
                      key={section.key}
                      id={`raw-tab-${section.key}`}
                      value={section.key}
                      aria-controls={`raw-panel-${section.key}`}
                      label={section.label}
                    />
                  ))}
                </Tabs>

                {rawSections.map((section) => (
                  <RawPanel
                    key={section.key}
                    value={section.key}
                    activeValue={activeRawSection}
                  >
                    <Paper
                      variant="outlined"
                      sx={{
                        borderRadius: "18px",
                        p: 2,
                        borderColor: "rgba(95, 103, 117, 0.14)",
                        bgcolor: "rgba(247, 241, 231, 0.96)",
                        maxHeight: { xs: 420, xl: "calc(100vh - 120px)" },
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        component="pre"
                        sx={{
                          m: 0,
                          fontSize: 13,
                          lineHeight: 1.65,
                          fontFamily: '"Cascadia Code", "Consolas", monospace',
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          color: "#2a3140",
                        }}
                      >
                        {JSON.stringify(rawPayload, null, 2)}
                      </Typography>
                    </Paper>
                  </RawPanel>
                ))}
              </Box>
            </SectionFrame>
          </Box>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
