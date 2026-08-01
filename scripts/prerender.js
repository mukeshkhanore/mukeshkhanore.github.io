#!/usr/bin/env node
/**
 * Writes the rendered content of Assets/data.js directly into index.html.
 *
 * Without this the page ships eight empty <div>s and every publication,
 * role and degree exists only after JavaScript runs — invisible to crawlers,
 * archivers, citation scrapers and reader modes. The client-side render still
 * happens on load and produces identical markup, so the JS remains a
 * progressive layer rather than a requirement.
 *
 * It runs the real Assets/script.js against a DOM stub, so there is exactly
 * one renderer and the two outputs cannot drift.
 *
 * Usage:
 *   node scripts/prerender.js          # write markup into index.html
 *   node scripts/prerender.js --check  # exit 1 if index.html is stale (CI)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const CHECK = process.argv.includes("--check");
const INDEX = path.join(ROOT, "index.html");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* ── run the real renderers against a DOM stub ────────────────────────── */

const nodes = new Map();
const stub = () => ({
  innerHTML: "",
  textContent: "",
  src: "",
  setAttribute() {},
  getAttribute: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  classList: { toggle() {}, contains: () => false, remove() {} },
});

const context = {
  console: { error: console.error, log() {} },
  document: {
    baseURI: "https://mukeshkhanore.github.io/",
    body: stub(),
    addEventListener() {}, // swallow DOMContentLoaded
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, stub());
      return nodes.get(id);
    },
    querySelector: () => null,
  },
  window: {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
  },
  localStorage: { getItem: () => null, setItem() {} },
  getComputedStyle: () => ({ getPropertyValue: () => "#52d1b8" }),
  URL,
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(read("Assets/data.js"), context, { filename: "data.js" });
vm.runInContext(read("Assets/script.js"), context, { filename: "script.js" });

const api = vm.runInContext(
  "({ portfolioData, SECTION_SPECS, validatePortfolioData, renderProfile, renderSections })",
  context,
);

if (!api.validatePortfolioData(api.portfolioData)) {
  console.error("Assets/data.js failed validation — not pre-rendering.");
  process.exit(1);
}

api.renderProfile(api.portfolioData.profile);
api.renderSections(api.portfolioData);

/* ── splice the markup into index.html ────────────────────────────────── */

let html = fs.readFileSync(INDEX, "utf8");

/** Replace the inner HTML of <tag id="id" ...> ... </tag>, preserving indent. */
function fillElement(source, id, markup) {
  const open = new RegExp(`<(\\w+)([^>]*\\bid="${id}"[^>]*)>`);
  const m = open.exec(source);
  if (!m) throw new Error(`index.html has no element with id="${id}"`);

  const tag = m[1];
  const start = m.index + m[0].length;

  // Walk forward tracking depth. The grids are <div>s and the cards they hold
  // contain their own <div>s (.meta, .card-tag-row), so matching the first
  // </div> would close in the wrong place and shred the file.
  const token = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  token.lastIndex = start;
  let depth = 1;
  let end = -1;
  let t;
  while ((t = token.exec(source)) !== null) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) {
      end = t.index;
      break;
    }
  }
  if (end === -1) throw new Error(`unclosed <${tag}> for id="${id}"`);

  const lineStart = source.lastIndexOf("\n", m.index) + 1;
  const indent = source.slice(lineStart, m.index);
  const inner = markup
    ? "\n" +
      markup
        .split("\n")
        .map((l) => indent + "  " + l)
        .join("\n") +
      "\n" +
      indent
    : "";

  return source.slice(0, start) + inner + source.slice(end);
}

/** Set the text content of an element, escaping it. */
function fillText(source, id, text) {
  const esc = String(text).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c],
  );
  const re = new RegExp(
    `(<(\\w+)[^>]*\\bid="${id}"[^>]*>)([\\s\\S]*?)(</\\2>)`,
  );
  if (!re.test(source)) throw new Error(`index.html has no id="${id}"`);
  return source.replace(re, `$1${esc}$4`);
}

/*
 * Take whatever renderProfile actually set, rather than listing the fields
 * here — a hardcoded list silently drops any field added later, which is how
 * the hero statement shipped blank. Text nodes carry textContent; containers
 * carry innerHTML.
 */
for (const [id, node] of nodes) {
  if (node.textContent && !node.innerHTML) {
    html = fillText(html, id, node.textContent);
  }
}
html = fillElement(html, "social-links", nodes.get("social-links").innerHTML);

let sections = 0;
for (const spec of Object.values(api.SECTION_SPECS)) {
  const node = nodes.get(spec.grid);
  if (!node || !node.innerHTML) continue;
  // Emitted as one line; Prettier reflows it into the file's house style.
  html = fillElement(html, spec.grid, node.innerHTML);
  sections++;
}

/* ── write or verify ──────────────────────────────────────────────────── */

// Format here rather than in a following npm step, so the output is canonical
// and --check can compare it byte-for-byte against what is committed.
const prettier = require("prettier");

(async () => {
  const options = await prettier.resolveConfig(INDEX);
  const formatted = await prettier.format(html, {
    ...options,
    filepath: INDEX,
  });
  const current = fs.readFileSync(INDEX, "utf8");

  if (CHECK) {
    if (current !== formatted) {
      console.error(
        "index.html is out of date with Assets/data.js. Run `npm run prerender`.",
      );
      process.exit(1);
    }
    console.log("Pre-rendered HTML is up to date.");
    return;
  }

  fs.writeFileSync(INDEX, formatted);
  const cards = (formatted.match(/class="card[\s"]/g) || []).length;
  console.log(`Pre-rendered ${cards} cards across ${sections} sections.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
