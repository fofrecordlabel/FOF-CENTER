import { ArtConverter } from "@/components/ArtConverter";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Cover art" };

export default function ArtPage() {
  return (
    <>
      <PageHeader
        kicker="Delivery"
        title="3000×3000"
        lede="Turn any song image into the square cover file distributors ask for. Nothing is uploaded. The file stays on this computer until you download it."
      />
      <ArtConverter />
    </>
  );
}
