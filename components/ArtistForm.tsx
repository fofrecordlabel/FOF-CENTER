import Link from "next/link";
import { createArtist, deleteArtist, updateArtist } from "@/lib/actions";
import { PRIORITIES, STAGES } from "@/lib/labels";
import type { Artist } from "@/lib/types";
import { ConfirmSubmit, SubmitButton } from "./controls";
import { Field } from "./ui";

export function ArtistForm({ artist }: { artist?: Artist | null }) {
  return (
    <div className="stack">
      <form action={artist ? updateArtist : createArtist} className="stack">
        {artist ? <input type="hidden" name="id" value={artist.id} /> : null}
        <section className="card stack">
          <div>
            <h2>Where they stand</h2>
            <p className="meta">Signed, Active, Paused, and Catalog land on the roster. Everything before that stays in A&R.</p>
          </div>
          <div className="form-grid">
            <Field label="Stage">
              <select name="stage" defaultValue={artist?.stage ?? "discovered"}>
                {STAGES.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={artist?.priority ?? "standard"}>
                {PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="A&R">
              <input name="ar_rep" defaultValue={artist?.ar_rep ?? ""} placeholder="Who owns the conversation" />
            </Field>
            <Field label="Source">
              <input name="source" defaultValue={artist?.source ?? ""} placeholder="Show, demo, manager, playlist" />
            </Field>
            <Field label="Signed" hint="Leave blank until the deal is executed.">
              <input name="signed_date" type="date" defaultValue={artist?.signed_date ?? ""} />
            </Field>
          </div>
        </section>

        <section className="card stack">
          <h2>Identity</h2>
          <div className="form-grid">
            <Field label="Name">
              <input name="name" required defaultValue={artist?.name ?? ""} placeholder="Stage name" autoComplete="off" />
            </Field>
            <Field label="Legal name">
              <input name="legal_name" defaultValue={artist?.legal_name ?? ""} />
            </Field>
            <Field label="IPI" hint="The artist's own IPI if they write. 9 to 11 digits.">
              <input name="ipi" inputMode="numeric" defaultValue={artist?.ipi ?? ""} placeholder="00000000000" />
            </Field>
            <Field label="Genre">
              <input name="genre" defaultValue={artist?.genre ?? ""} placeholder="Alt-pop, rap, regional Mexican" />
            </Field>
            <Field label="Based in">
              <input name="base_city" defaultValue={artist?.base_city ?? ""} />
            </Field>
            <Field label="Hometown">
              <input name="hometown" defaultValue={artist?.hometown ?? ""} />
            </Field>
            <Field label="Photo URL" hint="Paste a link. The desk stores the link, not the file.">
              <input name="image_url" defaultValue={artist?.image_url ?? ""} placeholder="https://" />
            </Field>
            <Field label="Short bio" wide>
              <textarea name="bio" defaultValue={artist?.bio ?? ""} />
            </Field>
          </div>
        </section>

        <section className="card stack">
          <h2>Audience and contact</h2>
          <div className="form-grid">
            <Field label="Monthly listeners">
              <input name="monthly_listeners" inputMode="numeric" defaultValue={artist?.monthly_listeners ?? ""} />
            </Field>
            <Field label="Instagram followers">
              <input name="ig_followers" inputMode="numeric" defaultValue={artist?.ig_followers ?? ""} />
            </Field>
            <Field label="TikTok followers">
              <input name="tiktok_followers" inputMode="numeric" defaultValue={artist?.tiktok_followers ?? ""} />
            </Field>
            <Field label="Instagram">
              <input name="instagram" defaultValue={artist?.instagram ?? ""} placeholder="@handle or URL" />
            </Field>
            <Field label="TikTok">
              <input name="tiktok" defaultValue={artist?.tiktok ?? ""} placeholder="@handle or URL" />
            </Field>
            <Field label="YouTube">
              <input name="youtube" defaultValue={artist?.youtube ?? ""} placeholder="@handle or URL" />
            </Field>
            <Field label="Spotify URL">
              <input name="spotify_url" defaultValue={artist?.spotify_url ?? ""} placeholder="https://open.spotify.com/..." />
            </Field>
            <Field label="Website">
              <input name="website" defaultValue={artist?.website ?? ""} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={artist?.email ?? ""} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={artist?.phone ?? ""} />
            </Field>
          </div>
        </section>

        <section className="card stack">
          <div>
            <h2>A&R read</h2>
            <p className="meta">Why they belong here, or why they do not. This sits at the top of the file.</p>
          </div>
          <Field label="Read" wide>
            <textarea name="interest" defaultValue={artist?.interest ?? ""} />
          </Field>
        </section>

        <div className="actions">
          <SubmitButton label={artist ? "Save changes" : "Add to the desk"} />
          <Link className="btn" href={artist ? `/artists/${artist.id}` : "/pipeline"}>
            Cancel
          </Link>
        </div>
      </form>
      {artist ? (
        <form action={deleteArtist}>
          <input type="hidden" name="id" value={artist.id} />
          <ConfirmSubmit className="btn danger" label="Delete artist" message={`Delete ${artist.name} and the whole file? Deals, masters, and statements go with them.`} />
        </form>
      ) : null}
    </div>
  );
}
