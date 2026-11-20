/* Minimal SVG charts for the growth tab. No dependencies.
 * All text goes through textContent; colors come from CSS classes (s1/s2/s3).
 */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const H = 210, M = { top: 14, right: 14, bottom: 30, left: 40 };
  let W = 560;
  const widthOf = c => Math.max(260, Math.round(c.getBoundingClientRect().width || c.clientWidth || 560));

  function el(name, attrs, text) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = String(text);
    return n;
  }

  function niceTicks(max) {
    if (!(max > 0)) return [0, 1];
    const raw = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = Math.max(1, [1, 2, 5, 10].map(m => m * p).find(s => s >= raw) || p * 10);
    const top = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
  }

  const fmt = v => (Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + "K" : v.toLocaleString("zh-CN"));

  // Column with 4px rounded top, square at baseline.
  function colPath(x, y, w, h, roundTop) {
    if (h <= 0) return "";
    const r = roundTop ? Math.min(4, w / 2, h) : 0;
    return `M${x},${y + h}V${y + r}` +
      (r ? `Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}` : `H${x + w}`) +
      `V${y + h}Z`;
  }
  // Horizontal bar, square at baseline (left), rounded at the data end (right).
  function barPath(x, y, w, h) {
    if (w <= 0) return "";
    const r = Math.min(4, h / 2, w);
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }

  function frame(container, ariaLabel) {
    W = widthOf(container);
    container.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "chart-wrap";
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": ariaLabel });
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.hidden = true;
    wrap.append(svg, tip);
    container.append(wrap);
    const vw = W; // this chart's own viewBox width (W is reassigned per chart)
    function show(vx, vy, lines) {
      const box = svg.getBoundingClientRect();
      const s = box.width / vw;
      tip.textContent = "";
      lines.forEach((line, i) => {
        if (i) tip.append(document.createElement("br"));
        tip.append(document.createTextNode(line));
      });
      tip.hidden = false;
      const px = Math.max(60, Math.min(box.width - 60, vx * s));
      tip.style.left = px + "px";
      tip.style.top = vy * s + "px";
    }
    function hide() { tip.hidden = true; }
    svg.addEventListener("mouseleave", hide);
    return { svg, show, hide };
  }

  function yAxis(svg, ticks, y) {
    const g = el("g");
    ticks.forEach(t => {
      const yy = y(t);
      g.append(el("line", { class: t === 0 ? "base" : "grid", x1: M.left, x2: W - M.right, y1: yy, y2: yy }));
      g.append(el("text", { class: "tick", x: M.left - 8, y: yy + 4, "text-anchor": "end" }, fmt(t)));
    });
    svg.append(g);
  }

  function xLabels(svg, labels, xCenter) {
    const every = Math.ceil(labels.length / 8);
    labels.forEach((lab, i) => {
      if ((labels.length - 1 - i) % every !== 0) return; // anchored at the latest week, evenly spaced
      svg.append(el("text", { class: "tick", x: xCenter(i), y: H - M.bottom + 18, "text-anchor": "middle" }, lab));
    });
  }

  /* rows: [{label, values: {key: n}}], series: [{key, name, cls}] */
  function stackedColumns(container, { rows, series, ariaLabel, unit }) {
    const { svg, show, hide } = frame(container, ariaLabel);
    const totals = rows.map(r => series.reduce((a, s) => a + (r.values[s.key] || 0), 0));
    const ticks = niceTicks(Math.max(1, ...totals));
    const top = ticks[ticks.length - 1];
    const ih = H - M.top - M.bottom, iw = W - M.left - M.right;
    const y = v => M.top + ih - (v / top) * ih;
    yAxis(svg, ticks, y);
    const band = iw / Math.max(1, rows.length);
    const bw = Math.min(24, band * 0.6);
    const xc = i => M.left + band * (i + 0.5);
    rows.forEach((r, i) => {
      let acc = 0;
      const present = series.filter(s => (r.values[s.key] || 0) > 0);
      const g = el("g");
      present.forEach((s, j) => {
        const v = r.values[s.key];
        const y0 = y(acc), y1 = y(acc + v);
        const gap = j > 0 ? 2 : 0;           // 2px surface gap between stacked segments
        const h = Math.max(0, y0 - y1 - gap);
        g.append(el("path", { class: s.cls, d: colPath(xc(i) - bw / 2, y1, bw, h, j === present.length - 1) }));
        acc += v;
      });
      if (totals[i] > 0) {
        g.append(el("text", { class: "val", x: xc(i), y: y(totals[i]) - 5, "text-anchor": "middle" }, fmt(totals[i])));
      }
      const hit = el("rect", { class: "hit", x: M.left + band * i, y: M.top, width: band, height: ih });
      const lines = [r.label].concat(series.map(s => `${s.name}：${r.values[s.key] || 0}${unit || ""}`));
      hit.addEventListener("mousemove", () => show(xc(i), y(totals[i] || 0), lines));
      hit.addEventListener("mouseleave", hide);
      g.append(hit);
      svg.append(g);
    });
    xLabels(svg, rows.map(r => r.label), xc);
  }

  /* rows: [{label, value}] */
  function columns(container, { rows, ariaLabel, unit }) {
    stackedColumns(container, {
      rows: rows.map(r => ({ label: r.label, values: { v: r.value } })),
      series: [{ key: "v", name: ariaLabel, cls: "s1" }],
      ariaLabel, unit,
    });
  }

  /* rows: [{label, value}] cumulative step line */
  function stepLine(container, { rows, ariaLabel, unit }) {
    const { svg, show, hide } = frame(container, ariaLabel);
    const ticks = niceTicks(Math.max(1, ...rows.map(r => r.value)));
    const top = ticks[ticks.length - 1];
    const ih = H - M.top - M.bottom, iw = W - M.left - M.right;
    const y = v => M.top + ih - (v / top) * ih;
    yAxis(svg, ticks, y);
    const n = rows.length;
    const x = i => (n <= 1 ? M.left + iw / 2 : M.left + (iw * i) / (n - 1));
    if (n) {
      let d = `M${x(0)},${y(rows[0].value)}`;
      for (let i = 1; i < n; i++) d += `H${x(i)}V${y(rows[i].value)}`;
      const area = d + `V${y(0)}H${x(0)}Z`;
      svg.append(el("path", { class: "wash1", d: area }));
      svg.append(el("path", { class: "line1", d }));
      const last = rows[n - 1];
      svg.append(el("circle", { class: "dot1", cx: x(n - 1), cy: y(last.value), r: 4.5 }));
      svg.append(el("text", { class: "val", x: x(n - 1) - 8, y: y(last.value) - 9, "text-anchor": "end" }, fmt(last.value)));
      const marker = el("circle", { class: "dot1", r: 4.5, cx: 0, cy: 0, visibility: "hidden" });
      svg.append(marker);
      rows.forEach((r, i) => {
        const half = n <= 1 ? iw / 2 : iw / (n - 1) / 2;
        const hit = el("rect", { class: "hit", x: x(i) - half, y: M.top, width: half * 2, height: ih });
        hit.addEventListener("mousemove", () => {
          marker.setAttribute("cx", x(i)); marker.setAttribute("cy", y(r.value)); marker.setAttribute("visibility", "visible");
          show(x(i), y(r.value), [r.label, `累计 ${r.value}${unit || ""}`]);
        });
        hit.addEventListener("mouseleave", () => { marker.setAttribute("visibility", "hidden"); hide(); });
        svg.append(hit);
      });
    }
    xLabels(svg, rows.map(r => r.label), x);
  }

  /* rows: [{label, value}] horizontal bars, label left, value at tip */
  function hbars(container, { rows, ariaLabel, unit }) {
    W = widthOf(container);
    const rowH = 26, labelW = Math.min(150, Math.round(W * 0.34));
    const h = Math.max(40, rows.length * rowH + 10);
    container.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "chart-wrap";
    const svg = el("svg", { viewBox: `0 0 ${W} ${h}`, role: "img", "aria-label": ariaLabel });
    wrap.append(svg);
    container.append(wrap);
    const max = Math.max(1, ...rows.map(r => r.value));
    const iw = W - labelW - 50;
    svg.append(el("line", { class: "base", x1: labelW, x2: labelW, y1: 2, y2: h - 6 }));
    rows.forEach((r, i) => {
      const yy = 6 + i * rowH;
      const bh = 14;
      const w = (r.value / max) * iw;
      const maxCh = Math.max(4, Math.floor((labelW - 12) / 12));
      const label = r.label.length > maxCh ? r.label.slice(0, maxCh - 1) + "…" : r.label;
      const t = el("text", { class: "tick", x: labelW - 8, y: yy + bh / 2 + 4, "text-anchor": "end" }, label);
      t.append(el("title", {}, r.label));
      svg.append(t);
      svg.append(el("path", { class: "s1", d: barPath(labelW, yy, Math.max(2, w), bh) }));
      svg.append(el("text", { class: "val", x: labelW + Math.max(2, w) + 6, y: yy + bh / 2 + 4 }, `${fmt(r.value)}${unit || ""}`));
    });
  }

  window.Charts = { stackedColumns, columns, stepLine, hbars };
})();
