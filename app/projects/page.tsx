import Link from "next/link";
import { deleteProject } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { ProjectForm } from "@/components/RecordForms";
import { Banner, BudgetBar, PageHeader, Pill } from "@/components/ui";
import { listArtists, listProjectViews, listReleaseViews } from "@/lib/db";
import { money, prettyDate } from "@/lib/format";
import { PROJECT_KINDS, PROJECT_STATUSES, labelFor, statusTone } from "@/lib/labels";

export const metadata = { title: "Budgets" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const projects = listProjectViews();
  const artists = listArtists().map((artist) => ({ id: artist.id, name: artist.name }));
  const releases = listReleaseViews().map((release) => ({ id: release.id, title: release.title, artist_name: release.artist_name }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader kicker="Spend" title="Budgets" lede="Recording, video, marketing, tour support. What was approved, and what has been spent." />
      <Banner message={error} />
      <div className="stack">
        {projects.map((project) => {
          const overdue = Boolean(project.due_date && project.due_date < today && (project.status === "active" || project.status === "planned"));
          return (
            <article className="card stack" key={project.id}>
              <div className="section-head">
                <div>
                  <h2>{project.name}</h2>
                  <p className="meta">
                    {project.artist_id ? <Link href={`/artists/${project.artist_id}`}>{project.artist_name}</Link> : "Label"}
                    {" · "}
                    {labelFor(PROJECT_KINDS, project.kind)}
                    {project.release_title ? ` · ${project.release_title}` : ""}
                    {project.owner ? ` · ${project.owner}` : ""}
                    {project.due_date ? ` · ${overdue ? "Overdue" : "Due"} ${prettyDate(project.due_date)}` : ""}
                  </p>
                </div>
                <Pill tone={statusTone(project.status)}>{labelFor(PROJECT_STATUSES, project.status)}</Pill>
              </div>
              <p className="meta">{money(project.spent_cents)} of {money(project.budget_cents)}</p>
              <BudgetBar budget={project.budget_cents} spent={project.spent_cents} />
              {project.notes ? <p>{project.notes}</p> : null}
              <details className="drawer">
                <summary>Edit budget</summary>
                <ProjectForm artists={artists} releases={releases} project={project} next="/projects" />
              </details>
              <form action={deleteProject}>
                <input type="hidden" name="id" value={project.id} />
                <input type="hidden" name="next" value="/projects" />
                <ConfirmSubmit className="btn danger small" label="Delete" message="Delete this budget?" />
              </form>
            </article>
          );
        })}
      </div>
      <section className="section card stack">
        <h2>Open a budget</h2>
        <ProjectForm artists={artists} releases={releases} next="/projects" />
      </section>
    </>
  );
}
