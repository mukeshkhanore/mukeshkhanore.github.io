#!/usr/bin/env node
/**
 * Builds Assets/icons.svg — an SVG sprite containing only the icons this site
 * actually uses — and keeps the ICON_IDS allow-list in Assets/script.js in
 * sync with it.
 *
 * This replaced the FontAwesome CDN stylesheet: 102KB of CSS plus webfont
 * files, for 18 glyphs. The sprite is under 10KB, needs no third-party origin,
 * and cannot flash unstyled.
 *
 * Usage:
 *   node scripts/build-icons.js          # regenerate sprite + allow-list
 *   node scripts/build-icons.js --check  # exit 1 if either is stale (CI)
 *
 * After adding an icon to data.js, run `npm run icons` and re-run
 * `npm run prerender` so the inlined copies pick it up.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHECK = process.argv.includes("--check");
const PKG = path.join(ROOT, "node_modules/@fortawesome/fontawesome-free/svgs");

// FontAwesome 5 names still used in this codebase. FA6 renamed the files but
// kept the old names as aliases, so the source keeps reading naturally.
const ALIAS = {
  "external-link-alt": "arrow-up-right-from-square",
  "chalkboard-teacher": "chalkboard-user",
  adjust: "circle-half-stroke",
};

const SOURCES = [
  "Assets/data.js",
  "Assets/script.js",
  "index.html",
  "cookie-policy.html",
  "404.html",
];

/* ── collect ──────────────────────────────────────────────────────────── */

/*
 * Icons are referenced three ways, and all three have to be found or the
 * sprite would prune something still in use:
 *   data.js      "fab fa-github"
 *   markup/JS    href="#i-github"
 *   THEMES       icon: "i-moon"
 *
 * These patterns are deliberately narrow. A loose /i-([a-z-]+)/ would also
 * match the id="i-…" attributes of the sprite already inlined into the HTML,
 * making the scan self-fulfilling and unable to drop a retired icon.
 */
const PATTERNS = [
  /\b(?:fab|fas|far)\s+fa-([a-z0-9-]+)/g,
  /href="#i-([a-z0-9-]+)"/g,
  /icon:\s*"i-([a-z0-9-]+)"/g,
];

// icon() falls back to this when handed a name it does not recognise, so it
// has to be in the sprite even when nothing references it directly.
const ALWAYS = ["link"];

/**
 * Remove generated regions before scanning: the inlined sprite, and the
 * pre-rendered content of each grid. Both are produced from data.js and
 * script.js, which are scanned anyway — counting them too would make the
 * result depend on whether prerender happened to run first, and make the
 * --check gate flap between builds.
 */
function stripGenerated(src) {
  let out = src.replace(/<svg[^>]*class="icon-sprite"[\s\S]*?<\/svg>/g, "");
  const openGrid = /<div[^>]*\bid="[a-z-]+-grid"[^>]*>/g;
  let m;
  while ((m = openGrid.exec(out)) !== null) {
    const start = m.index + m[0].length;
    const token = /<(\/?)div\b[^>]*>/g;
    token.lastIndex = start;
    let depth = 1;
    let t;
    while ((t = token.exec(out)) !== null) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) break;
    }
    if (depth !== 0) break;
    out = out.slice(0, start) + out.slice(t.index);
    openGrid.lastIndex = start;
  }
  return out;
}

const found = new Set(ALWAYS);
for (const rel of SOURCES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const src = stripGenerated(fs.readFileSync(file, "utf8"));
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) found.add(m[1]);
  }
}

if (found.size === 0) {
  console.error(
    "No icon references found — refusing to write an empty sprite.",
  );
  process.exit(1);
}

/* ── build ────────────────────────────────────────────────────────────── */

if (!fs.existsSync(PKG)) {
  console.error(
    "Missing @fortawesome/fontawesome-free. Run `npm install` first.",
  );
  process.exit(1);
}

const names = [...found].sort();
const symbols = [];
const missing = [];

// Style is resolved by probing rather than declared, so a reference written as
// a bare sprite id does not have to remember whether it is solid or brands.
const STYLES = ["solid", "brands", "regular"];

for (const name of names) {
  const filename = `${ALIAS[name] || name}.svg`;
  const file = STYLES.map((s) => path.join(PKG, s, filename)).find((f) =>
    fs.existsSync(f),
  );
  if (!file) {
    missing.push(name);
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  const viewBox = /viewBox="([^"]+)"/.exec(src)[1];
  const body = /<svg[^>]*>([\s\S]*)<\/svg>/
    .exec(src)[1]
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  symbols.push(`<symbol id="i-${name}" viewBox="${viewBox}">${body}</symbol>`);
}

if (missing.length) {
  console.error("No SVG found for: " + missing.join(", "));
  console.error("If FontAwesome renamed these, add them to ALIAS above.");
  process.exit(1);
}

const sprite =
  '<svg xmlns="http://www.w3.org/2000/svg" class="icon-sprite" aria-hidden="true">' +
  symbols.join("") +
  "</svg>\n";

/* ── the allow-list in script.js must match the sprite ────────────────── */

const scriptPath = path.join(ROOT, "Assets/script.js");
let script = fs.readFileSync(scriptPath, "utf8");
const listBlock = /const ICON_IDS = new Set\(\[[\s\S]*?\]\);/;
const rendered =
  "const ICON_IDS = new Set([\n" +
  names.map((n) => `  "${n}",`).join("\n") +
  "\n]);";

const spritePath = path.join(ROOT, "Assets/icons.svg");
const spriteStale =
  !fs.existsSync(spritePath) || fs.readFileSync(spritePath, "utf8") !== sprite;
const listStale = !listBlock.test(script) || !script.includes(rendered);

if (CHECK) {
  if (spriteStale || listStale) {
    console.error("Icon sprite is stale. Run `npm run icons`.");
    if (spriteStale) console.error("  - Assets/icons.svg differs");
    if (listStale) console.error("  - ICON_IDS in Assets/script.js differs");
    process.exit(1);
  }
  console.log(`Icon sprite up to date (${names.length} icons).`);
  process.exit(0);
}

fs.writeFileSync(spritePath, sprite);
script = script.replace(listBlock, rendered);
fs.writeFileSync(scriptPath, script);

console.log(
  `Wrote Assets/icons.svg — ${names.length} icons, ` +
    `${(sprite.length / 1024).toFixed(1)}KB.`,
);
