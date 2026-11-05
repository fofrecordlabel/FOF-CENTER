import { notFound } from "next/navigation";
import { DossierView } from "@/components/Dossier";
import { Banner } from "@/components/ui";
import { getDossier, listListenerLogs, listLogs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await getDossier(id);
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
  const file = await getDossier(id);
  if (!file) notFound();
  const listeners = await listListenerLogs(id);
  const marks = (await listLogs())
    .filter((entry) => entry.artist_id === id && entry.status !== "planned")
    .map((entry) => ({ id: entry.id, log_date: entry.log_date, kind: entry.kind, title: entry.title }));
  return (
    <>
      <Banner message={error} />
      <DossierView file={file} listeners={listeners} marks={marks} />
    </>
  );
}
