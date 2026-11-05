export type Artist = {
  id: string;
  stage: string;
  priority: string;
  name: string;
  legal_name: string | null;
  genre: string | null;
  hometown: string | null;
  base_city: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  spotify_url: string | null;
  youtube: string | null;
  website: string | null;
  monthly_listeners: number | null;
  ig_followers: number | null;
  tiktok_followers: number | null;
  image_url: string | null;
  source: string | null;
  ar_rep: string | null;
  ipi: string | null;
  interest: string | null;
  signed_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Person = {
  id: string;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  ipi: string | null;
  notes: string | null;
  created_at: string;
};

export type Influencer = {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
  profile_url: string | null;
  email: string | null;
  phone: string | null;
  followers: number | null;
  city: string | null;
  niche: string | null;
  rate: string | null;
  status: string;
  notes: string | null;
  kind: string;
  created_at: string;
};

export type Contract = {
  id: string;
  artist_id: string;
  title: string;
  deal_type: string;
  status: string;
  territory: string | null;
  term_years: number | null;
  options: number | null;
  advance_cents: number;
  royalty_rate: number | null;
  recoupable: number;
  effective_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
};

export type Release = {
  id: string;
  artist_id: string;
  title: string;
  release_type: string;
  status: string;
  release_date: string | null;
  upc: string | null;
  catalog_no: string | null;
  imprint: string | null;
  distributor: string | null;
  cover_url: string | null;
  budget_cents: number;
  notes: string | null;
  created_at: string;
};

export type Track = {
  id: string;
  release_id: string | null;
  artist_id: string;
  title: string;
  isrc: string | null;
  duration_sec: number | null;
  track_number: number | null;
  explicit: number;
  writers: string | null;
  writer_ipis: string | null;
  producers: string | null;
  master_owner: string | null;
  publishing: string | null;
  notes: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  artist_id: string | null;
  release_id: string | null;
  name: string;
  kind: string;
  status: string;
  budget_cents: number;
  spent_cents: number;
  start_date: string | null;
  due_date: string | null;
  owner: string | null;
  notes: string | null;
  created_at: string;
};

export type Royalty = {
  id: string;
  artist_id: string;
  release_id: string | null;
  period: string;
  source: string;
  gross_cents: number;
  recoup_cents: number;
  notes: string | null;
  created_at: string;
};

export type Note = {
  id: string;
  artist_id: string;
  body: string;
  author: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  artist_id: string | null;
  action: string;
  detail: string;
  created_at: string;
};

export type ReleaseView = Release & { artist_name: string };
export type TrackView = Track & { artist_name: string; release_title: string | null };
export type ContractView = Contract & { artist_name: string };
export type ProjectView = Project & { artist_name: string | null; release_title: string | null };
export type RoyaltyView = Royalty & { artist_name: string; release_title: string | null };
export type ActivityView = Activity & { artist_name: string | null };

export type LogEntry = {
  id: string;
  log_date: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  platform: string | null;
  artist_id: string | null;
  status: string;
  created_at: string;
};

export type LogView = LogEntry & { artist_name: string | null };

export type ListenerLog = {
  id: string;
  artist_id: string;
  log_date: string;
  listeners: number;
  note: string | null;
  created_at: string;
};

export type Split = {
  id: string;
  track_id: string;
  name: string;
  role: string;
  share: number | null;
  ipi: string | null;
  pro: string | null;
  created_at: string;
};

export type Campaign = {
  id: string;
  release_id: string;
  artist_id: string;
  name: string;
  status: string;
  budget_cents: number;
  notes: string | null;
  created_at: string;
};

export type Todo = {
  id: string;
  todo_date: string;
  title: string;
  done: number;
  created_at: string;
  completed_at: string | null;
  release_id: string | null;
  template_id: string | null;
  notes: string | null;
  reminder: string | null;
  release_title?: string | null;
  template_locked?: number | null;
  template_notes?: string | null;
  template_sort?: number | null;
};

export type ChecklistTemplate = {
  id: string;
  title: string;
  release_id: string | null;
  created_at: string;
  notes: string | null;
  reminder: string | null;
  archived: number;
  sort_order: number;
  locked: number;
  release_title?: string | null;
};

export type ChecklistEvent = {
  id: string;
  todo_id: string | null;
  template_id: string | null;
  title: string;
  todo_date: string;
  action: string;
  created_at: string;
};

export type CampaignBooking = {
  id: string;
  campaign_id: string;
  influencer_id: string | null;
  paid: string | null;
  posted: number;
  post_url: string | null;
  created_at: string;
  influencer_name: string | null;
  handle: string | null;
};
export type PersonLink = { id: string; name: string; relationship: string | null };
export type PersonView = Person & { artists: PersonLink[] };

export type MoneySnapshot = {
  advance: number;
  recouped: number;
  gross: number;
  balance: number;
};

export type DossierPerson = Person & { relationship: string | null };
export type DossierRelease = Release & { tracks: Track[] };

export type Dossier = {
  artist: Artist;
  people: DossierPerson[];
  directory: Pick<Person, "id" | "name" | "role" | "company">[];
  contracts: Contract[];
  releases: DossierRelease[];
  projects: Project[];
  royalties: Royalty[];
  notes: Note[];
  activity: Activity[];
  money: MoneySnapshot;
  releaseOptions: Pick<Release, "id" | "title">[];
};
