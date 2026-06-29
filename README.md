# IFL Tracker — ifl.indoorfootballindex.com

Indoor Football League standings, rosters, and transactions site.
Stack: Cloudflare Worker + D1 (SQLite) + static HTML/CSS/JS.

---

## Repo Structure

```
ifl-site/
  worker/
    index.js          ← Cloudflare Worker (all API logic)
    wrangler.toml     ← Worker config
    schema.sql        ← D1 database schema
    package.json
  public/
    index.html        ← Home page
    standings.html    ← Standings
    roster.html       ← Rosters (by team / by position / all)
    transactions.html ← Transaction log
    admin/
      upload.html     ← Weekly file upload page
    css/
      style.css       ← Shared styles
    js/
      shared.js       ← Nav, helpers, API base URL
```

---

## First-Time Setup

### 1. Create GitHub repo
```
github.com/indoorfootballindex/ifl-site
```
Push this entire folder.

### 2. Create D1 database in Cloudflare
- Dashboard → Storage & Databases → D1 → Create
- Name: `ifl-site-db`
- Copy the Database ID
- Paste it into `worker/wrangler.toml` where it says `REPLACE_WITH_YOUR_D1_ID`

### 3. Run schema in D1 Console
- Open the D1 database → Console tab
- Paste the contents of `worker/schema.sql` and run it

### 4. Deploy the Worker
```bash
cd worker
npx wrangler deploy
```

### 5. Set your Admin Secret
```bash
npx wrangler secret put ADMIN_SECRET
# Enter a strong password — you'll use this on the upload page
```

### 6. Set up subdomain in Cloudflare
- Dashboard → Workers & Pages → your worker → Settings → Triggers
- Add Custom Domain: `api.ifl.indoorfootballindex.com`

### 7. Deploy the front end
- Same as cards site: connect `public/` folder to Cloudflare Pages
- Set custom domain: `ifl.indoorfootballindex.com`

---

## Weekly Update Workflow

1. Get the new roster `.xlsx` and transactions `.xls` files
2. Go to `ifl.indoorfootballindex.com/admin/upload.html`
3. Enter your Admin Secret
4. Upload roster → replaces all roster data
5. Upload transactions → appends new moves (duplicates ignored)
6. Done — site updates immediately

---

## Standings Upload

Standings aren't in the roster/transaction files, so upload a TSV with these columns:

```
team_code  team_name  conference  gp  wins  losses  win_pct  conf_gp  conf_wins  conf_losses  conf_pct  sos  clinched
```

- `clinched`: use `X` for playoff clinch, `E` for eliminated, blank otherwise
- `sos`: opponents' combined win percentage (0.000–1.000)
- `conference`: `Eastern` or `Western`

---

## Team Codes

| Code | Team |
|------|------|
| AZ   | Arizona Rattlers |
| BAY  | Bay Area Panthers |
| FF   | Fishers Freight |
| GB   | Green Bay Blizzard |
| IA   | Iowa Barnstormers |
| JAX  | Jacksonville Sharks |
| NAZ  | NAZ Wranglers |
| NM   | New Mexico Chupacabras |
| ORL  | Orlando Pirates |
| QC   | Quad City Steamwheelers |
| SA   | San Antonio Gunslingers |
| SD   | San Diego Strike Force |
| TUC  | Tucson Sugar Skulls |
| TUL  | Tulsa Oilers |
| VG   | Vegas Knight Hawks |

---

## API Endpoints

All at `https://api.ifl.indoorfootballindex.com`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/roster` | All players (filter: `team`, `position`, `status`, `q`) |
| GET | `/api/transactions` | All moves (filter: `team`, `type`, `limit`, `offset`) |
| GET | `/api/standings` | All standings |
| GET | `/api/teams` | Team list |
| GET | `/api/meta` | Available positions, statuses, transaction types |
| POST | `/api/admin/upload/roster` | Replace roster (requires Bearer token) |
| POST | `/api/admin/upload/transactions` | Append transactions (requires Bearer token) |
| POST | `/api/admin/upload/standings` | Replace standings (requires Bearer token) |
