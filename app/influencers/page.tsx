import { deleteInfluencer } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { InfluencerForm } from "@/components/RecordForms";
import { Banner, PageHeader, Pill } from "@/components/ui";
import { listInfluencers } from "@/lib/db";
import { compact } from "@/lib/format";
import { INFLUENCER_STATUSES, PLATFORMS, labelFor, statusTone } from "@/lib/labels";
import type { Influencer } from "@/lib/types";

export const metadata = { title: "Influencers" };

export default async function InfluencersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const people = await listInfluencers();

  return (
    <>
      <PageHeader
        kicker="Contact book"
        title="Influencers"
        lede="Save the @ and the number. Call them from here."
      />
      <Banner message={error} />
      <section className="card stack">
        <h2>Save a contact</h2>
        <InfluencerForm next="/influencers" />
      </section>
      {people.length === 0 ? (
        <div className="empty section">
          <p>No one saved yet. An @ and a number is enough to start.</p>
        </div>
      ) : (
        <div className="book">
          {people.map((person) => {
            const profile = reach(person);
            const phone = telHref(person.phone);
            return (
              <article className="contact" key={person.id}>
                <div>
                  <p className="kicker">{labelFor(PLATFORMS, person.platform)}</p>
                  {profile && person.handle ? (
                    <a className="at" href={profile} target="_blank" rel="noreferrer">
                      {person.handle}
                    </a>
                  ) : (
                    <p className="at">{person.handle || "No @ yet"}</p>
                  )}
                  <p className="meta">
                    {[person.name, person.city, person.niche, person.followers ? `${compact(person.followers)} followers` : "", person.rate]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="contact-reach">
                  {phone && person.phone ? (
                    <a className="btn primary" href={phone}>
                      {person.phone}
                    </a>
                  ) : (
                    <span className="meta">No number</span>
                  )}
                  {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : null}
                  <Pill tone={statusTone(person.status)}>{labelFor(INFLUENCER_STATUSES, person.status)}</Pill>
                </div>
                <div className="stack">
                  {person.notes ? <p className="meta">{person.notes}</p> : null}
                  <details className="drawer">
                    <summary>Edit</summary>
                    <InfluencerForm person={person} next="/influencers" />
                  </details>
                  <form action={deleteInfluencer}>
                    <input type="hidden" name="id" value={person.id} />
                    <input type="hidden" name="next" value="/influencers" />
                    <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove ${person.name} from the contact book?`} />
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
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
