import { createBooking, createCampaign, createSplit, deleteBooking, deleteCampaign, deleteSplit, updateBooking } from "@/lib/actions";
import { ConfirmSubmit, SubmitButton } from "@/components/controls";
import { Field } from "@/components/ui";
import { money } from "@/lib/format";
import { CAMPAIGN_STATUSES, SPLIT_ROLES, labelFor } from "@/lib/labels";
import type { Campaign, CampaignBooking, Split } from "@/lib/types";

export function DeliveryChecks({
  release,
  masters,
}: {
  release: { cover_url: string | null; upc: string | null; distributor: string | null };
  masters: { title: string; isrc: string | null; writer_ipis: string | null }[];
}) {
  const missingIsrc = masters.filter((track) => !track.isrc);
  const missingIpi = masters.filter((track) => !track.writer_ipis?.trim());
  const items = [
    { label: "Cover", ok: Boolean(release.cover_url), miss: "Set the cover" },
    { label: "3000×3000", ok: Boolean(release.cover_url?.startsWith("/media/")), miss: "Upload the cover so it is saved at 3000×3000" },
    { label: "UPC", ok: Boolean(release.upc), miss: "UPC missing" },
    { label: "Distributor", ok: Boolean(release.distributor), miss: "Distributor missing" },
    { label: "Masters", ok: masters.length > 0, miss: "No masters" },
    { label: "ISRC", ok: masters.length > 0 && missingIsrc.length === 0, miss: missingIsrc.length ? missingIsrc.map((track) => track.title).join(", ") : "ISRC missing" },
    { label: "Writer IPI", ok: masters.length > 0 && missingIpi.length === 0, miss: missingIpi.length ? missingIpi.map((track) => track.title).join(", ") : "IPI missing" },
  ];
  const open = items.filter((item) => !item.ok);

  return (
    <div className="sheet-block">
      <div className="section-head">
        <h3>Delivery</h3>
        <span className="meta">{open.length === 0 ? "Ready" : `${open.length} open`}</span>
      </div>
      <div className="checks">
        {items.map((item) => (
          <span className={item.ok ? "ready ok" : "ready"} key={item.label} title={item.ok ? "On file" : item.miss}>
            {item.label}
          </span>
        ))}
      </div>
      {open.length ? <p className="meta">{open.map((item) => item.miss).join(" · ")}</p> : <p className="meta">Cover, codes, and distributor are on file.</p>}
    </div>
  );
}

