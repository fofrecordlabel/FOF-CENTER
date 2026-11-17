import Link from "next/link";
import { VaultDrop } from "@/components/VaultDesk";
import { ConfirmSubmit } from "@/components/controls";
import { Banner, PageHeader } from "@/components/ui";
import { deleteVaultFile } from "@/lib/actions";
import { listVault } from "@/lib/db";
import { fileSize, prettyDate } from "@/lib/format";
import { VAULT_CATEGORIES, labelFor } from "@/lib/labels";

export const metadata = { title: "Gallery & files" };

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ cat?: string; view?: string; error?: string }> }) {
  const { cat, view, error } = await searchParams;
  const current = VAULT_CATEGORIES.some((item) => item.value === cat) ? cat! : "all";
  const mode = view === "files" ? "files" : "gallery";
  const files = await listVault();
  const shown = files.filter((file) => current === "all" || file.category === current);
  const counts = new Map(VAULT_CATEGORIES.map((item) => [item.value, files.filter((file) => file.category === item.value).length]));

  return (
    <>
      <PageHeader
        kicker="Library"
        title="Gallery & files"
        lede="Drop important docs, screenshots, agreements, and deal PDFs. Open any of them from here."
      />
      <Banner message={error} />
      <div className="filters" aria-label="File categories">
        <Link className={current === "all" ? "pill acid on" : "pill"} href={filesHref("all", mode)}>
          All
        </Link>
        {VAULT_CATEGORIES.map((item) => (
          <Link key={item.value} className={current === item.value ? "pill acid on" : "pill"} href={filesHref(item.value, mode)}>
            {item.label}
            {counts.get(item.value) ? ` ${counts.get(item.value)}` : ""}
          </Link>
        ))}
      </div>
      <div className="filters" aria-label="Gallery or files">
        <Link className={mode === "gallery" ? "pill acid on" : "pill"} href={filesHref(current, "gallery")}>
          Gallery
        </Link>
        <Link className={mode === "files" ? "pill acid on" : "pill"} href={filesHref(current, "files")}>
          Files
        </Link>
      </div>
      <VaultDrop category={current === "all" ? "docs" : current} />
      {shown.length === 0 ? (
        <div className="empty">
          <p>{current === "all" ? "Nothing saved yet. Drop a file above." : `Nothing in ${labelFor(VAULT_CATEGORIES, current).toLowerCase()} yet.`}</p>
        </div>
      ) : mode === "gallery" ? (
        <div className="vault-grid">
          {shown.map((file) => (
            <Link className="vault-card" href={`/files/${file.id}`} key={file.id}>
              <span className="vault-thumb">{file.mime.startsWith("image/") ? <img src={`/media/${file.id}`} alt="" /> : <b>PDF</b>}</span>
              <span className="vault-copy">
                <strong>{file.title}</strong>
                <em>{labelFor(VAULT_CATEGORIES, file.category)}</em>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="stack">
          {shown.map((file) => (
            <article className="vault-row" key={file.id}>
              <Link href={`/files/${file.id}`}>
                {file.mime.startsWith("image/") ? <img src={`/media/${file.id}`} alt="" /> : <b>PDF</b>}
                <span>
                  <strong>{file.title}</strong>
                  <p className="meta">
                    {labelFor(VAULT_CATEGORIES, file.category)} · {fileSize(file.size)} · {prettyDate(file.created_at)}
                  </p>
                </span>
              </Link>
              <form action={deleteVaultFile}>
                <input type="hidden" name="id" value={file.id} />
                <input type="hidden" name="next" value={filesHref(current, mode)} />
                <ConfirmSubmit className="btn danger small" label="Remove" message="Remove this file from the desk?" />
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function filesHref(cat: string, mode: string) {
  const params = new URLSearchParams();
  if (cat !== "all") params.set("cat", cat);
  if (mode === "files") params.set("view", "files");
  const qs = params.toString();
  return qs ? `/files?${qs}` : "/files";
}
