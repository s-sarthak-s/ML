#!/usr/bin/env node
// Structure lint for a course module. Usage: node scripts/check-module.mjs site/modules/NN-x.html [...]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const here = path.dirname(new URL(import.meta.url).pathname);
const katex = require(path.join(here, "../site/assets/vendor/katex/katex.js"));
const manifestSrc = fs.readFileSync(path.join(here, "../site/assets/manifest.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(manifestSrc, sandbox);
const COURSE = sandbox.window.COURSE;

const BANNED = ["delve", "seamless", "tapestry", "game-changer", "game changer", "in today's", "unlock the", "empower", "it's important to note", "it is important to note", "leverage"];
const decode = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

let failed = 0;
for (const file of process.argv.slice(2)) {
  const errs = [], warns = [];
  const html = fs.readFileSync(file, "utf8");
  const base = path.basename(file);
  const mod = COURSE.modules.find(m => m.file === base);
  if (!mod) errs.push(`file name ${base} not in manifest`);
  const n = mod ? mod.n : "??";
  const light = ["00", "22"].includes(n);
  const mediumMath = ["12"].includes(n);

  if (!html.includes(`data-module="${n}"`)) errs.push(`missing body data-module="${n}"`);
  for (const need of ['../assets/style.css', '../assets/vendor/katex/katex.min.js', '../assets/vendor/katex/contrib/auto-render.min.js', '../assets/manifest.js', '../assets/course.js', '<aside id="sidebar"></aside>', '<main class="content">'])
    if (!html.includes(need)) errs.push(`missing skeleton piece: ${need}`);
  // local only
  const ext = [...html.matchAll(/<(script|link|img|iframe|source|video|audio)\b[^>]*(src|href)=["'](https?:)?\/\//gi)];
  if (ext.length) errs.push(`external resource(s): ${ext.map(m => m[0].slice(0, 80)).join(" | ")}`);
  if (/@import\s+url\(["']?https?:/i.test(html)) errs.push("external @import");

  const count = re => (html.match(re) || []).length;
  const h2 = count(/<h2 id="[^"]+"/g);
  const formulas = count(/class="formula"/g);
  const figs = count(/<figure class="fig/g);
  const widgets = count(/<div id="w-[^"]+"><\/div>/g);
  const quizzes = count(/class="quiz"/g);
  const qs = [...html.matchAll(/<div class="q" data-answer="(\d+)">([\s\S]*?)<div class="explain">/g)];
  if (h2 < (light ? 5 : 8)) errs.push(`only ${h2} h2[id] sections`);
  if (formulas < (light ? 1 : mediumMath ? 4 : 6)) errs.push(`only ${formulas} formula cards`);
  if (figs < 3) errs.push(`only ${figs} figures`);
  if (widgets < (light ? 2 : 3)) errs.push(`only ${widgets} widget mounts (<div id="w-..."></div>)`);
  if (quizzes < 1) errs.push("no quiz");
  if (qs.length < 5) errs.push(`only ${qs.length} quiz questions`);
  const answerPos = qs.map(q => +q[1]);
  qs.forEach((q, i) => {
    const opts = (q[2].match(/<li>/g) || []).length;
    if (+q[1] >= opts) errs.push(`quiz q${i + 1}: data-answer ${q[1]} but only ${opts} options`);
  });
  if (qs.length >= 5 && new Set(answerPos).size < 3) warns.push(`quiz answers poorly distributed: ${answerPos.join(",")}`);

  // formula legend consistency
  [...html.matchAll(/<div class="formula"[\s\S]*?<\/div>\s*(?=<(?:div|p|h2|h3|figure|table|details|ul|ol)\b)/g)];
  const fblocks = html.split('class="formula"').slice(1).map(s => s.split(/<\/dl>|<p class="inwords">/)[0]);
  fblocks.forEach((b, i) => {
    const used = new Set([...b.matchAll(/\\htmlClass\{(t\d)\}/g)].map(m => m[1]));
    const legend = new Set([...b.matchAll(/data-t="(t\d)"/g)].map(m => m[1]));
    for (const u of used) if (!legend.has(u)) warns.push(`formula #${i + 1}: ${u} colored but no legend row`);
    for (const l of legend) if (!used.has(l)) warns.push(`formula #${i + 1}: legend ${l} not used in tex`);
  });

  // KaTeX validation (outside script/pre/code/textarea)
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<pre[\s\S]*?<\/pre>/gi, "").replace(/<textarea[\s\S]*?<\/textarea>/gi, "").replace(/<code[\s\S]*?<\/code>/gi, "");
  const maths = [];
  for (const m of textOnly.matchAll(/\$\$([\s\S]+?)\$\$/g)) maths.push([m[1], true]);
  const noDisplay = textOnly.replace(/\$\$[\s\S]+?\$\$/g, "");
  for (const m of noDisplay.matchAll(/\\\(([\s\S]+?)\\\)/g)) maths.push([m[1], false]);
  for (const m of noDisplay.matchAll(/\\\[([\s\S]+?)\\\]/g)) maths.push([m[1], true]);
  let mathErr = 0;
  for (const [src, disp] of maths) {
    const s = decode(src.replace(/<[^>]+>/g, ""));
    try { katex.renderToString(s, { throwOnError: true, displayMode: disp, strict: "ignore", trust: true }); }
    catch (e) { mathErr++; if (mathErr <= 8) errs.push(`KaTeX: ${e.message.split("\n")[0].slice(0, 140)} :: ${s.slice(0, 80)}`); }
  }

  // scripts parse
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  scripts.forEach((s, i) => { try { new vm.Script(s, { filename: `${base}#inline${i}` }); } catch (e) { errs.push(`inline script ${i} syntax error: ${e.message}`); } });
  // widget ids referenced
  const mounts = [...html.matchAll(/<div id="(w-[^"]+)"><\/div>/g)].map(m => m[1]);
  const js = scripts.join("\n");
  mounts.forEach(id => { if (!js.includes(`"${id}"`) && !js.includes(`'${id}'`)) warns.push(`widget mount ${id} never referenced in script`); });
  const figIds = [...html.matchAll(/<(?:svg|div)[^>]*id="(fig-[^"]+)"/g)].map(m => m[1]);
  figIds.forEach(id => { if (!js.includes(id)) { /* static svg figure is fine if it has children */ } });

  // balanced tags (rough)
  for (const t of ["div", "section", "figure", "table", "details", "ol", "ul", "dl", "svg", "main", "p"]) {
    const o = count(new RegExp(`<${t}[\\s>]`, "g")), c = count(new RegExp(`</${t}>`, "g"));
    if (t === "p") { if (c > o) warns.push(`more </p> than <p>`); continue; }
    if (o !== c) errs.push(`unbalanced <${t}>: ${o} open vs ${c} close`);
  }
  // banned words in prose
  const prose = textOnly.replace(/<[^>]+>/g, " ").toLowerCase();
  BANNED.forEach(b => { if (prose.includes(b)) warns.push(`banned phrase: "${b}"`); });
  if (/\$[0-9]/.test(prose) === false && /(?<!\$)\$(?!\$)[^$\n]{1,40}\$(?!\$)/.test(textOnly.replace(/\$\$[\s\S]+?\$\$/g, ""))) warns.push("possible single-$ math (not rendered; use \\( \\))");

  const words = prose.split(/\s+/).filter(Boolean).length;
  console.log(`\n${base}: h2=${h2} formulas=${formulas} figures=${figs} widgets=${widgets} quizQ=${qs.length} math=${maths.length} words≈${words}`);
  warns.forEach(w => console.log("  warn: " + w));
  errs.forEach(e => console.log("  FAIL: " + e));
  if (errs.length) failed++; else console.log("  OK");
}
process.exit(failed ? 1 : 0);
