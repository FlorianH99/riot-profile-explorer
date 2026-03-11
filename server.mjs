import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");
const requestTimeoutMs = 8000;

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
  const parsed = Number.parseInt(value ?? "5", 10);
  if (!Number.isFinite(parsed)) {
    return 5;
  }

  return Math.min(Math.max(parsed, 1), 10);
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

function summarizeSection(result) {
  return result.ok ? result.data : null;
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
      "account-v1",
      `${regional}.api.riotgames.com`,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    if (!account.ok || !account.data?.puuid) {
      sendJson(response, account.status, {
        message: describeAccountLookupFailure(account),
        errors: [normalizeFailure("account-v1", account)],
        raw: { account: account.data },
      });
      return;
    }

    const puuid = account.data.puuid;

    const [summoner, ranked, mastery, matchIds] = await Promise.all([
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
        "champion-mastery-v4",
        `${platform}.api.riotgames.com`,
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top`,
        { count: 5 }
      ),
      riotFetch(
        "match-v5 ids",
        `${regional}.api.riotgames.com`,
        `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`,
        { start: 0, count: matchCount }
      ),
    ]);

    const matchDetails =
      Array.isArray(matchIds.data) && matchIds.ok
        ? await Promise.all(
            matchIds.data.map((matchId, index) =>
              riotFetch(
                `match-v5 detail ${index + 1}`,
                `${regional}.api.riotgames.com`,
                `/lol/match/v5/matches/${encodeURIComponent(matchId)}`
              )
            )
          )
        : [];

    const errors = [
      account,
      summoner,
      ranked,
      mastery,
      matchIds,
      ...matchDetails,
    ]
      .filter((entry) => !entry.ok)
      .map((entry) => normalizeFailure(entry.endpoint, entry));

    const blockingFailure = [summoner, ranked, mastery, matchIds].some(
      (entry) =>
        !entry.ok && [401, 403, 429, 500, 502, 503, 504].includes(entry.status)
    );

    const payload = {
      query: {
        gameName,
        tagLine,
        platform,
        regional,
      },
      summary: {
        account: {
          gameName: account.data.gameName,
          tagLine: account.data.tagLine,
          puuid,
        },
        summoner: summarizeSection(summoner),
        ranked: summarizeSection(ranked),
        masteryTop: summarizeSection(mastery),
        matchIds: summarizeSection(matchIds),
      },
      raw: {
        account: account.data,
        summoner: summoner.data,
        ranked: ranked.data,
        masteryTop: mastery.data,
        matchIds: matchIds.data,
        matches: matchDetails.map((entry, index) => ({
          id: Array.isArray(matchIds.data)
            ? matchIds.data[index]
            : `match-${index}`,
          status: entry.status,
          ok: entry.ok,
          endpoint: entry.endpoint,
          data: entry.data,
        })),
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
