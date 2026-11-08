# FOF Records — Ops Agents

Coordinated automation for the existing FOF CENTER label desk (`github.com/fofrecordlabel/FOF-CENTER`). Agents extend the Next.js + Supabase desk; they do not replace it.

## What shipped (Wave 1)

| Workflow | Agent | Schedule (America/New_York) |
| --- | --- | --- |
| Daily streaming metrics | Streaming Intelligence | 09:00 |
| ISRC & metadata audit | ISRC & Rights Auditing | 09:30 |
| Daily executive briefing | Chief of Staff | 10:00 |
| Integration health | Data Quality & Security | 08:00 |

Also registered (gated / honest-unavailable where credentials are missing): Release Management, Royalty Reconciliation, Financial Control, Marketing & Growth, Web Research, Contract Analysis, Catalog & A&R Intelligence, Automation Engineering, Database & Integrations, User Experience.

### Safety rails

- Never fabricates streaming numbers.
- Never exposes secrets in logs or UI.
- Never publishes releases, spends money, alters ownership, or signs contracts.
- Approval-gated workflows record human decisions; side-effect executors stay off until you approve a later change.
- Unavailable data sources are labeled `unavailable` / `misconfigured` instead of guessed.

### Streaming honesty

Spotify’s official Web API **does not** provide monthly listeners. The collector:

1. Snapshots desk `listener_logs` into `streaming_snapshots`.
2. Optionally pulls **followers/popularity** if `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` are set.
3. Optionally pulls monthly listeners from Chartmetric if `CHARTMETRIC_API_KEY` is set and the API accepts the key.
4. Otherwise reports the gap clearly on `/ops`.

## Database

On first agent run, `lib/agents/schema.ts` ensures these tables in the existing `desk` schema:

- `agent_runs`, `agent_approvals`, `agent_schedules`, `agent_alerts`, `agent_briefings`, `agent_audit_findings`
- `streaming_snapshots`, `integration_health`

Requires the same `DATABASE_URL` the desk already uses (Supabase pooler, `search_path=desk`).

## UI

Open **Ops Agents** in the desk rail (`/ops`) after unlocking with the desk PIN.

## Cron (your setup)

1. In Netlify (or your host), set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Already required by the desk |
| `AGENTS_CRON_SECRET` | Shared secret for `/api/agents/cron` |
| `ALERT_WEBHOOK_URL` | Optional Slack/Discord webhook for failures |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Optional (followers only) |
| `CHARTMETRIC_API_KEY` | Optional authorized monthly listeners |

2. Point an external scheduler (Netlify Scheduled Functions, cron-job.org, GitHub Actions, etc.) at:

```http
POST https://<your-desk-host>/api/agents/cron
Authorization: Bearer <AGENTS_CRON_SECRET>
Content-Type: application/json

{}
```

Empty body runs the Wave 1 pack. For one workflow:

```json
{ "workflowId": "daily-streaming-metrics", "force": false, "dryRun": false }
```

3. Suggested daily times (ET): 08:00 health → 09:00 streaming → 09:30 ISRC → 10:00 briefing. The default POST runs all four Wave 1 jobs once; use `workflowId` if you prefer separate cron entries.

## Manual runs

From `/ops`, use **Run** / **Dry run** / **Force**. Dry run executes logic without writing snapshots/briefings where those writes are gated by `ctx.dryRun`.

## Approvals

Workflows that propose actions (release packet prep, budget freeze proposal, promo plan draft, legal review request) create `agent_approvals` rows. Recording approve/reject on `/ops` stores the decision only — it does **not** auto-execute irreversible work.

## Local / Cloud Agent notes

- `npm run build` must pass.
- Pure unit tests: `npm run test:agents`.
- Without `DATABASE_URL`, live workflow runs against Supabase will fail; that is expected until the secret is available in the environment.

## Costs (order of magnitude)

| Item | Notes |
| --- | --- |
| Netlify site | Existing desk hosting |
| Supabase Postgres | Existing desk DB; new tables are small |
| Spotify Developer app | Free for client-credentials metadata |
| Chartmetric | Paid — only if you choose it |
| Cron pings | Usually free on external cron tiers |

## Your approval checklist

- [ ] Confirm Netlify `DATABASE_URL` still points at the desk Supabase project
- [ ] Generate and set `AGENTS_CRON_SECRET`
- [ ] Decide whether to buy/connect Chartmetric (optional)
- [ ] Create Spotify Developer app if you want followers snapshots (optional)
- [ ] Add `ALERT_WEBHOOK_URL` if you want push failure alerts (optional)
- [ ] Schedule the daily cron POST
- [ ] Review first Wave 1 runs on `/ops` before enabling any future side-effect executors
