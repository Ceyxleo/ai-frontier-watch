/* views-more.js: learning, knowledge, growth, settings tabs. */
(function () {
  "use strict";
  const { h, areaName, weekStart, shortDate } = window.AFW;
  const t = (...a) => I18N.t(...a);
  const pick = (o, f) => I18N.pick(o, f);
  const STATUS_KEYS = ["todo", "doing", "done"];

  /* ---------- learning ---------- */
  let learnFilter = "all";
  let editingId = null;

  function learnForm(root) {
    const ro = !AFW.hasToken();
    const entry = editingId ? (APP.state.learning || []).find(l => l.id === editingId) : null;
    const f = {
      title: h("input", { attrs: { name: "title", required: true, maxlength: 200, placeholder: t("lfTitlePh") } }),
      url: h("input", { attrs: { name: "url", type: "url", placeholder: t("lfUrlPh") } }),
      minutes: h("input", { attrs: { name: "minutes", type: "number", min: 0, max: 6000, step: 5, placeholder: "30" } }),
      status: h("select", { attrs: { name: "status" } }, STATUS_KEYS.map(k => h("option", { text: t("status." + k), attrs: { value: k } }))),
      tags: h("input", { attrs: { name: "tags", placeholder: t("lfTagsPh") } }),
      notes: h("textarea", { attrs: { name: "notes", maxlength: 4000, placeholder: t("lfNotesPh") } }),
    };
    if (entry) {
      f.title.value = entry.title || ""; f.url.value = entry.url || ""; f.minutes.value = entry.minutes || "";
      f.status.value = entry.status || "todo"; f.tags.value = (entry.tags || []).join(", "); f.notes.value = entry.notes || "";
    } else {
      f.status.value = "doing";
    }
    const submit = h("button", { class: "btn", text: entry ? t("lfSave") : t("lfAdd"), attrs: { type: "submit", disabled: ro } });
    return h("form", { class: "form panel", on: { submit: ev => {
      ev.preventDefault();
      const url = f.url.value.trim();
      if (url && !AFW.safeUrl(url)) { AFW.toast(t("lfHttps"), true); return; }
      const data = {
        title: f.title.value.trim().slice(0, 200),
        url: url || "",
        minutes: Math.max(0, Math.min(6000, parseInt(f.minutes.value, 10) || 0)),
        status: STATUS_KEYS.includes(f.status.value) ? f.status.value : "todo",
        tags: f.tags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 8),
        notes: f.notes.value.trim().slice(0, 4000),
      };
      if (!data.title) return;
      const id = editingId;
      editingId = null;
      APP.saveLearning(id, data);
    } } },
      h("label", {}, t("lfTitle"), f.title),
      h("div", { class: "row" }, h("label", {}, t("lfUrl"), f.url), h("label", {}, t("lfMin"), f.minutes)),
      h("div", { class: "row" }, h("label", {}, t("lfStatus"), f.status), h("label", {}, t("lfTags"), f.tags)),
      h("label", {}, t("lfNotes"), f.notes),
      h("div", { class: "btn-row" }, submit,
        entry ? h("button", { class: "btn ghost", text: t("lfCancel"), attrs: { type: "button" }, on: { click: () => { editingId = null; renderLearn(root); } } }) : null,
        ro ? h("span", { class: "muted small", text: t("lfRo") }) : null),
    );
  }

  function renderLearn(root) {
    root.textContent = "";
    root.append(h("div", { class: "section-head" }, h("h2", { text: editingId ? t("learnEdit") : t("learnNew") })));
    root.append(learnForm(root));
    const all = (APP.state.learning || []).slice().sort((a, b) => String(b.updated || b.created).localeCompare(String(a.updated || a.created)));
    const counts = { all: all.length, todo: 0, doing: 0, done: 0 };
    all.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    root.append(h("div", { class: "section-head" }, h("h2", { text: t("learnMine") }),
      h("div", { class: "seg", attrs: { role: "group", "aria-label": t("statusFilter") } },
        [["all", t("lAll")]].concat(STATUS_KEYS.map(k => [k, t("status." + k)])).map(([k, label]) => h("button", {
          text: `${label} ${counts[k] || 0}`, attrs: { type: "button", "aria-pressed": learnFilter === k ? "true" : "false" },
          on: { click: () => { learnFilter = k; renderLearn(root); } } })))));
    const list = all.filter(l => learnFilter === "all" || l.status === learnFilter);
    if (!list.length) { root.append(h("div", { class: "empty" }, h("p", { text: t("learnEmpty") }))); return; }
    const ro = !AFW.hasToken();
    const distilled = new Set(APP.cards.distilled_ids || []);
    const panel = h("div", { class: "panel" });
    list.forEach(l => {
      const st = STATUS_KEYS.includes(l.status) ? l.status : "todo";
      const next = st === "todo" ? "doing" : st === "doing" ? "done" : null;
      panel.append(h("div", { class: "learn-item" },
        h("div", { class: "item-meta" },
          h("span", { class: "status " + st, text: t("status." + st) }),
          l.minutes ? h("span", { text: t("minutes", l.minutes) }) : null,
          h("span", { text: st === "done" && l.done_at ? t("doneOn", String(l.done_at).slice(0, 10)) : t("updatedOn", String(l.updated || l.created || "").slice(0, 10)) }),
          (l.tags || []).map(x => h("span", { text: "#" + x })),
          distilled.has(l.id) ? h("span", { class: "chip primary", text: t("distilled") }) : null),
        h("h4", {}, AFW.safeUrl(l.url) ? h("a", { href: l.url, text: l.title }) : l.title),
        l.notes ? h("p", { class: "notes", text: l.notes }) : null,
        h("div", { class: "learn-tools" },
          next ? h("button", { class: "act", text: next === "doing" ? t("startLearning") : t("markDone"), attrs: { type: "button", disabled: ro }, on: { click: () => APP.saveLearning(l.id, { status: next }) } }) : null,
          h("button", { class: "act", text: t("edit"), attrs: { type: "button", disabled: ro }, on: { click: () => { editingId = l.id; renderLearn(root); window.scrollTo({ top: 0, behavior: "smooth" }); } } }),
          h("button", { class: "act", text: t("del"), attrs: { type: "button", disabled: ro }, on: { click: () => { if (confirm(t("confirmDel", l.title))) APP.deleteLearning(l.id); } } }),
        )));
    });
    root.append(panel);
  }

  /* ---------- knowledge ---------- */
  let query = "";
  function renderKnowledge(root) {
    root.textContent = "";
    const cards = APP.cards.cards || [];
    const search = h("input", { class: "search", attrs: { type: "search", placeholder: t("kSearch"), "aria-label": t("kSearch") } });
    search.value = query;
    const body = h("div");
    const topicOf = c => pick(c, "topic") || t("kUncat");
    function draw() {
      body.textContent = "";
      if (!cards.length) {
        body.append(h("div", { class: "empty" }, h("h3", { text: t("kEmptyTitle") }), h("p", { text: t("kEmptyBody") })));
        return;
      }
      const q = query.trim().toLowerCase();
      const text = c => [c.title, c.topic, c.summary, c.my_words, (c.key_points || []).join(" "),
        c.en && [c.en.title, c.en.topic, c.en.summary, (c.en.key_points || []).join(" ")].join(" ")].join(" ").toLowerCase();
      const hit = cards.filter(c => !q || text(c).includes(q));
      if (!hit.length) { body.append(h("p", { class: "muted", text: t("kNoMatch") })); return; }
      [...new Set(hit.map(topicOf))].sort().forEach(tp => {
        const group = hit.filter(c => topicOf(c) === tp);
        body.append(h("div", { class: "topic-group" },
          h("h3", { text: `${tp} · ${group.length}` }),
          h("div", { class: "cards" }, group.map(c => {
            const kp = pick(c, "key_points") || [], ns = pick(c, "next_steps") || [];
            return h("article", { class: "kcard" },
              h("h4", { text: pick(c, "title") }),
              h("p", { class: "summary", text: pick(c, "summary") }),
              kp.length ? h("ul", {}, kp.map(p => h("li", { text: p }))) : null,
              c.my_words ? h("div", { class: "mine", text: t("kMine") + c.my_words }) : null,
              h("details", {},
                h("summary", { text: t("kMore") }),
                pick(c, "related_research") ? h("p", { text: t("kRelated") + pick(c, "related_research") }) : null,
                ns.length ? h("ul", {}, ns.map(s => h("li", { text: s }))) : null,
                (c.links || []).filter(l => AFW.safeUrl(l.url)).map(l => h("p", {}, h("a", { href: l.url, text: "↗ " + (l.title || l.url) }))),
                h("p", { class: "muted", text: t("kCreated", String(c.created || "").slice(0, 10)) }),
              ));
          })),
        ));
      });
    }
    search.addEventListener("input", () => { query = search.value; draw(); });
    root.append(h("div", { class: "toolbar" }, search, h("span", { class: "muted small", text: t("kCount", cards.length) })));
    root.append(body);
    draw();
  }

  /* ---------- growth ---------- */
  function dataTable(head, rows) {
    return h("details", {}, h("summary", { text: t("table") }),
      h("table", {}, h("thead", {}, h("tr", {}, head.map((c, i) => h("th", { class: i ? "num" : "", text: c })))),
        h("tbody", {}, rows.map(r => h("tr", {}, r.map((c, i) => h("td", { class: i ? "num" : "", text: c })))))));
  }
  function chartCard(title, sub, draw, legend, table) {
    const box = h("div");
    const card = h("div", { class: "chart-card" }, h("h3", { text: title }), sub ? h("p", { class: "sub", text: sub }) : null, box,
      legend ? h("div", { class: "legend" }, legend.map(([cls, name]) => h("span", {}, h("i", { class: cls }), name))) : null, table);
    requestAnimationFrame(() => draw(box));
    let last = 0;
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width);
      if (w && Math.abs(w - last) > 8) { last = w; draw(box); }
    });
    ro.observe(box);
    return card;
  }
  function lastNWeeks(n) {
    const out = [];
    const start = new Date(weekStart(AFW.todayISO()) + "T12:00:00");
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(start); d.setDate(d.getDate() - 7 * i);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    return out;
  }

  function renderGrowth(root) {
    root.textContent = "";
    const fb = Object.values(APP.state.feedback || {});
    const learning = APP.state.learning || [];
    const cards = APP.cards.cards || [];
    const runs = APP.usage.runs || [];
    const month = AFW.todayISO().slice(0, 7);
    const monthCost = runs.filter(r => String(r.date).slice(0, 7) === month).reduce((a, r) => a + (r.cost_usd || 0), 0);
    const doneMin = learning.filter(l => l.status === "done").reduce((a, l) => a + (l.minutes || 0), 0);
    const okWeeks = (APP.index.weeks || []).filter(w => w.status === "ok").length;

    const stat = (label, value, sub) => h("div", { class: "stat" }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), sub ? h("div", { class: "sub", text: sub }) : null);
    root.append(h("div", { class: "stats-row" },
      stat(t("gWeeks"), String(okWeeks)),
      stat(t("gUp"), String(fb.filter(f => f.v === "up").length), t("gUpSub", fb.filter(f => f.star).length, fb.filter(f => f.v === "down").length)),
      stat(t("gDone"), String(learning.filter(l => l.status === "done").length), doneMin ? t("gHours", Math.round(doneMin / 6) / 10) : null),
      stat(t("gCards"), String(cards.length)),
    ));

    const weeks = lastNWeeks(12);
    const fbRows = weeks.map(w => ({ label: shortDate(w), values: {
      // mutually exclusive so the stack total = items with any feedback
      star: fb.filter(f => weekStart(f.week) === w && f.star).length,
      up: fb.filter(f => weekStart(f.week) === w && f.v === "up" && !f.star).length,
      down: fb.filter(f => weekStart(f.week) === w && f.v === "down" && !f.star).length,
    } }));
    const minRows = weeks.map(w => ({ label: shortDate(w), value: learning
      .filter(l => weekStart(l.status === "done" && l.done_at ? l.done_at : (l.updated || l.created)) === w)
      .reduce((a, l) => a + (l.minutes || 0), 0) }));
    let acc = cards.filter(c => weekStart(c.created) < weeks[0]).length;
    const cardRows = weeks.map(w => { acc += cards.filter(c => weekStart(c.created) === w).length; return { label: shortDate(w), value: acc }; });
    let topicRows, topicSub;
    if (cards.length) {
      const m = {}; cards.forEach(c => { const tp = pick(c, "topic") || t("kUncat"); m[tp] = (m[tp] || 0) + 1; });
      topicRows = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
      topicSub = t("cTopicSubCards");
    } else {
      const m = {}; fb.filter(f => f.v === "up").forEach(f => { const tp = areaName(f.area); m[tp] = (m[tp] || 0) + 1; });
      topicRows = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
      topicSub = t("cTopicSubUp");
    }

    root.append(h("div", { class: "charts" },
      chartCard(t("cFb"), t("cFbSub"), box => Charts.stackedColumns(box, {
        rows: fbRows, ariaLabel: t("cFbAria"), unit: t("unitItems"),
        series: [{ key: "up", name: t("sUp"), cls: "s1" }, { key: "down", name: t("sDown"), cls: "s2" }, { key: "star", name: t("sStar"), cls: "s3" }],
      }), [["s1", t("sUp")], ["s2", t("sDown")], ["s3", t("sStarLegend")]],
      dataTable([t("thWeek"), "✓", "✗", "⭐"], fbRows.map(r => [r.label, r.values.up, r.values.down, r.values.star]))),
      chartCard(t("cMin"), t("cMinSub"), box => Charts.columns(box, { rows: minRows, ariaLabel: t("cMinAria"), unit: t("unitMin") }), null,
        dataTable([t("thWeek"), t("thMinutes")], minRows.map(r => [r.label, r.value]))),
      chartCard(t("cCards"), t("cCardsSub"), box => Charts.stepLine(box, { rows: cardRows, ariaLabel: t("cCardsAria"), unit: t("unitCards"), cumLabel: v => t("cum", v) }), null,
        dataTable([t("thWeek"), t("thCum")], cardRows.map(r => [r.label, r.value]))),
      chartCard(t("cTopic"), topicSub, box => topicRows.length ? Charts.hbars(box, { rows: topicRows, ariaLabel: t("cTopicAria") }) : box.append(h("p", { class: "muted small", text: t("noData") })), null,
        dataTable([t("thTopic"), t("thCount")], topicRows.map(r => [r.label, r.value]))),
    ));

    const byMonth = {};
    runs.forEach(r => { const m = String(r.date).slice(0, 7); byMonth[m] = (byMonth[m] || 0) + (r.cost_usd || 0); });
    root.append(h("div", { class: "section-head" }, h("h2", { text: t("spend") }), h("span", { class: "meta", text: t("spendMeta", monthCost.toFixed(2)) })));
    root.append(h("div", { class: "panel" }, Object.keys(byMonth).length
      ? h("dl", { class: "kv" }, Object.keys(byMonth).sort().reverse().map(m => [h("dt", { text: m }),
          h("dd", { text: t("runs", byMonth[m].toFixed(2), runs.filter(r => String(r.date).slice(0, 7) === m).length) })]))
      : h("p", { class: "muted", text: t("noRuns") })));
  }

  /* ---------- settings ---------- */
  function segGroup(label, options, current, onPick) {
    return h("div", { class: "seg", attrs: { role: "group", "aria-label": label } },
      options.map(([k, text]) => h("button", { text, attrs: { type: "button", "aria-pressed": current === k ? "true" : "false" }, on: { click: () => onPick(k) } })));
  }

  function renderSettings(root) {
    root.textContent = "";
    const has = AFW.hasToken();
    const input = h("input", { attrs: { type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…", "aria-label": "GitHub token" } });
    const save = h("button", { class: "btn", text: t("sSave"), attrs: { type: "button" }, on: { click: async () => {
      const v = input.value.trim();
      if (!v) return;
      save.disabled = true;
      const r = await AFW.verifyToken(v);
      save.disabled = false;
      if (!r.ok) { AFW.toast(r.why, true); return; }
      AFW.setToken(v);
      input.value = "";
      AFW.toast(t("sSaved"));
      await APP.reload();
    } } });
    const repo = `${AFW.CFG.owner}/${AFW.CFG.repo}`;
    root.append(h("div", { class: "section-head" }, h("h2", { text: t("sWrite") })));
    root.append(h("div", { class: "panel form" },
      h("p", { text: has ? (AFW.isTokenBad() ? t("sBad") : t("sHas")) : t("sNone") }),
      h("ol", { class: "steps" },
        h("li", {}, t("sStep1"), h("a", { href: "https://github.com/settings/personal-access-tokens/new", text: t("sStep1Link") })),
        h("li", { text: t("sStep2", repo) }),
        h("li", { text: t("sStep3") }),
        h("li", { text: t("sStep4") })),
      h("label", {}, "Token", input),
      h("div", { class: "btn-row" }, save,
        has ? h("button", { class: "btn danger", text: t("sClear"), attrs: { type: "button" }, on: { click: async () => { AFW.setToken(null); AFW.toast(t("sCleared")); await APP.reload(); } } }) : null),
    ));

    root.append(h("div", { class: "section-head" }, h("h2", { text: t("sLook") })));
    root.append(h("div", { class: "panel" }, h("div", { class: "btn-row" },
      segGroup(t("sTheme"), [["auto", t("thAuto")], ["light", t("thLight")], ["dark", t("thDark")]], AFW.store.get("theme") || "auto",
        k => { APP.setTheme(k); renderSettings(root); }),
      segGroup(t("sLang"), [["zh", "中文"], ["en", "English"]], I18N.lang, k => I18N.setLang(k)),
    )));

    root.append(h("div", { class: "section-head" }, h("h2", { text: t("sAbout") })));
    root.append(h("div", { class: "panel" }, h("dl", { class: "kv" },
      h("dt", { text: t("sRepo") }), h("dd", {}, h("a", { href: `https://github.com/${repo}`, text: repo })),
      h("dt", { text: t("sUpdated") }), h("dd", { text: APP.index.updated || t("sNever") }),
      h("dt", { text: t("sHow") }), h("dd", { text: t("sHowBody") }),
      h("dt", { text: t("sProfile") }), h("dd", {}, h("a", { href: `https://github.com/${repo}/blob/main/profile/interests.md`, text: "profile/interests.md" }), t("sProfileNote")),
    )));
  }

  window.MoreViews = { renderLearn, renderKnowledge, renderGrowth, renderSettings };
})();
