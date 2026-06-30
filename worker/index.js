// IFL Site - Cloudflare Worker
// Routes: /api/roster, /api/transactions, /api/standings, /api/admin/upload

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── Fuzzy typo-tolerant matching ───────────────────────────────────────────
// Levenshtein distance for catching typos like "Relaase", "Acitve", "Suspeneded"
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

const STATUS_CANON = [
  { value: 'Active',                key: 'active' },
  { value: 'RTR',                   key: 'rtr' },
  { value: 'PUP',                   key: 'pup' },
  { value: 'Short-Term IR',         key: 'shorttermir' },
  { value: 'Season IR',             key: 'seasonir' },
  { value: 'League IR',             key: 'leagueir' },
  { value: 'Exempt – CFL',          key: 'exemptcfl' },
  { value: 'Exempt – UFL',          key: 'exemptufl' },
  { value: 'Exempt – NFL',          key: 'exemptnfl' },
  { value: "Commissioners Exempt",  key: 'commissionersexempt' },
  { value: 'Suspended',             key: 'suspended' },
  { value: 'Retired',               key: 'retired' },
];

const TRANS_CANON = [
  { value: 'Sign',           key: 'sign' },
  { value: 'Release',        key: 'release' },
  { value: 'RTR',            key: 'rtr' },
  { value: 'Short-Term IR',  key: 'shorttermir' },
  { value: 'Season IR',      key: 'seasonir' },
  { value: 'Exempt – CFL',   key: 'exemptcfl' },
  { value: 'Exempt – UFL',   key: 'exemptufl' },
  { value: 'Exempt – NFL',   key: 'exemptnfl' },
  { value: 'Suspended',      key: 'suspended' },
  { value: 'Retired',        key: 'retired' },
];

function fuzzyMatch(raw, canonList, maxDist = 2) {
  if (!raw) return canonList[0].value;
  const cleaned = raw.toString().trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return raw.toString().trim();

  for (const c of canonList) {
    if (cleaned === c.key) return c.value;
  }
  for (const c of canonList) {
    if (cleaned.includes(c.key) || c.key.includes(cleaned)) return c.value;
  }
  let best = null, bestDist = Infinity;
  for (const c of canonList) {
    const d = levenshtein(cleaned, c.key);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  if (best && bestDist <= Math.max(maxDist, Math.floor(best.key.length * 0.3))) {
    return best.value;
  }
  return raw.toString().trim();
}

function normalizeStatus(raw) {
  return fuzzyMatch(raw, STATUS_CANON);
}

function normalizeTransType(raw) {
  return fuzzyMatch(raw, TRANS_CANON);
}

function titleCase(str) {
  if (!str) return '';
  return str.toString().trim().split(/\s+/).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}

// ── CSV parser (simple, handles quoted fields) ─────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

// ── ADMIN AUTH ─────────────────────────────────────────────────────────────
function checkAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  return token === env.ADMIN_SECRET;
}

