/* app.js: app state, actions (optimistic + write-back), routing, init. */
(function () {
  "use strict";
  const { h } = window.AFW;
  const t = (...a) => I18N.t(...a);

  const APP = window.APP = {
    index: { weeks: [], notices: [] },
    state: AFW.emptyState(),
    cards: { cards: [] },
    usage: { runs: [] },
    weekCache: {},
  };

  APP.loadWeek = async function (w) {
    if (!w || !w.file) return null;
    if (!APP.weekCache[w.file]) APP.weekCache[w.file] = await AFW.loadJSON(w.file.replace(/^data\//, ""), null);
    return APP.weekCache[w.file];
  };

  APP.reload = async function () {
    const [index, state, cards, usage] = await Promise.all([
      AFW.loadJSON("index.json", { weeks: [], notices: [] }),
      AFW.loadJSON("state.json", AFW.emptyState()),
      AFW.loadJSON("knowledge/cards.json", { cards: [] }),
      AFW.loadJSON("usage.json", { runs: [] }),
    ]);
    APP.index = index || { weeks: [], notices: [] };
    APP.state = AFW.normalizeState(state);
    APP.cards = cards || { cards: [] };
    APP.usage = usage || { runs: [] };
    APP.weekCache = {};
    updateBadge();
    route();
  };

  /* ---------- actions ---------- */
  const nowISO = () => new Date().toISOString();
  const newId = () => "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Apply locally first (instant), then persist; on failure reload the truth.
  async function commit(mutator, message, okMsg) {
    if (!AFW.hasToken()) { AFW.toast(t("toastRo"), true); return; }
    APP.state = AFW.normalizeState(mutator(JSON.parse(JSON.stringify(APP.state))) || APP.state);
    route(true);
    try {
      APP.state = await AFW.updateState(mutator, message);
      if (okMsg) AFW.toast(okMsg);
      route(true);
    } catch (e) {
      AFW.toast(t("notSaved", e.message), true);
      try { APP.state = (await AFW.getRemoteState()).state; } catch (_) { /* keep local */ }
      route(true);
    }
  }

  function fbEntry(s, item, week) {
    const cur = s.feedback[item.id] || {};
    return Object.assign(cur, { title: item.title, area: item.area, tags: (item.tags || []).slice(0, 6), week, t: nowISO() });
  }

  APP.vote = function (item, week, v) {
    commit(s => {
      const e = fbEntry(s, item, week);
      e.v = e.v === v ? null : v;
      if (!e.v && !e.star) delete s.feedback[item.id]; else s.feedback[item.id] = e;
      return s;
    }, `feedback: ${v} ${item.id}`);
  };

  APP.star = function (item, week) {
    commit(s => {
      const e = fbEntry(s, item, week);
      e.star = !e.star;
      if (!e.v && !e.star) delete s.feedback[item.id]; else s.feedback[item.id] = e;
      return s;
    }, `feedback: star ${item.id}`, null);
  };

  APP.addLearning = function (item, week) {
    if ((APP.state.learning || []).some(l => l.item_id === item.id)) { location.hash = "learn"; return; }
    const link = (item.links || []).find(l => AFW.safeUrl(l.url));
    const entry = {
      id: newId(), item_id: item.id, week, title: item.title, url: link ? link.url : "",
      notes: "", minutes: 0, status: "todo", tags: (item.tags || []).slice(0, 6), created: nowISO(), updated: nowISO(),
    };
    commit(s => {
      if (!s.learning.some(l => l.item_id === item.id)) s.learning.push(entry);
      return s;
    }, `learning: add ${item.id}`, t("toastAdded"));
  };

  APP.saveLearning = function (id, data) {
    const ts = nowISO();
    const fresh = id ? null : Object.assign({ id: newId(), item_id: null, created: ts }, data, { updated: ts });
    if (fresh && fresh.status === "done") fresh.done_at = ts;
    commit(s => {
      if (fresh) { s.learning.push(fresh); return s; }
      const e = s.learning.find(l => l.id === id);
      if (!e) return s;
      if (data.status === "done" && e.status !== "done") e.done_at = ts;
      if (data.status && data.status !== "done") delete e.done_at;
      Object.assign(e, data, { updated: ts });
      return s;
    }, id ? `learning: update ${id}` : "learning: add", id ? t("toastSaved") : t("toastLogged"));
  };

  APP.deleteLearning = function (id) {
    commit(s => { s.learning = s.learning.filter(l => l.id !== id); return s; }, `learning: delete ${id}`, t("toastDeleted"));
  };

  /* ---------- theme ---------- */
  APP.setTheme = function (k) {
    AFW.store.set("theme", k);
    if (k === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", k);
  };

  /* ---------- badge ---------- */
  function updateBadge() {
    const b = document.getElementById("mode-badge");
    if (AFW.hasToken() && AFW.isTokenBad()) { b.textContent = t("badge.bad"); b.className = "badge warn"; b.title = t("badge.badTitle"); }
    else if (AFW.hasToken()) { b.textContent = t("badge.rw"); b.className = "badge rw"; b.title = t("badge.rwTitle"); }
    else { b.textContent = t("badge.ro"); b.className = "badge"; b.title = t("badge.roTitle"); }
  }
  document.addEventListener("afw:token-bad", updateBadge);

  /* ---------- routing ---------- */
  const VIEWS = ["week", "archive", "learn", "knowledge", "growth", "settings"];
  function route(keepScroll) {
    const raw = (location.hash || "#week").slice(1);
    const [tab, arg] = raw.split("/");
    const t = VIEWS.includes(tab) ? tab : "week";
    document.querySelectorAll(".tabs a").forEach(a => a.setAttribute("aria-selected", a.dataset.tab === t ? "true" : "false"));
    document.querySelectorAll(".view").forEach(v => { v.hidden = v.dataset.view !== t; });
    const root = document.getElementById("view-" + t);
    const y = window.scrollY;
    const done = () => { if (keepScroll) window.scrollTo(0, y); };
    if (t === "week") WeekViews.renderWeek(root, arg).then(done);
    else if (t === "archive") WeekViews.renderArchive(root).then(done);
    else { ({ learn: MoreViews.renderLearn, knowledge: MoreViews.renderKnowledge, growth: MoreViews.renderGrowth, settings: MoreViews.renderSettings })[t](root); done(); }
  }
  window.addEventListener("hashchange", () => { route(false); window.scrollTo(0, 0); });

  /* ---------- init ---------- */
  APP.setTheme(AFW.store.get("theme") || "auto");
  I18N.applyStatic();
  document.getElementById("lang-toggle").addEventListener("click", () => I18N.setLang(I18N.lang === "zh" ? "en" : "zh"));
  document.addEventListener("afw:lang", () => { updateBadge(); route(true); });
  document.getElementById("view-week").append(h("p", { class: "muted", text: t("loading") }));
  APP.reload();
})();
