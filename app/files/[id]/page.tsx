import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/controls";
import { Banner, PageHeader } from "@/components/ui";
import { deleteVaultFile, updateVaultFile } from "@/lib/actions";
import { getVault } from "@/lib/db";
import { fileSize, prettyDate } from "@/lib/format";
import { VAULT_CATEGORIES, labelFor } from "@/lib/labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getVault(id);
  return { title: file?.title ?? "File" };
}

export default async function VaultFilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const file = await getVault(id);
  if (!file) notFound();
  const image = file.mime.startsWith("image/");
  const download = file.name || `${file.title}.${image ? "jpg" : "pdf"}`;

  return (
    <>
      <PageHeader kicker={labelFor(VAULT_CATEGORIES, file.category)} title={file.title} lede={`${fileSize(file.size)} · ${prettyDate(file.created_at)}`}>
        <Link className="btn" href={`/files?cat=${file.category}`}>
          Back
        </Link>
        <a className="btn" href={`/media/${file.id}`} target="_blank" rel="noreferrer">
          Open
        </a>
        <a className="btn" href={`/media/${file.id}`} download={download}>
          Download
        </a>
      </PageHeader>
      <Banner message={error} />
      {file.notes ? <p className="meta vault-note">{file.notes}</p> : null}
      <div className="vault-stage">
        {image ? (
          <img src={`/media/${file.id}`} alt={file.title} />
        ) : (
          <iframe title={file.title} src={`/media/${file.id}`} />
        )}
      </div>
      <section className="card stack">
        <h2>File details</h2>
        <form action={updateVaultFile} className="form-grid">
          <input type="hidden" name="id" value={file.id} />
          <input type="hidden" name="next" value={`/files/${file.id}`} />
          <label className="field wide">
            <span>Name</span>
            <input name="title" required defaultValue={file.title} />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={file.category}>
              {VAULT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Note</span>
            <input name="notes" defaultValue={file.notes ?? ""} placeholder="What this file is" />
          </label>
          <div className="actions wide">
            <button className="btn primary" type="submit">
              Save
            </button>
          </div>
        </form>
        <form action={deleteVaultFile}>
          <input type="hidden" name="id" value={file.id} />
          <input type="hidden" name="next" value={`/files?cat=${file.category}`} />
          <ConfirmSubmit className="btn danger" label="Remove file" message="Remove this file from the desk?" />
        </form>
      </section>
    </>
  );
}
