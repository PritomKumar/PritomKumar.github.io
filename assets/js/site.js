/* Pritom Kumar Das — site behaviour.
   Vanilla JS, no dependencies. Everything is progressive enhancement:
   the page reads fine with JavaScript off. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* storage unavailable */ } },
    remove(k) { try { localStorage.removeItem(k); } catch (_) { /* storage unavailable */ } },
  };

  /* ---------- Toast + clipboard ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fall through to the legacy path */ }
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    doc.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = doc.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    return ok;
  }

  async function copyAndToast(text, okMsg) {
    const ok = await copyText(text);
    toast(ok ? okMsg : 'Copy is blocked in this browser — please copy it manually');
  }

  const EMAIL = 'pritom.das@helsinki.fi';
  const copyEmail = () => copyAndToast(EMAIL, 'Email address copied');

  doc.addEventListener('click', (e) => {
    const direct = e.target.closest('[data-copy]');
    if (direct) { copyAndToast(direct.dataset.copy, direct.dataset.copied || 'Copied'); return; }
    const viaTarget = e.target.closest('[data-copy-target]');
    if (viaTarget) {
      const src = $(viaTarget.dataset.copyTarget);
      if (src) copyAndToast(src.textContent.trim(), viaTarget.dataset.copied || 'Copied');
    }
  });

  /* ---------- Theme ---------- */
  const themeBtn = $('#theme-toggle');
  const mqLight = window.matchMedia('(prefers-color-scheme: light)');
  const effectiveTheme = () => root.dataset.theme || (mqLight.matches ? 'light' : 'dark');

  function syncThemeUi() {
    const t = effectiveTheme();
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0B0E13' : '#F7F5F1');
  }
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') { root.dataset.theme = t; store.set('pkd-theme', t); }
    else { delete root.dataset.theme; store.remove('pkd-theme'); }
    syncThemeUi();
  }
  function toggleTheme() {
    applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
    toast(effectiveTheme() === 'dark' ? 'Dark theme' : 'Light theme');
  }
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (mqLight.addEventListener) mqLight.addEventListener('change', syncThemeUi);
  syncThemeUi();

  /* ---------- Mobile menu ---------- */
  const burger = $('#nav-burger');
  const navLinks = $('#nav-links');
  function closeMenu() {
    if (!navLinks) return;
    navLinks.classList.remove('is-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('is-open')) { closeMenu(); burger.focus(); }
    });
    window.matchMedia('(min-width: 1041px)').addEventListener('change', (e) => { if (e.matches) closeMenu(); });
  }

  /* ---------- Scroll progress ---------- */
  const bar = $('#progress-bar');
  if (bar) {
    let ticking = false;
    const update = () => {
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- Scroll spy ---------- */
  const spyLinks = new Map($$('.nav__links a[href^="#"]').map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window && spyLinks.size) {
    const setCurrent = (id) => {
      spyLinks.forEach((a, key) => {
        if (key === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.dataset.spy || en.target.id;
        setCurrent(id === 'top' ? '' : id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- Reveal on scroll (content is visible unless it starts below the fold) ---------- */
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const vh = window.innerHeight;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });
    $$('.reveal').forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add('will-reveal'); io.observe(el); }
    });
  }

  /* ---------- Small live details ---------- */
  const clock = $('#clock');
  if (clock) {
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Helsinki' });
      const tick = () => { clock.textContent = fmt.format(new Date()); };
      tick();
      setInterval(tick, 15000);
    } catch (_) { clock.textContent = ''; }
  }
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || '');
  $$('[data-kbd]').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });

  /* Cursor spotlight in the hero (fine pointers only) */
  const hero = $('.hero');
  if (hero && window.matchMedia('(pointer: fine)').matches && !reduceMotion.matches) {
    let raf = 0;
    hero.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
        raf = 0;
      });
    });
  }

  /* ---------- Hero signal card ---------- */
  const signal = $('#signal');
  if (signal) {
    const btns = $$('.seg button', signal);
    let mode = 'same';
    let timer = null;
    let userTouched = false;
    const setMode = (m) => {
      mode = m;
      signal.dataset.mode = m;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    };
    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      if (reduceMotion.matches || userTouched || timer || doc.hidden) return;
      timer = setInterval(() => setMode(mode === 'same' ? 'calibrated' : 'same'), 3800);
    };
    btns.forEach((b) => b.addEventListener('click', () => { userTouched = true; stop(); setMode(b.dataset.mode); }));
    signal.addEventListener('pointerenter', stop);
    signal.addEventListener('pointerleave', start);
    signal.addEventListener('focusin', stop);
    signal.addEventListener('focusout', start);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); else start(); });
    setMode(reduceMotion.matches ? 'calibrated' : 'same');
    start();
  }

  /* ---------- Filters: timeline + projects ---------- */
  const tl = $('#timeline');
  const tlItems = tl ? $$('.tl-item', tl) : [];
  const tlBtns = $$('[data-tl-filter]');
  const tlStatus = $('#tl-status');
  function applyTimelineFilter(f) {
    let n = 0;
    tlItems.forEach((it) => {
      const show = f === 'all' || it.dataset.cat === f;
      it.hidden = !show;
      if (show) n += 1;
    });
    tlBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tlFilter === f)));
    if (tlStatus) tlStatus.textContent = n + ' of ' + tlItems.length + ' entries shown';
  }
  tlBtns.forEach((b) => b.addEventListener('click', () => applyTimelineFilter(b.dataset.tlFilter)));
  const tlExpand = $('#tl-expand');
  if (tl && tlExpand) {
    tlExpand.addEventListener('click', () => {
      const open = tlExpand.getAttribute('aria-pressed') !== 'true';
      $$('details', tl).forEach((d) => { d.open = open; });
      tlExpand.setAttribute('aria-pressed', String(open));
      tlExpand.textContent = open ? 'Collapse all' : 'Expand all';
    });
  }

  const projs = $$('.proj');
  const projBtns = $$('[data-proj-filter]');
  const projStatus = $('#proj-status');
  function applyProjectFilter(f) {
    let n = 0;
    projs.forEach((p) => {
      const show = f === 'all' || p.dataset.group === f;
      p.hidden = !show;
      if (show) n += 1;
    });
    projBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.projFilter === f)));
    if (projStatus) projStatus.textContent = n + ' of ' + projs.length + ' projects shown';
  }
  projBtns.forEach((b) => b.addEventListener('click', () => applyProjectFilter(b.dataset.projFilter)));
  const resetFilters = () => { if (tlItems.length) applyTimelineFilter('all'); if (projs.length) applyProjectFilter('all'); };

  /* ---------- Skills -> evidence explorer ---------- */
  const skillChips = $$('.skill');
  const skillOut = $('#skill-results');
  const evidence = $$('[data-skills]');
  let activeChip = null;
  const HINT = 'Tap a skill to see the projects, roles and studies where I have used it.';

  function clearHits() {
    $$('.skill-hit').forEach((el) => el.classList.remove('skill-hit'));
    $$('.is-hit').forEach((el) => el.classList.remove('is-hit'));
  }
  function renderSkillHint() {
    if (!skillOut) return;
    skillOut.textContent = '';
    const p = doc.createElement('p');
    p.className = 'skill-results__hint';
    p.textContent = HINT;
    skillOut.appendChild(p);
  }
  function showSkill(chip) {
    clearHits();
    if (activeChip === chip) {
      activeChip = null;
      skillChips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      renderSkillHint();
      return;
    }
    activeChip = chip;
    skillChips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const token = chip.dataset.skill;
    const hits = evidence.filter((el) => (el.dataset.skills || '').split(/\s+/).includes(token));
    skillOut.textContent = '';
    const h = doc.createElement('h3');
    h.textContent = chip.textContent.trim() + ' — ' + hits.length + (hits.length === 1 ? ' place' : ' places');
    const ul = doc.createElement('ul');
    hits.forEach((el) => {
      const li = doc.createElement('li');
      const kind = doc.createElement('span');
      kind.className = 'kind';
      kind.textContent = el.dataset.kind || 'Item';
      const a = doc.createElement('a');
      a.href = '#' + el.id;
      a.textContent = el.dataset.name || el.id;
      li.append(kind, a);
      ul.appendChild(li);
      el.classList.add(el.classList.contains('tl-item') ? 'is-hit' : 'skill-hit');
    });
    const clear = doc.createElement('button');
    clear.type = 'button';
    clear.className = 'btn btn--sm clear';
    clear.textContent = 'Clear selection';
    clear.addEventListener('click', () => showSkill(chip));
    skillOut.append(h, ul, clear);
  }
  if (skillOut) {
    renderSkillHint();
    skillChips.forEach((c) => c.addEventListener('click', () => showSkill(c)));
    skillOut.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (a) resetFilters();
    });
  }

  /* ---------- Permission lab ---------- */
  const labRoot = $('#lab-app');
  if (labRoot) {
    const ACTIONS = [
      { id: 'rename', cmd: 'mv utils.py helpers.py', risk: 'low', deletes: false,
        short: 'Reversible and contained',
        why: 'Renames one tracked file. Easy to undo, and nothing is lost.' },
      { id: 'cache', cmd: 'rm -rf .cache/', risk: 'low', deletes: true,
        short: 'Regenerated on the next build',
        why: 'A deletion, but the build cache is rebuilt automatically. Nothing is lost.' },
      { id: 'config', cmd: 'edit config/settings.yaml', risk: 'moderate', deletes: false,
        short: 'Changes behaviour; easy to revert',
        why: 'Changes how the app behaves, but the file is tracked, so the change is easy to revert.' },
      { id: 'env', cmd: 'write .env.production', risk: 'high', deletes: false,
        short: 'Overwrites secrets; no undo',
        why: 'Overwrites production settings that are not under version control. There is no way back.' },
      { id: 'force', cmd: 'git push --force origin main', risk: 'high', deletes: false,
        short: 'Rewrites shared history',
        why: 'Rewrites history that teammates rely on, and their work can be lost.' },
      { id: 'data', cmd: 'rm -rf data/exports/', risk: 'high', deletes: true,
        short: 'Deletes files that exist nowhere else',
        why: 'Deletes local files that exist nowhere else. Once they are gone, they are gone.' },
    ];
    const RISK_LABEL = { low: 'Low risk', moderate: 'Moderate risk', high: 'High risk' };
    const MODE_CAPTION = {
      same: 'Every request gets the same framing, so the rename and the deletion look identical. Whether it matters is left entirely to the person.',
      blunt: 'A cheap rule: flag anything that deletes. It is simple, but it does not follow what is actually at stake.',
      calibrated: 'The signal follows the consequence: quiet when little is at stake, prominent when the action is hard to undo.',
    };

    let cur = 5;
    let mode = 'same';
    const decided = {};
    const list = $('#lab-list');
    const stage = $('#lab-dialog');
    const caption = $('#lab-caption');
    const matrixBody = $('#lab-matrix-body');
    const modeInputs = $$('input[name="lab-mode"]', labRoot);
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Build the action list and matrix once, then update in place.
    ACTIONS.forEach((a, i) => {
      const li = doc.createElement('li');
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'act';
      b.dataset.i = String(i);
      const cmd = doc.createElement('span');
      cmd.className = 'act__cmd';
      cmd.textContent = a.cmd;
      const st = doc.createElement('span');
      st.className = 'act__state';
      b.append(cmd, st);
      li.appendChild(b);
      list.appendChild(li);

      const tr = doc.createElement('tr');
      tr.dataset.i = String(i);
      const blunt = a.deletes ? 'flag' : 'none';
      let note = '';
      if (a.deletes && a.risk === 'low') note = 'false alarm: nothing is lost';
      else if (!a.deletes && a.risk === 'high') note = 'missed: cannot be undone';
      else if (a.deletes && a.risk === 'high') note = 'flagged, and rightly so';
      tr.innerHTML =
        '<th scope="row"><button type="button" class="rowbtn" data-i="' + i + '">' + esc(a.cmd) + '</button></th>' +
        '<td><span class="risk risk--' + a.risk + '">' + esc(RISK_LABEL[a.risk]) + '</span></td>' +
        '<td><span class="risk risk--none">no signal</span></td>' +
        '<td><span class="risk risk--' + blunt + '">' + (a.deletes ? 'flagged' : 'silent') + '</span>' + (note ? '<span class="note">' + esc(note) + '</span>' : '') + '</td>' +
        '<td><span class="risk risk--' + a.risk + '">' + esc(RISK_LABEL[a.risk]) + '</span></td>';
      matrixBody.appendChild(tr);
    });

    function renderList() {
      $$('.act', list).forEach((b) => {
        const i = Number(b.dataset.i);
        const a = ACTIONS[i];
        b.setAttribute('aria-current', String(i === cur));
        const d = decided[a.id];
        if (d) b.dataset.decided = d; else delete b.dataset.decided;
        $('.act__state', b).textContent = d === 'allow' ? 'allowed' : d === 'deny' ? 'denied' : '';
      });
      $$('tr', matrixBody).forEach((tr) => {
        if (Number(tr.dataset.i) === cur) tr.setAttribute('aria-current', 'true'); else tr.removeAttribute('aria-current');
      });
    }

    function renderDialog() {
      const a = ACTIONS[cur];
      let banner = '';
      const attrs = [];
      if (mode === 'blunt' && a.deletes) {
        attrs.push('data-flag="true"');
        banner = '<div class="perm__banner"><span class="risk risk--flag">Flagged</span><span>Deletion: potentially dangerous</span></div>';
      } else if (mode === 'calibrated') {
        attrs.push('data-risk="' + a.risk + '"');
        banner = '<div class="perm__banner"><span class="risk risk--' + a.risk + '">' + esc(RISK_LABEL[a.risk]) + '</span><span>' + esc(a.short) + '</span></div>';
      }
      stage.innerHTML =
        '<div class="perm" ' + attrs.join(' ') + '>' +
          '<div class="perm__title"><span>permission request</span><span>agent · refactor session</span></div>' +
          banner +
          '<div class="perm__body"><p class="perm__ask">The agent wants to run:</p><pre class="perm__cmd">' + esc(a.cmd) + '</pre></div>' +
          '<div class="perm__actions"><button type="button" class="btn btn--primary" data-decision="allow">Allow</button><button type="button" class="btn" data-decision="deny">Deny</button></div>' +
        '</div>';

      let text = MODE_CAPTION[mode];
      if (mode === 'blunt') {
        if (a.deletes && a.risk === 'low') text = 'The rule flags this deletion, but the cache regenerates on its own: a false alarm that teaches people to ignore the flag.';
        else if (!a.deletes && a.risk === 'high') text = 'Nothing is flagged here, yet this cannot be undone. The rule only looks for deletions, so it misses the risk.';
        else if (a.deletes && a.risk === 'high') text = 'Flagged, and rightly so. This time the rule and reality agree.';
        else text = 'Nothing is flagged, and nothing is at stake. The rule is only right by coincidence.';
      } else if (mode === 'calibrated') {
        text = a.why + ' ' + MODE_CAPTION.calibrated;
      } else if (mode === 'same') {
        text = a.deletes && a.risk === 'high'
          ? 'A destructive deletion, framed exactly like a rename. ' + MODE_CAPTION.same
          : MODE_CAPTION.same;
      }
      caption.textContent = text;
    }

    function renderAll() { renderList(); renderDialog(); }

    function advance() {
      const n = ACTIONS.length;
      for (let step = 1; step <= n; step += 1) {
        const i = (cur + step) % n;
        if (!decided[ACTIONS[i].id]) { cur = i; return false; }
      }
      Object.keys(decided).forEach((k) => delete decided[k]);
      cur = 0;
      return true;
    }

    list.addEventListener('click', (e) => {
      const b = e.target.closest('.act');
      if (!b) return;
      cur = Number(b.dataset.i);
      renderAll();
    });
    matrixBody.addEventListener('click', (e) => {
      const b = e.target.closest('.rowbtn');
      if (!b) return;
      cur = Number(b.dataset.i);
      renderAll();
    });
    stage.addEventListener('click', (e) => {
      const b = e.target.closest('[data-decision]');
      if (!b) return;
      const a = ACTIONS[cur];
      decided[a.id] = b.dataset.decision;
      const wrapped = advance();
      renderAll();
      toast(wrapped ? 'All six decided. Session reset.' : 'Demo only: “' + a.cmd + '” was not run.');
    });
    modeInputs.forEach((r) => r.addEventListener('change', () => {
      if (r.checked) { mode = r.value; renderDialog(); }
    }));

    const initial = modeInputs.find((r) => r.checked);
    if (initial) mode = initial.value;
    renderAll();
  }

  /* ---------- Command palette ---------- */
  const palette = $('#palette');
  const pInput = $('#palette-input');
  const pList = $('#palette-list');
  if (palette && pInput && pList) {
    const go = (hash) => () => {
      const t = $(hash);
      if (!t) return;
      t.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', hash); } catch (_) { /* file:// or sandbox */ }
    };
    const ITEMS = [
      { g: 'Go to', t: 'About', k: 'bio background story', run: go('#about') },
      { g: 'Go to', t: 'Research', k: 'agentic ai permission notifications threads', run: go('#research') },
      { g: 'Go to', t: 'Permission lab (interactive demo)', k: 'demo try play interactive', run: go('#lab') },
      { g: 'Go to', t: 'Publications', k: 'papers bibtex doi cite', run: go('#publications') },
      { g: 'Go to', t: 'Journey (timeline)', k: 'experience education work career', run: go('#journey') },
      { g: 'Go to', t: 'Projects', k: 'github code repositories', run: go('#projects') },
      { g: 'Go to', t: 'Skills', k: 'toolbox languages tools evidence', run: go('#skills') },
      { g: 'Go to', t: 'Recognition and credentials', k: 'awards certificates coursera transcript teaching', run: go('#recognition') },
      { g: 'Go to', t: 'Contact', k: 'email reach hire collaborate', run: go('#contact') },
      { g: 'Actions', t: 'Toggle light / dark theme', k: 'theme dark light mode appearance', run: toggleTheme },
      { g: 'Actions', t: 'Copy email address', k: 'mail contact clipboard', run: copyEmail },
      { g: 'Actions', t: 'Download CV (PDF)', k: 'resume curriculum vitae', href: 'assets/Pritom-Kumar-Das-CV.pdf', hint: 'PDF' },
      { g: 'Links', t: 'GitHub', k: 'code', href: 'https://github.com/PritomKumar', ext: true, hint: 'github.com' },
      { g: 'Links', t: 'LinkedIn', k: 'profile network', href: 'https://www.linkedin.com/in/pritomkumar/', ext: true, hint: 'linkedin.com' },
      { g: 'Links', t: 'ORCID', k: 'identifier research', href: 'https://orcid.org/0009-0009-7284-7933', ext: true, hint: 'orcid.org' },
      { g: 'Links', t: 'University of Helsinki research profile', k: 'portal', href: 'https://researchportal.helsinki.fi/en/persons/pritom-kumar-das', ext: true, hint: 'helsinki.fi' },
    ];
    let shown = [];
    let sel = 0;
    let lastFocus = null;

    function render(query) {
      const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      shown = ITEMS.filter((it) => {
        const hay = (it.t + ' ' + (it.k || '') + ' ' + it.g).toLowerCase();
        return tokens.every((tk) => hay.includes(tk));
      });
      pList.textContent = '';
      if (!shown.length) {
        const empty = doc.createElement('div');
        empty.className = 'palette__empty';
        empty.textContent = 'Nothing matches “' + query + '”';
        pList.appendChild(empty);
        pInput.removeAttribute('aria-activedescendant');
        return;
      }
      sel = Math.min(sel, shown.length - 1);
      let lastGroup = '';
      shown.forEach((it, i) => {
        if (it.g !== lastGroup) {
          const gh = doc.createElement('div');
          gh.className = 'palette__group';
          gh.setAttribute('role', 'presentation');
          gh.textContent = it.g;
          pList.appendChild(gh);
          lastGroup = it.g;
        }
        const row = doc.createElement('div');
        row.className = 'palette__item';
        row.id = 'pal-' + i;
        row.setAttribute('role', 'option');
        row.dataset.i = String(i);
        const label = doc.createElement('span');
        label.textContent = it.t;
        row.appendChild(label);
        if (it.hint) { const s = doc.createElement('small'); s.textContent = it.hint; row.appendChild(s); }
        pList.appendChild(row);
      });
      highlight();
    }
    function highlight() {
      $$('.palette__item', pList).forEach((el) => {
        const on = Number(el.dataset.i) === sel;
        el.setAttribute('aria-selected', String(on));
        if (on) { pInput.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
      });
    }
    function openPalette() {
      if (!palette.hidden) return;
      lastFocus = doc.activeElement;
      palette.hidden = false;
      root.classList.add('no-scroll');
      pInput.setAttribute('aria-expanded', 'true');
      pInput.value = '';
      sel = 0;
      render('');
      pInput.focus();
    }
    function closePalette() {
      if (palette.hidden) return;
      palette.hidden = true;
      root.classList.remove('no-scroll');
      pInput.setAttribute('aria-expanded', 'false');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function runItem(it) {
      if (!it) return;
      closePalette();
      setTimeout(() => {
        if (it.href) {
          const a = doc.createElement('a');
          a.href = it.href;
          if (it.ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } else { a.download = ''; }
          doc.body.appendChild(a);
          a.click();
          a.remove();
        } else if (it.run) { it.run(); }
      }, 30);
    }

    pInput.addEventListener('input', () => { sel = 0; render(pInput.value); });
    pInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (shown.length) { sel = (sel + 1) % shown.length; highlight(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (shown.length) { sel = (sel - 1 + shown.length) % shown.length; highlight(); } }
      else if (e.key === 'Enter') { e.preventDefault(); runItem(shown[sel]); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    pList.addEventListener('mousemove', (e) => {
      const row = e.target.closest('.palette__item');
      if (row && Number(row.dataset.i) !== sel) { sel = Number(row.dataset.i); highlight(); }
    });
    pList.addEventListener('click', (e) => {
      const row = e.target.closest('.palette__item');
      if (row) runItem(shown[Number(row.dataset.i)]);
    });
    palette.addEventListener('mousedown', (e) => { if (e.target === palette) closePalette(); });
    $$('#open-palette').forEach((b) => b.addEventListener('click', openPalette));

    doc.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (palette.hidden) openPalette(); else closePalette(); }
      else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); openPalette(); }
      else if (e.key === 'Escape' && !palette.hidden) { e.preventDefault(); closePalette(); }
    });
  }
})();
