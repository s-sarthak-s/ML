# Authoring spec for course modules

Site root: `site/`. Open `site/index.html` in a browser (file://). No server, no network, no CDNs.

**The gold-standard exemplar is `site/modules/09-quantization.html`. Read it fully before writing.** Match its structure, depth, voice, component usage, and widget-coding style.

## Audience

A working engineer who uses LLMs and agents daily and knows college math, but hasn't studied ML systems internals. The goal is to become a strong ML engineer. Explain the plain-language idea first, then the technical detail, then the deep cut. Never condescend; never hand-wave.

## Hard rules

1. **One self-contained HTML file per module** at `site/modules/<file>` (file name from `site/assets/manifest.js`). Do not edit `style.css`, `course.js`, `manifest.js`, or any other module. If you need extra CSS, put a small `<style>` block in your own file's `<head>`.
2. **Local only.** No external `<script src>`, no external fonts, images, or iframes. External `<a href>` links to papers and docs are fine and encouraged in reading lists.
3. **Page skeleton**: copy the `<head>` and the outer `<body data-module="NN"><div class="layout"><aside id="sidebar"></aside><main class="content">…</main></div>` frame from the exemplar verbatim, changing title and `data-module`. Load `../assets/course.js` at the end of body, then **one** inline `<script>` with all widget code wrapped in an IIFE, using `const { … } = C;`.
4. **Header stack**: `p.eyebrow` → `h1.title` (one `<span class="it">` italic accent word) → `p.lede` → `div.meta` tags (time estimate, prereqs) → `div.goals` (4–6 "By the end you can" items).
5. **Sections**: `<h2 id="slug">Title</h2>`. Section numbers and the sidebar TOC are auto-generated; don't number manually. Aim for **8–12 h2 sections**. Use h3 for sub-topics.
6. **Math**: KaTeX auto-render. Inline: `\( … \)`. Display: `$$ … $$`. **Never use single `$`** (cost figures use `$`). Use `\lt`/`\gt` instead of raw `<` `>` inside math. Avoid `&` in math (no aligned environments). Escape is not needed for backslashes in HTML.
7. **Every important formula goes in a `.formula` card** (see exemplar), with:
   - `data-name="…"` title
   - `<div class="tex">$$…$$</div>` with symbols wrapped in `\htmlClass{t1}{…}` … `\htmlClass{t7}{…}`
   - `<dl class="legend">` rows `<div data-t="t1"><dt>\(…\)</dt><dd>meaning</dd></div>`, one per colored symbol. The class must match so hover-highlighting works.
   - `<p class="inwords"><b>In words</b>…</p>`: plain-English reading of the formula
   - optional `<p class="why"><b>Why it matters</b>…</p>`
   Target **6–12 formula cards per module** (fewer for 00, 12, 14 where math is lighter).
8. **Graphics are mandatory and plentiful**: at least **3 figures** (`<figure class="fig">` containing an inline `<svg viewBox=…>` or a div you draw into with JS, plus `<figcaption>`, which gets auto-numbered) and at least **3 interactive widgets** per module (`<div id="w-…"></div>` built with `C.widget`). Diagrams should be precise and labelled, drawn with SVG (boxes, arrows, matrices, curves). No emoji, no clip art, no stock imagery, no gradients.
9. **Callouts**: `.def` (definitions), `.intuition`, `.flag` (caveats), `.pitfall` (common mistakes), `.mle` (practical MLE angle / lab exit criteria), `details.think` ("Think first" predict-then-reveal). Each starts with `<b>Label</b>` then `<p>`.
10. **Code**: `<div class="code" data-lang="python|bash|js" data-title="…"><pre><code>…</code></pre></div>`. Escape `<`, `>`, `&` inside code as entities. Code must be realistic and correct for current libraries (PyTorch, transformers, TRL, PEFT, vLLM, mlx-lm, llama.cpp, sentence-transformers, FAISS, rank_bm25, etc.).
11. **Quiz**: end with `<div class="quiz" data-id="NN-main" data-title="Check yourself · Topic">` containing **5–7** `.q` blocks: `<div class="q" data-answer="IDX">` (0-based correct index) with `<p>` question, `<ol><li>` options, `<div class="explain">`. Vary the position of the correct answer. Questions should test understanding (compute something, predict a behaviour), not recall of trivia.
12. **Accuracy**: be correct. Where a number is a rule of thumb or illustrative, say so. Don't invent benchmark numbers. Attribute key papers by author and year (e.g. "Hu et al., 2021"). If unsure, phrase conservatively.
13. **Voice / anti-slop**: specific, concrete, varied sentence rhythm. Banned: "delve", "seamless", "leverage", "tapestry", "landscape", "robust" as filler, "in today's fast-paced", "unlock", "empower", "game-changer", "it's important to note", rule-of-three padding, and identical bold-lead-in bullet lists. Prefer worked numeric examples (e.g. "Llama-3-8B: 32 layers, 8 KV heads, head_dim 128 → 128 KB per token").

## Helper API (`window.C`, from `assets/course.js`)

- `C.widget(id, {title, kicker, note})` → `{root, body, controls}`. Put controls in `controls`, drawings in `body`.
- `C.slider(parent, {label, min, max, step, value, fmt, onInput})` → `{value, input, wrap}`.
- `C.select(parent, {label, options:[{value,label}], value, onChange})`.
- `C.seg(parent, {options:[{value,label}], value, onChange})`: segmented buttons. Wrap in `el("div",{class:"ctl"}, el("label",null,el("span",{text:"Label"})))` first, like the exemplar.
- `C.stats(parent, [{key,label,sub}])` → `set(key, valueText, cls?, sub?)`, where cls is `good|bad|warn`.
- `C.plot(container, {width,height,x:[a,b],y:[a,b],xlabel,ylabel,logx,logy,xticks,yticks,xfmt,yfmt,margin})` → `api.draw(layers)`. Layers: `{fn,color,label,dash,width,area}` | `{points:[[x,y]],dots}` | `{vline}` | `{hline}` | `{marker:[x,y],label}` | `{text:[x,y],label}` | `{band:[x0,x1]}`. Also `api.sx/sy` for custom SVG via `api.svg`.
- `C.bars(container, {width,height,horizontal,labelWidth,max,fmt})` → `.draw(labels, values, {colors, highlight, max, fmt})`.
- `C.heatmap(container, {cell,rowLabels,colLabels,showValues,fmt,maxWidth})` → `.draw(matrix, {max,min,diverging,hue:'green'|'brick'|'blue',mask:(i,j)=>bool})`.
- `C.el(tag, attrs, children)`, `C.svg(tag, attrs, children)`, `C.rng(seed)` (with `.normal()`), `C.softmax(xs, T)`, `C.fmtNum`, `C.fmtSI`, `C.fmtBytes`, `C.clamp`, `C.lerp`, `C.palette` (green, brick, blue, gold, plum, teal, ink, muted, faint, line, paper, paper2), `C.series`, `C.heat(t,hue)`, `C.diverge(t)`, `C.katex(str, display)` (returns HTML for dynamic math), `C.tex(element)`.
- Wrap a drawing in `el("div",{class:"canvas-wrap"})` for the bordered paper background.
- Widget scripts run before the page boots (KaTeX render, reveal-on-scroll), so static `\( \)` math inside widget HTML gets rendered automatically. For math that updates dynamically, use `C.katex()`.
- SVG arrowheads: define a `<marker>` in a `<defs>` with a **unique id per figure**.

## Done criteria (verify yourself before reporting)

- `node scripts/check-module.mjs site/modules/<file>` passes (structure lint: counts, local-only, quiz shape, balanced tags, script parses).
- File opens with no JS errors (the lint script syntax-checks the inline script).
- Report: section list, formula-card count, figure count, widget count, quiz count, and anything you were unsure about.
