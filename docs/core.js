/* core.js: config, DOM helpers, data loading, GitHub write-back.
 * Security: every generated string is rendered with textContent; links must be https.
 */
(function () {
  "use strict";

  const CFG = {
    owner: "Ceyxleo",
    repo: "ai-frontier-watch",
    branch: "main",
    dataDir: "docs/data",
  };

  const t = (...a) => I18N.t(...a);
  const AREAS = ["frontier", "earth", "workflow", "other"].map(key => ({ key, get name() { return t("areas." + key); } }));
  const areaName = k => t("areas." + (AREAS.some(a => a.key === k) ? k : "other"));

  /* ---------- DOM ---------- */
  function safeUrl(s) {
    try {
      const u = new URL(String(s));
      return u.protocol === "https:" ? u.href : null;
    } catch (_) { return null; }
  }

  // h("div", {class, text, href, title, on: {click}, attrs: {...}}, ...children)
  function h(tag, props, ...children) {
    const n = document.createElement(tag);
    const p = props || {};
    if (p.class) n.className = p.class;
    if (p.text != null) n.textContent = String(p.text);
    if (p.title) n.title = String(p.title);
    if (p.href != null) {
      const u = safeUrl(p.href);
      if (u) { n.href = u; n.target = "_blank"; n.rel = "noopener noreferrer"; }
    }
    if (p.hash) n.href = "#" + p.hash;
    for (const k in p.attrs || {}) if (p.attrs[k] != null && p.attrs[k] !== false) n.setAttribute(k, p.attrs[k] === true ? "" : String(p.attrs[k]));
    for (const ev in p.on || {}) n.addEventListener(ev, p.on[ev]);
    append(n, children);
    return n;
  }
  function append(n, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return n;
  }

  let toastTimer = null;
  function toast(msg, isError) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.className = "toast" + (isError ? " error" : "");
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 6000 : 2600);
  }

  /* ---------- storage (per-browser conveniences only) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem("afw." + k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem("afw." + k, v); } catch (_) { /* private mode */ } },
    del(k) { try { localStorage.removeItem("afw." + k); } catch (_) { /* ignore */ } },
  };

  /* ---------- dates ---------- */
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  // Monday of the week containing ISO date/datetime string, as YYYY-MM-DD
  function weekStart(s) {
    const d = new Date(String(s).slice(0, 10) + "T12:00:00");
    if (isNaN(d)) return null;
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const shortDate = s => (s ? String(s).slice(5, 10).replace("-", "/") : "");

  /* ---------- base64 (UTF-8 safe) ---------- */
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    const bin = atob(String(b64).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- GitHub API ---------- */
  const API = "https://api.github.com";
  let token = store.get("token");
  let identity = null; // {login, id, noreply}

  function hasToken() { return !!token; }

  async function gh(path, opts) {
    const o = opts || {};
    const headers = Object.assign({ Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, o.headers || {});
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch(API + path, { method: o.method || "GET", headers, body: o.body, cache: "no-store" });
    return res;
  }

  const contentsPath = rel => `/repos/${CFG.owner}/${CFG.repo}/contents/${CFG.dataDir}/${rel}`;

  async function verifyToken(candidate) {
    const prev = token;
    token = candidate;
    try {
      const [u, r] = await Promise.all([gh("/user"), gh(`/repos/${CFG.owner}/${CFG.repo}`)]);
      if (u.status === 401 || r.status === 401) return { ok: false, why: t("eBadToken") };
      if (!r.ok) return { ok: false, why: t("eNoRepo", r.status) };
      const user = await u.json().catch(() => null);
      const repo = await r.json();
      const canPush = repo.permissions ? !!repo.permissions.push : null;
      if (canPush === false) return { ok: false, why: t("eNoPush") };
      if (user && user.id) identity = { login: user.login, id: user.id, noreply: `${user.id}+${user.login}@users.noreply.github.com` };
      return { ok: true, login: user ? user.login : "" };
    } finally {
      token = prev;
    }
  }
  function setToken(t) { token = t || null; if (t) store.set("token", t); else { store.del("token"); identity = null; } }

  async function ensureIdentity() {
    if (identity || !token) return identity;
    const u = await gh("/user");
    if (u.ok) {
      const user = await u.json();
      identity = { login: user.login, id: user.id, noreply: `${user.id}+${user.login}@users.noreply.github.com` };
    }
    return identity;
  }

  /* ---------- data loading ---------- */
  // Without a token: the Pages copy (may lag ~1 min behind the repo).
  // With a token: the repo itself, so the owner always sees fresh data.
  async function loadJSON(rel, fallback) {
    try {
      let res;
      if (token) {
        res = await gh(contentsPath(rel) + `?ref=${CFG.branch}`, { headers: { Accept: "application/vnd.github.raw+json" } });
        if (res.status === 401) { markTokenBad(); res = await fetch("data/" + rel, { cache: "no-cache" }); }
      } else {
        res = await fetch("data/" + rel, { cache: "no-cache" });
      }
      if (res.status === 404) return fallback;
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      console.warn("load failed", rel, e);
      return fallback;
    }
  }

  let tokenBad = false;
  function markTokenBad() { tokenBad = true; document.dispatchEvent(new CustomEvent("afw:token-bad")); }
  function isTokenBad() { return tokenBad; }

  async function getRemoteState() {
    const res = await gh(contentsPath("state.json") + `?ref=${CFG.branch}`);
    if (res.status === 404) return { state: emptyState(), sha: null };
    if (res.status === 401) { markTokenBad(); throw new Error(t("eBadToken")); }
    if (!res.ok) throw new Error(t("eRead", res.status));
    const j = await res.json();
    return { state: normalizeState(JSON.parse(b64decode(j.content))), sha: j.sha };
  }

  function emptyState() { return { version: 1, feedback: {}, learning: [] }; }
  function normalizeState(s) {
    const o = s && typeof s === "object" ? s : {};
    return { version: 1, feedback: o.feedback && typeof o.feedback === "object" ? o.feedback : {}, learning: Array.isArray(o.learning) ? o.learning : [] };
  }

  // Serialized write queue: read fresh state + sha, apply mutator, PUT; retry on conflict.
  let queue = Promise.resolve();
  function updateState(mutator, message) {
    const job = queue.then(async () => {
      if (!token) throw new Error(t("eRo"));
      const who = await ensureIdentity();
      for (let attempt = 0; attempt < 4; attempt++) {
        const { state, sha } = await getRemoteState();
        const next = normalizeState(mutator(JSON.parse(JSON.stringify(state))) || state);
        const body = {
          message: message || "update state",
          content: b64encode(JSON.stringify(next, null, 2) + "\n"),
          branch: CFG.branch,
        };
        if (sha) body.sha = sha;
        if (who) body.committer = body.author = { name: who.login, email: who.noreply };
        const res = await gh(contentsPath("state.json"), { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
        if (res.ok) return next;
        if (res.status === 409 || res.status === 422) { await new Promise(r => setTimeout(r, 400 * (attempt + 1))); continue; }
        if (res.status === 401) { markTokenBad(); throw new Error(t("eBadToken")); }
        if (res.status === 403 || res.status === 404) throw new Error(t("eForbidden", res.status));
        throw new Error(t("eSave", res.status));
      }
      throw new Error(t("eConflict"));
    });
    queue = job.catch(() => {});
    return job;
  }

  window.AFW = {
    CFG, AREAS, areaName, h, append, safeUrl, toast, store,
    todayISO, weekStart, shortDate, b64encode, b64decode,
    hasToken, setToken, verifyToken, isTokenBad, loadJSON, getRemoteState, updateState, emptyState, normalizeState,
  };
})();
