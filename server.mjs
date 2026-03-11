import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env");

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
  vn2: "sea"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload));
}

async function riotFetch(host, pathname, searchParams = undefined) {
  if (!riotApiKey) {
    return {
      ok: false,
      status: 500,
      data: {
        message: "Missing RIOT_API_KEY. Add it to a local .env file before starting the server."
      }
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

  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": riotApiKey
    }
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
    status: response.status,
    data
  };
}

async function handleProfileLookup(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const gameName = url.searchParams.get("gameName")?.trim();
  const tagLine = url.searchParams.get("tagLine")?.trim();
  const platform = url.searchParams.get("platform")?.trim().toLowerCase();
  const matchCount = Math.min(Number.parseInt(url.searchParams.get("matchCount") ?? "5", 10) || 5, 10);

  if (!gameName || !tagLine || !platform) {
    sendJson(response, 400, {
      message: "gameName, tagLine, and platform are required."
    });
    return;
  }

  const regional = platformToRegional[platform];

  if (!regional) {
    sendJson(response, 400, {
      message: `Unsupported platform routing value: ${platform}`
    });
    return;
  }

  try {
    const account = await riotFetch(
      `${regional}.api.riotgames.com`,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
    );

    if (!account.ok || !account.data?.puuid) {
      sendJson(response, account.status, {
        message: "Unable to resolve Riot ID.",
        raw: { account: account.data }
      });
      return;
    }

    const puuid = account.data.puuid;

    const [summoner, ranked, mastery, matchIds] = await Promise.all([
      riotFetch(`${platform}.api.riotgames.com`, `/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`),
      riotFetch(`${platform}.api.riotgames.com`, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`),
      riotFetch(
        `${platform}.api.riotgames.com`,
        `/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}/top`,
        { count: 5 }
      ),
      riotFetch(`${regional}.api.riotgames.com`, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`, {
        start: 0,
        count: matchCount
      })
    ]);

    const matchDetails = Array.isArray(matchIds.data) && matchIds.ok
      ? await Promise.all(
          matchIds.data.map((matchId) =>
            riotFetch(`${regional}.api.riotgames.com`, `/lol/match/v5/matches/${encodeURIComponent(matchId)}`)
          )
        )
      : [];

    const payload = {
      query: {
        gameName,
        tagLine,
        platform,
        regional
      },
      summary: {
        account: {
          gameName: account.data.gameName,
          tagLine: account.data.tagLine,
          puuid
        },
        summoner: summoner.ok ? summoner.data : null,
        ranked: ranked.ok ? ranked.data : [],
        masteryTop: mastery.ok ? mastery.data : [],
        matchIds: matchIds.ok ? matchIds.data : []
      },
      raw: {
        account: account.data,
        summoner: summoner.data,
        ranked: ranked.data,
        masteryTop: mastery.data,
        matchIds: matchIds.data,
        matches: matchDetails.map((entry, index) => ({
          id: Array.isArray(matchIds.data) ? matchIds.data[index] : `match-${index}`,
          status: entry.status,
          data: entry.data
        }))
      },
      errors: [
        !summoner.ok
          ? { endpoint: "summoner-v4", status: summoner.status, detail: summoner.data }
          : null,
        !ranked.ok ? { endpoint: "league-v4", status: ranked.status, detail: ranked.data } : null,
        !mastery.ok
          ? { endpoint: "champion-mastery-v4", status: mastery.status, detail: mastery.data }
          : null,
        !matchIds.ok ? { endpoint: "match-v5 ids", status: matchIds.status, detail: matchIds.data } : null,
        ...matchDetails
          .filter((entry) => !entry.ok)
          .map((entry, index) => ({
            endpoint: `match-v5 detail ${index + 1}`,
            status: entry.status,
            detail: entry.data
          }))
      ].filter(Boolean)
    };

    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 500, {
      message: "Unexpected proxy error while contacting Riot APIs.",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

async function serveStaticAsset(response, pathname) {
  const root = path.join(__dirname, "dist");
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(root, requestedPath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error("Not a file");
    }

    const extension = path.extname(filePath);
    const typeMap = {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png"
    };

    response.writeHead(200, {
      "Content-Type": typeMap[extension] ?? "application/octet-stream"
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

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/profile")) {
    await handleProfileLookup(request, response);
    return;
  }

  if (request.method === "GET") {
    const served = await serveStaticAsset(response, new URL(request.url, `http://${request.headers.host}`).pathname);
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
        message: "Static build not found. Use `npm run dev` for development or `npm run build` before `npm start`."
      });
      return;
    }
  }

  sendJson(response, 405, { message: "Method not allowed." });
}).listen(port, () => {
  console.log(`Riot profile proxy listening on http://localhost:${port}`);
});