// ── ROUTER ─────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // GET /api/roster?team=AZ&position=QB&status=Active&q=smith
    if (path === '/api/roster' && request.method === 'GET') {
      const team = url.searchParams.get('team');
      const position = url.searchParams.get('position');
      const status = url.searchParams.get('status');
      const q = url.searchParams.get('q');

      let query = 'SELECT * FROM roster WHERE 1=1';
      const params = [];

      if (team) { query += ' AND team_code = ?'; params.push(team); }
      if (position) { query += ' AND position = ?'; params.push(position); }
      if (status) { query += ' AND status = ?'; params.push(status); }
      if (q) {
        query += ' AND (last_name LIKE ? OR first_name LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
      }
      query += ' ORDER BY team_code, last_name, first_name';

      const result = await env.DB.prepare(query).bind(...params).all();
      return json(result.results);
    }

    // GET /api/transactions?team=AZ&type=Sign&limit=50&offset=0
    if (path === '/api/transactions' && request.method === 'GET') {
      const team = url.searchParams.get('team');
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = 'SELECT * FROM transactions WHERE 1=1';
      const params = [];

      if (team) { query += ' AND team_name LIKE ?'; params.push(`%${team}%`); }
      if (type) { query += ' AND trans_type = ?'; params.push(type); }
      query += ' ORDER BY trans_date DESC, id DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const result = await env.DB.prepare(query).bind(...params).all();

      // also get count
      let countQ = 'SELECT COUNT(*) as cnt FROM transactions WHERE 1=1';
      const countParams = [];
      if (team) { countQ += ' AND team_name LIKE ?'; countParams.push(`%${team}%`); }
      if (type) { countQ += ' AND trans_type = ?'; countParams.push(type); }
      const countRes = await env.DB.prepare(countQ).bind(...countParams).first();

      return json({ transactions: result.results, total: countRes.cnt });
    }

    // GET /api/standings?season=2026
    if (path === '/api/standings' && request.method === 'GET') {
      const season = url.searchParams.get('season') || '2026';
      const standings = await env.DB.prepare(
        'SELECT * FROM standings WHERE season = ? ORDER BY conference, win_pct DESC, wins DESC'
      ).bind(season).all();
      return json(standings.results);
    }

    // GET /api/standings/seasons — list of years with data
    if (path === '/api/standings/seasons' && request.method === 'GET') {
      const seasons = await env.DB.prepare(
        'SELECT DISTINCT season FROM standings ORDER BY season DESC'
      ).all();
      return json(seasons.results.map(r => r.season));
    }

    // GET /api/teams
    if (path === '/api/teams' && request.method === 'GET') {
      const teams = await env.DB.prepare(
        'SELECT DISTINCT team_code, team_name FROM roster ORDER BY team_name'
      ).all();
      return json(teams.results);
    }

    // GET /api/meta — transaction types, positions for filters
    if (path === '/api/meta' && request.method === 'GET') {
      const positions = await env.DB.prepare(
        "SELECT DISTINCT position FROM roster WHERE position != '' ORDER BY position"
      ).all();
      const types = await env.DB.prepare(
        "SELECT DISTINCT trans_type FROM transactions WHERE trans_type != '' ORDER BY trans_type"
      ).all();
      const statuses = await env.DB.prepare(
        "SELECT DISTINCT status FROM roster WHERE status != '' ORDER BY status"
      ).all();
      return json({
        positions: positions.results.map(r => r.position),
        transTypes: types.results.map(r => r.trans_type),
        statuses: statuses.results.map(r => r.status),
      });
    }

    // POST /api/admin/upload/roster — expects JSON array of roster rows
    if (path === '/api/admin/upload/roster' && request.method === 'POST') {
      if (!checkAuth(request, env)) return err('Unauthorized', 401);

      const rows = await request.json();
      if (!Array.isArray(rows) || !rows.length) return err('No data');

      // Clear and re-insert
      await env.DB.prepare('DELETE FROM roster').run();

      const TEAM_NAMES = {
        AZ: 'Arizona Rattlers', BAY: 'Bay Area Panthers', FF: 'Fishers Freight',
        GB: 'Green Bay Blizzard', IA: 'Iowa Barnstormers', JAX: 'Jacksonville Sharks',
        NAZ: 'NAZ Wranglers', NM: 'New Mexico Chupacabras', ORL: 'Orlando Pirates',
        QC: 'Quad City Steamwheelers', SA: 'San Antonio Gunslingers',
        SD: 'San Diego Strike Force', TUC: 'Tucson Sugar Skulls',
        TUL: 'Tulsa Oilers', VG: 'Vegas Knight Hawks',
      };

      const stmt = env.DB.prepare(
        `INSERT INTO roster (team_code, team_name, last_name, first_name, jersey, position, height, weight, college, level, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batch = rows.map(r => stmt.bind(
        r.team_code || '',
        TEAM_NAMES[r.team_code] || r.team_code || '',
        titleCase(r.last_name),
        titleCase(r.first_name),
        r.jersey || '',
        r.position || '',
        r.height || '',
        r.weight || '',
        r.college || '',
        r.level || '',
        normalizeStatus(r.status)
      ));

      await env.DB.batch(batch);
      return json({ ok: true, count: rows.length });
    }

    // POST /api/admin/upload/transactions — expects JSON array
    if (path === '/api/admin/upload/transactions' && request.method === 'POST') {
      if (!checkAuth(request, env)) return err('Unauthorized', 401);

      const rows = await request.json();
      if (!Array.isArray(rows) || !rows.length) return err('No data');

      // Append (don't clear — transactions are historical)
      const stmt = env.DB.prepare(
        `INSERT OR IGNORE INTO transactions (team_name, last_name, first_name, jersey, position, height, weight, college, level, trans_type, trans_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batch = rows.map(r => stmt.bind(
        r.team_name || '',
        titleCase(r.last_name),
        titleCase(r.first_name),
        r.jersey || '',
        r.position || '',
        r.height || '',
        r.weight || '',
        r.college || '',
        r.level || '',
        normalizeTransType(r.trans_type),
        r.trans_date || ''
      ));

      await env.DB.batch(batch);
      return json({ ok: true, count: rows.length });
    }

    // POST /api/admin/upload/standings — expects JSON array with optional `season` per row (defaults 2026)
    if (path === '/api/admin/upload/standings' && request.method === 'POST') {
      if (!checkAuth(request, env)) return err('Unauthorized', 401);

      const rows = await request.json();
      if (!Array.isArray(rows) || !rows.length) return err('No data');

      // Only clear out the seasons present in this upload, so other years are untouched
      const seasons = [...new Set(rows.map(r => parseInt(r.season) || 2026))];
      for (const s of seasons) {
        await env.DB.prepare('DELETE FROM standings WHERE season = ?').bind(s).run();
      }

      const stmt = env.DB.prepare(
        `INSERT INTO standings (season, team_code, team_name, conference, gp, wins, losses, win_pct, conf_gp, conf_wins, conf_losses, conf_pct, sos, clinched)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      const batch = rows.map(r => stmt.bind(
        parseInt(r.season) || 2026,
        r.team_code || '',
        r.team_name || '',
        r.conference || '',
        parseInt(r.gp) || 0,
        parseInt(r.wins) || 0,
        parseInt(r.losses) || 0,
        parseFloat(r.win_pct) || 0,
        parseInt(r.conf_gp) || 0,
        parseInt(r.conf_wins) || 0,
        parseInt(r.conf_losses) || 0,
        parseFloat(r.conf_pct) || 0,
        parseFloat(r.sos) || 0,
        r.clinched || ''
      ));

      await env.DB.batch(batch);
      return json({ ok: true, count: rows.length, seasons });
    }

    return err('Not found', 404);
  },
};
