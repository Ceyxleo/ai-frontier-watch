/* i18n.js: UI strings (zh / en) and the language switch. Loaded first.
 * Generated content is bilingual in the data itself (an `en` object beside the Chinese fields);
 * pick() chooses the right one. The user's own learning notes are never translated.
 */
(function () {
  "use strict";
  const T = {
    zh: {
      htmlLang: "zh-CN", title: "AI 前沿周报", brandSub: "每周一更新 · 打勾、记录、沉淀成知识", switchTo: "EN", switchTitle: "Switch to English",
      tabs: { week: "本周", archive: "往期", learn: "学习记录", knowledge: "知识库", growth: "成长", settings: "设置" },
      footer: "内容由 AI agent 每周自动检索和整理，每条都附原始链接，并标明是否读了原文。请以原文为准。",
      loading: "加载中…",
      areas: { frontier: "前沿模型和 agent", earth: "AI for 地球系统和水文", workflow: "AI 科研工作流", other: "其他" },
      badge: { ro: "只读", roTitle: "到「设置」填 token 后可以打勾和记录", rw: "可编辑", rwTitle: "这个浏览器可以打勾和记录", bad: "token 失效", badTitle: "到「设置」换一个 token" },
      // week
      evPrimary: "读了原文", evSecondary: "只看了摘要或二手报道", published: d => "发布 " + d,
      fWhat: "是什么", fWhy: "为什么", fRel: "跟我", fTry: "怎么试",
      aUp: "感兴趣", aDown: "不感兴趣", aStar: "想深入", aLearn: "加入学习", aLearned: "已在学习清单", roHint: "在「设置」里填 token 后可以操作",
      weekTitle: d => `${d} 这一期`, covers: (a, b) => `覆盖 ${a} 至 ${b}`, nItems: n => `${n} 条`, model: m => `模型 ${m}`,
      weekCost: c => `本期花费约 $${c}（按标价估算）`,
      emptyTitle: "第一期还没生成", emptyBody: "每周一早上 7:47（芝加哥时间）自动生成，也可以在 GitHub Actions 里手动运行 weekly 工作流。",
      weekUnreadable: f => "这一期的数据读不出来：" + f, backLatest: "← 回到最新一期",
      deepTitle: "⭐ 展开讲一条", tryTitle: "推荐你试的", tryMeta: "需要你决定", skipTitle: "可以先不管的", watchTitle: "下期继续盯",
      // archive
      fAll: "按期", fUp: "只看 ✓", fStar: "只看 ⭐", filterLabel: "筛选", noArchive: "还没有往期",
      skipped: "跳过", failed: "失败", archiveStats: (n, u) => `${n} 条 · ✓ ${u}`,
      noUp: "还没有打 ✓ 的条目。", noStar: "还没有标 ⭐ 的条目。",
      // learn
      status: { todo: "想学", doing: "在学", done: "学完" },
      lfTitle: "标题", lfTitlePh: "比如：读完 n8n 的 multi-agent 文章", lfUrl: "链接", lfUrlPh: "https://…（可选）",
      lfMin: "用时（分钟）", lfStatus: "状态", lfTags: "标签", lfTagsPh: "multi-agent, 水文（逗号分隔）",
      lfNotes: "我学到了什么", lfNotesPh: "用自己的话写：学到了什么、哪里还不懂、想怎么用到研究里。学完以后，周一的整理会把它沉淀成知识卡片。",
      lfAdd: "记一条", lfSave: "保存修改", lfCancel: "取消", lfRo: "只读模式：在「设置」里填 token 后才能记录。",
      lfHttps: "链接要以 https:// 开头", learnNew: "记一条学习", learnEdit: "修改学习记录", learnMine: "我的学习",
      lAll: "全部", statusFilter: "按状态筛选", learnEmpty: "还没有记录。在「本周」点 ＋ 加入学习，或者在上面直接记一条。",
      minutes: n => `${n} 分钟`, doneOn: d => "学完于 " + d, updatedOn: d => "更新于 " + d, distilled: "已沉淀成知识",
      startLearning: "开始学", markDone: "标记学完", edit: "编辑", del: "删除",
      confirmDel: t => `删除「${t}」？这条记录会从仓库里移除（git 历史里还能找回）。`,
      // knowledge
      kSearch: "搜索知识卡片", kCount: n => `${n} 张卡片`, kEmptyTitle: "知识库还是空的",
      kEmptyBody: "在「学习记录」里把一条标成学完，下一次整理（每周一，或手动运行）就会把它和相关条目沉淀成知识卡片。",
      kNoMatch: "没有匹配的卡片。", kUncat: "未分类", kMine: "我的话：", kMore: "关联研究、下一步、来源",
      kRelated: "关联研究：", kCreated: d => "整理于 " + d,
      // growth
      gWeeks: "出了几期", gUp: "打了 ✓", gUpSub: (s, d) => `⭐ ${s} · ✗ ${d}`, gDone: "学完", gHours: h => `共 ${h} 小时`, gCards: "知识卡片",
      cFb: "每期的反馈", cFbSub: "按周报日期，最近 12 周", cFbAria: "每期的反馈数", unitItems: " 条",
      sUp: "✓ 感兴趣", sDown: "✗ 不感兴趣", sStar: "⭐ 想深入", sStarLegend: "⭐ 想深入（含同时打 ✓ 的）",
      cMin: "每周学习时长", cMinSub: "分钟，最近 12 周", cMinAria: "学习分钟", unitMin: " 分钟",
      cCards: "知识卡片累计", cCardsSub: "最近 12 周", cCardsAria: "知识卡片累计", unitCards: " 张", cum: v => `累计 ${v}`,
      cTopic: "主题分布", cTopicSubCards: "知识卡片按主题，前 8 个", cTopicSubUp: "还没有知识卡片，先看打了 ✓ 的条目在哪个方向",
      cTopicAria: "主题分布", noData: "还没有数据。", table: "查看数据表",
      thWeek: "周", thMinutes: "分钟", thCum: "累计", thTopic: "主题", thCount: "数量",
      spend: "花费", spendMeta: m => `本月约 $${m}，上限 $20（按标价估算，不是账单）`, runs: (c, n) => `$${c} · ${n} 次运行`, noRuns: "还没有运行记录。",
      // settings
      sWrite: "写入权限",
      sHas: "已填 token：这个浏览器可以打勾、记学习记录。token 只存在这个浏览器里。",
      sBad: "已保存的 token 失效了（可能过期）。网页已退回只读，请换一个新的。",
      sNone: "现在是只读模式。填一个只对这个仓库有写权限的 GitHub token，就能在这个浏览器里打勾和记录。token 只存在这个浏览器的 localStorage 里，不会上传到别处。",
      sStep1: "打开 ", sStep1Link: "GitHub → Fine-grained tokens → Generate new token",
      sStep2: r => `Repository access 选 Only select repositories → ${r}`,
      sStep3: "Permissions → Repository permissions → Contents 选 Read and write，其他都不用开",
      sStep4: "有效期按自己习惯（比如 90 天），生成后粘到下面",
      sSave: "验证并保存", sClear: "清除 token", sSaved: "已保存，现在可以打勾和记录了", sCleared: "已清除，回到只读模式",
      sLook: "外观", sTheme: "主题", thAuto: "跟随系统", thLight: "浅色", thDark: "深色",
      sLang: "语言", sAbout: "关于", sRepo: "仓库", sUpdated: "更新时间", sNever: "还没有运行过",
      sHow: "怎么运行", sHowBody: "每周一 7:47（芝加哥时间）由 GitHub Actions 自动运行；也可以在 Actions 页面手动运行 weekly 工作流。",
      sProfile: "兴趣画像", sProfileNote: "（改这个文件就能调整推荐方向）",
      // actions / errors
      toastRo: "只读模式：在「设置」里填 token 后才能操作", toastAdded: "已加入学习清单", toastSaved: "已保存", toastLogged: "已记下", toastDeleted: "已删除",
      notSaved: m => "没保存上：" + m,
      eRo: "只读模式：先在设置里填 token", eBadToken: "token 无效或已过期", eNoRepo: s => `读不到仓库（HTTP ${s}），检查 token 是否选了这个仓库`,
      eNoPush: "token 没有这个仓库的写权限（Contents: Read and write）", eRead: s => `读取 state.json 失败（HTTP ${s}）`,
      eForbidden: s => `没有写权限（HTTP ${s}）`, eSave: s => `保存失败（HTTP ${s}）`, eConflict: "保存冲突，重试几次都没成功，请刷新后再试",
    },
    en: {
      htmlLang: "en", title: "AI Frontier Weekly", brandSub: "Updated every Monday · rate, log, and distill", switchTo: "中", switchTitle: "切换到中文",
      tabs: { week: "This week", archive: "Archive", learn: "Learning", knowledge: "Knowledge", growth: "Growth", settings: "Settings" },
      footer: "An AI agent searches and curates this every week. Every item links to its source and says whether the agent read the original. The source is the authority.",
      loading: "Loading…",
      areas: { frontier: "Frontier models & agents", earth: "AI for Earth system & hydrology", workflow: "AI research workflow", other: "Other" },
      badge: { ro: "Read-only", roTitle: "Add a token in Settings to rate and log", rw: "Editable", rwTitle: "This browser can rate and log", bad: "Token expired", badTitle: "Replace the token in Settings" },
      evPrimary: "Read the original", evSecondary: "Summary or secondhand only", published: d => "Published " + d,
      fWhat: "What", fWhy: "Why", fRel: "For me", fTry: "Try",
      aUp: "Interested", aDown: "Not for me", aStar: "Go deeper", aLearn: "Add to learning", aLearned: "In learning list", roHint: "Add a token in Settings first",
      weekTitle: d => `Issue of ${d}`, covers: (a, b) => `Covers ${a} to ${b}`, nItems: n => (n === 1 ? "1 item" : `${n} items`), model: m => `Model ${m}`,
      weekCost: c => `This issue cost about $${c} (list-price estimate)`,
      emptyTitle: "The first issue hasn't run yet", emptyBody: "It runs every Monday at 7:47 a.m. Chicago time. You can also run the weekly workflow by hand in GitHub Actions.",
      weekUnreadable: f => "Couldn't read this issue: " + f, backLatest: "← Back to the latest issue",
      deepTitle: "⭐ Deep dive", tryTitle: "Worth trying", tryMeta: "Your call", skipTitle: "Safe to skip for now", watchTitle: "Watching next week",
      fAll: "By issue", fUp: "✓ only", fStar: "⭐ only", filterLabel: "Filter", noArchive: "No past issues yet",
      skipped: "skipped", failed: "failed", archiveStats: (n, u) => `${n === 1 ? "1 item" : n + " items"} · ✓ ${u}`,
      noUp: "Nothing marked ✓ yet.", noStar: "Nothing marked ⭐ yet.",
      status: { todo: "To learn", doing: "Learning", done: "Done" },
      lfTitle: "Title", lfTitlePh: "e.g. Read the n8n post on multi-agent systems", lfUrl: "Link", lfUrlPh: "https://… (optional)",
      lfMin: "Time (minutes)", lfStatus: "Status", lfTags: "Tags", lfTagsPh: "multi-agent, hydrology (comma-separated)",
      lfNotes: "What I learned", lfNotesPh: "In your own words: what you learned, what's still unclear, how it could fit your research. Once it's done, Monday's distill turns it into a knowledge card.",
      lfAdd: "Log it", lfSave: "Save changes", lfCancel: "Cancel", lfRo: "Read-only: add a token in Settings to log.",
      lfHttps: "Links must start with https://", learnNew: "Log something you learned", learnEdit: "Edit entry", learnMine: "My learning",
      lAll: "All", statusFilter: "Filter by status", learnEmpty: "Nothing logged yet. Tap ＋ on an item in This week, or log one above.",
      minutes: n => `${n} min`, doneOn: d => "Done " + d, updatedOn: d => "Updated " + d, distilled: "Distilled into knowledge",
      startLearning: "Start", markDone: "Mark done", edit: "Edit", del: "Delete",
      confirmDel: t => `Delete "${t}"? It will be removed from the repo (still recoverable from git history).`,
      kSearch: "Search knowledge cards", kCount: n => (n === 1 ? "1 card" : `${n} cards`), kEmptyTitle: "No knowledge cards yet",
      kEmptyBody: "Mark a learning entry as done. The next distill (every Monday, or a manual run) turns it and its related items into knowledge cards.",
      kNoMatch: "No matching cards.", kUncat: "Uncategorized", kMine: "In my words: ", kMore: "Related research, next steps, sources",
      kRelated: "Related research: ", kCreated: d => "Distilled " + d,
      gWeeks: "Issues", gUp: "Marked ✓", gUpSub: (s, d) => `⭐ ${s} · ✗ ${d}`, gDone: "Done", gHours: h => `${h} hours total`, gCards: "Knowledge cards",
      cFb: "Feedback per issue", cFbSub: "By issue date, last 12 weeks", cFbAria: "Feedback per issue", unitItems: "",
      sUp: "✓ Interested", sDown: "✗ Not for me", sStar: "⭐ Go deeper", sStarLegend: "⭐ Go deeper (incl. ones also marked ✓)",
      cMin: "Learning time per week", cMinSub: "Minutes, last 12 weeks", cMinAria: "Learning minutes", unitMin: " min",
      cCards: "Knowledge cards, cumulative", cCardsSub: "Last 12 weeks", cCardsAria: "Cumulative knowledge cards", unitCards: "", cum: v => `Total ${v}`,
      cTopic: "Topics", cTopicSubCards: "Knowledge cards by topic, top 8", cTopicSubUp: "No cards yet; showing ✓ items by area",
      cTopicAria: "Topic distribution", noData: "No data yet.", table: "Show data table",
      thWeek: "Week", thMinutes: "Minutes", thCum: "Total", thTopic: "Topic", thCount: "Count",
      spend: "Spend", spendMeta: m => `About $${m} this month, cap $20 (list-price estimate, not a bill)`, runs: (c, n) => `$${c} · ${n === 1 ? "1 run" : n + " runs"}`, noRuns: "No runs yet.",
      sWrite: "Write access",
      sHas: "Token saved: this browser can rate items and log learning. The token stays in this browser.",
      sBad: "The saved token no longer works (it may have expired). The page is read-only until you add a new one.",
      sNone: "Read-only for now. Add a GitHub token that can write to this repo only, and this browser can rate items and log learning. The token is kept in this browser's localStorage and sent nowhere else.",
      sStep1: "Open ", sStep1Link: "GitHub → Fine-grained tokens → Generate new token",
      sStep2: r => `Repository access: Only select repositories → ${r}`,
      sStep3: "Permissions → Repository permissions → Contents: Read and write. Nothing else.",
      sStep4: "Pick any expiry (say 90 days), then paste it below",
      sSave: "Verify and save", sClear: "Clear token", sSaved: "Saved. You can rate and log now.", sCleared: "Cleared. Back to read-only.",
      sLook: "Appearance", sTheme: "Theme", thAuto: "System", thLight: "Light", thDark: "Dark",
      sLang: "Language", sAbout: "About", sRepo: "Repo", sUpdated: "Last updated", sNever: "Hasn't run yet",
      sHow: "How it runs", sHowBody: "GitHub Actions runs it every Monday at 7:47 a.m. Chicago time. You can also run the weekly workflow by hand from the Actions page.",
      sProfile: "Interest profile", sProfileNote: " (edit this file to steer the picks)",
      toastRo: "Read-only: add a token in Settings first", toastAdded: "Added to learning", toastSaved: "Saved", toastLogged: "Logged", toastDeleted: "Deleted",
      notSaved: m => "Not saved: " + m,
      eRo: "Read-only: add a token in Settings first", eBadToken: "The token is invalid or expired", eNoRepo: s => `Can't read the repo (HTTP ${s}). Check that the token includes this repo.`,
      eNoPush: "The token can't write to this repo (needs Contents: Read and write)", eRead: s => `Couldn't read state.json (HTTP ${s})`,
      eForbidden: s => `No write access (HTTP ${s})`, eSave: s => `Save failed (HTTP ${s})`, eConflict: "Kept hitting a save conflict. Refresh and try again.",
    },
  };

  function initialLang() {
    let saved = null;
    try { saved = localStorage.getItem("afw.lang"); } catch (_) { /* private mode */ }
    return saved === "en" ? "en" : "zh"; // Chinese by default; the choice is remembered per browser
  }
  let lang = initialLang();

  // t("key") or t("key", ...args) for function entries; dotted keys reach nested maps.
  function t(key, ...args) {
    const get = dict => key.split(".").reduce((o, k) => (o == null ? o : o[k]), dict);
    let v = get(T[lang]);
    if (v == null) v = get(T.zh);
    return typeof v === "function" ? v(...args) : v;
  }

  // Generated objects carry Chinese fields plus an optional `en` object with the same keys.
  function pick(obj, field) {
    if (!obj) return "";
    if (lang === "en" && obj.en && obj.en[field] != null && obj.en[field] !== "" && !(Array.isArray(obj.en[field]) && !obj.en[field].length)) return obj.en[field];
    return obj[field];
  }

  function setLang(l) {
    lang = l === "en" ? "en" : "zh";
    try { localStorage.setItem("afw.lang", lang); } catch (_) { /* ignore */ }
    applyStatic();
    document.dispatchEvent(new CustomEvent("afw:lang"));
  }

  function applyStatic() {
    document.documentElement.lang = t("htmlLang");
    document.title = t("title");
    document.querySelectorAll("[data-i18n]").forEach(n => { n.textContent = t(n.dataset.i18n); });
    const b = document.getElementById("lang-toggle");
    if (b) { b.textContent = t("switchTo"); b.title = t("switchTitle"); b.setAttribute("aria-label", t("switchTitle")); }
  }

  window.I18N = { t, pick, setLang, applyStatic, get lang() { return lang; } };
})();
