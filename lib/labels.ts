export type Choice = { value: string; label: string };

export const STAGES: (Choice & { lane: "pipeline" | "roster" | "archive" })[] = [
  { value: "discovered", label: "Discovered", lane: "pipeline" },
  { value: "researching", label: "Researching", lane: "pipeline" },
  { value: "meeting", label: "In the room", lane: "pipeline" },
  { value: "offer", label: "Offer out", lane: "pipeline" },
  { value: "legal", label: "In legal", lane: "pipeline" },
  { value: "signed", label: "Signed", lane: "roster" },
  { value: "active", label: "Active", lane: "roster" },
  { value: "paused", label: "Paused", lane: "roster" },
  { value: "catalog", label: "Catalog", lane: "roster" },
  { value: "passed", label: "Passed", lane: "archive" },
];

export const PIPELINE_STAGES = STAGES.filter((stage) => stage.lane === "pipeline");
export const ROSTER_STAGES = STAGES.filter((stage) => stage.lane === "roster");

export const PRIORITIES: Choice[] = [
  { value: "rush", label: "Rush" },
  { value: "high", label: "High" },
  { value: "standard", label: "Standard" },
  { value: "low", label: "Low" },
];

export const ROLES: Choice[] = [
  { value: "manager", label: "Manager" },
  { value: "business-manager", label: "Business manager" },
  { value: "attorney", label: "Attorney" },
  { value: "ar", label: "A&R" },
  { value: "producer", label: "Producer" },
  { value: "publicist", label: "Publicist" },
  { value: "booking", label: "Booking" },
  { value: "publisher", label: "Publisher" },
  { value: "other", label: "Other" },
];

export const DEAL_TYPES: Choice[] = [
  { value: "recording", label: "Recording agreement" },
  { value: "360", label: "360 agreement" },
  { value: "distribution", label: "Distribution deal" },
  { value: "license", label: "License" },
  { value: "single", label: "Single deal" },
  { value: "development", label: "Development deal" },
  { value: "jv", label: "Joint venture" },
  { value: "producer", label: "Producer agreement" },
];

export const DEAL_STATUSES: Choice[] = [
  { value: "draft", label: "Draft" },
  { value: "termsheet", label: "Term sheet" },
  { value: "negotiating", label: "Negotiating" },
  { value: "signature", label: "Out for signature" },
  { value: "executed", label: "Executed" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
];

export const RELEASE_TYPES: Choice[] = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
  { value: "mixtape", label: "Mixtape" },
  { value: "compilation", label: "Compilation" },
];

export const RELEASE_STATUSES: Choice[] = [
  { value: "idea", label: "Idea" },
  { value: "unreleased", label: "Unreleased" },
  { value: "production", label: "In production" },
  { value: "delivered", label: "Delivered" },
  { value: "scheduled", label: "Scheduled" },
  { value: "released", label: "Released" },
  { value: "taken_down", label: "Taken down" },
  { value: "shelved", label: "Shelved" },
];

export const DISTRIBUTORS: Choice[] = [
  { value: "DistroKid", label: "DistroKid" },
  { value: "Symphonic", label: "Symphonic" },
  { value: "Venice", label: "Venice" },
  { value: "UnitedMasters", label: "UnitedMasters" },
  { value: "TuneCore", label: "TuneCore" },
  { value: "CD Baby", label: "CD Baby" },
  { value: "AWAL", label: "AWAL" },
  { value: "ONErpm", label: "ONErpm" },
  { value: "Too Lost", label: "Too Lost" },
  { value: "EMPIRE", label: "EMPIRE" },
  { value: "The Orchard", label: "The Orchard" },
  { value: "Believe", label: "Believe" },
  { value: "Ditto", label: "Ditto" },
  { value: "Amuse", label: "Amuse" },
  { value: "Stem", label: "Stem" },
];

export const STORES: Choice[] = [
  { value: "spotify", label: "Spotify" },
  { value: "apple", label: "Apple Music" },
  { value: "youtube", label: "YouTube" },
  { value: "audiomack", label: "Audiomack" },
  { value: "all", label: "All stores" },
  { value: "other", label: "Other" },
];

