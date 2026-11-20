/* views-week.js: this week + archive tabs, item cards, feedback buttons. */
(function () {
  "use strict";
  const { h, AREAS, areaName } = window.AFW;
  const t = (...a) => I18N.t(...a);
  const pick = (o, f) => I18N.pick(o, f);

  function evidenceChip(ev) {
    return ev === "primary"
      ? h("span", { class: "chip primary", text: t("evPrimary") })
      : h("span", { class: "chip secondary", text: t("evSecondary") });
  }

  function fbOf(id) { return (APP.state.feedback || {})[id] || {}; }
  function inLearning(id) { return (APP.state.learning || []).some(l => l.item_id === id); }

  function itemCard(item, weekDate) {
    const fb = fbOf(item.id);
    const ro = !AFW.hasToken();
    const roTitle = ro ? t("roHint") : "";
    const cls = ["item", fb.v === "up" ? "fb-up" : "", fb.v === "down" ? "fb-down" : "", fb.star ? "fb-star" : ""].join(" ");
    const links = (item.links || []).filter(l => AFW.safeUrl(l.url));
    const title = pick(item, "title");
    const meta = h("div", { class: "item-meta" },
      h("span", { class: "chip", text: areaName(item.area) }),
      evidenceChip(item.evidence),
      item.date_published ? h("span", { text: t("published", item.date_published) }) : null,
      (pick(item, "tags") || []).slice(0, 4).map(x => h("span", { text: "#" + x })),
    );
    const rel = pick(item, "relevance"), tr = pick(item, "try"), eff = pick(item, "effort");
    const fields = h("dl", { class: "fields" },
      h("dt", { text: t("fWhat") }), h("dd", { text: pick(item, "what") }),
      h("dt", { text: t("fWhy") }), h("dd", { text: pick(item, "why") }),
      rel ? [h("dt", { text: t("fRel") }), h("dd", { text: rel })] : null,
      tr ? [h("dt", { text: t("fTry") }), h("dd", {}, tr, eff ? h("span", { class: "muted small", text: I18N.lang === "en" ? ` (${eff})` : `（${eff}）` }) : null)] : null,
    );
    const btn = (kind, ico, label, pressed, onClick) => h("button", {
      class: "act " + kind, title: roTitle || label,
      attrs: { type: "button", "aria-pressed": pressed ? "true" : "false", disabled: ro },
      on: { click: onClick },
    }, h("span", { class: "ico", text: ico, attrs: { "aria-hidden": "true" } }), label);

    const actions = h("div", { class: "actions" },
      btn("up", "✓", t("aUp"), fb.v === "up", () => APP.vote(item, weekDate, "up")),
      btn("down", "✗", t("aDown"), fb.v === "down", () => APP.vote(item, weekDate, "down")),
      btn("star", "⭐", t("aStar"), !!fb.star, () => APP.star(item, weekDate)),
      btn("learn", "＋", inLearning(item.id) ? t("aLearned") : t("aLearn"), inLearning(item.id), () => APP.addLearning(item, weekDate)),
    );
    return h("article", { class: cls, attrs: { id: "item-" + item.id } },
      h("h4", {}, links[0] ? h("a", { href: links[0].url, text: title }) : title),
      meta, fields,
      links.length ? h("div", { class: "links" }, links.map(l => h("a", { href: l.url, text: "↗ " + (l.title || new URL(l.url).hostname) }))) : null,
      actions,
    );
  }

  function weekHeader(week) {
    const w = week.window || {};
    const cost = (APP.usage.runs || []).filter(r => r.date === week.date && r.kind === "weekly").reduce((a, r) => a + (r.cost_usd || 0), 0);
    const summary = pick(week, "summary") || [];
    return h("div", { class: "panel week-hero" },
      h("h2", { text: t("weekTitle", week.date) }),
      h("p", { class: "meta", text: [
        w.from && w.to ? t("covers", w.from, w.to) : null,
        t("nItems", (week.items || []).length),
        week.model ? t("model", week.model) : null,
        cost ? t("weekCost", cost.toFixed(2)) : null,
      ].filter(Boolean).join(" · ") }),
      summary.length ? h("ul", { class: "summary-list" }, summary.map(s => h("li", { text: s }))) : null,
    );
  }

  function noticesBlock() {
    const ns = (APP.index.notices || []).slice(-2);
    return ns.map(n => h("div", { class: "notice" + (n.level === "info" ? " info" : ""), text: `${n.date || ""} ${(I18N.lang === "en" && n.text_en) || n.text || ""}` }));
  }

  function renderWeekBody(root, week) {
    root.append(weekHeader(week));
    AREAS.forEach(a => {
      const items = (week.items || []).filter(it => (it.area || "other") === a.key);
      if (!items.length) return;
      root.append(h("div", { class: "area-head" },
        h("span", { class: "area-dot " + a.key, attrs: { "aria-hidden": "true" } }),
        h("h3", { text: a.name }), h("span", { class: "count", text: t("nItems", items.length) })));
      items.forEach(it => root.append(itemCard(it, week.date)));
    });
    const en = (I18N.lang === "en" && week.en) || {};
    const d = week.deep_dive;
    if (d && d.title) {
      const dEn = en.deep_dive && en.deep_dive.title ? en.deep_dive : d;
      root.append(h("div", { class: "section-head" }, h("h2", { text: t("deepTitle") })));
      root.append(h("div", { class: "panel deep" },
        h("h3", { text: dEn.title }),
        h("div", { class: "body" }, String(dEn.body || "").split(/\n{2,}/).map(p => h("p", { text: p }))),
        (d.links || []).length ? h("div", { class: "links" }, d.links.filter(l => AFW.safeUrl(l.url)).map(l => h("a", { href: l.url, text: "↗ " + (l.title || l.url) }))) : null,
      ));
    }
    const tryThis = (en.try_this && en.try_this.length ? en.try_this : week.try_this) || [];
    if (tryThis.length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: t("tryTitle") }), h("span", { class: "meta", text: t("tryMeta") })));
      root.append(h("div", { class: "panel" }, h("ol", { class: "try-list" }, tryThis.map(x =>
        h("li", {}, h("strong", { text: x.title }), I18N.lang === "en" ? ": " : "：", x.steps,
          x.cost ? h("span", { class: "muted", text: I18N.lang === "en" ? ` (${x.cost})` : `（${x.cost}）` }) : null)))));
    }
    const skip = (en.skip && en.skip.length ? en.skip : week.skip) || [];
    if (skip.length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: t("skipTitle") })));
      root.append(h("div", { class: "panel" }, h("ul", { class: "skip-list" }, skip.map(s =>
        h("li", {}, h("strong", { text: s.title }), s.reason ? (I18N.lang === "en" ? ": " : "：") + s.reason : "")))));
    }
    const watch = (en.watch_next && en.watch_next.length ? en.watch_next : week.watch_next) || [];
    if (watch.length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: t("watchTitle") })));
      root.append(h("div", { class: "panel" }, h("ul", { class: "watch-list" }, watch.map(s => h("li", { text: s })))));
    }
  }

  async function renderWeek(root, date) {
    root.textContent = "";
    root.append(...noticesBlock());
    const weeks = APP.index.weeks || [];
    const okWeeks = weeks.filter(w => w.status === "ok");
    if (!okWeeks.length) {
      root.append(h("div", { class: "empty" }, h("h3", { text: t("emptyTitle") }), h("p", { text: t("emptyBody") })));
      return;
    }
    const target = (date && okWeeks.find(w => w.date === date)) || okWeeks[okWeeks.length - 1];
    const week = await APP.loadWeek(target);
    if (!week) { root.append(h("div", { class: "notice", text: t("weekUnreadable", target.file) })); return; }
    if (target !== okWeeks[okWeeks.length - 1]) {
      root.append(h("p", { class: "small" }, h("a", { hash: "week", text: t("backLatest") })));
    }
    renderWeekBody(root, week);
  }

  /* ---------- archive ---------- */
  let archiveFilter = "all";
  async function renderArchive(root) {
    root.textContent = "";
    const weeks = (APP.index.weeks || []).slice().reverse();
    const seg = h("div", { class: "seg", attrs: { role: "group", "aria-label": t("filterLabel") } },
      [["all", t("fAll")], ["up", t("fUp")], ["star", t("fStar")]].map(([k, label]) => h("button", {
        text: label, attrs: { type: "button", "aria-pressed": archiveFilter === k ? "true" : "false" },
        on: { click: () => { archiveFilter = k; renderArchive(root); } },
      })));
    root.append(h("div", { class: "toolbar" }, seg));
    if (!weeks.length) { root.append(h("div", { class: "empty" }, h("h3", { text: t("noArchive") }))); return; }

    if (archiveFilter === "all") {
      const fb = APP.state.feedback || {};
      const panel = h("div", { class: "panel" });
      weeks.forEach(w => {
        const ups = Object.values(fb).filter(f => f.week === w.date && f.v === "up").length;
        const ok = w.status === "ok";
        const headline = (I18N.lang === "en" && (w.headline_en || w.reason_en)) || w.headline || w.reason || "";
        panel.append(h("div", { class: "week-row" },
          h("div", {},
            ok ? h("a", { hash: "week/" + w.date, text: t("weekTitle", w.date) })
              : h("strong", { text: `${w.date} (${w.status === "skipped" ? t("skipped") : t("failed")})` }),
            h("p", { class: "headline", text: headline })),
          h("div", { class: "stats", text: ok ? t("archiveStats", w.n_items || 0, ups) : "" })));
      });
      root.append(panel);
      return;
    }
    const list = h("div");
    root.append(list);
    let n = 0;
    for (const w of weeks.filter(x => x.status === "ok")) {
      const week = await APP.loadWeek(w);
      if (!week) continue;
      const items = (week.items || []).filter(it => {
        const f = (APP.state.feedback || {})[it.id] || {};
        return archiveFilter === "up" ? f.v === "up" : !!f.star;
      });
      if (!items.length) continue;
      list.append(h("div", { class: "area-head" }, h("h3", { text: week.date }), h("span", { class: "count", text: t("nItems", items.length) })));
      items.forEach(it => list.append(itemCard(it, week.date)));
      n += items.length;
    }
    if (!n) list.append(h("div", { class: "empty" }, h("p", { text: archiveFilter === "up" ? t("noUp") : t("noStar") })));
  }

  window.WeekViews = { renderWeek, renderArchive, itemCard };
})();
