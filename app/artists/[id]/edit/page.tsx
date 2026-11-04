import { notFound } from "next/navigation";
import { ArtistForm } from "@/components/ArtistForm";
import { Banner, PageHeader } from "@/components/ui";
import { getArtist } from "@/lib/db";

export const metadata = { title: "Edit artist" };

export default async function EditArtistPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const artist = await getArtist(id);
  if (!artist) notFound();
  return (
    <>
      <PageHeader kicker="Edit file" title={artist.name} lede="Deals, masters, budgets, and statements stay on the file." />
      <Banner message={error} />
      <ArtistForm artist={artist} />
    </>
  );
}