export const EXPENSE_CATEGORIES: Choice[] = [
  { value: "ads", label: "Ads" },
  { value: "playlist", label: "Playlist pitching" },
  { value: "studio", label: "Studio" },
  { value: "video", label: "Video" },
  { value: "artwork", label: "Artwork" },
  { value: "promo", label: "Promo" },
  { value: "travel", label: "Travel" },
  { value: "software", label: "Software" },
  { value: "other", label: "Other" },
];

export const PROJECT_KINDS: Choice[] = [
  { value: "recording", label: "Recording" },
  { value: "mixing", label: "Mixing" },
  { value: "video", label: "Video" },
  { value: "marketing", label: "Marketing" },
  { value: "radio", label: "Radio" },
  { value: "tour", label: "Tour" },
  { value: "artwork", label: "Artwork" },
  { value: "photoshoot", label: "Photoshoot" },
  { value: "other", label: "Other" },
];

export const PROJECT_STATUSES: Choice[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "closed", label: "Closed" },
  { value: "killed", label: "Killed" },
];

export const PLATFORMS: Choice[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
  { value: "snapchat", label: "Snapchat" },
  { value: "other", label: "Other" },
];

export const CONTACT_KINDS: Choice[] = [
  { value: "influencer", label: "Influencer" },
  { value: "curator", label: "Playlist curator" },
];

export const INFLUENCER_STATUSES: Choice[] = [
  { value: "prospect", label: "Prospect" },
  { value: "talking", label: "In talks" },
  { value: "booked", label: "Booked" },
  { value: "passed", label: "Passed" },
];

export const LOG_KINDS: Choice[] = [
  { value: "post", label: "Post" },
  { value: "promo", label: "Promo" },
  { value: "blog", label: "Blog" },
  { value: "playlist", label: "Playlist" },
];

export const SPLIT_ROLES: Choice[] = [
  { value: "writer", label: "Writer" },
  { value: "publisher", label: "Publisher" },
  { value: "collects", label: "Collects" },
];

export const CAMPAIGN_STATUSES: Choice[] = [
  { value: "planning", label: "Planning" },
  { value: "live", label: "Live" },
  { value: "wrapped", label: "Wrapped" },
];

export const ROYALTY_SOURCES: Choice[] = [
  { value: "spotify", label: "Spotify" },
  { value: "apple", label: "Apple Music" },
  { value: "youtube", label: "YouTube" },
  { value: "amazon", label: "Amazon" },
  { value: "sync", label: "Sync" },
  { value: "performance", label: "Performance" },
  { value: "physical", label: "Physical" },
  { value: "merch", label: "Merch" },
  { value: "tour", label: "Tour" },
  { value: "other", label: "Other" },
];

export function values(list: Choice[]) {
  return list.map((item) => item.value);
}

export function labelFor(list: Choice[], value: string | null | undefined) {
  if (!value) return "—";
  return list.find((item) => item.value === value)?.label ?? value;
}

export function isRoster(stage: string) {
  return ROSTER_STAGES.some((item) => item.value === stage);
}

export function stageTone(stage: string) {
  if (stage === "active" || stage === "signed") return "good";
  if (stage === "offer" || stage === "legal") return "high";
  if (stage === "passed" || stage === "paused") return "mute";
  if (stage === "catalog") return "sky";
  return "";
}

export function priorityTone(priority: string) {
  if (priority === "rush") return "rush";
  if (priority === "high") return "high";
  if (priority === "low") return "mute";
  return "";
}

export function statusTone(status: string) {
  if (["executed", "released", "active", "delivered", "closed"].includes(status)) return "good";
  if (status === "taken_down") return "down";
  if (["negotiating", "signature", "termsheet", "scheduled", "production", "offer", "legal"].includes(status)) return "high";
  if (["terminated", "expired", "shelved", "killed", "passed", "paused", "idea", "unreleased"].includes(status)) return "mute";
  return "";
}

export function sheetClass(status: string) {
  const tone = statusTone(status);
  if (tone === "good") return "sheet is-live";
  if (tone === "down") return "sheet is-down";
  if (tone === "high") return "sheet is-work";
  return "sheet";
}

export function lineClass(status: string) {
  const tone = statusTone(status);
  if (tone === "good") return "line live";
  if (tone === "down") return "line down";
  if (tone === "high") return "line work";
  return "line";
}
