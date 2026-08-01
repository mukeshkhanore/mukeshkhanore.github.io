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

// Top-level `const` lives in the context's global lexical scope rather than on
// the global object — exactly as it does across two <script> tags in a browser
// — so reach it by evaluating an expression in that same scope.
const api = vm.runInContext(
  "({ portfolioData, SECTION_SPECS, validatePortfolioData, renderProfile, renderSections, initCvLink })",
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

/** Run initCvLink() against a stubbed fetch and report the container state. */
function probeCvLink(fetchResult) {
  const container = { hidden: true };
  grids.set("cv-link", {
    href: "https://mukeshkhanore.github.io/Assets/Mukesh_Khanore_CV.pdf",
    closest: () => container,
  });
  context.fetch = () => fetchResult;

  api.initCvLink();
  // Settle the promise chain inside initCvLink before reading the result.
  return new Promise((resolve) =>
    setImmediate(() => resolve(container.hidden)),
  );
}

/* ── Report ───────────────────────────────────────────────────────────── */

async function main() {
  check(
    (await probeCvLink(Promise.resolve({ ok: true }))) === false,
    "CV button stayed hidden even though the PDF responded 200",
  );
  check(
    (await probeCvLink(Promise.resolve({ ok: false }))) === true,
    "CV button was revealed despite the PDF 404ing",
  );
  check(
    (await probeCvLink(Promise.reject(new Error("offline")))) === true,
    "CV button was revealed even though the probe threw",
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
