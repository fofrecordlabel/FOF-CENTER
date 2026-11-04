import Link from "next/link";
import { StageSelect } from "@/components/controls";
import { Mono, PageHeader, Pill } from "@/components/ui";
import { artistsIn } from "@/lib/db";
import { compact } from "@/lib/format";
import { PIPELINE_STAGES, STAGES, labelFor, priorityTone } from "@/lib/labels";

export const metadata = { title: "A&R Pipeline" };

export default async function PipelinePage() {
  const columns = await Promise.all(
    PIPELINE_STAGES.map(async (stage) => ({ stage, people: await artistsIn([stage.value]) }))
  );
  const passed = await artistsIn(["passed"]);

  return (
    <>
      <PageHeader
        kicker="A&R"
        title="Pipeline"
        lede="Everyone FOF is considering. Move a name when the conversation changes. Signed names leave this board and land on the roster."
      >
        <Link className="btn primary" href="/artists/new">
          Add a target
        </Link>
      </PageHeader>
      <div className="board">
        {columns.map(({ stage, people }) => {
          return (
            <section className="col" key={stage.value}>
              <header>
                <h2>{stage.label}</h2>
                <span className="count">{people.length}</span>
              </header>
              {people.length === 0 ? <p className="meta">No one</p> : null}
              {people.map((artist) => (
                <article className="acard" key={artist.id}>
                  <div className="actions">
                    <Pill tone={priorityTone(artist.priority)}>{artist.priority}</Pill>
                    <span className="meta">{compact(artist.monthly_listeners)} listeners</span>
                  </div>
                  <Link className="title brand-name" href={`/artists/${artist.id}`}>
                    <Mono name={artist.name} image={artist.image_url} />
                    {artist.name}
                  </Link>
                  <p className="meta">
                    {[artist.genre, artist.base_city, artist.ar_rep ? `A&R ${artist.ar_rep}` : ""].filter(Boolean).join(" · ")}
                  </p>
                  {artist.interest ? <p className="meta clamp">{artist.interest}</p> : null}
                  <StageSelect id={artist.id} stage={artist.stage} />
                </article>
              ))}
            </section>
          );
        })}
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Passed</h2>
          <span className="count">{passed.length}</span>
        </div>
        {passed.length === 0 ? <p className="meta">No one has been passed.</p> : null}
        <div className="stack">
          {passed.map((artist) => (
            <article className="card" key={artist.id}>
              <div className="section-head">
                <div>
                  <div className="brand-name">
                    <Mono name={artist.name} image={artist.image_url} />
                    <Link className="rowlink" href={`/artists/${artist.id}`}>
                      {artist.name}
                    </Link>
                  </div>
                  <p className="meta">{[artist.genre, artist.base_city].filter(Boolean).join(" · ")}</p>
                </div>
                <Pill tone="mute">{labelFor(STAGES, artist.stage)}</Pill>
              </div>
              <StageSelect id={artist.id} stage={artist.stage} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
