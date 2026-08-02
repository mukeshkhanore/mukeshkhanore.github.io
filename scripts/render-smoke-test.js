#!/usr/bin/env node
/**
 * Renders the real Assets/data.js through the real Assets/script.js against a
 * minimal DOM stub, then asserts the output is sane.
 *
 * This is the safety net for content edits: a renamed field, a bad URL or a
 * section whose grid is missing from index.html fails here instead of silently
 * producing an empty or broken card on the live site.
 *
 * Usage: node scripts/render-smoke-test.js
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

/* ── Minimal DOM stub ─────────────────────────────────────────────────── */

const grids = new Map();

const stubElement = () => ({
  innerHTML: "",
  textContent: "",
  src: "",
  className: "",
  title: "",
  setAttribute() {},
  getAttribute: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  classList: { toggle() {}, contains: () => false, remove() {} },
});

// Populated by probeCvLink(); keyed by the selector initCvLink() asks for.
const cvLinks = {};

const context = {
  console,
  document: {
    baseURI: "https://mukeshkhanore.github.io/",
    body: stubElement(),
    addEventListener() {}, // swallow DOMContentLoaded; we call renderers directly
    getElementById(id) {
      if (!grids.has(id)) grids.set(id, stubElement());
      return grids.get(id);
    },
    querySelector: () => null,
    // initCvLink() collects its buttons this way; probeCvLink below swaps in
    // the pair it wants to observe.
    querySelectorAll: (selector) => cvLinks[selector] || [],
  },
  window: {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
  },
  localStorage: { getItem: () => null, setItem() {} },
  getComputedStyle: () => ({ getPropertyValue: () => "#ff7a59" }),
  URL,
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(read("Assets/data.js"), context, { filename: "data.js" });
vm.runInContext(read("Assets/script.js"), context, { filename: "script.js" });

// Top-level `const` lives in the context's global lexical scope rather than on
// the global object — exactly as it does across two <script> tags in a browser
// — so reach it by evaluating an expression in that same scope.
const api = vm.runInContext(
  "({ portfolioData, SECTION_SPECS, validatePortfolioData, renderProfile," +
    " renderSections, renderResearch, initCvLink })",
  context,
);

/* ── Render ───────────────────────────────────────────────────────────── */

const data = api.portfolioData;

check(
  api.validatePortfolioData(data) === true,
  "validatePortfolioData() rejected Assets/data.js",
);

api.renderProfile(data.profile);
api.renderSections(data);
// research.html's blocks go through the same stub, so the class-coverage scan
// below sees .focus-card and friends too.
api.renderResearch(data);

/* ── Assertions ───────────────────────────────────────────────────────── */

const indexHtml = read("index.html");

for (const [key, spec] of Object.entries(api.SECTION_SPECS)) {
  const html = grids.get(spec.grid) ? grids.get(spec.grid).innerHTML : "";

  check(
    indexHtml.includes('id="' + spec.grid + '"'),
    `section "${key}": index.html has no element with id="${spec.grid}"`,
  );

  check(html.length > 0, `section "${key}": rendered nothing`);

  // Sections with a `render` override are not card-shaped — publications are a
  // bibliography, experience a chronology — so count their own top-level rows.
  const ROW = {
    publications: /<li class="biblio-item/g,
    experience: /<li class="timeline-item/g,
    education: /<li class="edu-item/g,
  };
  const pattern = ROW[key] || /class="card[\s"]/g;
  const rendered = (html.match(pattern) || []).length;
  const raw = data[key];
  const expected = spec.transform ? spec.transform(raw).length : raw.length;
  check(
    rendered === expected,
    `section "${key}": rendered ${rendered} entries, expected ${expected}`,
  );

  // A missing title field renders as an empty heading.
  check(
    !/<h3[^>]*>\s*<\/h3>/.test(html),
    `section "${key}": an entry has an empty <h3> — check the title field`,
  );

  // safeUrl() collapses anything unroutable to "#".
  const deadLinks = (html.match(/href="#"/g) || []).length;
  check(
    deadLinks === 0,
    `section "${key}": ${deadLinks} link(s) fell back to "#" — check the url fields`,
  );
}

/*
 * research.html's blocks. Each pattern matches only the top-level row for that
 * block — a looser `<li |<article ` counted the tag chips inside the focus
 * cards as well, making three cards look like fifteen.
 */
