#!/usr/bin/env python3
"""Weekly AI-frontier scout.

Modes
  weekly   distill newly finished learning entries, then research + compose this week's report
  distill  only turn finished learning entries into knowledge cards

Writes only under the data dir (default docs/data). Never reads or writes state.json
except to read it: state.json belongs to the web page.

Logs go to public GitHub Actions output, so print counts and costs only, never content.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
SCOUT = ROOT / "scout"
CFG = json.loads((SCOUT / "config.json").read_text(encoding="utf-8"))
TZ = ZoneInfo(CFG["timezone"])
AREAS = ("frontier", "earth", "workflow", "other")


class RunError(Exception):
    """A failure worth recording on the page (not a crash)."""


# ---------------------------------------------------------------- IO

def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def read_prompt(name: str) -> str:
    return (SCOUT / "prompts" / f"{name}.md").read_text(encoding="utf-8")


def fill(template: str, **values: str) -> str:
    for k, v in values.items():
        template = template.replace("{{" + k + "}}", v)
    return template


def now_local() -> dt.datetime:
    return dt.datetime.now(TZ)


# ---------------------------------------------------------------- URLs, privacy

def safe_url(u: str) -> str | None:
    try:
        p = urlsplit(str(u).strip())
    except ValueError:
        return None
    if p.scheme != "https" or not p.netloc or any(c in u for c in " \n\t\"'<>"):
        return None
    return urlunsplit(p)


def norm_url(u: str) -> str:
    p = urlsplit(str(u).strip())
    q = [(k, v) for k, v in parse_qsl(p.query) if not k.lower().startswith(("utm_", "ref", "fbclid", "gclid"))]
    path = p.path.rstrip("/") or "/"
    return urlunsplit((p.scheme.lower(), p.netloc.lower().removeprefix("www."), path, urlencode(q), ""))


_PRIVACY_PATTERNS = [
    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),        # emails
    re.compile(r"sk-ant-[A-Za-z0-9_-]{8,}"),                              # Anthropic keys
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"),                           # GitHub tokens
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"/Users/[^\s\"'，。）)]+"),                                 # local paths
    re.compile(r"/(?:global/(?:cfs|homes)|pscratch)/[^\s\"'，。）)]*"),
]


def _denylist() -> list[re.Pattern]:
    raw = os.environ.get("PRIVACY_DENYLIST", "")
    words = [w.strip() for w in re.split(r"[\n,，]", raw) if len(w.strip()) >= 2]
    return [re.compile(re.escape(w), re.IGNORECASE) for w in words]


def redact(obj, counter: list[int], deny: list[re.Pattern]):
    """Recursively redact private patterns from every string. URL fields are validated separately."""
    if isinstance(obj, str):
        out = obj
        for pat in _PRIVACY_PATTERNS + deny:
            out, n = pat.subn("[已移除]", out)
            counter[0] += n
        return out
    if isinstance(obj, list):
        return [redact(x, counter, deny) for x in obj]
    if isinstance(obj, dict):  # URLs are checked by clean_links instead of being rewritten
        return {k: (v if k == "url" else redact(v, counter, deny)) for k, v in obj.items()}
    return obj


def clean_links(links, limit=3) -> list[dict]:
    out, seen = [], set()
    for l in links or []:
        u = safe_url((l or {}).get("url", ""))
        if not u or norm_url(u) in seen or any(p.search(u) for p in _PRIVACY_PATTERNS + _denylist()):
            continue
        seen.add(norm_url(u))
        out.append({"title": str(l.get("title") or "")[:120], "url": u})
        if len(out) >= limit:
            break
    return out


# ---------------------------------------------------------------- usage and budget

def price_of(model: str) -> dict:
    table = CFG["pricing_per_mtok"]
    if model in table:
        return table[model]
    for k in table:  # e.g. a dated or suffixed id
        if model.startswith(k):
            return table[k]
    return table[CFG["model"]]


class Meter:
    """Accumulates token usage and list-price cost across API responses."""

    def __init__(self) -> None:
        self.input = self.output = self.cache_read = self.cache_write = self.searches = 0
        self.cost = 0.0
        self.models: set[str] = set()

    def add(self, msg) -> None:
        u = getattr(msg, "usage", None)
        if u is None:
            return
        model = getattr(msg, "model", None) or CFG["model"]
        self.models.add(model)
        p = price_of(model)
        i = getattr(u, "input_tokens", 0) or 0
        o = getattr(u, "output_tokens", 0) or 0
        cr = getattr(u, "cache_read_input_tokens", 0) or 0
        cw = getattr(u, "cache_creation_input_tokens", 0) or 0
        stu = getattr(u, "server_tool_use", None)
        s = (getattr(stu, "web_search_requests", 0) or 0) if stu is not None else 0
        self.input += i; self.output += o; self.cache_read += cr; self.cache_write += cw; self.searches += s
        self.cost += (i * p["input"] + o * p["output"] + cr * p["cache_read"] + cw * p["cache_write"]) / 1e6
        self.cost += s * CFG["web_search_usd_per_1000"] / 1000

    def record(self, date: str, kind: str, status: str) -> dict:
        return {
            "date": date, "kind": kind, "status": status,
            "model": ",".join(sorted(self.models)) or CFG["model"],
            "input_tokens": self.input, "output_tokens": self.output,
            "cache_read_tokens": self.cache_read, "cache_write_tokens": self.cache_write,
            "web_searches": self.searches, "cost_usd": round(self.cost, 4),
        }


def month_cost(usage: dict, date: str) -> float:
    return sum(r.get("cost_usd", 0) for r in usage.get("runs", []) if str(r.get("date", ""))[:7] == date[:7])


def budget_ok(usage: dict, date: str) -> tuple[bool, float]:
    spent = month_cost(usage, date)
    return spent + CFG["per_run_reserve_usd"] <= CFG["monthly_cap_usd"], spent


# ---------------------------------------------------------------- context from repo data

def past_weeks(data: Path, index: dict, n: int) -> list[dict]:
    out = []
    for w in reversed(index.get("weeks", [])):
        if w.get("status") != "ok":
            continue
        wk = load_json(data / w["file"], None)
        if wk:
            out.append(wk)
        if len(out) >= n:
            break
    return out


def seen_urls(weeks: list[dict]) -> list[str]:
    urls = []
    for wk in weeks:
        for it in wk.get("items", []):
            urls += [l["url"] for l in it.get("links", []) if l.get("url")]
        urls += [l["url"] for l in (wk.get("deep_dive") or {}).get("links", []) if l.get("url")]
    return sorted({norm_url(u) for u in urls})


def feedback_text(state: dict) -> str:
    fb = state.get("feedback", {}) or {}
    ups = [f for f in fb.values() if f.get("v") == "up"]
    downs = [f for f in fb.values() if f.get("v") == "down"]
    stars = [f for f in fb.values() if f.get("star")]
    if not (ups or downs or stars):
        return "暂无反馈（这是最早的几期）。"

    def fmt(fs):
        fs = sorted(fs, key=lambda f: str(f.get("t", "")), reverse=True)[:15]
        return "\n".join(f"- [{f.get('area', '?')}] {str(f.get('title', ''))[:80]}（标签：{', '.join(f.get('tags', [])[:4])}）" for f in fs)

    parts = []
    if ups:
        parts.append("打了 ✓ 感兴趣的：\n" + fmt(ups))
    if stars:
        parts.append("标了 ⭐ 想深入的：\n" + fmt(stars))
    if downs:
        parts.append("打了 ✗ 不感兴趣的：\n" + fmt(downs))
    return "\n\n".join(parts)


def pick_deep_dive(state: dict, weeks: list[dict]) -> dict | None:
    """Most recent ⭐ item that has not had a deep dive yet."""
    done = {(wk.get("deep_dive") or {}).get("source_item_id") for wk in weeks}
    items = {it["id"]: it for wk in weeks for it in wk.get("items", [])}
    stars = [(f.get("t", ""), iid) for iid, f in (state.get("feedback") or {}).items() if f.get("star")]
    for _, iid in sorted(stars, reverse=True):
        if iid not in done and iid in items:
            return items[iid]
    return None


def learning_candidates(state: dict, cards: dict, data: Path, index: dict, limit: int = 10) -> list[dict]:
    distilled = set(cards.get("distilled_ids", []))
    todo = [l for l in state.get("learning", []) if l.get("status") == "done" and l.get("id") not in distilled]
    todo = sorted(todo, key=lambda l: str(l.get("done_at") or l.get("updated") or ""))[:limit]
    if not todo:
        return []
    items = {it["id"]: it for wk in past_weeks(data, index, 52) for it in wk.get("items", [])}
    out = []
    for l in todo:
        it = items.get(l.get("item_id") or "")
        out.append({
            "learning_id": l["id"], "title": str(l.get("title", ""))[:200], "url": safe_url(l.get("url", "")) or "",
            "notes": str(l.get("notes", ""))[:4000], "minutes": l.get("minutes", 0), "tags": l.get("tags", [])[:8],
            "related_item": None if not it else {k: it.get(k) for k in ("title", "area", "what", "why", "relevance", "links")},
        })
    return out


# ---------------------------------------------------------------- output schemas (structured outputs)

def _obj(props: dict) -> dict:
    return {"type": "object", "properties": props, "required": list(props), "additionalProperties": False}


_S = {"type": "string"}
_LINKS = {"type": "array", "items": _obj({"title": _S, "url": _S})}

WEEK_SCHEMA = _obj({
    "summary": {"type": "array", "items": _S},
    "items": {"type": "array", "items": _obj({
        "area": {"type": "string", "enum": list(AREAS)},
        "title": _S, "what": _S, "why": _S, "relevance": _S, "try": _S, "effort": _S,
        "links": _LINKS,
        "evidence": {"type": "string", "enum": ["primary", "secondary"]},
        "date_published": _S,
        "tags": {"type": "array", "items": _S},
    })},
    "deep_dive": _obj({"source_item_id": _S, "title": _S, "body": _S, "links": _LINKS}),
    "try_this": {"type": "array", "items": _obj({"title": _S, "steps": _S, "cost": _S})},
    "skip": {"type": "array", "items": _obj({"title": _S, "reason": _S})},
    "watch_next": {"type": "array", "items": _S},
    "preferences_learned": _S,
})

CARDS_SCHEMA = _obj({
    "cards": {"type": "array", "items": _obj({
        "topic": _S, "title": _S, "summary": _S,
        "key_points": {"type": "array", "items": _S},
        "my_words": _S, "related_research": _S,
        "next_steps": {"type": "array", "items": _S},
        "links": _LINKS,
        "source_learning_ids": {"type": "array", "items": _S},
    })},
})


# ---------------------------------------------------------------- Claude API

FALLBACK_BETA = "server-side-fallback-2026-07-01"


def _client():
    import anthropic  # imported lazily so --fixture runs without the SDK
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RunError("没有设置 ANTHROPIC_API_KEY（GitHub 仓库的 Actions secret）")
    return anthropic.Anthropic(timeout=900.0, max_retries=3)


def _stream(client, meter: Meter, **kw):
    """One streamed beta request with server-side refusal fallback; returns the final message."""
    import inspect
    kw.setdefault("betas", [FALLBACK_BETA])
    if "fallbacks" in inspect.signature(client.beta.messages.stream).parameters:
        kw["fallbacks"] = "default"
    else:  # older SDK without the typed param: send it in the body
        kw["extra_body"] = {"fallbacks": "default"}
    with client.beta.messages.stream(**kw) as s:
        msg = s.get_final_message()
    meter.add(msg)
    if msg.stop_reason == "refusal":
        cat = getattr(getattr(msg, "stop_details", None), "category", None)
        raise RunError(f"模型拒绝了这次请求（category={cat}）")
    return msg


def _text(msg) -> str:
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")


def call_research(client, meter: Meter, prompt: str) -> str:
    tools = [
        {"type": "web_search_20260209", "name": "web_search", "max_uses": CFG["max_web_searches"]},
        {"type": "web_fetch_20260209", "name": "web_fetch", "max_uses": CFG["max_web_fetches"],
         "max_content_tokens": CFG["max_fetch_content_tokens"]},
    ]
    user = {"role": "user", "content": prompt}
    assistant_blocks: list = []
    texts: list[str] = []
    for turn in range(8):
        messages = [user] + ([{"role": "assistant", "content": assistant_blocks}] if assistant_blocks else [])
        msg = _stream(client, meter, model=CFG["model"], max_tokens=64000, tools=tools, messages=messages,
                      output_config={"effort": CFG["effort_research"]})
        texts.append(_text(msg))
        print(f"  research turn {turn + 1}: stop={msg.stop_reason} searches_so_far={meter.searches} cost_so_far=${meter.cost:.2f}")
        if msg.stop_reason != "pause_turn":
            break
        assistant_blocks = assistant_blocks + list(msg.content)  # server resumes from the trailing tool block
    else:
        raise RunError("检索在多次 pause_turn 后仍未结束")
    notes = "\n".join(t for t in texts if t).strip()
    if len(notes) < 500:
        raise RunError("检索笔记太短，可能没搜到东西")
    return notes


def call_structured(client, meter: Meter, prompt: str, schema: dict, effort: str, max_tokens: int) -> dict:
    msg = _stream(client, meter, model=CFG["model"], max_tokens=max_tokens,
                  messages=[{"role": "user", "content": prompt}],
                  output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}})
    if msg.stop_reason == "max_tokens":
        raise RunError("输出超过 max_tokens，被截断")
    try:
        return json.loads(_text(msg))
    except json.JSONDecodeError as e:
        raise RunError(f"结构化输出不是合法 JSON：{e}") from e


# ---------------------------------------------------------------- shaping the outputs

def _s(x, n: int) -> str:
    return re.sub(r"\s+\n", "\n", str(x or "")).strip()[:n]


def _item_id(date: str, url: str) -> str:
    import hashlib
    return f"{date}-{hashlib.sha1(norm_url(url).encode()).hexdigest()[:6]}"


def finalize_week(raw: dict, date: str, window: dict, seen: list[str], deep: dict | None, models: list[str]) -> dict:
    seen_set = set(seen)
    items, used = [], set()
    for it in raw.get("items", []):
        links = clean_links(it.get("links"))
        if not links:
            continue
        norms = {norm_url(l["url"]) for l in links}
        if norms <= seen_set or norm_url(links[0]["url"]) in used:
            continue
        used.add(norm_url(links[0]["url"]))
        area = it.get("area") if it.get("area") in AREAS else "other"
        pub = it.get("date_published") or ""
        items.append({
            "id": _item_id(date, links[0]["url"]), "area": area,
            "title": _s(it.get("title"), 120), "what": _s(it.get("what"), 500), "why": _s(it.get("why"), 300),
            "relevance": _s(it.get("relevance"), 300), "try": _s(it.get("try"), 300), "effort": _s(it.get("effort"), 80),
            "links": links, "evidence": "primary" if it.get("evidence") == "primary" else "secondary",
            "date_published": pub if re.fullmatch(r"\d{4}-\d{2}-\d{2}", pub) else "",
            "tags": [_s(t, 20) for t in (it.get("tags") or [])][:4],
        })
        if len(items) >= CFG["items_max"]:
            break
    if not items:
        raise RunError("整理后没有可用条目（都没有有效链接，或都已报道过）")
    dd = raw.get("deep_dive") or {}
    deep_dive = None
    if deep and _s(dd.get("title"), 10):
        deep_dive = {"source_item_id": deep["id"], "title": _s(dd.get("title"), 120),
                     "body": _s(dd.get("body"), 5000), "links": clean_links(dd.get("links"), 5)}
    week = {
        "date": date, "window": window,
        "generated_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "model": ",".join(models) or CFG["model"],
        "summary": [_s(x, 100) for x in raw.get("summary", [])][:3],
        "items": items,
        "deep_dive": deep_dive,
        "try_this": [{"title": _s(t.get("title"), 80), "steps": _s(t.get("steps"), 400), "cost": _s(t.get("cost"), 80)}
                     for t in raw.get("try_this", [])][:2],
        "skip": [{"title": _s(t.get("title"), 80), "reason": _s(t.get("reason"), 200)} for t in raw.get("skip", [])][:3],
        "watch_next": [_s(x, 150) for x in raw.get("watch_next", [])][:3],
        "preferences_learned": _s(raw.get("preferences_learned"), 300),
    }
    n = [0]
    week = redact(week, n, _denylist())
    for it in week["items"]:  # redaction must not touch URLs; re-validate them
        it["links"] = clean_links(it["links"])
    if n[0]:
        print(f"  privacy: redacted {n[0]} match(es)")
    if len(items) < CFG["items_min"]:
        print(f"  note: only {len(items)} items (min {CFG['items_min']})")
    return week


def finalize_cards(raw: dict, cands: list[dict], date: str) -> list[dict]:
    cand_ids = {c["learning_id"] for c in cands}
    allowed = set()
    for c in cands:
        if c["url"]:
            allowed.add(norm_url(c["url"]))
        for l in ((c.get("related_item") or {}).get("links") or []):
            if l.get("url"):
                allowed.add(norm_url(l["url"]))
    out = []
    stamp = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    for i, c in enumerate(raw.get("cards", []), start=1):
        src = [x for x in c.get("source_learning_ids", []) if x in cand_ids]
        if not src and len(cand_ids) == 1:
            src = list(cand_ids)
        if not src:
            continue
        out.append({
            "id": f"K{date.replace('-', '')}-{i:02d}", "created": stamp,
            "topic": _s(c.get("topic"), 20) or "未分类", "title": _s(c.get("title"), 120),
            "summary": _s(c.get("summary"), 500),
            "key_points": [_s(p, 200) for p in c.get("key_points", [])][:5],
            "my_words": _s(c.get("my_words"), 2000), "related_research": _s(c.get("related_research"), 300),
            "next_steps": [_s(p, 200) for p in c.get("next_steps", [])][:3],
            "links": [l for l in clean_links(c.get("links"), 5) if norm_url(l["url"]) in allowed],
            "source_learning_ids": src,
        })
    n = [0]
    out = redact(out, n, _denylist())
    for c in out:
        c["links"] = clean_links(c["links"], 5)
    return out


# ---------------------------------------------------------------- pipelines

class Ctx:
    def __init__(self, data: Path, date: str, fixture: bool):
        self.data, self.date, self.fixture = data, date, fixture
        self.index = load_json(data / "index.json", {"updated": None, "weeks": [], "notices": []})
        self.usage = load_json(data / "usage.json", {"runs": []})
        self.state = load_json(data / "state.json", {"version": 1, "feedback": {}, "learning": []})
        self.cards = load_json(data / "knowledge" / "cards.json", {"updated": None, "distilled_ids": [], "cards": []})
        self._client = None

    def client(self):
        if self._client is None:
            self._client = _client()
        return self._client

    def notice(self, level: str, text: str) -> None:
        self.index.setdefault("notices", []).append({"date": self.date, "level": level, "text": text[:300]})
        self.index["notices"] = self.index["notices"][-10:]

    def upsert_week(self, entry: dict) -> None:
        weeks = [w for w in self.index.get("weeks", []) if w.get("date") != entry["date"]]
        weeks.append(entry)
        self.index["weeks"] = sorted(weeks, key=lambda w: w["date"])

    def save(self) -> None:
        self.index["updated"] = now_local().replace(microsecond=0).isoformat()
        save_json(self.data / "index.json", self.index)
        save_json(self.data / "usage.json", self.usage)
        save_json(self.data / "knowledge" / "cards.json", self.cards)


def run_distill(ctx: Ctx) -> bool:
    cands = learning_candidates(ctx.state, ctx.cards, ctx.data, ctx.index)
    if not cands:
        print("distill: no newly finished learning entries")
        return True
    ok, spent = budget_ok(ctx.usage, ctx.date)
    if not ok:
        ctx.notice("info", f"本月花费约 ${spent:.2f}，接近上限 ${CFG['monthly_cap_usd']}，知识整理推迟到下个月。")
        print(f"distill: skipped, month spend ${spent:.2f}")
        return True
    meter = Meter()
    try:
        if ctx.fixture:
            raw = {"cards": [{"topic": "示例主题", "title": c["title"], "summary": "【示例】知识卡片摘要。",
                              "key_points": ["【示例】要点一", "【示例】要点二"], "my_words": c["notes"],
                              "related_research": "科研 agent 工作流", "next_steps": ["【示例】下一步"],
                              "links": [{"title": "原文", "url": c["url"]}] if c["url"] else [],
                              "source_learning_ids": [c["learning_id"]]} for c in cands]}
        else:
            topics = sorted({c.get("topic", "") for c in ctx.cards.get("cards", []) if c.get("topic")})
            prompt = fill(read_prompt("distill"), TOPICS="、".join(topics) or "（还没有）",
                          ENTRIES=json.dumps(cands, ensure_ascii=False, indent=1))
            raw = call_structured(ctx.client(), meter, prompt, CARDS_SCHEMA, CFG["effort_distill"], 16000)
        new = finalize_cards(raw, cands, ctx.date)
        covered = {x for c in new for x in c["source_learning_ids"]}
        ctx.cards["cards"] = ctx.cards.get("cards", []) + new
        ctx.cards["distilled_ids"] = sorted(set(ctx.cards.get("distilled_ids", [])) | covered)
        ctx.cards["updated"] = now_local().replace(microsecond=0).isoformat()
        ctx.usage["runs"].append(meter.record(ctx.date, "distill", "ok"))
        print(f"distill: {len(cands)} entries -> {len(new)} cards, cost ${meter.cost:.2f}")
        return True
    except Exception as e:  # record and continue; the weekly report can still run
        ctx.usage["runs"].append(meter.record(ctx.date, "distill", "failed"))
        ctx.notice("error", f"知识整理失败：{type(e).__name__}: {str(e)[:200]}")
        print(f"distill: FAILED {type(e).__name__}: {str(e)[:200]}")
        return False


def run_weekly(ctx: Ctx, window_days: int, must_read: list[str]) -> bool:
    d = dt.date.fromisoformat(ctx.date)
    window = {"from": (d - dt.timedelta(days=window_days)).isoformat(), "to": ctx.date}
    ok, spent = budget_ok(ctx.usage, ctx.date)
    if not ok:
        reason = f"本月花费约 ${spent:.2f}，再跑一期可能超过上限 ${CFG['monthly_cap_usd']}，这一期跳过。"
        ctx.upsert_week({"date": ctx.date, "status": "skipped", "reason": reason})
        ctx.notice("info", reason)
        print(f"weekly: skipped, month spend ${spent:.2f}")
        return True
    weeks = past_weeks(ctx.data, ctx.index, CFG["seen_lookback_weeks"])
    seen = seen_urls(weeks)
    deep = pick_deep_dive(ctx.state, weeks)
    fb = feedback_text(ctx.state)
    meter = Meter()
    try:
        if ctx.fixture:
            raw = load_json(SCOUT / "fixtures" / "week_sample.json", {})
        else:
            prompt = fill(
                read_prompt("research"),
                MAX_SEARCHES=str(CFG["max_web_searches"]), MAX_FETCHES=str(CFG["max_web_fetches"]),
                WINDOW_FROM=window["from"], WINDOW_TO=window["to"], TODAY=ctx.date,
                INTERESTS=(ROOT / "profile" / "interests.md").read_text(encoding="utf-8"),
                SOURCES=(ROOT / "profile" / "sources.md").read_text(encoding="utf-8"),
                FEEDBACK=fb,
                MUST_READ="\n".join(f"- {u}（必须打开原文核实，并作为候选条目）" for u in must_read) or "无",
                DEEP_DIVE=(f"{deep['title']}\n" + "\n".join(l["url"] for l in deep.get("links", []))) if deep else "无",
                SEEN="\n".join(seen) or "（无）",
            )
            print(f"weekly: window {window['from']}..{window['to']}, seen {len(seen)} urls, deep_dive={'yes' if deep else 'no'}, must_read={len(must_read)}")
            notes = call_research(ctx.client(), meter, prompt)
            prompt2 = fill(read_prompt("compose"), ITEMS_MIN=str(CFG["items_min"]), ITEMS_MAX=str(CFG["items_max"]),
                           DEEP_DIVE_ID=deep["id"] if deep else "（无）", FEEDBACK=fb,
                           SEEN="\n".join(seen) or "（无）", NOTES=notes)
            raw = call_structured(ctx.client(), meter, prompt2, WEEK_SCHEMA, CFG["effort_compose"], 32000)
        week = finalize_week(raw, ctx.date, window, seen, deep, sorted(meter.models))
        rel = f"weeks/{ctx.date}.json"
        save_json(ctx.data / rel, week)
        ctx.upsert_week({"date": ctx.date, "file": rel, "status": "ok", "n_items": len(week["items"]),
                         "headline": (week["summary"] or [""])[0], "model": week["model"],
                         "generated_at": week["generated_at"]})
        ctx.index["notices"] = [n for n in ctx.index.get("notices", []) if n.get("date", "") > ctx.date]
        ctx.usage["runs"].append(meter.record(ctx.date, "weekly", "ok"))
        print(f"weekly: {len(week['items'])} items, searches {meter.searches}, cost ${meter.cost:.2f}")
        return True
    except Exception as e:
        ctx.usage["runs"].append(meter.record(ctx.date, "weekly", "failed"))
        msg = f"{type(e).__name__}: {str(e)[:200]}"
        if not any(w.get("date") == ctx.date and w.get("status") == "ok" for w in ctx.index.get("weeks", [])):
            ctx.upsert_week({"date": ctx.date, "status": "failed", "reason": "生成失败：" + msg})
        ctx.notice("error", f"{ctx.date} 这一期生成失败：{msg}")
        print(f"weekly: FAILED {msg} (cost so far ${meter.cost:.2f})")
        return False


# ---------------------------------------------------------------- main

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--mode", choices=["weekly", "distill"], default="weekly")
    ap.add_argument("--window-days", type=int, default=7)
    ap.add_argument("--must-read", default="", help="https URLs separated by spaces or newlines")
    ap.add_argument("--date", default="", help="report date YYYY-MM-DD (default: today, America/Chicago)")
    ap.add_argument("--data-dir", default=str(ROOT / "docs" / "data"))
    ap.add_argument("--fixture", action="store_true", help="no API calls; use scout/fixtures (needs a non-default --data-dir)")
    a = ap.parse_args(argv)

    data = Path(a.data_dir).resolve()
    if a.fixture and data == (ROOT / "docs" / "data").resolve():
        ap.error("--fixture writes sample data; point --data-dir at a scratch copy, not docs/data")
    if not 1 <= a.window_days <= 60:
        ap.error("--window-days must be 1..60")
    date = a.date or now_local().date().isoformat()
    dt.date.fromisoformat(date)
    must = [u for u in (safe_url(x) for x in a.must_read.split()) if u][:5]

    ctx = Ctx(data, date, a.fixture)
    ok = run_distill(ctx)
    if a.mode == "weekly":
        ok = run_weekly(ctx, a.window_days, must) and ok
    ctx.save()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
