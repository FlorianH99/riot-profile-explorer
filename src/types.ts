export type PlatformRoute =
  | "na1"
  | "br1"
  | "la1"
  | "la2"
  | "euw1"
  | "eun1"
  | "tr1"
  | "ru"
  | "me1"
  | "kr"
  | "jp1"
  | "oc1"
  | "sg2"
  | "ph2"
  | "th2"
  | "tw2"
  | "vn2";

export type SearchFormState = {
  gameName: string;
  tagLine: string;
  platform: PlatformRoute;
};

export type RankedEntry = {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type MasteryEntry = {
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
};

export type MatchRecord = {
  id: string;
  status: number;
  ok: boolean;
  endpoint: string;
  data: {
    metadata?: {
      matchId?: string;
    };
    info?: {
      gameMode?: string;
      gameCreation?: number;
      gameDuration?: number;
      participants?: Array<{
        puuid?: string;
        riotIdGameName?: string;
        riotIdTagline?: string;
        championName?: string;
        kills?: number;
        deaths?: number;
        assists?: number;
        win?: boolean;
      }>;
    };
  };
};

export type RiotEndpointError = {
  endpoint: string;
  status: number;
  detail: unknown;
};

export type RiotProfileResponse = {
  query: {
    gameName: string;
    tagLine: string;
    platform: PlatformRoute;
    regional: string;
  };
  summary: {
    account: {
      gameName: string;
      tagLine: string;
      puuid: string;
    };
    summoner: {
      profileIconId: number;
      summonerLevel: number;
    } | null;
    ranked: RankedEntry[] | null;
    masteryTop: MasteryEntry[] | null;
    matchIds: string[] | null;
  };
  raw: {
    account: unknown;
    summoner: unknown;
    ranked: unknown;
    masteryTop: unknown;
    matchIds: unknown;
    matches: MatchRecord[];
  };
  errors: RiotEndpointError[];
};
