import { ArtConverter } from "@/components/ArtConverter";
import { PageHeader } from "@/components/ui";
import { listReleaseViews } from "@/lib/db";

export const metadata = { title: "Cover art" };

export default async function ArtPage() {
  const releases = (await listReleaseViews()).map((release) => ({ id: release.id, title: release.title, artist_name: release.artist_name }));
  return (
    <>
      <PageHeader
        kicker="Delivery"
        title="3000×3000"
        lede="Any photo you upload is cropped to a square, saved at 3000×3000, and kept on the song."
      />
      <ArtConverter releases={releases} />
    </>
  );
}
