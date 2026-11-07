#!/usr/bin/env node
// Checks every relative href in site/ (index + modules): target file exists and #fragment id exists.
// Usage: node scripts/check-links.mjs
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "../site");
const pages = ["index.html", ...fs.readdirSync(path.join(root, "modules")).filter(f => f.endsWith(".html")).map(f => "modules/" + f)];
const idCache = new Map();
const idsOf = file => {
  if (!idCache.has(file)) {
    const html = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
  }
  return idCache.get(file);
};

let bad = 0, total = 0;
for (const page of pages) {
  const abs = path.join(root, page);
  const html = fs.readFileSync(abs, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    total++;
    const [file, frag] = href.split("#");
    const target = file ? path.resolve(path.dirname(abs), file) : abs;
    if (!fs.existsSync(target)) { bad++; console.log(`${page}: missing file ${href}`); continue; }
    if (frag && target.endsWith(".html") && !idsOf(target).has(frag)) { bad++; console.log(`${page}: missing #${frag} in ${file || "(self)"}`); }
  }
}
console.log(`${total} relative links checked, ${bad} broken`);
process.exit(bad ? 1 : 0);
