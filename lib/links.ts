export const LINK_GROUPS = ["Streaming", "Social", "Growth", "Rights", "Distribution"] as const;

export type LinkGroup = (typeof LINK_GROUPS)[number];

export type DeskLink = {
  id: string;
  name: string;
  href: string;
  group: LinkGroup;
  note: string;
  mark: string;
  alias: string;
};

export const DESK_LINKS: DeskLink[] = [
  {
    id: "soundcloud",
    name: "SoundCloud Artists",
    href: "https://soundcloud.com/",
    group: "Streaming",
    note: "Artist pages and plays",
    mark: "SC",
    alias: "soundcloud artists",
  },
  {
    id: "audiomack",
    name: "Audiomack Artists",
    href: "https://audiomack.com/",
    group: "Streaming",
    note: "Artist pages and uploads",
    mark: "AM",
    alias: "audiomack artists",
  },
  {
    id: "spotify",
    name: "Spotify",
    href: "https://open.spotify.com/",
    group: "Streaming",
    note: "Listener app",
    mark: "SP",
    alias: "open spotify",
  },
  {
    id: "spotify-artists",
    name: "Spotify for Artists",
    href: "https://artists.spotify.com/",
    group: "Streaming",
    note: "Stats, pitches, and profile",
    mark: "S4",
    alias: "s4a artists spotify",
  },
  {
    id: "instagram",
    name: "Instagram",
    href: "https://www.instagram.com/",
    group: "Social",
    note: "Posts and ads",
    mark: "IG",
    alias: "instagram ig",
  },
  {
    id: "tiktok",
    name: "TikTok",
    href: "https://www.tiktok.com/",
    group: "Social",
    note: "Posts and promotion",
    mark: "TT",
    alias: "tik tok tiktok",
  },
  {
    id: "youtube",
    name: "YouTube Studio",
    href: "https://studio.youtube.com/",
    group: "Social",
    note: "Uploads and analytics",
    mark: "YT",
    alias: "youtube studio",
  },
  {
    id: "smmfollows",
    name: "SMMFollows",
    href: "https://smmfollows.com/",
    group: "Growth",
    note: "Promotion desk",
    mark: "SM",
    alias: "smm follows smmfollows.com",
  },
  {
    id: "streamingmafia",
    name: "StreamingMafia",
    href: "https://streamingmafia.com/",
    group: "Growth",
    note: "Streaming campaigns",
    mark: "MF",
    alias: "streaming mafia streamingmafia.com",
  },
  {
    id: "mlc",
    name: "The MLC",
    href: "https://portal.themlc.com/",
    group: "Rights",
    note: "Mechanical royalties",
    mark: "ML",
    alias: "mlc mechanical licensing collective",
  },
  {
    id: "bmi",
    name: "BMI",
    href: "https://www.bmi.com/",
    group: "Rights",
    note: "Performance royalties",
    mark: "BMI",
    alias: "broadcast music",
  },
  {
    id: "sentric",
    name: "Sentric",
    href: "https://sentric.publishingdashboard.com/",
    group: "Rights",
    note: "Publishing dashboard",
    mark: "SE",
    alias: "scentric sentric publishing",
  },
  {
    id: "soundexchange",
    name: "SoundExchange",
    href: "https://sxdirect.soundexchange.com/login/",
    group: "Rights",
    note: "Digital performance royalties",
    mark: "SX",
    alias: "sound exchange sx direct",
  },
  {
    id: "symphonic",
    name: "Symphonic",
    href: "https://www.symphonicms.com/auth/login",
    group: "Distribution",
    note: "Distribution desk",
    mark: "SY",
    alias: "symphonicms symphonic distribution",
  },
  {
    id: "distrokid",
    name: "DistroKid",
    href: "https://distrokid.com/signin",
    group: "Distribution",
    note: "Release delivery",
    mark: "DK",
    alias: "distro kid distrokid",
  },
];
