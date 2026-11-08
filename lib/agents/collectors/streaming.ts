import type { DataSourceNote, IntegrationStatus } from "@/lib/agents/types";
import { listArtists, listListenerLogs } from "@/lib/db";

export type StreamingCollect = {
  artistId: string;
  artistName: string;
  spotifyUrl: string | null;
  monthlyListeners: number | null;
  followers: number | null;
  popularity: number | null;
  source: string;
  note: string;
};

function spotifyArtistId(url: string | null) {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? null;
}

export function streamingSourceNotes(): DataSourceNote[] {
  const hasSpotify = Boolean(process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim());
  const hasChartmetric = Boolean(process.env.CHARTMETRIC_API_KEY?.trim());
  return [
    {
      id: "desk-listener-logs",
      status: "ok",
      detail: "Authorized internal logs entered on the desk (listener_logs).",
    },
    {
      id: "spotify-web-api",
      status: hasSpotify ? "degraded" : "misconfigured",
      detail: hasSpotify
        ? "Spotify Web API is configured but does not expose monthly listeners. Followers/popularity only."
        : "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set. Monthly listeners unavailable from Spotify officially.",
    },
    {
      id: "chartmetric",
      status: hasChartmetric ? "ok" : "unavailable",
      detail: hasChartmetric
        ? "Chartmetric API key present — will attempt authorized listener pulls."
        : "CHARTMETRIC_API_KEY not set. No third-party streaming analytics connected.",
    },
  ];
}

export async function collectStreamingMetrics(deskDate: string): Promise<{
  rows: StreamingCollect[];
  sources: DataSourceNote[];
}> {
  const artists = await listArtists();
  const logs = await listListenerLogs();
  const sources = streamingSourceNotes();
  const rows: StreamingCollect[] = [];

  const spotifyToken = await spotifyClientCredentialsToken();
  const chartmetricKey = process.env.CHARTMETRIC_API_KEY?.trim() || null;

  for (const artist of artists) {
    const todayLog = logs
      .filter((log) => log.artist_id === artist.id && log.log_date === deskDate)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const latestLog = logs
      .filter((log) => log.artist_id === artist.id)
      .sort((a, b) => b.log_date.localeCompare(a.log_date) || b.created_at.localeCompare(a.created_at))[0];

    let followers: number | null = null;
    let popularity: number | null = null;
    let chartmetricListeners: number | null = null;
    const notes: string[] = [];

    if (todayLog) {
      notes.push(`Desk log for ${deskDate}: ${todayLog.listeners.toLocaleString("en-US")}`);
    } else if (latestLog) {
      notes.push(`No desk log for ${deskDate}; latest desk log ${latestLog.log_date}: ${latestLog.listeners.toLocaleString("en-US")}`);
    } else {
      notes.push("No desk listener log on file.");
    }

    const sid = spotifyArtistId(artist.spotify_url);
    if (spotifyToken && sid) {
      const meta = await fetchSpotifyArtist(spotifyToken, sid);
      if (meta) {
        followers = meta.followers;
        popularity = meta.popularity;
        notes.push("Spotify Web API: followers/popularity only (monthly listeners not provided by Spotify).");
      } else {
        notes.push("Spotify Web API lookup failed for this artist id.");
      }
    } else if (!sid) {
      notes.push("No Spotify artist URL on the artist file.");
    }

    if (chartmetricKey && sid) {
      const cm = await fetchChartmetricListeners(chartmetricKey, sid);
      if (cm.status === "ok") {
        chartmetricListeners = cm.listeners;
        notes.push("Chartmetric authorized pull succeeded.");
      } else {
        notes.push(cm.detail);
        sources.find((source) => source.id === "chartmetric")!.status = cm.status;
        sources.find((source) => source.id === "chartmetric")!.detail = cm.detail;
      }
    }

    const monthly =
      chartmetricListeners ??
      todayLog?.listeners ??
      (latestLog && latestLog.log_date === deskDate ? latestLog.listeners : null) ??
      null;

    rows.push({
      artistId: artist.id,
      artistName: artist.name,
      spotifyUrl: artist.spotify_url,
      monthlyListeners: monthly ?? todayLog?.listeners ?? null,
      followers,
      popularity,
      source: chartmetricListeners != null ? "chartmetric" : todayLog ? "desk-log" : latestLog ? "desk-log-stale" : "unavailable",
      note: notes.join(" "),
    });
  }

  return { rows, sources };
}

async function spotifyClientCredentialsToken() {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  try {
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchSpotifyArtist(token: string, artistId: string) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      followers?: { total?: number };
      popularity?: number;
    };
    return {
      followers: json.followers?.total ?? null,
      popularity: json.popularity ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchChartmetricListeners(
  apiKey: string,
  spotifyArtistId: string
): Promise<{ status: IntegrationStatus; listeners: number | null; detail: string }> {
  // Chartmetric’s public docs require their artist id mapping first.
  // Without a confirmed account mapping endpoint response, we refuse to invent numbers.
  try {
    const response = await fetch(
      `https://api.chartmetric.com/api/artist/spotify/${encodeURIComponent(spotifyArtistId)}/where`,
      { headers: { authorization: `Bearer ${apiKey}` } }
    );
    if (response.status === 401 || response.status === 403) {
      return { status: "misconfigured", listeners: null, detail: "Chartmetric rejected the API key." };
    }
    if (!response.ok) {
      return {
        status: "unavailable",
        listeners: null,
        detail: `Chartmetric mapping unavailable (HTTP ${response.status}). Monthly listeners not written from this source.`,
      };
    }
    const json = (await response.json()) as { id?: number; obj?: { id?: number } };
    const cmId = json.id ?? json.obj?.id;
    if (!cmId) {
      return { status: "unavailable", listeners: null, detail: "Chartmetric did not return an artist id for this Spotify id." };
    }
    const stats = await fetch(
      `https://api.chartmetric.com/api/artist/${cmId}/stat/spotify?field=listeners`,
      { headers: { authorization: `Bearer ${apiKey}` } }
    );
    if (!stats.ok) {
      return {
        status: "unavailable",
        listeners: null,
        detail: `Chartmetric stats unavailable (HTTP ${stats.status}).`,
      };
    }
    const body = (await stats.json()) as {
      obj?: Array<{ value?: number; listeners?: number }>;
      value?: number;
    };
    const latest =
      body.value ??
      body.obj?.[body.obj.length - 1]?.value ??
      body.obj?.[body.obj.length - 1]?.listeners ??
      null;
    if (latest == null || !Number.isFinite(Number(latest))) {
      return { status: "unavailable", listeners: null, detail: "Chartmetric response had no listener value." };
    }
    return { status: "ok", listeners: Number(latest), detail: "Chartmetric listeners pulled." };
  } catch (error) {
    return {
      status: "unavailable",
      listeners: null,
      detail: `Chartmetric request failed: ${error instanceof Error ? error.message : "network error"}`,
    };
  }
}
