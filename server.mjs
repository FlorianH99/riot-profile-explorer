import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");
const requestTimeoutMs = 8000;
const maxMatchCount = 80;
const timelineSampleCount = 8;
const batchConcurrency = 10;
const ddragonLocale = "en_US";
const ddragonVersionsUrl =
  "https://ddragon.leagueoflegends.com/api/versions.json";

let championCatalogPromise = null;

try {
  const envSource = await readFile(envPath, "utf8");
  for (const line of envSource.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // Local env file is optional during scaffolding.
}

const port = Number.parseInt(process.env.PORT ?? "5050", 10);
const riotApiKey = process.env.RIOT_API_KEY ?? "";

const platformToRegional = {
  br1: "americas",
  eun1: "europe",
  euw1: "europe",
  jp1: "asia",
  kr: "asia",
  la1: "americas",
  la2: "americas",
  me1: "europe",
  na1: "americas",
  oc1: "sea",
  ph2: "sea",
  ru: "europe",
  sg2: "sea",
  th2: "sea",
  tr1: "europe",
  tw2: "sea",
  vn2: "sea",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function normalizeFailure(endpoint, result) {
  return {
    endpoint,
    status: result.status,
    detail: result.data,
  };
}

function clampMatchCount(value) {
  const parsed = Number.parseInt(value ?? String(maxMatchCount), 10);
  if (!Number.isFinite(parsed)) {
    return maxMatchCount;
  }

  return Math.min(Math.max(parsed, 1), maxMatchCount);
}

function summarizeSection(result) {
  return result.ok ? result.data : null;
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeChallenges(result) {
  if (!result.ok || typeof result.data !== "object" || result.data === null) {
    return null;
  }

  const totalPoints =
    "totalPoints" in result.data && typeof result.data.totalPoints === "object"
      ? result.data.totalPoints
      : null;

  if (!totalPoints || totalPoints === null) {
    return null;
  }

  return {
    level: numberOrNull(totalPoints.level),
    current: numberOrNull(totalPoints.current),
    percentile: numberOrNull(totalPoints.percentile),
  };
}

function summarizeStatus(result) {
  if (!result.ok || typeof result.data !== "object" || result.data === null) {
    return null;
  }

  return {
    name: typeof result.data.name === "string" ? result.data.name : null,
    maintenances: Array.isArray(result.data.maintenances)
      ? result.data.maintenances.length
      : 0,
    incidents: Array.isArray(result.data.incidents)
      ? result.data.incidents.length
      : 0,
  };
}

function describeAccountLookupFailure(result) {
  const detailMessage =
    typeof result.data === "object" &&
    result.data !== null &&
    "message" in result.data
      ? String(result.data.message)
      : null;

  if (result.status === 401 || result.status === 403) {
    return "Riot API key was rejected while resolving this Riot ID. Development keys expire every 24 hours, so refresh the key in .env and restart the server.";
  }

  if (result.status === 404) {
    return "No Riot account matched that game name and tag line. Check spelling, capitalization, and tag line exactly as shown in the Riot client.";
  }

  if (result.status === 429) {
    return "Riot API rate limits were hit while resolving this Riot ID. Wait a moment and try again.";
  }

  if (detailMessage) {
    return `Unable to resolve Riot ID: ${detailMessage}`;
  }

  return `Unable to resolve Riot ID (HTTP ${result.status}).`;
}

async function riotFetch(endpoint, host, pathname, searchParams = undefined) {
  if (!riotApiKey) {
    return {
      ok: false,
      endpoint,
      status: 500,
      data: {
        message:
          "Missing RIOT_API_KEY. Add it to a local .env file before starting the server.",
      },
    };
  }

  const url = new URL(`https://${host}${pathname}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        "X-Riot-Token": riotApiKey,
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      endpoint,
      status: response.status,
      data,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      endpoint,
      status: 504,
      data: {
        message: isAbort
          ? `Request timed out after ${requestTimeoutMs}ms.`
          : "Network request failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicJson(endpoint, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      endpoint,
      status: response.status,
      data,
    };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      endpoint,
      status: 504,
      data: {
        message: isAbort
          ? `Request timed out after ${requestTimeoutMs}ms.`
          : "Network request failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchChampionCatalog() {
  if (!championCatalogPromise) {
    championCatalogPromise = (async () => {
      const versions = await fetchPublicJson(
        "ddragon versions",
        ddragonVersionsUrl
      );
      if (
        !versions.ok ||
        !Array.isArray(versions.data) ||
        !versions.data.length
      ) {
        throw new Error("Unable to load Riot Data Dragon versions.");
      }

      const version = String(versions.data[0]);
      const catalog = await fetchPublicJson(
        "ddragon champions",
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/${ddragonLocale}/champion.json`
      );

      if (
        !catalog.ok ||
        typeof catalog.data !== "object" ||
        catalog.data === null ||
        !("data" in catalog.data)
      ) {
        throw new Error("Unable to load Riot champion catalog.");
      }

      const championEntries = Object.values(catalog.data.data)
        .filter((entry) => typeof entry === "object" && entry !== null)
        .map((entry) => ({
          id: Number.parseInt(String(entry.key ?? ""), 10),
          key: String(entry.key ?? ""),
          slug: String(entry.id ?? ""),
          name: String(entry.name ?? ""),
        }))
        .filter((entry) => Number.isFinite(entry.id) && entry.name);

      return {
        version,
        locale: ddragonLocale,
        champions: championEntries,
      };
    })().catch((error) => {
      championCatalogPromise = null;
      throw error;
    });
  }

  return championCatalogPromise;
}
async function mapWithConcurrency(
  items,
  mapper,
  concurrency = batchConcurrency
) {
  const results = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const slice = items.slice(index, index + concurrency);
    const batch = await Promise.all(
      slice.map((item, offset) => mapper(item, index + offset))
    );
    results.push(...batch);
  }

  return results;
}

