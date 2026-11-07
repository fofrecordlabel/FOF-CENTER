import { deleteInfluencer } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { PhoneBook } from "@/components/PhoneBook";
import { groupByLetter } from "@/lib/phonebook";
import { InfluencerForm } from "@/components/RecordForms";
import { Banner, PageHeader, Pill } from "@/components/ui";
import { listInfluencers } from "@/lib/db";
import { compact } from "@/lib/format";
import { INFLUENCER_STATUSES, labelFor, statusTone } from "@/lib/labels";
import type { Influencer } from "@/lib/types";

export const metadata = { title: "Influencers" };

export default async function InfluencersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const people = await listInfluencers();

  return (
    <>
      <PageHeader
        kicker="Contact book"
        title="Contacts"
        lede="Playlist curators and influencers live here. Add the number, email, and rate when you have them."
      />
      <Banner message={error} />
      <section className="card stack">
        <h2>Save a contact</h2>
        <InfluencerForm next="/influencers" />
      </section>
      <ContactGroup prefix="curators" title="Playlist curators" people={people.filter((person) => person.kind === "curator")} />
      <ContactGroup prefix="influencers" title="Influencers" people={people.filter((person) => person.kind !== "curator")} />
    </>
  );
}

function ContactGroup({ title, prefix, people }: { title: string; prefix: string; people: Influencer[] }) {
  const groups = groupByLetter(people, (person) => person.handle || person.name);
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <span className="meta">{people.length}</span>
      </div>
      {groups.length === 0 ? <p className="meta">None saved yet.</p> : null}
      {groups.length ? (
        <PhoneBook prefix={prefix} letters={groups.map((group) => group.letter)}>
          {groups.map((group) => (
            <section data-letter={group.letter} id={`${prefix}-${group.letter}`} key={group.letter}>
              <h3 className="phonebook-letter">{group.letter}</h3>
              {group.items.map((person) => {
                const profile = reach(person);
                const phone = telHref(person.phone);
                const titleText = person.handle || person.name;
                const detail =
                  [person.handle ? person.name : "", person.city, person.niche, person.followers ? `${compact(person.followers)} followers` : "", person.rate]
                    .filter(Boolean)
                    .join(" · ") || "Details still open";
                return (
                  <article className="contact-row" data-name={`${titleText} ${person.name} ${detail}`.toLowerCase()} key={person.id}>
                    <div>
                      {profile ? (
                        <a className="contact-name" href={profile} target="_blank" rel="noreferrer">
                          {titleText}
                        </a>
                      ) : (
                        <strong>{titleText}</strong>
                      )}
                      <p className="meta">{detail}</p>
                      <p className="marks">
                        {phone && person.phone ? <a className="pill" href={phone}>{person.phone}</a> : null}
                        {person.email ? <a className="pill" href={`mailto:${person.email}`}>{person.email}</a> : null}
                        <Pill tone={statusTone(person.status)}>{labelFor(INFLUENCER_STATUSES, person.status)}</Pill>
                      </p>
                    </div>
                    <details className="drawer">
                      <summary>Edit</summary>
                      {person.notes ? <p className="meta">{person.notes}</p> : null}
                      <InfluencerForm person={person} next="/influencers" />
                      <form action={deleteInfluencer}>
                        <input type="hidden" name="id" value={person.id} />
                        <input type="hidden" name="next" value="/influencers" />
                        <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove ${person.name} from the contact book?`} />
                      </form>
                    </details>
                  </article>
                );
              })}
            </section>
          ))}
        </PhoneBook>
      ) : null}
    </section>
  );
}

function reach(person: Influencer) {
  if (person.profile_url) return person.profile_url;
  const handle = person.handle?.replace(/^@/, "");
  if (!handle) return null;
  if (person.platform === "instagram") return `https://instagram.com/${handle}`;
  if (person.platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (person.platform === "youtube") return `https://www.youtube.com/@${handle}`;
  if (person.platform === "x") return `https://x.com/${handle}`;
  if (person.platform === "snapchat") return `https://www.snapchat.com/add/${handle}`;
  return null;
}

function telHref(phone: string | null) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}
