import Link from "next/link";
import { clearSampleDesk } from "@/lib/actions";
import { ConfirmSubmit } from "@/components/controls";
import { DailyTodos, PostNotifications } from "@/components/DeskToday";
import { ListenerBoard, type ChartMark } from "@/components/ListenerBoard";
import { Balance, Banner, Mono, PageHeader, Pill } from "@/components/ui";
import { dashboard, hasSample, listArtists, listListenerLogs, listLogs, listReleaseViews, listTodos, rosterRows } from "@/lib/db";
import { dayStats } from "@/lib/checklist";
import { ago, compact, money, prettyDate, today } from "@/lib/format";
import { LOG_KINDS, STAGES, labelFor, priorityTone, statusTone, RELEASE_STATUSES } from "@/lib/labels";

export const metadata = { title: "Desk" };

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const desk = await dashboard();
  const sample = await hasSample();
  const roster = await rosterRows();
  const artists = await listArtists();
  const listenerLogs = await listListenerLogs();
  const logs = await listLogs();
  const doneLogs = logs.filter((entry) => entry.status !== "planned");
  const todayCount = doneLogs.filter((entry) => entry.log_date === today()).length;
  const todayLogs = doneLogs.filter((entry) => entry.log_date === today()).slice(0, 8);
  const todos = await listTodos();
  const releases = (await listReleaseViews()).map((release) => ({ id: release.id, title: release.title }));
  const todayChecks = dayStats(todos.filter((todo) => todo.todo_date === today()));
  const listenerTotal = artists.reduce((sum, artist) => sum + (artist.monthly_listeners ?? 0), 0);
  const hasListeners = artists.some((artist) => artist.monthly_listeners != null);
  const duePosts = logs.filter((entry) => entry.status === "planned" && entry.kind === "post" && entry.log_date <= today());

  return (
    <>
      {sample ? (
        <div className="sample">
          <p>Sample artists are fiction, so you can see a full label file. Clear them when you are ready to run real ones.</p>
          <form action={clearSampleDesk}>
            <ConfirmSubmit className="btn" label="Clear sample artists" message="Remove the sample roster, pipeline, deals, and masters? Artists you added stay." />
          </form>
        </div>
      ) : null}
      <PageHeader
        kicker="Label desk"
        title="FOF Records"
        lede="Log the monthly listeners. The line shows the gain or the drop, and how far it is from 100K."
      >
        <Link className="btn primary" href="/artists/new">
          Add artist
        </Link>
      </PageHeader>
      <Banner message={error} />

      <section className="glance" aria-label="Desk at a glance">
        <a className="glance-card" href="#listeners">
          <b>{hasListeners ? compact(listenerTotal) : "—"}</b>
          <span>Monthly listeners</span>
        </a>
        <Link className="glance-card" href="/checklist">
          <b>{todayChecks.total ? `${todayChecks.done}/${todayChecks.total}` : "—"}</b>
          <span>Checklist today</span>
        </Link>
        <a className="glance-card" href="#today">
          <b>{duePosts.length}</b>
          <span>Posts due</span>
        </a>
        <Link className="glance-card" href="/log">
          <b>{todayCount}</b>
          <span>Logged today</span>
        </Link>
      </section>

      <section className="section stack" id="listeners">
        {artists.map((artist) => (
          <ListenerBoard
            key={artist.id}
            artist={artist}
            logs={listenerLogs.filter((log) => log.artist_id === artist.id)}
            marks={doneLogs.filter((entry) => entry.artist_id === artist.id).map(chartMark)}
            next="/"
          />
        ))}
      </section>

      <section className="section stack" id="today">
        <PostNotifications posts={duePosts} />
        <DailyTodos todos={todos} releases={releases} />
      </section>

      <div className="desk-more">
      <section className="section stats">
        <Link className="stat" href="/roster">
          <b>{desk.rosterCount}</b>
          <span>On the roster</span>
        </Link>
        <Link className="stat" href="/pipeline">
          <b>{desk.pipelineCount}</b>
          <span>In A&R</span>
        </Link>
        <Link className="stat" href="/pipeline">
          <b>{desk.offerCount}</b>
          <span>Offer or legal</span>
        </Link>
        <Link className="stat" href="/catalog">
          <b className={desk.unrecouped > 0 ? "hot-text" : "good-text"}>{money(desk.unrecouped)}</b>
          <span>Unrecouped</span>
        </Link>
        <Link className="stat" href="/catalog">
          <b className="good-text">{money(desk.payable)}</b>
          <span>Past recoupment</span>
        </Link>
      </section>

      <section className="section card">
        <div className="section-head">
          <h2>Today</h2>
          <span className="actions">
            <Link href="/week">Week ahead</Link>
            <Link href="/log">Daily log</Link>
          </span>
        </div>
        {todayLogs.length ? (
          todayLogs.map((entry) => (
            <div className="log-row" key={entry.id}>
              <span className="kind-mark">{labelFor(LOG_KINDS, entry.kind)}</span>
              <div>
                <strong>{entry.title}</strong>
                {entry.body ? <p className="meta">{entry.body}</p> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="meta">Nothing posted, no promo run, and no blog yet today.</p>
        )}
      </section>

      <section className="section grid-2">
        <article className="card">
          <div className="section-head">
            <h2>Needs a decision</h2>
            <Link href="/pipeline">Pipeline</Link>
          </div>
          {desk.hot.length ? (
            desk.hot.map((artist) => (
              <Link className="line" key={artist.id} href={`/artists/${artist.id}`}>
                <Mono name={artist.name} image={artist.image_url} />
                <div>
                  <strong>{artist.name}</strong>
                  <span>
                    {labelFor(STAGES, artist.stage)}
                    {artist.genre ? ` · ${artist.genre}` : ""}
                    {artist.base_city ? ` · ${artist.base_city}` : ""}
                  </span>
                </div>
                <Pill tone={priorityTone(artist.priority)}>{artist.priority}</Pill>
              </Link>
            ))
          ) : (
            <p className="meta">Nothing is waiting. The pipeline is quiet.</p>
          )}
        </article>
        <article className="card stack">
          <div className="section-head">
            <h2>On the calendar</h2>
            <Link href="/releases">Releases</Link>
          </div>
          {desk.coming.map((release) => (
            <Link className="line" key={release.id} href={`/releases/${release.id}`}>
              <Mono name={release.title} image={release.cover_url} />
              <div>
                <strong>{release.title}</strong>
                <span>
                  {release.artist_name} · {labelFor(RELEASE_STATUSES, release.status)}
                  {release.release_date ? ` · ${prettyDate(release.release_date)}` : ""}
                </span>
              </div>
              <Pill tone={statusTone(release.status)}>{labelFor(RELEASE_STATUSES, release.status)}</Pill>
            </Link>
          ))}
          {desk.due.map((project) => (
            <Link className="line" key={project.id} href={project.artist_id ? `/artists/${project.artist_id}#budgets` : "/projects"}>
              <Mono name={project.name} />
              <div>
                <strong>{project.name}</strong>
                <span>
                  {project.artist_name || "Label"} · {project.overdue ? "Overdue" : "Due"} {prettyDate(project.due_date)}
                </span>
              </div>
              <Pill tone={project.overdue ? "high" : "sky"}>{project.overdue ? "Overdue" : "Due"}</Pill>
            </Link>
          ))}
          {desk.coming.length === 0 && desk.due.length === 0 ? <p className="meta">No dated releases or open budgets in the next three weeks.</p> : null}
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Roster balances</h2>
          <Link href="/roster">Full roster</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Artist</th>
                <th>Listeners</th>
                <th className="num">Advance</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <tr key={row.artist.id}>
                  <td data-label="Artist">
                    <div className="brand-name">
                      <Mono name={row.artist.name} image={row.artist.image_url} />
                      <Link className="rowlink" href={`/artists/${row.artist.id}`}>
                        {row.artist.name}
                      </Link>
                    </div>
                    <div className="meta">{row.artist.genre}</div>
                  </td>
                  <td data-label="Listeners">{compact(row.artist.monthly_listeners)}</td>
                  <td className="num" data-label="Advance">{money(row.advance)}</td>
                  <td className="num" data-label="Balance">
                    <Balance cents={row.balance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section card">
        <h2>Latest on the desk</h2>
        <ul className="timeline">
          {desk.activity.map((item) => (
            <li key={item.id}>
              <time dateTime={item.created_at}>{ago(item.created_at)}</time>
              <div>
                <strong>{item.artist_name ? `${item.artist_name} · ` : ""}{item.action}</strong>
                <p className="meta">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </>
  );
}

function chartMark(entry: { id: string; log_date: string; kind: string; title: string }): ChartMark {
  return { id: entry.id, log_date: entry.log_date, kind: entry.kind, title: entry.title };
}
