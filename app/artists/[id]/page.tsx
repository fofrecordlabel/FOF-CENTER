import { notFound } from "next/navigation";
import { DossierView } from "@/components/Dossier";
import { Banner } from "@/components/ui";
import { getDossier, listListenerLogs, listLogs } from "@/lib/db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = getDossier(id);
  return { title: file?.artist.name ?? "Artist" };
}

export default async function ArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const file = getDossier(id);
  if (!file) notFound();
  return (
    <>
      <Banner message={error} />
      <DossierView
        file={file}
        listeners={listListenerLogs(id)}
        marks={listLogs()
          .filter((entry) => entry.artist_id === id && entry.status !== "planned")
          .map((entry) => ({ id: entry.id, log_date: entry.log_date, kind: entry.kind, title: entry.title }))}
      />
    </>
  );
}
