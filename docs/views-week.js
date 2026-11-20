/* views-week.js: 本周 and 往期 tabs, item cards, feedback buttons. */
(function () {
  "use strict";
  const { h, AREAS, areaName, shortDate } = window.AFW;

  function evidenceChip(ev) {
    return ev === "primary"
      ? h("span", { class: "chip primary", text: "读了原文" })
      : h("span", { class: "chip secondary", text: "只看了摘要或二手报道" });
  }

  function fbOf(id) { return (APP.state.feedback || {})[id] || {}; }
  function inLearning(id) { return (APP.state.learning || []).some(l => l.item_id === id); }

  function itemCard(item, weekDate) {
    const fb = fbOf(item.id);
    const ro = !AFW.hasToken();
    const roTitle = ro ? "在「设置」里填 token 后可以操作" : "";
    const cls = ["item", fb.v === "up" ? "fb-up" : "", fb.v === "down" ? "fb-down" : "", fb.star ? "fb-star" : ""].join(" ");
    const links = (item.links || []).filter(l => AFW.safeUrl(l.url));
    const meta = h("div", { class: "item-meta" },
      h("span", { class: "chip", text: areaName(item.area) }),
      evidenceChip(item.evidence),
      item.date_published ? h("span", { text: "发布 " + item.date_published }) : null,
      (item.tags || []).slice(0, 4).map(t => h("span", { text: "#" + t })),
    );
    const fields = h("dl", { class: "fields" },
      h("dt", { text: "是什么" }), h("dd", { text: item.what }),
      h("dt", { text: "为什么" }), h("dd", { text: item.why }),
      item.relevance ? [h("dt", { text: "跟我" }), h("dd", { text: item.relevance })] : null,
      item.try ? [h("dt", { text: "怎么试" }), h("dd", {}, item.try, item.effort ? h("span", { class: "muted small", text: `（${item.effort}）` }) : null)] : null,
    );
    const btn = (kind, ico, label, pressed, onClick) => h("button", {
      class: "act " + kind, title: roTitle || label,
      attrs: { type: "button", "aria-pressed": pressed ? "true" : "false", disabled: ro },
      on: { click: onClick },
    }, h("span", { class: "ico", text: ico, attrs: { "aria-hidden": "true" } }), label);

    const actions = h("div", { class: "actions" },
      btn("up", "✓", "感兴趣", fb.v === "up", () => APP.vote(item, weekDate, "up")),
      btn("down", "✗", "不感兴趣", fb.v === "down", () => APP.vote(item, weekDate, "down")),
      btn("star", "⭐", "想深入", !!fb.star, () => APP.star(item, weekDate)),
      btn("learn", "＋", inLearning(item.id) ? "已在学习清单" : "加入学习", inLearning(item.id), () => APP.addLearning(item, weekDate)),
    );
    return h("article", { class: cls, attrs: { id: "item-" + item.id } },
      h("h4", {}, links[0] ? h("a", { href: links[0].url, text: item.title }) : item.title),
      meta, fields,
      links.length ? h("div", { class: "links" }, links.map(l => h("a", { href: l.url, text: "↗ " + (l.title || new URL(l.url).hostname) }))) : null,
      actions,
    );
  }

  function weekHeader(week) {
    const w = week.window || {};
    const cost = (APP.usage.runs || []).filter(r => r.date === week.date && r.kind === "weekly").reduce((a, r) => a + (r.cost_usd || 0), 0);
    return h("div", { class: "panel week-hero" },
      h("h2", { text: `${week.date} 这一期` }),
      h("p", { class: "meta", text: [
        w.from && w.to ? `覆盖 ${w.from} 至 ${w.to}` : null,
        `${(week.items || []).length} 条`,
        week.model ? `模型 ${week.model}` : null,
        cost ? `本期花费约 $${cost.toFixed(2)}（按标价估算）` : null,
      ].filter(Boolean).join(" · ") }),
      week.summary && week.summary.length ? h("ul", { class: "summary-list" }, week.summary.map(s => h("li", { text: s }))) : null,
    );
  }

  function noticesBlock() {
    const ns = (APP.index.notices || []).slice(-2);
    return ns.map(n => h("div", { class: "notice" + (n.level === "info" ? " info" : ""), text: `${n.date || ""} ${n.text || ""}` }));
  }

  function renderWeekBody(root, week) {
    root.append(weekHeader(week));
    AREAS.forEach(a => {
      const items = (week.items || []).filter(it => (it.area || "other") === a.key);
      if (!items.length) return;
      root.append(h("div", { class: "area-head" },
        h("span", { class: "area-dot " + a.key, attrs: { "aria-hidden": "true" } }),
        h("h3", { text: a.name }), h("span", { class: "count", text: items.length + " 条" })));
      items.forEach(it => root.append(itemCard(it, week.date)));
    });
    if (week.deep_dive && week.deep_dive.title) {
      const d = week.deep_dive;
      root.append(h("div", { class: "section-head" }, h("h2", { text: "⭐ 展开讲一条" })));
      root.append(h("div", { class: "panel deep" },
        h("h3", { text: d.title }),
        h("div", { class: "body" }, String(d.body || "").split(/\n{2,}/).map(p => h("p", { text: p }))),
        (d.links || []).length ? h("div", { class: "links" }, d.links.filter(l => AFW.safeUrl(l.url)).map(l => h("a", { href: l.url, text: "↗ " + (l.title || l.url) }))) : null,
      ));
    }
    if ((week.try_this || []).length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: "推荐你试的" }), h("span", { class: "meta", text: "需要你决定" })));
      root.append(h("div", { class: "panel" }, h("ol", { class: "try-list" }, week.try_this.map(t =>
        h("li", {}, h("strong", { text: t.title }), "：", t.steps, t.cost ? h("span", { class: "muted", text: `（${t.cost}）` }) : null)))));
    }
    if ((week.skip || []).length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: "可以先不管的" })));
      root.append(h("div", { class: "panel" }, h("ul", { class: "skip-list" }, week.skip.map(s =>
        h("li", {}, h("strong", { text: s.title }), s.reason ? "：" + s.reason : "")))));
    }
    if ((week.watch_next || []).length) {
      root.append(h("div", { class: "section-head" }, h("h2", { text: "下期继续盯" })));
      root.append(h("div", { class: "panel" }, h("ul", { class: "watch-list" }, week.watch_next.map(s => h("li", { text: s })))));
    }
  }

  async function renderWeek(root, date) {
    root.textContent = "";
    root.append(...noticesBlock());
    const weeks = APP.index.weeks || [];
    const okWeeks = weeks.filter(w => w.status === "ok");
    if (!okWeeks.length) {
      root.append(h("div", { class: "empty" },
        h("h3", { text: "第一期还没生成" }),
        h("p", { text: "每周一早上 7:47（芝加哥时间）自动生成，也可以在 GitHub Actions 里手动运行 weekly 工作流。" })));
      return;
    }
    const target = (date && okWeeks.find(w => w.date === date)) || okWeeks[okWeeks.length - 1];
    const week = await APP.loadWeek(target);
    if (!week) { root.append(h("div", { class: "notice", text: "这一期的数据读不出来：" + target.file })); return; }
    if (target !== okWeeks[okWeeks.length - 1]) {
      root.append(h("p", { class: "small" }, h("a", { hash: "week", text: "← 回到最新一期" })));
    }
    renderWeekBody(root, week);
  }

  /* ---------- 往期 ---------- */
  let archiveFilter = "all";
  async function renderArchive(root) {
    root.textContent = "";
    const weeks = (APP.index.weeks || []).slice().reverse();
    const seg = h("div", { class: "seg", attrs: { role: "group", "aria-label": "筛选" } },
      [["all", "按期"], ["up", "只看 ✓"], ["star", "只看 ⭐"]].map(([k, label]) => h("button", {
        text: label, attrs: { type: "button", "aria-pressed": archiveFilter === k ? "true" : "false" },
        on: { click: () => { archiveFilter = k; renderArchive(root); } },
      })));
    root.append(h("div", { class: "toolbar" }, seg));
    if (!weeks.length) { root.append(h("div", { class: "empty" }, h("h3", { text: "还没有往期" }))); return; }

    if (archiveFilter === "all") {
      const fb = APP.state.feedback || {};
      const panel = h("div", { class: "panel" });
      weeks.forEach(w => {
        const ups = Object.values(fb).filter(f => f.week === w.date && f.v === "up").length;
        const ok = w.status === "ok";
        panel.append(h("div", { class: "week-row" },
          h("div", {},
            ok ? h("a", { hash: "week/" + w.date, text: w.date + " 这一期" }) : h("strong", { text: w.date + "（" + (w.status === "skipped" ? "跳过" : "失败") + "）" }),
            h("p", { class: "headline", text: w.headline || w.reason || "" })),
          h("div", { class: "stats", text: ok ? `${w.n_items || 0} 条 · ✓ ${ups}` : "" })));
      });
      root.append(panel);
      return;
    }
    // Filtered: load every ok week and list the matching items.
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
      list.append(h("div", { class: "area-head" }, h("h3", { text: week.date }), h("span", { class: "count", text: items.length + " 条" })));
      items.forEach(it => list.append(itemCard(it, week.date)));
      n += items.length;
    }
    if (!n) list.append(h("div", { class: "empty" }, h("p", { text: archiveFilter === "up" ? "还没有打 ✓ 的条目。" : "还没有标 ⭐ 的条目。" })));
  }

  window.WeekViews = { renderWeek, renderArchive, itemCard };
})();
