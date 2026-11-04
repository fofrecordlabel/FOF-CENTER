import Link from "next/link";
import { Banner, Mono, PageHeader } from "@/components/ui";
import { searchDesk } from "@/lib/db";
import { INFLUENCER_STATUSES, PLATFORMS, STAGES, labelFor } from "@/lib/labels";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const { q = "", error } = await searchParams;
  const query = q.trim();
  const hits = await searchDesk(query);
  const empty = !hits.artists.length && !hits.people.length && !hits.releases.length && !hits.tracks.length && !hits.projects.length && !hits.influencers.length;

  return (
    <>
      <PageHeader kicker="Search" title={query ? query : "Search the desk"} lede="Artists, people, releases, masters, and budgets." />
      <Banner message={error} />
      {!query ? <p className="meta">Type a name in the search bar.</p> : null}
      {query && empty ? <div className="empty"><p>Nothing matched “{query}”.</p></div> : null}
      {hits.artists.length ? (
        <section className="section stack">
          <h2>Artists</h2>
          {hits.artists.map((artist) => (
            <Link key={artist.id} className="card brand-name" href={`/artists/${artist.id}`}>
              <Mono name={artist.name} image={artist.image_url} />
              <span>
                <strong>{artist.name}</strong>
                <p className="meta">{[labelFor(STAGES, artist.stage), artist.genre, artist.base_city].filter(Boolean).join(" · ")}</p>
              </span>
            </Link>
          ))}
        </section>
      ) : null}
      {hits.people.length ? (
        <section className="section stack">
          <h2>People</h2>
          {hits.people.map((person) => (
            <Link key={person.id} className="card" href="/people">
              <strong>{person.name}</strong>
              <p className="meta">{[person.company, person.email].filter(Boolean).join(" · ")}</p>
            </Link>
          ))}
        </section>
      ) : null}
      {hits.releases.length ? (
        <section className="section stack">
          <h2>Releases</h2>
          {hits.releases.map((release) => (
            <Link key={release.id} className="card" href={`/releases/${release.id}`}>
              <strong>{release.title}</strong>
              <p className="meta">{release.artist_name}{release.catalog_no ? ` · ${release.catalog_no}` : ""}</p>
            </Link>
          ))}
        </section>
      ) : null}
      {hits.tracks.length ? (
        <section className="section stack">
          <h2>Masters</h2>
          {hits.tracks.map((track) => (
            <Link key={track.id} className="card" href={track.release_id ? `/releases/${track.release_id}` : `/artists/${track.artist_id}`}>
              <strong>{track.title}</strong>
              <p className="meta">{track.artist_name}{track.release_title ? ` · ${track.release_title}` : ""}{track.isrc ? ` · ${track.isrc}` : ""}</p>
            </Link>
          ))}
        </section>
      ) : null}
      {hits.influencers.length ? (
        <section className="section stack">
          <h2>Influencers</h2>
          {hits.influencers.map((person) => (
            <a key={person.id} className="card" href="/influencers">
              <strong>{person.name}</strong>
              <p className="meta">{[labelFor(PLATFORMS, person.platform), person.handle, labelFor(INFLUENCER_STATUSES, person.status)].filter(Boolean).join(" · ")}</p>
            </a>
          ))}
        </section>
      ) : null}
      {hits.projects.length ? (
        <section className="section stack">
          <h2>Budgets</h2>
          {hits.projects.map((project) => (
            <Link key={project.id} className="card" href="/projects">
              <strong>{project.name}</strong>
              <p className="meta">{project.artist_name || "Label"}</p>
            </Link>
          ))}
        </section>
      ) : null}
    </>
  );
}
