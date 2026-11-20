/* views-more.js: 学习记录, 知识库, 成长, 设置 tabs. */
(function () {
  "use strict";
  const { h, areaName, weekStart, shortDate } = window.AFW;
  const STATUS = { todo: "想学", doing: "在学", done: "学完" };

  /* ---------- 学习记录 ---------- */
  let learnFilter = "all";
  let editingId = null;

  function learnForm(root) {
    const ro = !AFW.hasToken();
    const entry = editingId ? (APP.state.learning || []).find(l => l.id === editingId) : null;
    const f = {
      title: h("input", { attrs: { name: "title", required: true, maxlength: 200, placeholder: "比如：读完 n8n 的 multi-agent 文章" } }),
      url: h("input", { attrs: { name: "url", type: "url", placeholder: "https://…（可选）" } }),
      minutes: h("input", { attrs: { name: "minutes", type: "number", min: 0, max: 6000, step: 5, placeholder: "30" } }),
      status: h("select", { attrs: { name: "status" } }, Object.entries(STATUS).map(([k, v]) => h("option", { text: v, attrs: { value: k } }))),
      tags: h("input", { attrs: { name: "tags", placeholder: "multi-agent, 水文（逗号分隔）" } }),
      notes: h("textarea", { attrs: { name: "notes", maxlength: 4000, placeholder: "用自己的话写：学到了什么、哪里还不懂、想怎么用到研究里。学完以后，周一的整理会把它沉淀成知识卡片。" } }),
    };
    if (entry) {
      f.title.value = entry.title || ""; f.url.value = entry.url || ""; f.minutes.value = entry.minutes || "";
      f.status.value = entry.status || "todo"; f.tags.value = (entry.tags || []).join(", "); f.notes.value = entry.notes || "";
    } else {
      f.status.value = "doing";
    }
    const submit = h("button", { class: "btn", text: entry ? "保存修改" : "记一条", attrs: { type: "submit", disabled: ro } });
    const form = h("form", { class: "form panel", on: { submit: ev => {
      ev.preventDefault();
      const url = f.url.value.trim();
      if (url && !AFW.safeUrl(url)) { AFW.toast("链接要以 https:// 开头", true); return; }
      const data = {
        title: f.title.value.trim().slice(0, 200),
        url: url || "",
        minutes: Math.max(0, Math.min(6000, parseInt(f.minutes.value, 10) || 0)),
        status: f.status.value in STATUS ? f.status.value : "todo",
        tags: f.tags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 8),
        notes: f.notes.value.trim().slice(0, 4000),
      };
      if (!data.title) return;
      const id = editingId;
      editingId = null;
      APP.saveLearning(id, data);
    } } },
      h("label", {}, "标题", f.title),
      h("div", { class: "row" }, h("label", {}, "链接", f.url), h("label", {}, "用时（分钟）", f.minutes)),
      h("div", { class: "row" }, h("label", {}, "状态", f.status), h("label", {}, "标签", f.tags)),
      h("label", {}, "我学到了什么", f.notes),
      h("div", { class: "btn-row" }, submit,
        entry ? h("button", { class: "btn ghost", text: "取消", attrs: { type: "button" }, on: { click: () => { editingId = null; renderLearn(root); } } }) : null,
        ro ? h("span", { class: "muted small", text: "只读模式：在「设置」里填 token 后才能记录。" }) : null),
    );
    return form;
  }

  function renderLearn(root) {
    root.textContent = "";
    root.append(h("div", { class: "section-head" }, h("h2", { text: editingId ? "修改学习记录" : "记一条学习" })));
    root.append(learnForm(root));
    const all = (APP.state.learning || []).slice().sort((a, b) => String(b.updated || b.created).localeCompare(String(a.updated || a.created)));
    const counts = { all: all.length, todo: 0, doing: 0, done: 0 };
    all.forEach(l => { counts[l.status] = (counts[l.status] || 0) + 1; });
    root.append(h("div", { class: "section-head" }, h("h2", { text: "我的学习" }),
      h("div", { class: "seg", attrs: { role: "group", "aria-label": "按状态筛选" } },
        [["all", "全部"], ["todo", "想学"], ["doing", "在学"], ["done", "学完"]].map(([k, label]) => h("button", {
          text: `${label} ${counts[k] || 0}`, attrs: { type: "button", "aria-pressed": learnFilter === k ? "true" : "false" },
          on: { click: () => { learnFilter = k; renderLearn(root); } } })))));
    const list = all.filter(l => learnFilter === "all" || l.status === learnFilter);
    if (!list.length) { root.append(h("div", { class: "empty" }, h("p", { text: "还没有记录。在「本周」点 ＋ 加入学习，或者在上面直接记一条。" }))); return; }
    const ro = !AFW.hasToken();
    const panel = h("div", { class: "panel" });
    list.forEach(l => {
      const next = l.status === "todo" ? "doing" : l.status === "doing" ? "done" : null;
      panel.append(h("div", { class: "learn-item" },
        h("div", { class: "item-meta" },
          h("span", { class: "status " + (l.status || "todo"), text: STATUS[l.status] || "想学" }),
          l.minutes ? h("span", { text: `${l.minutes} 分钟` }) : null,
          h("span", { text: (l.status === "done" && l.done_at ? "学完于 " + String(l.done_at).slice(0, 10) : "更新于 " + String(l.updated || l.created || "").slice(0, 10)) }),
          (l.tags || []).map(t => h("span", { text: "#" + t })),
          (APP.cards.distilled_ids || []).includes(l.id) ? h("span", { class: "chip primary", text: "已沉淀成知识" }) : null),
        h("h4", {}, AFW.safeUrl(l.url) ? h("a", { href: l.url, text: l.title }) : l.title),
        l.notes ? h("p", { class: "notes", text: l.notes }) : null,
        h("div", { class: "learn-tools" },
          next ? h("button", { class: "act", text: next === "doing" ? "开始学" : "标记学完", attrs: { type: "button", disabled: ro }, on: { click: () => APP.saveLearning(l.id, { status: next }) } }) : null,
          h("button", { class: "act", text: "编辑", attrs: { type: "button", disabled: ro }, on: { click: () => { editingId = l.id; renderLearn(root); window.scrollTo({ top: 0, behavior: "smooth" }); } } }),
          h("button", { class: "act", text: "删除", attrs: { type: "button", disabled: ro }, on: { click: () => { if (confirm(`删除「${l.title}」？这条记录会从仓库里移除（git 历史里还能找回）。`)) APP.deleteLearning(l.id); } } }),
        )));
    });
    root.append(panel);
  }

  /* ---------- 知识库 ---------- */
  let query = "";
  function renderKnowledge(root) {
    root.textContent = "";
    const cards = (APP.cards.cards || []);
    const search = h("input", { class: "search", attrs: { type: "search", placeholder: "搜索知识卡片", "aria-label": "搜索知识卡片" } });
    search.value = query;
    const body = h("div");
    function draw() {
      body.textContent = "";
      const q = query.trim().toLowerCase();
      const hit = cards.filter(c => !q || [c.title, c.topic, c.summary, c.my_words, (c.key_points || []).join(" ")].join(" ").toLowerCase().includes(q));
      if (!cards.length) {
        body.append(h("div", { class: "empty" },
          h("h3", { text: "知识库还是空的" }),
          h("p", { text: "在「学习记录」里把一条标成学完，下一次整理（每周一，或手动运行）就会把它和相关条目沉淀成知识卡片。" })));
        return;
      }
      if (!hit.length) { body.append(h("p", { class: "muted", text: "没有匹配的卡片。" })); return; }
      const topics = [...new Set(hit.map(c => c.topic || "未分类"))].sort();
      topics.forEach(t => {
        const group = hit.filter(c => (c.topic || "未分类") === t);
        body.append(h("div", { class: "topic-group" },
          h("h3", { text: `${t} · ${group.length}` }),
          h("div", { class: "cards" }, group.map(c => h("article", { class: "kcard" },
            h("h4", { text: c.title }),
            h("p", { class: "summary", text: c.summary }),
            (c.key_points || []).length ? h("ul", {}, c.key_points.map(p => h("li", { text: p }))) : null,
            c.my_words ? h("div", { class: "mine", text: "我的话：" + c.my_words }) : null,
            h("details", {},
              h("summary", { text: "关联研究、下一步、来源" }),
              c.related_research ? h("p", { text: "关联研究：" + c.related_research }) : null,
              (c.next_steps || []).length ? h("ul", {}, c.next_steps.map(s => h("li", { text: s }))) : null,
              (c.links || []).filter(l => AFW.safeUrl(l.url)).map(l => h("p", {}, h("a", { href: l.url, text: "↗ " + (l.title || l.url) }))),
              h("p", { class: "muted", text: "整理于 " + String(c.created || "").slice(0, 10) }),
            ),
          ))),
        ));
      });
    }
    search.addEventListener("input", () => { query = search.value; draw(); });
    root.append(h("div", { class: "toolbar" }, search, h("span", { class: "muted small", text: `${cards.length} 张卡片` })));
    root.append(body);
    draw();
  }

  /* ---------- 成长 ---------- */
  function dataTable(head, rows) {
    return h("details", {}, h("summary", { text: "查看数据表" }),
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
      stat("出了几期", String(okWeeks)),
      stat("打了 ✓", String(fb.filter(f => f.v === "up").length), `⭐ ${fb.filter(f => f.star).length} · ✗ ${fb.filter(f => f.v === "down").length}`),
      stat("学完", String(learning.filter(l => l.status === "done").length), doneMin ? `共 ${Math.round(doneMin / 6) / 10} 小时` : null),
      stat("知识卡片", String(cards.length)),
    ));

    const weeks = lastNWeeks(12);
    // 1. feedback per report week
    const fbRows = weeks.map(w => ({ label: shortDate(w), values: {
      // mutually exclusive so the stack total = items with any feedback
      star: fb.filter(f => weekStart(f.week) === w && f.star).length,
      up: fb.filter(f => weekStart(f.week) === w && f.v === "up" && !f.star).length,
      down: fb.filter(f => weekStart(f.week) === w && f.v === "down" && !f.star).length,
    } }));
    // 2. learning minutes per week (by the week it was finished, else last update)
    const minRows = weeks.map(w => ({ label: shortDate(w), value: learning
      .filter(l => weekStart(l.status === "done" && l.done_at ? l.done_at : (l.updated || l.created)) === w)
      .reduce((a, l) => a + (l.minutes || 0), 0) }));
    // 3. cumulative knowledge cards
    let acc = cards.filter(c => weekStart(c.created) < weeks[0]).length;
    const cardRows = weeks.map(w => { acc += cards.filter(c => weekStart(c.created) === w).length; return { label: shortDate(w), value: acc }; });
    // 4. topic distribution: knowledge topics, else ✓ items by area
    let topicRows, topicSub;
    if (cards.length) {
      const m = {}; cards.forEach(c => { const t = c.topic || "未分类"; m[t] = (m[t] || 0) + 1; });
      topicRows = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
      topicSub = "知识卡片按主题，前 8 个";
    } else {
      const m = {}; fb.filter(f => f.v === "up").forEach(f => { const t = areaName(f.area); m[t] = (m[t] || 0) + 1; });
      topicRows = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
      topicSub = "还没有知识卡片，先看打了 ✓ 的条目在哪个方向";
    }

    root.append(h("div", { class: "charts" },
      chartCard("每期的反馈", "按周报日期，最近 12 周", box => Charts.stackedColumns(box, {
        rows: fbRows, ariaLabel: "每期的反馈数", unit: " 条",
        series: [{ key: "up", name: "✓ 感兴趣", cls: "s1" }, { key: "down", name: "✗ 不感兴趣", cls: "s2" }, { key: "star", name: "⭐ 想深入", cls: "s3" }],
      }), [["s1", "✓ 感兴趣"], ["s2", "✗ 不感兴趣"], ["s3", "⭐ 想深入（含同时打 ✓ 的）"]],
      dataTable(["周", "✓", "✗", "⭐"], fbRows.map(r => [r.label, r.values.up, r.values.down, r.values.star]))),
      chartCard("每周学习时长", "分钟，最近 12 周", box => Charts.columns(box, { rows: minRows, ariaLabel: "学习分钟", unit: " 分钟" }), null,
        dataTable(["周", "分钟"], minRows.map(r => [r.label, r.value]))),
      chartCard("知识卡片累计", "最近 12 周", box => Charts.stepLine(box, { rows: cardRows, ariaLabel: "知识卡片累计", unit: " 张" }), null,
        dataTable(["周", "累计"], cardRows.map(r => [r.label, r.value]))),
      chartCard("主题分布", topicSub, box => topicRows.length ? Charts.hbars(box, { rows: topicRows, ariaLabel: "主题分布" }) : box.append(h("p", { class: "muted small", text: "还没有数据。" })), null,
        dataTable(["主题", "数量"], topicRows.map(r => [r.label, r.value]))),
    ));

    // spend
    const byMonth = {};
    runs.forEach(r => { const m = String(r.date).slice(0, 7); byMonth[m] = (byMonth[m] || 0) + (r.cost_usd || 0); });
    root.append(h("div", { class: "section-head" }, h("h2", { text: "花费" }), h("span", { class: "meta", text: `本月约 $${monthCost.toFixed(2)}，上限 $20（按标价估算，不是账单）` })));
    root.append(h("div", { class: "panel" }, Object.keys(byMonth).length
      ? h("dl", { class: "kv" }, Object.keys(byMonth).sort().reverse().map(m => [h("dt", { text: m }), h("dd", { text: `$${byMonth[m].toFixed(2)} · ${runs.filter(r => String(r.date).slice(0, 7) === m).length} 次运行` })]))
      : h("p", { class: "muted", text: "还没有运行记录。" })));
  }

  /* ---------- 设置 ---------- */
  function renderSettings(root) {
    root.textContent = "";
    const has = AFW.hasToken();
    const input = h("input", { attrs: { type: "password", autocomplete: "off", spellcheck: "false", placeholder: "github_pat_…", "aria-label": "GitHub token" } });
    const save = h("button", { class: "btn", text: "验证并保存", attrs: { type: "button" }, on: { click: async () => {
      const t = input.value.trim();
      if (!t) return;
      save.disabled = true;
      const r = await AFW.verifyToken(t);
      save.disabled = false;
      if (!r.ok) { AFW.toast(r.why, true); return; }
      AFW.setToken(t);
      input.value = "";
      AFW.toast("已保存，现在可以打勾和记录了");
      await APP.reload();
    } } });
    root.append(h("div", { class: "section-head" }, h("h2", { text: "写入权限" })));
    root.append(h("div", { class: "panel form" },
      h("p", { text: has
        ? (AFW.isTokenBad() ? "已保存的 token 失效了（可能过期）。网页已退回只读，请换一个新的。" : "已填 token：这个浏览器可以打勾、记学习记录。token 只存在这个浏览器里。")
        : "现在是只读模式。填一个只对这个仓库有写权限的 GitHub token，就能在这个浏览器里打勾和记录。token 只存在这个浏览器的 localStorage 里，不会上传到别处。" }),
      h("ol", { class: "steps" },
        h("li", {}, "打开 ", h("a", { href: "https://github.com/settings/personal-access-tokens/new", text: "GitHub → Fine-grained tokens → Generate new token" })),
        h("li", { text: `Repository access 选 Only select repositories → ${AFW.CFG.owner}/${AFW.CFG.repo}` }),
        h("li", { text: "Permissions → Repository permissions → Contents 选 Read and write，其他都不用开" }),
        h("li", { text: "有效期按自己习惯（比如 90 天），生成后粘到下面" })),
      h("label", {}, "Token", input),
      h("div", { class: "btn-row" }, save,
        has ? h("button", { class: "btn danger", text: "清除 token", attrs: { type: "button" }, on: { click: async () => { AFW.setToken(null); AFW.toast("已清除，回到只读模式"); await APP.reload(); } } }) : null),
    ));

    const theme = AFW.store.get("theme") || "auto";
    root.append(h("div", { class: "section-head" }, h("h2", { text: "外观" })));
    root.append(h("div", { class: "panel" }, h("div", { class: "seg", attrs: { role: "group", "aria-label": "主题" } },
      [["auto", "跟随系统"], ["light", "浅色"], ["dark", "深色"]].map(([k, label]) => h("button", {
        text: label, attrs: { type: "button", "aria-pressed": theme === k ? "true" : "false" },
        on: { click: () => { APP.setTheme(k); renderSettings(root); } } })))));

    root.append(h("div", { class: "section-head" }, h("h2", { text: "关于" })));
    root.append(h("div", { class: "panel" }, h("dl", { class: "kv" },
      h("dt", { text: "仓库" }), h("dd", {}, h("a", { href: `https://github.com/${AFW.CFG.owner}/${AFW.CFG.repo}`, text: `${AFW.CFG.owner}/${AFW.CFG.repo}` })),
      h("dt", { text: "更新时间" }), h("dd", { text: APP.index.updated || "还没有运行过" }),
      h("dt", { text: "怎么运行" }), h("dd", { text: "每周一 7:47（芝加哥时间）由 GitHub Actions 自动运行；也可以在 Actions 页面手动运行 weekly 工作流。" }),
      h("dt", { text: "兴趣画像" }), h("dd", {}, h("a", { href: `https://github.com/${AFW.CFG.owner}/${AFW.CFG.repo}/blob/main/profile/interests.md`, text: "profile/interests.md" }), "（改这个文件就能调整推荐方向）"),
    )));
  }

  window.MoreViews = { renderLearn, renderKnowledge, renderGrowth, renderSettings };
})();
