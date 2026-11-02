import { ArtistForm } from "@/components/ArtistForm";
import { Banner, PageHeader } from "@/components/ui";

export const metadata = { title: "Add artist" };

export default async function NewArtistPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader kicker="New file" title="Add an artist" lede="A signing target and a roster artist use the same file. The stage decides which board they sit on." />
      <Banner message={error} />
      <ArtistForm />
    </>
  );
}
