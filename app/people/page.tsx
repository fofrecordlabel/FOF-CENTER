import Link from "next/link";
import { deletePerson } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { PhoneBook } from "@/components/PhoneBook";
import { groupByLetter } from "@/lib/phonebook";
import { PersonForm } from "@/components/RecordForms";
import { Banner, PageHeader } from "@/components/ui";
import { listPeople } from "@/lib/db";
import { ROLES, labelFor } from "@/lib/labels";

export const metadata = { title: "Directory" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const people = await listPeople();
  const groups = groupByLetter(people, (person) => person.name);

  return (
    <>
      <PageHeader kicker="Directory" title="People" lede="Scroll the list like a phone book. Tap a name to edit it." />
      <Banner message={error} />
      {groups.length === 0 ? <p className="meta">Nobody in the directory yet.</p> : null}
      {groups.length ? (
        <PhoneBook prefix="directory" letters={groups.map((group) => group.letter)}>
          {groups.map((group) => (
            <section data-letter={group.letter} id={`directory-${group.letter}`} key={group.letter}>
              <h2 className="phonebook-letter">{group.letter}</h2>
              {group.items.map((person) => {
                const detail = [labelFor(ROLES, person.role), person.company, person.email, person.phone].filter(Boolean).join(" · ");
                return (
                  <article className="contact-row" data-name={`${person.name} ${detail}`.toLowerCase()} key={person.id}>
                    <div>
                      <strong>{person.name}</strong>
                      <p className="meta">{detail || "Details still open"}</p>
                      {person.artists.length ? (
                        <p className="meta">
                          {person.artists.map((artist) => (
                            <Link key={artist.id} href={`/artists/${artist.id}#team`}>
                              {artist.name}
                              {artist.relationship ? ` · ${artist.relationship}` : ""}
                            </Link>
                          ))}
                        </p>
                      ) : null}
                    </div>
                    <details className="drawer">
                      <summary>Edit</summary>
                      <PersonForm person={person} next="/people" />
                      {person.notes ? <p className="meta">{person.notes}</p> : null}
                      <form action={deletePerson}>
                        <input type="hidden" name="id" value={person.id} />
                        <input type="hidden" name="next" value="/people" />
                        <ConfirmSubmit className="btn danger small" label="Remove from directory" message={`Remove ${person.name} from the directory?`} />
                      </form>
                    </details>
                  </article>
                );
              })}
            </section>
          ))}
        </PhoneBook>
      ) : null}
      <section className="section card stack">
        <h2>Add a person</h2>
        <PersonForm next="/people" />
      </section>
    </>
  );
}
