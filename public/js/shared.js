// shared.js — nav, helpers, API base
const API = 'https://api.ifl.indoorfootballindex.com';

// ── Nav injection ──────────────────────────────────────────────────────
(function injectNav() {
  const page = document.body.dataset.page || '';
  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="/index.html" class="nav-brand">IFL <span>Tracker</span></a>
      <ul class="nav-links" id="navLinks">
        <li><a href="/index.html"     ${page==='home'?'class="active"':''}>Home</a></li>
        <li><a href="/standings.html" ${page==='standings'?'class="active"':''}>Standings</a></li>
        <li><a href="/roster.html"    ${page==='roster'?'class="active"':''}>Roster</a></li>
        <li><a href="/transactions.html" ${page==='transactions'?'class="active"':''}>Transactions</a></li>
      </ul>
      <button class="nav-hamburger" id="hamburger" aria-label="Menu">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6"  x2="19" y2="6"/>
          <line x1="3" y1="11" x2="19" y2="11"/>
          <line x1="3" y1="16" x2="19" y2="16"/>
        </svg>
      </button>
    </div>`;
  document.body.prepend(nav);

  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
})();

// ── Helpers ───────────────────────────────────────────────────────────
function statusBadge(status) {
  const s = (status || '').toLowerCase();
  let cls = 'badge-default';
  if (s === 'active') cls = 'badge-active';
  else if (s.includes('ir')) cls = 'badge-ir';
  else if (s.includes('exempt')) cls = 'badge-exempt';
  else if (s === 'rtr') cls = 'badge-rtr';
  else if (s.includes('suspend')) cls = 'badge-sus';
  return `<span class="badge ${cls}">${status || '—'}</span>`;
}

function transBadge(type) {
  const t = (type || '').toLowerCase();
  let cls = 'badge-default';
  if (t === 'sign') cls = 'badge-sign';
  else if (t === 'release') cls = 'badge-release';
  else if (t === 'rtr') cls = 'badge-rtr';
  else if (t.includes('ir')) cls = 'badge-ir';
  else if (t.includes('exempt')) cls = 'badge-exempt';
  else if (t.includes('suspend')) cls = 'badge-sus';
  return `<span class="badge ${cls}">${type || '—'}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function loading(container) {
  container.innerHTML = `<div class="state-box"><div class="spinner"></div><p>Loading…</p></div>`;
}

function empty(container, msg = 'No results found.') {
  container.innerHTML = `<div class="state-box"><div class="icon">📋</div><p>${msg}</p></div>`;
}

async function apiFetch(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Sort helper ────────────────────────────────────────────────────────
function makeSortable(table, data, renderFn) {
  let sortCol = null, sortDir = 1;
  table.querySelectorAll('thead th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) sortDir *= -1;
      else { sortCol = col; sortDir = 1; }
      table.querySelectorAll('thead th').forEach(t => t.classList.remove('sorted'));
      th.classList.add('sorted');
      data.sort((a, b) => {
        const av = a[col] ?? '', bv = b[col] ?? '';
        const an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir;
        return av.toString().localeCompare(bv.toString()) * sortDir;
      });
      renderFn(data);
    });
  });
}