function buildApiCallSummary(key, label, endpoint, results, metadata = {}) {
  const collection = Array.isArray(results) ? results : [results];
  const failures = collection.filter((entry) => !entry.ok).length;
  const returned = collection.filter((entry) => entry.ok).length;
  const status =
    collection.length === 0
      ? 204
      : failures === 0
        ? collection[0].status
        : returned > 0
          ? 207
          : collection[0].status;

  return {
    key,
    label,
    endpoint,
    ok: failures === 0,
    status,
    returned,
    failures,
    ...metadata,
  };
}

async function handleProfileLookup(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const gameName = url.searchParams.get("gameName")?.trim();
  const tagLine = url.searchParams.get("tagLine")?.trim();
  const platform = url.searchParams.get("platform")?.trim().toLowerCase();
  const matchCount = clampMatchCount(url.searchParams.get("matchCount"));

  if (!gameName || !tagLine || !platform) {
    sendJson(response, 400, {
      message: "gameName, tagLine, and platform are required.",
    });
    return;
  }

  const regional = platformToRegional[platform];

  if (!regional) {
    sendJson(response, 400, {
      message: `Unsupported platform routing value: ${platform}`,
    });
    return;
  }

  try {
    const account = await riotFetch(
      "account-v1 riot-id",
      `${regional}.api.riotgames.com`,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    if (!account.ok || !account.data?.puuid) {
      sendJson(response, account.status, {
        message: describeAccountLookupFailure(account),
        errors: [normalizeFailure(account.endpoint, account)],
        raw: { account: account.data },
      });
      return;
    }

    const puuid = account.data.puuid;

    const [
      accountByPuuid,
      summoner,
      ranked,
      masteryTop,
      masteryScore,
      challenges,
      status,
      matchIds,
    ] = await Promise.all([
      riotFetch(
        "account-v1 puuid",
        `${regional}.api.riotgames.com`,
        `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`
      ),
      riotFetch(
        "summoner-v4",
        `${platform}.api.riotgames.com`,
        `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`
      ),
      riotFetch(
        "league-v4",
        `${platform}.api.riotgames.com`,
        `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`
      ),
      riotFetch(
        "champion-mastery-v4 top",
        `${platform}.api.riotgames.com`,
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top`,
        { count: 10 }
      ),
      riotFetch(
        "champion-mastery-v4 score",
        `${platform}.api.riotgames.com`,
        `/lol/champion-mastery/v4/scores/by-puuid/${encodeURIComponent(puuid)}`
      ),
      riotFetch(
        "challenges-v1",
        `${platform}.api.riotgames.com`,
        `/lol/challenges/v1/player-data/${encodeURIComponent(puuid)}`
      ),
      riotFetch(
        "status-v4",
        `${platform}.api.riotgames.com`,
        "/lol/status/v4/platform-data"
      ),
      riotFetch(
        "match-v5 ids",
        `${regional}.api.riotgames.com`,
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
        { start: 0, count: matchCount }
      ),
    ]);

    const matchIdList =
      Array.isArray(matchIds.data) && matchIds.ok ? matchIds.data : [];

    const matchDetails = await mapWithConcurrency(
      matchIdList,
      (matchId, index) =>
        riotFetch(
          `match-v5 detail ${index + 1}`,
          `${regional}.api.riotgames.com`,
          `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
        )
    );

    const timelineIds = matchIdList.slice(
      0,
      Math.min(matchIdList.length, timelineSampleCount)
    );
    const timelines = await mapWithConcurrency(timelineIds, (matchId, index) =>
      riotFetch(
        `match-v5 timeline ${index + 1}`,
        `${regional}.api.riotgames.com`,
        `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`
      )
    );

    const coreResults = [
      account,
      accountByPuuid,
      summoner,
      ranked,
      masteryTop,
      masteryScore,
      challenges,
      status,
      matchIds,
    ];

    const errors = [...coreResults, ...matchDetails, ...timelines]
      .filter((entry) => !entry.ok)
      .map((entry) => normalizeFailure(entry.endpoint, entry));

    const blockingFailure = coreResults.some(
      (entry) =>
        !entry.ok && [401, 403, 429, 500, 502, 503, 504].includes(entry.status)
    );

    const payload = {
      query: {
        gameName,
        tagLine,
        platform,
        regional,
        matchCount,
      },
      summary: {
        account: {
          gameName: account.data.gameName,
          tagLine: account.data.tagLine,
          puuid,
        },
        summoner: summarizeSection(summoner),
        ranked: summarizeSection(ranked),
        masteryTop: summarizeSection(masteryTop),
        masteryScore:
          masteryScore.ok && typeof masteryScore.data === "number"
            ? masteryScore.data
            : null,
        challenges: summarizeChallenges(challenges),
        status: summarizeStatus(status),
        matchIds: summarizeSection(matchIds),
      },
      raw: {
        account: account.data,
        accountByPuuid: accountByPuuid.data,
        summoner: summoner.data,
        ranked: ranked.data,
        masteryTop: masteryTop.data,
        masteryScore: masteryScore.data,
        challenges: challenges.data,
        status: status.data,
        matchIds: matchIds.data,
        matches: matchDetails.map((entry, index) => ({
          id: matchIdList[index] ?? `match-${index}`,
          status: entry.status,
          ok: entry.ok,
          endpoint: entry.endpoint,
          data: entry.data,
        })),
        timelines: timelines.map((entry, index) => ({
          id: timelineIds[index] ?? `timeline-${index}`,
          status: entry.status,
          ok: entry.ok,
          endpoint: entry.endpoint,
          data: entry.data,
        })),
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        matchCountRequested: matchCount,
        matchCountLoaded: matchDetails.filter((entry) => entry.ok).length,
        timelineCountLoaded: timelines.filter((entry) => entry.ok).length,
        apiCalls: [
          buildApiCallSummary(
            "account",
            "Account by Riot ID",
            account.endpoint,
            account
          ),
          buildApiCallSummary(
            "accountByPuuid",
            "Account by PUUID",
            accountByPuuid.endpoint,
            accountByPuuid
          ),
          buildApiCallSummary(
            "summoner",
            "Summoner profile",
            summoner.endpoint,
            summoner
          ),
          buildApiCallSummary(
            "ranked",
            "Ranked entries",
            ranked.endpoint,
            ranked
          ),
          buildApiCallSummary(
            "masteryTop",
            "Top champion mastery",
            masteryTop.endpoint,
            masteryTop
          ),
          buildApiCallSummary(
            "masteryScore",
            "Mastery score",
            masteryScore.endpoint,
            masteryScore
          ),
          buildApiCallSummary(
            "challenges",
            "Challenges profile",
            challenges.endpoint,
            challenges
          ),
          buildApiCallSummary(
            "status",
            "Platform status",
            status.endpoint,
            status
          ),
          buildApiCallSummary(
            "matchIds",
            "Match ID list",
            matchIds.endpoint,
            matchIds,
            {
              requested: matchCount,
              returned: matchIdList.length,
            }
          ),
          buildApiCallSummary(
            "matches",
            "Match details",
            "match-v5 detail",
            matchDetails,
            {
              requested: matchIdList.length,
            }
          ),
          buildApiCallSummary(
            "timelines",
            "Match timelines",
            "match-v5 timeline",
            timelines,
            {
              requested: timelineIds.length,
            }
          ),
        ],
      },
      errors,
    };

    sendJson(response, blockingFailure ? 502 : 200, payload);
  } catch (error) {
    sendJson(response, 500, {
      message: "Unexpected proxy error while contacting Riot APIs.",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function serveStaticAsset(response, pathname) {
  const root = path.resolve(__dirname, "dist");
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    return false;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("Not a file");
    }

    const extension = path.extname(filePath);
    const typeMap = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".map": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    };

    response.writeHead(200, {
      "Content-Type": typeMap[extension] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { message: "Missing request URL." });
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/champions")) {
    try {
      const catalog = await fetchChampionCatalog();
      sendJson(response, 200, catalog);
    } catch (error) {
      sendJson(response, 502, {
        message: "Unable to load Riot champion catalog.",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/profile")) {
    await handleProfileLookup(request, response);
    return;
  }

  if (request.method === "GET") {
    const served = await serveStaticAsset(
      response,
      new URL(request.url, `http://${request.headers.host}`).pathname
    );
    if (served) {
      return;
    }

    const indexPath = path.join(__dirname, "dist", "index.html");
    try {
      const html = await readFile(indexPath, "utf8");
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    } catch {
      sendJson(response, 404, {
        message:
          "Static build not found. Use `npm run dev` for development or `npm run build` before `npm start`.",
      });
      return;
    }
  }

  sendJson(response, 405, { message: "Method not allowed." });
}).listen(port, () => {
  console.log(`Riot profile proxy listening on http://localhost:${port}`);
});
