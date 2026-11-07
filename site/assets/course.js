/* ==========================================================================
   MLE Course — shared runtime
   - builds sidebar, in-page TOC, pager, completion state
   - renders KaTeX (local), wires formula legends, quizzes, code blocks
   - exposes window.C helpers for interactive widgets (sliders, plots, bars, heatmaps)
   No network access. Works from file://.
   ========================================================================== */
(function () {
  "use strict";
  const LS = "mle-course:";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------------------------------------------------------------- DOM helpers
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, children) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    if (children) (Array.isArray(children) ? children : [children]).forEach(c => c && n.appendChild(c));
    return n;
  }
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // ---------------------------------------------------------------- number helpers
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function fmtNum(x, d) {
    if (!isFinite(x)) return "∞";
    if (d == null) d = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    return x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function fmtSI(x, d = 1) {
    const a = Math.abs(x);
    const u = [[1e15, "P"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (const [v, s] of u) if (a >= v) return fmtNum(x / v, d) + s;
    return fmtNum(x, a < 10 ? 2 : 0);
  }
  function fmtBytes(b, d = 1) {
    const a = Math.abs(b);
    const u = [[1024 ** 4, "TB"], [1024 ** 3, "GB"], [1024 ** 2, "MB"], [1024, "KB"]];
    for (const [v, s] of u) if (a >= v) return fmtNum(b / v, d) + " " + s;
    return fmtNum(b, 0) + " B";
  }
  function fmtFlops(f) { return fmtSI(f, 2).replace("B", "G") + "FLOP"; }
  // seeded RNG so demos are reproducible
  function rng(seed = 42) {
    let s = seed >>> 0;
    const r = () => { s += 0x6D2B79F5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.normal = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return r;
  }
  function softmax(xs, T = 1) {
    const m = Math.max(...xs.map(x => x / T));
    const e = xs.map(x => Math.exp(x / T - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
  }
  const palette = { green: "#1a7a52", brick: "#b0432e", blue: "#2f5d8a", gold: "#9a7b22", plum: "#7a3f6e", teal: "#2b7a78", ink: "#1c1b19", muted: "#76736b", faint: "#9a978f", line: "rgba(28,27,25,0.14)", paper: "#f7f6f2", paper2: "#efede6" };
  const series = [palette.green, palette.brick, palette.blue, palette.gold, palette.plum, palette.teal];
  function heat(t, hue) { // 0..1 -> paper to color
    t = clamp(t, 0, 1);
    const base = hue === "brick" ? [176, 67, 46] : hue === "blue" ? [47, 93, 138] : [26, 122, 82];
    const p = [247, 246, 242];
    return `rgb(${p.map((c, i) => Math.round(lerp(c, base[i], t))).join(",")})`;
  }
  function diverge(t) { // -1..1 -> brick..paper..green
    t = clamp(t, -1, 1);
    return t < 0 ? heat(-t, "brick") : heat(t, "green");
  }

  // ---------------------------------------------------------------- KaTeX
  function tex(root) {
    if (!window.renderMathInElement) return;
    window.renderMathInElement(root || document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false,
      strict: "ignore",
      trust: ctx => ctx.command === "\\htmlClass" || ctx.command === "\\htmlData",
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"]
    });
  }
  function katexStr(s, display) {
    if (!window.katex) return s;
    return window.katex.renderToString(s, { throwOnError: false, displayMode: !!display, strict: "ignore", trust: true });
  }

  // ---------------------------------------------------------------- page chrome
  const M = window.COURSE;
  const body = document.body;
  const isIndex = body.dataset.page === "index";
  const root = isIndex ? "" : "../";
  const modHref = m => (isIndex ? "modules/" : "") + m.file;
  const current = body.dataset.module;

  function doneSet() { return new Set(store.get("done", [])); }
  function setDone(n, v) {
    const s = doneSet(); v ? s.add(n) : s.delete(n); store.set("done", [...s]);
    refreshProgress();
  }
  function refreshProgress() {
    const s = doneSet();
    $$(".mods a[data-n]").forEach(a => a.classList.toggle("done", s.has(a.dataset.n)));
    $$(".mod-card[data-n]").forEach(a => a.classList.toggle("done", s.has(a.dataset.n)));
    const pct = Math.round(100 * s.size / M.modules.length);
    $$(".js-progress-bar").forEach(i => i.style.width = pct + "%");
    $$(".js-progress-txt").forEach(t => t.textContent = `${s.size} / ${M.modules.length}`);
    const btn = $(".js-complete");
    if (btn) {
      const d = s.has(current);
      btn.textContent = d ? "Completed ✓  (undo)" : "Mark module complete";
      btn.classList.toggle("primary", !d);
    }
  }

  function buildSidebar() {
    const side = $("#sidebar");
    if (!side) return;
    side.innerHTML = "";
    side.appendChild(el("a", { class: "brand", href: root + "index.html" }, [
      el("span", { class: "brand-mark", text: "ML" }),
      el("span", { class: "brand-name", text: M.title })
    ]));
    side.appendChild(el("div", { class: "brand-sub", text: "LLM systems course" }));
    side.appendChild(el("div", { class: "side-progress" }, [
      el("div", { class: "lbl" }, [el("span", { text: "Progress" }), el("span", { class: "js-progress-txt" })]),
      el("div", { class: "track" }, el("i", { class: "js-progress-bar", style: { width: "0%" } }))
    ]));
    const toggle = el("button", { class: "menu-toggle", text: "Modules ▾", onclick: () => side.classList.toggle("open") });
    side.appendChild(toggle);
    const mods = el("nav", { class: "mods" });
    M.parts.forEach(p => {
      mods.appendChild(el("div", { class: "part-label", text: `Part ${p.id} · ${p.name}` }));
      M.modules.filter(m => m.part === p.id).forEach(m => {
        const a = el("a", { href: modHref(m), "data-n": m.n, class: m.n === current ? "active" : "" }, [
          el("span", { class: "n", text: m.n }), el("span", { text: m.title }), el("span", { class: "ck" })
        ]);
        mods.appendChild(a);
        if (m.n === current) {
          const toc = el("div", { class: "side-toc" });
          $$("main h2[id]").forEach(h => {
            const label = h.dataset.short || h.childNodes[h.childNodes.length - 1].textContent.trim();
            toc.appendChild(el("a", { href: "#" + h.id, "data-for": h.id, text: label }));
          });
          if (toc.children.length) mods.appendChild(toc);
        }
      });
    });
    side.appendChild(mods);
  }

  function numberSections() {
    let i = 0;
    $$("main h2[id]").forEach(h => {
      i++;
      if (!h.querySelector(".sn")) h.insertBefore(el("span", { class: "sn", text: `${current}.${i}` }), h.firstChild);
    });
    let f = 0;
    $$("main figure.fig figcaption").forEach(c => {
      f++;
      if (!c.querySelector("b")) c.insertBefore(el("b", { text: `Fig ${current}.${f}` }), c.firstChild);
    });
  }

  function scrollSpy() {
    const links = $$(".side-toc a");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const map = new Map(links.map(a => [a.dataset.for, a]));
    const obs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) { links.forEach(a => a.classList.remove("on")); const a = map.get(e.target.id); if (a) a.classList.add("on"); }
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    $$("main h2[id]").forEach(h => obs.observe(h));
  }

  function buildFooter() {
    const main = $("main.content");
    if (!main || isIndex) return;
    const idx = M.modules.findIndex(m => m.n === current);
    const box = el("div", { class: "complete" }, [
      el("p", { html: "Finished the reading, the widgets, and the quiz? Mark it so the course map tracks your progress." }),
      el("button", { class: "btn primary js-complete", onclick: () => setDone(current, !doneSet().has(current)) })
    ]);
    main.appendChild(box);
    const prev = M.modules[idx - 1], next = M.modules[idx + 1];
    main.appendChild(el("div", { class: "pager" }, [
      prev ? el("a", { href: prev.file, class: "prev" }, [el("div", { class: "d", text: "← Previous · " + prev.n }), el("div", { class: "tt", text: prev.title })]) : el("span"),
      next ? el("a", { href: next.file, class: "next" }, [el("div", { class: "d", text: "Next · " + next.n + " →" }), el("div", { class: "tt", text: next.title })]) : el("a", { href: "../index.html", class: "next" }, [el("div", { class: "d", text: "Back to map →" }), el("div", { class: "tt", text: "Course map" })])
    ]));
  }

  // ---------------------------------------------------------------- formula cards
  function wireFormulas() {
    $$(".formula").forEach(f => {
      if (f.dataset.name && !f.querySelector(".f-head")) {
        f.insertBefore(el("div", { class: "f-head" }, [
          el("span", { class: "f-name", text: f.dataset.name }),
          f.querySelector(".legend") ? el("span", { class: "f-hint", text: "hover a symbol ↔ its meaning" }) : null
        ]), f.firstChild);
      }
      const rows = $$(".legend > div[data-t]", f);
      rows.forEach(r => {
        const cls = r.dataset.t;
        const on = v => { $$(".tex ." + cls, f).forEach(s => s.classList.toggle("hl", v)); r.classList.toggle("hl", v); };
        r.addEventListener("mouseenter", () => on(true));
        r.addEventListener("mouseleave", () => on(false));
        $$(".tex ." + cls, f).forEach(s => {
          s.style.cursor = "help";
          s.addEventListener("mouseenter", () => on(true));
          s.addEventListener("mouseleave", () => on(false));
        });
      });
    });
  }

  // ---------------------------------------------------------------- code blocks
  const KW = { python: /\b(def|return|import|from|as|for|in|if|elif|else|while|with|class|lambda|None|True|False|and|or|not|is|try|except|finally|yield|raise|pass|break|continue|assert|async|await|print)\b/g,
    bash: /\b(pip|python|python3|uv|git|cd|export|curl|mlx_lm\.lora|mlx_lm\.generate|mlx_lm\.fuse|huggingface-cli|llama-cli|llama-quantize|llama-perplexity|llama-bench|llama-server|vllm|ollama|make|cmake|echo)\b/g,
    js: /\b(const|let|var|function|return|if|else|for|of|in|new|class|await|async|import|from|export)\b/g };
  function highlight(code, lang) {
    let s = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const slots = [];
    const keep = (re, cls) => { s = s.replace(re, m => { slots.push(`<span class="${cls}">${m}</span>`); return `\u0000${slots.length - 1}\u0000`; }); };
    if (lang === "python" || lang === "bash" || lang === "yaml" || lang === "toml") keep(/#[^\n]*/g, "tok-c");
    if (lang === "js" || lang === "json") keep(/\/\/[^\n]*/g, "tok-c");
    keep(/("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g, "tok-s");
    if (KW[lang]) s = s.replace(KW[lang], m => `<span class="tok-k">${m}</span>`);
    s = s.replace(/\b(\d+(?:\.\d+)?(?:e-?\d+)?)\b/g, '<span class="tok-n">$1</span>');
    s = s.replace(/\b([a-zA-Z_][\w]*)(?=\()/g, '<span class="tok-f">$1</span>');
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
    return s;
  }
  function wireCode() {
    $$(".code").forEach(c => {
      const pre = $("pre", c); if (!pre) return;
      const codeEl = $("code", pre) || pre;
      const raw = codeEl.textContent.replace(/^\n/, "").replace(/\s+$/, "");
      const lang = c.dataset.lang || "";
      codeEl.innerHTML = highlight(raw, lang);
      if (!$(".c-head", c)) {
        const btn = el("button", { class: "copy", text: "copy", onclick: () => { navigator.clipboard && navigator.clipboard.writeText(raw); btn.textContent = "copied"; setTimeout(() => btn.textContent = "copy", 1200); } });
        c.insertBefore(el("div", { class: "c-head" }, [el("span", { text: c.dataset.title || lang }), btn]), pre);
      }
    });
  }

  // ---------------------------------------------------------------- quizzes
  function wireQuizzes() {
    $$(".quiz").forEach((qz, qi) => {
      const id = qz.dataset.id || `${current}-quiz-${qi}`;
      const qs = $$(".q", qz);
      const saved = store.get("quiz:" + id, {});
      const score = el("span", { class: "qz-score" });
      qz.insertBefore(el("div", { class: "qz-head" }, [el("span", { class: "k", text: qz.dataset.title || "Check yourself" }), score]), qz.firstChild);
      const upd = () => {
        const st = store.get("quiz:" + id, {});
        const n = Object.keys(st).length, c = Object.values(st).filter(Boolean).length;
        score.textContent = n ? `${c} / ${qs.length} correct · ${n} answered` : `${qs.length} questions`;
      };
      qs.forEach((q, i) => {
        const ans = +q.dataset.answer;
        const lis = $$("ol > li", q);
        lis.forEach((li, j) => {
          li.dataset.l = String.fromCharCode(65 + j);
          li.addEventListener("click", () => {
            if (q.classList.contains("answered")) return;
            q.classList.add("answered");
            li.classList.add(j === ans ? "right" : "wrong");
            lis[ans].classList.add("right");
            const st = store.get("quiz:" + id, {}); st[i] = j === ans; store.set("quiz:" + id, st); upd();
          });
        });
        if (i in saved) { q.classList.add("answered"); lis[ans] && lis[ans].classList.add("right"); }
      });
      qz.appendChild(el("div", { class: "qz-foot" }, el("button", { class: "btn", text: "Reset quiz", onclick: () => {
        store.set("quiz:" + id, {}); qs.forEach(q => { q.classList.remove("answered"); $$("li", q).forEach(l => l.classList.remove("right", "wrong")); }); upd();
      } })));
      upd();
    });
  }

  // ---------------------------------------------------------------- reveal on scroll
  function reveal() {
    const items = $$("main figure.fig, main .widget, main .formula, main .card, main .quiz");
    if (!("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    items.forEach(i => { i.classList.add("reveal"); obs.observe(i); });
  }

  // ---------------------------------------------------------------- widget helpers
  /** Slider control. opts: {label, min, max, step, value, fmt(v)->string, onInput(v)} */
  function slider(parent, o) {
    const out = el("output");
    const input = el("input", { type: "range", min: o.min, max: o.max, step: o.step || 1, value: o.value });
    const wrap = el("div", { class: "ctl" }, [el("label", null, [el("span", { text: o.label }), out]), input]);
    const fmt = o.fmt || (v => v);
    const sync = () => { const v = parseFloat(input.value); out.textContent = fmt(v); o.onInput && o.onInput(v); };
    input.addEventListener("input", sync);
    parent.appendChild(wrap);
    out.textContent = fmt(parseFloat(input.value));
    return { input, wrap, get value() { return parseFloat(input.value); }, set value(v) { input.value = v; out.textContent = fmt(parseFloat(input.value)); }, sync };
  }
  /** Select control. opts: {label, options:[{value,label}], value, onChange(v)} */
  function select(parent, o) {
    const s = el("select");
    o.options.forEach(op => s.appendChild(el("option", { value: op.value, text: op.label })));
    if (o.value != null) s.value = o.value;
    s.addEventListener("change", () => o.onChange && o.onChange(s.value));
    const wrap = el("div", { class: "ctl" }, [el("label", null, el("span", { text: o.label })), s]);
    parent.appendChild(wrap);
    return s;
  }
  /** Segmented buttons. opts: {options:[{value,label}], value, onChange(v)} */
  function seg(parent, o) {
    const box = el("div", { class: "seg" });
    let cur = o.value;
    o.options.forEach(op => {
      const b = el("button", { text: op.label, class: op.value === cur ? "on" : "", onclick: () => { cur = op.value; $$("button", box).forEach(x => x.classList.remove("on")); b.classList.add("on"); o.onChange && o.onChange(cur); } });
      box.appendChild(b);
    });
    parent.appendChild(box);
    return { el: box, get value() { return cur; } };
  }
  /** Stat tiles. Returns setter: set(key, value, cls?) */
  function stats(parent, defs) {
    const box = el("div", { class: "readout" });
    const map = {};
    defs.forEach(d => {
      const v = el("div", { class: "v", text: "–" });
      const s = el("div", { class: "s", text: d.sub || "" });
      box.appendChild(el("div", { class: "stat" }, [el("div", { class: "k", text: d.label }), v, s]));
      map[d.key] = { v, s };
    });
    parent.appendChild(box);
    return (key, value, cls, sub) => { const m = map[key]; if (!m) return; m.v.textContent = value; m.v.className = "v" + (cls ? " " + cls : ""); if (sub != null) m.s.textContent = sub; };
  }

  /**
   * Line/scatter plot in SVG.
   * opts: {width, height, x:[min,max], y:[min,max], xlabel, ylabel, xticks, yticks, xfmt, yfmt, logx, logy, margin}
   * returns {svg, draw(layers), sx, sy, g}
   * layers: [{fn, color, width, dash, label, samples} | {points:[[x,y]], color, width, dash, label, dots, area}
   *          | {vline:x, color, label, dash} | {hline:y, color, label, dash} | {marker:[x,y], color, r, label}
   *          | {text:[x,y], label, color, anchor} | {band:[x0,x1], color}]
   */
  function plot(container, o) {
    const W = o.width || 640, H = o.height || 300;
    const m = Object.assign({ l: 52, r: 18, t: 16, b: 42 }, o.margin || {});
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
    container.appendChild(s);
    const api = { svg: s, x: o.x.slice(), y: o.y.slice() };
    const tx = v => o.logx ? Math.log10(v) : v, ty = v => o.logy ? Math.log10(v) : v;
    api.sx = v => m.l + (tx(v) - tx(api.x[0])) / (tx(api.x[1]) - tx(api.x[0])) * (W - m.l - m.r);
    api.sy = v => H - m.b - (ty(v) - ty(api.y[0])) / (ty(api.y[1]) - ty(api.y[0])) * (H - m.t - m.b);
    function ticks(lo, hi, n, log) {
      if (log) { const a = []; for (let e = Math.ceil(Math.log10(lo)); e <= Math.floor(Math.log10(hi)); e++) a.push(10 ** e); return a; }
      const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
      const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
      const a = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) a.push(+v.toFixed(10)); return a;
    }
    api.draw = (layers) => {
      while (s.firstChild) s.removeChild(s.firstChild);
      const g = svg("g"); s.appendChild(g); api.g = g;
      const xt = o.xticks || ticks(api.x[0], api.x[1], 6, o.logx), yt = o.yticks || ticks(api.y[0], api.y[1], 5, o.logy);
      const xf = o.xfmt || (v => fmtSI(v, 0) === "0.00" ? "0" : (Math.abs(v) < 1000 ? +v.toFixed(3) : fmtSI(v, 0)));
      const yf = o.yfmt || xf;
      yt.forEach(v => { const y = api.sy(v); g.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: palette.line, "stroke-width": v === 0 ? 1 : 0.6, "stroke-dasharray": v === 0 ? null : "2 3" })); g.appendChild(svg("text", { x: m.l - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: palette.muted, class: "mono", text: yf(v) })); });
      xt.forEach(v => { const x = api.sx(v); g.appendChild(svg("line", { x1: x, x2: x, y1: m.t, y2: H - m.b, stroke: palette.line, "stroke-width": v === 0 ? 1 : 0.6, "stroke-dasharray": v === 0 ? null : "2 3" })); g.appendChild(svg("text", { x, y: H - m.b + 16, "text-anchor": "middle", "font-size": 11, fill: palette.muted, class: "mono", text: xf(v) })); });
      g.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: palette.ink, "stroke-width": 1 }));
      g.appendChild(svg("line", { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, stroke: palette.ink, "stroke-width": 1 }));
      if (o.xlabel) g.appendChild(svg("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: palette.ink, text: o.xlabel }));
      if (o.ylabel) g.appendChild(svg("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", "font-size": 12, fill: palette.ink, transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})`, text: o.ylabel }));
      const clipId = "clip" + Math.random().toString(36).slice(2);
      const defs = svg("defs"); defs.appendChild(svg("clipPath", { id: clipId }, svg("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }))); g.appendChild(defs);
      const pg = svg("g", { "clip-path": `url(#${clipId})` }); g.appendChild(pg);
      const legend = [];
      (layers || []).forEach((L, li) => {
        const color = L.color || series[li % series.length];
        if (L.band) { pg.appendChild(svg("rect", { x: api.sx(L.band[0]), y: m.t, width: api.sx(L.band[1]) - api.sx(L.band[0]), height: H - m.t - m.b, fill: color, opacity: L.opacity || 0.08 })); return; }
        if (L.vline != null) { const x = api.sx(L.vline); pg.appendChild(svg("line", { x1: x, x2: x, y1: m.t, y2: H - m.b, stroke: color, "stroke-width": L.width || 1.2, "stroke-dasharray": L.dash || "4 3" })); if (L.label) g.appendChild(svg("text", { x: x + 4, y: m.t + 12, "font-size": 11, fill: color, class: "mono", text: L.label })); return; }
        if (L.hline != null) { const y = api.sy(L.hline); pg.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: color, "stroke-width": L.width || 1.2, "stroke-dasharray": L.dash || "4 3" })); if (L.label) g.appendChild(svg("text", { x: W - m.r - 4, y: y - 5, "text-anchor": "end", "font-size": 11, fill: color, class: "mono", text: L.label })); return; }
        if (L.marker) { const [x, y] = L.marker; g.appendChild(svg("circle", { cx: api.sx(x), cy: api.sy(y), r: L.r || 5, fill: L.fill || color, stroke: "#fff", "stroke-width": 1.5 })); if (L.label) g.appendChild(svg("text", { x: api.sx(x) + 8, y: api.sy(y) - 8, "font-size": 11.5, fill: color, class: "mono", text: L.label })); return; }
        if (L.text) { g.appendChild(svg("text", { x: api.sx(L.text[0]), y: api.sy(L.text[1]), "font-size": L.size || 11.5, fill: color, "text-anchor": L.anchor || "start", class: L.mono === false ? "" : "mono", text: L.label })); return; }
        let pts = L.points;
        if (L.fn) {
          const n = L.samples || 240; pts = [];
          for (let i = 0; i <= n; i++) {
            const x = o.logx ? 10 ** lerp(Math.log10(api.x[0]), Math.log10(api.x[1]), i / n) : lerp(api.x[0], api.x[1], i / n);
            const y = L.fn(x); if (isFinite(y)) pts.push([x, y]);
          }
        }
        if (!pts || !pts.length) return;
        const d = pts.map((p, i) => (i ? "L" : "M") + api.sx(p[0]).toFixed(2) + "," + api.sy(clamp(p[1], o.logy ? 1e-12 : -1e12, 1e12)).toFixed(2)).join("");
        if (L.area) pg.appendChild(svg("path", { d: d + `L${api.sx(pts[pts.length - 1][0])},${api.sy(o.logy ? api.y[0] : Math.max(api.y[0], 0))}L${api.sx(pts[0][0])},${api.sy(o.logy ? api.y[0] : Math.max(api.y[0], 0))}Z`, fill: color, opacity: L.areaOpacity || 0.1 }));
        if (!L.dotsOnly) pg.appendChild(svg("path", { d, fill: "none", stroke: color, "stroke-width": L.width || 2, "stroke-dasharray": L.dash || null, "stroke-linejoin": "round", "stroke-linecap": "round" }));
        if (L.dots) pts.forEach(p => pg.appendChild(svg("circle", { cx: api.sx(p[0]), cy: api.sy(p[1]), r: L.r || 3, fill: color })));
        if (L.label) legend.push([L.label, color, L.dash]);
      });
      legend.forEach(([lab, col, dash], i) => {
        const x = m.l + 12, y = m.t + 12 + i * 17;
        g.appendChild(svg("line", { x1: x, x2: x + 18, y1: y - 4, y2: y - 4, stroke: col, "stroke-width": 2.5, "stroke-dasharray": dash || null }));
        g.appendChild(svg("text", { x: x + 24, y, "font-size": 11.5, fill: palette.ink, text: lab }));
      });
      return api;
    };
    return api;
  }

  /**
   * Horizontal or vertical bar chart. opts: {width, height, horizontal, max, fmt, labelWidth}
   * returns {draw(labels, values, {colors, highlight})}
   */
  function bars(container, o) {
    const W = o.width || 640, H = o.height || 260;
    const s = svg("svg", { viewBox: `0 0 ${W} ${H}` });
    container.appendChild(s);
    return {
      svg: s,
      draw(labels, values, opt = {}) {
        while (s.firstChild) s.removeChild(s.firstChild);
        const max = opt.max != null ? opt.max : (o.max != null ? o.max : Math.max(...values.map(Math.abs), 1e-9));
        const fmt = opt.fmt || o.fmt || (v => fmtNum(v, 2));
        const n = values.length;
        if (o.horizontal) {
          const lw = o.labelWidth || 90, rh = (H - 10) / n;
          values.forEach((v, i) => {
            const y = 5 + i * rh, w = Math.max(0, (W - lw - 70) * Math.abs(v) / max);
            const col = (opt.colors && opt.colors[i]) || (opt.highlight === i ? palette.brick : palette.green);
            s.appendChild(svg("text", { x: lw - 8, y: y + rh / 2 + 4, "text-anchor": "end", "font-size": 12, fill: palette.ink, class: "mono", text: labels[i] }));
            s.appendChild(svg("rect", { x: lw, y: y + rh * 0.18, width: w, height: rh * 0.64, rx: 3, fill: col, opacity: 0.85 }));
            s.appendChild(svg("text", { x: lw + w + 6, y: y + rh / 2 + 4, "font-size": 11.5, fill: palette.muted, class: "mono", text: fmt(v) }));
          });
        } else {
          const bh = H - 46, cw = (W - 20) / n;
          const hasNeg = values.some(v => v < 0);
          const zero = hasNeg ? 10 + bh / 2 : 10 + bh;
          const scale = hasNeg ? bh / 2 : bh;
          s.appendChild(svg("line", { x1: 10, x2: W - 10, y1: zero, y2: zero, stroke: palette.ink, "stroke-width": 1 }));
          values.forEach((v, i) => {
            const x = 10 + i * cw, h = scale * Math.abs(v) / max;
            const col = (opt.colors && opt.colors[i]) || (opt.highlight === i ? palette.brick : (v < 0 ? palette.brick : palette.green));
            s.appendChild(svg("rect", { x: x + cw * 0.15, y: v >= 0 ? zero - h : zero, width: cw * 0.7, height: h, rx: 2, fill: col, opacity: 0.85 }));
            if (opt.showValues !== false && n <= 24) s.appendChild(svg("text", { x: x + cw / 2, y: v >= 0 ? zero - h - 4 : zero + h + 12, "text-anchor": "middle", "font-size": 10.5, fill: palette.muted, class: "mono", text: fmt(v) }));
            s.appendChild(svg("text", { x: x + cw / 2, y: H - 8, "text-anchor": "middle", "font-size": n > 16 ? 9.5 : 11, fill: palette.ink, class: "mono", text: labels[i] }));
          });
        }
      }
    };
  }

  /**
   * Heatmap grid. opts: {width, height, rowLabels, colLabels, cell, fmt, showValues}
   * returns {draw(matrix, {max, min, diverging, hue, mask(i,j)->bool})}
   */
  function heatmap(container, o) {
    const s = svg("svg");
    container.appendChild(s);
    return {
      svg: s,
      draw(Mx, opt = {}) {
        while (s.firstChild) s.removeChild(s.firstChild);
        const R = Mx.length, Cc = Mx[0].length;
        const cell = o.cell || 34, lw = o.rowLabels ? (o.labelWidth || 70) : 4, th = o.colLabels ? (o.labelHeight || 60) : 4;
        const W = lw + Cc * cell + 6, H = th + R * cell + 6;
        s.setAttribute("viewBox", `0 0 ${W} ${H}`);
        s.style.maxWidth = (o.maxWidth || W) + "px";
        const flat = Mx.flat();
        const max = opt.max != null ? opt.max : Math.max(...flat.map(Math.abs));
        const min = opt.min != null ? opt.min : 0;
        const fmt = o.fmt || (v => fmtNum(v, 2));
        if (o.colLabels) o.colLabels.forEach((l, j) => s.appendChild(svg("text", { x: lw + j * cell + cell / 2, y: th - 8, "font-size": 11.5, fill: palette.ink, transform: `rotate(-45 ${lw + j * cell + cell / 2} ${th - 8})`, class: "mono", text: l })));
        if (o.rowLabels) o.rowLabels.forEach((l, i) => s.appendChild(svg("text", { x: lw - 6, y: th + i * cell + cell / 2 + 4, "text-anchor": "end", "font-size": 11.5, fill: palette.ink, class: "mono", text: l })));
        for (let i = 0; i < R; i++) for (let j = 0; j < Cc; j++) {
          const v = Mx[i][j];
          const masked = opt.mask && opt.mask(i, j);
          const t = opt.diverging ? v / (max || 1) : (v - min) / ((max - min) || 1);
          const fill = masked ? "#ecebe4" : opt.diverging ? diverge(t) : heat(t, opt.hue);
          s.appendChild(svg("rect", { x: lw + j * cell + 1, y: th + i * cell + 1, width: cell - 2, height: cell - 2, rx: 3, fill }));
          if (o.showValues !== false && !masked && cell >= 28) s.appendChild(svg("text", { x: lw + j * cell + cell / 2, y: th + i * cell + cell / 2 + 4, "text-anchor": "middle", "font-size": 10, fill: Math.abs(t) > 0.55 ? "#fff" : palette.ink, class: "mono", text: fmt(v) }));
        }
      }
    };
  }

  /** Make a widget shell: returns {root, body, controls, note(text)} inside container (by id or element). */
  function widget(target, o) {
    const host = typeof target === "string" ? document.getElementById(target) : target;
    host.classList.add("widget");
    host.innerHTML = "";
    host.appendChild(el("div", { class: "w-head" }, [el("span", { class: "w-title", text: o.title || "" }), el("span", { class: "w-kicker", text: o.kicker || "Interactive" })]));
    const bodyEl = el("div", { class: "w-body" });
    const controls = el("div", { class: "controls" });
    bodyEl.appendChild(controls);
    host.appendChild(bodyEl);
    if (o.note) host.appendChild(el("p", { class: "w-note", html: o.note }));
    return { root: host, body: bodyEl, controls };
  }

  window.C = { el, svg, $, $$, clamp, lerp, fmtNum, fmtSI, fmtBytes, fmtFlops, rng, softmax, palette, series, heat, diverge, tex, katex: katexStr, slider, select, seg, stats, plot, bars, heatmap, widget, store };

  // ---------------------------------------------------------------- boot
  function boot() {
    if (!isIndex) numberSections();
    buildSidebar();
    tex(document.body);
    wireFormulas();
    wireCode();
    wireQuizzes();
    buildFooter();
    refreshProgress();
    scrollSpy();
    reveal();
    document.dispatchEvent(new Event("course:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