for (const [id, pattern, expected] of [
  ["focus-grid", /<article class="focus-card"/g, data.research.focus.length],
  ["methods-grid", /<li class="skill-tag"/g, data.research.methods.length],
  ["selected-publications", /<li class="biblio-item/g, 4],
]) {
  const html = grids.get(id) ? grids.get(id).innerHTML : "";
  const rendered = (html.match(pattern) || []).length;
  check(
    rendered === expected,
    `research: #${id} rendered ${rendered} rows, expected ${expected}`,
  );
}

const socialHtml = grids.get("social-links").innerHTML;
check(socialHtml.length > 0, "profile: no social links rendered");
check(
  !socialHtml.includes('href="#"'),
  'profile: a social link fell back to "#"',
);

// Every grid the page defines should be claimed by a spec, or it stays empty.
for (const match of indexHtml.matchAll(/id="([a-z-]+-grid)"/g)) {
  const id = match[1];
  const claimed = Object.values(api.SECTION_SPECS).some(
    (spec) => spec.grid === id,
  );
  check(
    claimed,
    `index.html defines #${id} but no SECTION_SPECS entry fills it`,
  );
}

check(
  /<p class="hero-cv" hidden>/.test(indexHtml),
  "index.html: the CV button must ship hidden so a missing PDF never shows",
);

/* ── Every rendered class must have a rule ────────────────────────────── */

/*
 * A regex edit to style.css once swallowed the declaration block shared by
 * .biblio-year, .timeline-period and .edu-meta, leaving the selectors merged
 * onto the next rule. The result was still valid CSS, so Prettier and
 * html-validate both passed while the rails silently lost their font, size
 * and alignment. This catches that class of damage.
 */
const styleCss = read("Assets/style.css");
const emitted = new Set();
for (const el of grids.values()) {
  for (const m of (el.innerHTML || "").matchAll(/class="([^"]+)"/g)) {
    for (const cls of m[1].split(/\s+/)) if (cls) emitted.add(cls);
  }
}
const unstyled = [...emitted].filter(
  (cls) =>
    !new RegExp(`\\.${cls.replace(/[-]/g, "\\-")}[\\s,{:.]`).test(styleCss),
);
check(
  unstyled.length === 0,
  `classes rendered but absent from style.css: ${unstyled.join(", ")}`,
);

/* ── CV button reveal ─────────────────────────────────────────────────── */

/**
 * Run initCvLink() against a stubbed fetch and report whether the buttons were
 * revealed. There are two of them now — one in the header, one in the hero —
 * and a single probe has to flip both, so this asserts on the pair rather than
 * on one container.
 */
function probeCvLink(fetchResult) {
  const containers = [{ hidden: true }, { hidden: true }];
  cvLinks["[data-cv-link]"] = containers.map((container) => ({
    href: "https://mukeshkhanore.github.io/Assets/Mukesh_Khanore_CV.pdf",
    closest: () => container,
  }));
  context.fetch = () => fetchResult;

  api.initCvLink();
  // Settle the promise chain inside initCvLink before reading the result.
  return new Promise((resolve) =>
    setImmediate(() => resolve(containers.map((c) => c.hidden))),
  );
}

/** True when every CV container is still hidden. */
const allHidden = (states) => states.every((hidden) => hidden === true);
/** True when every CV container was revealed. */
const allShown = (states) => states.every((hidden) => hidden === false);

/* ── Report ───────────────────────────────────────────────────────────── */

async function main() {
  check(
    allShown(await probeCvLink(Promise.resolve({ ok: true }))),
    "a CV button stayed hidden even though the PDF responded 200",
  );
  check(
    allHidden(await probeCvLink(Promise.resolve({ ok: false }))),
    "a CV button was revealed despite the PDF 404ing",
  );
  check(
    allHidden(await probeCvLink(Promise.reject(new Error("offline")))),
    "a CV button was revealed even though the probe threw",
  );

  if (problems.length > 0) {
    console.error("Render smoke test failed:\n");
    for (const problem of problems) console.error("  - " + problem);
    process.exit(1);
  }

  const total = [...grids.values()].reduce(
    (sum, el) =>
      sum + ((el.innerHTML || "").match(/class="card[\s"]/g) || []).length,
    0,
  );
  console.log(
    `Render smoke test passed: ${total} cards across ${Object.keys(api.SECTION_SPECS).length} sections, CV reveal logic verified.`,
  );
}

main();
