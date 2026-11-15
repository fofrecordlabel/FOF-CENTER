import { QuickLinks } from "@/components/QuickLinks";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Quicklinks" };

export default function LinksPage() {
  return (
    <>
      <PageHeader
        kicker="Outside desks"
        title="Quicklinks"
        lede="Streaming, campaigns, rights, and distribution. Search or filter, then pin the desks you open every day. Pinned ones stay first here and on the home screen."
      />
      <QuickLinks />
    </>
  );
}