export function SplitList({ trackId, splits, next }: { trackId: string; splits: Split[]; next: string }) {
  const rows = splits.filter((split) => split.track_id === trackId);
  return (
    <div className="split-list">
      {rows.map((split) => (
        <div className="master-line" key={split.id}>
          <div>
            <strong>
              {split.name}
              {split.share != null ? ` · ${split.share}%` : ""}
            </strong>
            <p className="meta">
              {[labelFor(SPLIT_ROLES, split.role), split.ipi ? `IPI ${split.ipi}` : "", split.pro].filter(Boolean).join(" · ")}
            </p>
          </div>
          <form action={deleteSplit}>
            <input type="hidden" name="id" value={split.id} />
            <input type="hidden" name="next" value={next} />
            <ConfirmSubmit className="btn danger small" label="Remove" message={`Remove ${split.name} from the split?`} />
          </form>
        </div>
      ))}
      <details className="drawer">
        <summary>Add to the split</summary>
        <form action={createSplit} className="form-grid">
          <input type="hidden" name="track_id" value={trackId} />
          <input type="hidden" name="next" value={next} />
          <Field label="Name">
            <input name="name" required placeholder="Writer, publisher, or who collects" />
          </Field>
          <Field label="Role">
            <select name="role" defaultValue="writer">
              {SPLIT_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Share %">
            <input name="share" inputMode="decimal" min="0" max="100" step="0.01" placeholder="50" />
          </Field>
          <Field label="IPI">
            <input name="ipi" inputMode="numeric" placeholder="00123456789" />
          </Field>
          <Field label="PRO">
            <input name="pro" placeholder="ASCAP, BMI, SESAC" />
          </Field>
          <div className="actions wide">
            <SubmitButton label="Save split" />
          </div>
        </form>
      </details>
    </div>
  );
}

export function CampaignBlock({
  release,
  campaign,
  bookings,
  influencers,
  next,
}: {
  release: { id: string; title: string };
  campaign: Campaign | null;
  bookings: CampaignBooking[];
  influencers: { id: string; name: string; handle: string | null }[];
  next: string;
}) {
  return (
    <div className="sheet-block">
      <div className="section-head">
        <h3>Promo</h3>
        {campaign ? <span className="meta">{labelFor(CAMPAIGN_STATUSES, campaign.status)} · {money(campaign.budget_cents)}</span> : null}
      </div>
      {campaign ? (
        <>
          <p>
            <strong>{campaign.name}</strong>
          </p>
          {campaign.notes ? <p className="meta">{campaign.notes}</p> : null}
          {bookings.map((booking) => (
            <div className="master-line" key={booking.id}>
              <div>
                <strong>{booking.handle || booking.influencer_name || "Influencer"}</strong>
                <p className="meta">
                  {[booking.influencer_name, booking.paid ? `Paid ${booking.paid}` : "No fee logged", booking.posted ? "Posted" : "Not posted yet"].filter(Boolean).join(" · ")}
                </p>
                {booking.post_url ? (
                  <a href={booking.post_url} target="_blank" rel="noreferrer">
                    {booking.post_url}
                  </a>
                ) : null}
              </div>
              <form action={deleteBooking}>
                <input type="hidden" name="id" value={booking.id} />
                <input type="hidden" name="next" value={next} />
                <ConfirmSubmit className="btn danger small" label="Remove" message="Remove this influencer from the campaign?" />
              </form>
            </div>
          ))}
          {bookings.map((booking) => (
            <details className="drawer" key={`${booking.id}-edit`}>
              <summary>{booking.posted ? "Update the post" : `Mark ${booking.handle || booking.influencer_name || "them"} posted`}</summary>
              <form action={updateBooking} className="form-grid">
                <input type="hidden" name="id" value={booking.id} />
                <input type="hidden" name="next" value={next} />
                <Field label="Paid">
                  <input name="paid" defaultValue={booking.paid ?? ""} placeholder="$500, or product" />
                </Field>
                <Field label="Post URL">
                  <input name="post_url" defaultValue={booking.post_url ?? ""} placeholder="https://" />
                </Field>
                <label className="check">
                  <input type="checkbox" name="posted" value="1" defaultChecked={booking.posted === 1} />
                  <span>Posted</span>
                </label>
                <div className="actions wide">
                  <SubmitButton label="Save booking" />
                </div>
              </form>
            </details>
          ))}
          <details className="drawer">
            <summary>Book an influencer</summary>
            <form action={createBooking} className="form-grid">
              <input type="hidden" name="campaign_id" value={campaign.id} />
              <input type="hidden" name="next" value={next} />
              <Field label="Influencer" wide>
                <select name="influencer_id" defaultValue="" required>
                  <option value="">Choose from the contact book</option>
                  {influencers.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                      {person.handle ? ` · ${person.handle}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Paid">
                <input name="paid" placeholder="$500, or product" />
              </Field>
              <Field label="Post URL">
                <input name="post_url" placeholder="https://" />
              </Field>
              <label className="check">
                <input type="checkbox" name="posted" value="1" />
                <span>Already posted</span>
              </label>
              <div className="actions wide">
                <SubmitButton label="Add to the campaign" />
              </div>
            </form>
          </details>
          <form action={deleteCampaign}>
            <input type="hidden" name="id" value={campaign.id} />
            <input type="hidden" name="next" value={next} />
            <ConfirmSubmit className="btn danger small" label="Close campaign" message={`Remove the ${campaign.name} campaign?`} />
          </form>
        </>
      ) : (
        <form action={createCampaign} className="form-grid">
          <input type="hidden" name="release_id" value={release.id} />
          <input type="hidden" name="next" value={next} />
          <Field label="Campaign" wide>
            <input name="name" required defaultValue={`${release.title} promo`} />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue="planning">
              {CAMPAIGN_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Budget, USD">
            <input name="budget" inputMode="decimal" min="0" step="0.01" placeholder="0" />
          </Field>
          <Field label="Notes" wide>
            <textarea name="notes" placeholder="Who is running it, and what the ask is." />
          </Field>
          <div className="actions wide">
            <SubmitButton label="Open campaign" />
          </div>
        </form>
      )}
    </div>
  );
}
