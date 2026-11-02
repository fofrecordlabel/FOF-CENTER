import Link from "next/link";
import { deletePerson } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { PersonForm } from "@/components/RecordForms";
import { Banner, PageHeader, Pill } from "@/components/ui";
import { listPeople } from "@/lib/db";
import { ROLES, labelFor } from "@/lib/labels";

export const metadata = { title: "Directory" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const people = listPeople();

  return (
    <>
      <PageHeader kicker="Directory" title="People" lede="Managers, counsel, producers, publicists, and the A&R staff. Link them from an artist file." />
      <Banner message={error} />
      <div className="stack">
        {people.map((person) => (
          <article className="card stack" key={person.id}>
            <div className="section-head">
              <div>
                <h2>{person.name}</h2>
                <p className="meta">{[labelFor(ROLES, person.role), person.company, person.email, person.phone].filter(Boolean).join(" · ")}</p>
              </div>
              <Pill>{labelFor(ROLES, person.role)}</Pill>
            </div>
            {person.notes ? <p>{person.notes}</p> : null}
            <div className="actions">
              {person.artists.map((artist) => (
                <Link key={artist.id} className="pill" href={`/artists/${artist.id}#team`}>
                  {artist.name}{artist.relationship ? ` · ${artist.relationship}` : ""}
                </Link>
              ))}
            </div>
            <details className="drawer">
              <summary>Edit</summary>
              <PersonForm person={person} next="/people" />
            </details>
            <form action={deletePerson}>
              <input type="hidden" name="id" value={person.id} />
              <input type="hidden" name="next" value="/people" />
              <ConfirmSubmit className="btn danger small" label="Remove from directory" message={`Remove ${person.name} from the directory?`} />
            </form>
          </article>
        ))}
      </div>
      <section className="section card stack">
        <h2>Add a person</h2>
        <PersonForm next="/people" />
      </section>
    </>
  );
}
