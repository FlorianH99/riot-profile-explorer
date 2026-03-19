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
  matchCount: number;
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

export type MatchParticipant = {
  puuid?: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  championName?: string;
  championId?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  win?: boolean;
  totalDamageDealtToChampions?: number;
  goldEarned?: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  champLevel?: number;
};

export type MatchRecord = {
  id: string;
  status: number;
  ok: boolean;
  endpoint: string;
  data: {
    metadata?: {
      matchId?: string;
      participants?: string[];
    };
    info?: {
      gameMode?: string;
      gameType?: string;
      queueId?: number;
      mapId?: number;
      gameCreation?: number;
      gameDuration?: number;
      participants?: MatchParticipant[];
    };
  };
};

export type TimelineRecord = {
  id: string;
  status: number;
  ok: boolean;
  endpoint: string;
  data: {
    metadata?: {
      matchId?: string;
    };
    info?: {
      frames?: unknown[];
      frameInterval?: number;
    };
  };
};

export type RiotEndpointError = {
  endpoint: string;
  status: number;
  detail: unknown;
};

export type ApiCallSummary = {
  key: keyof RiotProfileResponse["raw"];
  label: string;
  endpoint: string;
  ok: boolean;
  status: number;
  requested?: number;
  returned?: number;
  failures?: number;
};

export type RiotProfileResponse = {
  query: {
    gameName: string;
    tagLine: string;
    platform: PlatformRoute;
    regional: string;
    matchCount: number;
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
    masteryScore: number | null;
    challenges: {
      level: number | null;
      current: number | null;
      percentile: number | null;
    } | null;
    status: {
      name: string | null;
      maintenances: number;
      incidents: number;
    } | null;
    matchIds: string[] | null;
  };
  raw: {
    account: unknown;
    accountByPuuid: unknown;
    summoner: unknown;
    ranked: unknown;
    masteryTop: unknown;
    masteryScore: unknown;
    challenges: unknown;
    status: unknown;
    matchIds: unknown;
    matches: MatchRecord[];
    timelines: TimelineRecord[];
  };
  meta: {
    fetchedAt: string;
    matchCountRequested: number;
    matchCountLoaded: number;
    timelineCountLoaded: number;
    apiCalls: ApiCallSummary[];
  };
  errors: RiotEndpointError[];
};
