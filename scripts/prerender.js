#!/usr/bin/env node
/**
 * Writes the rendered content of Assets/data.js directly into the HTML pages.
 *
 * Without this, index.html ships nine empty <div>s and every publication,
 * role and degree exists only after JavaScript runs — invisible to crawlers,
 * archivers, citation scrapers and reader modes. The client-side render still
 * happens on load and produces identical markup, so the JS remains a
 * progressive layer rather than a requirement.
 *
 * It runs the real Assets/script.js against a DOM stub, so there is exactly
 * one renderer and the two outputs cannot drift.
 *
 * Usage:
 *   node scripts/prerender.js          # write markup into the pages
 *   node scripts/prerender.js --check  # exit 1 if a page is stale (CI)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const prettier = require("prettier");

const ROOT = path.join(__dirname, "..");
const CHECK = process.argv.includes("--check");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// Every page that carries rendered content. A page only receives the ids it
// actually contains, so one list serves pages with very different markup.
const PAGES = ["index.html", "research.html"];

/* ── run the real renderers against a DOM stub ────────────────────────── */

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

/**
 * Run data.js + script.js in a fresh context and return every node the
 * renderers touched, keyed by id.
 */
function render() {
  const nodes = new Map();
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
      querySelectorAll: () => [],
    },
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener() {},
    },
    localStorage: { getItem: () => null, setItem() {} },
    getComputedStyle: () => ({ getPropertyValue: () => "#ff7a59" }),
    IntersectionObserver: undefined,
    URL,
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(read("Assets/data.js"), context, { filename: "data.js" });
  vm.runInContext(read("Assets/script.js"), context, { filename: "script.js" });

  const api = vm.runInContext(
    "({ portfolioData, SECTION_SPECS, validatePortfolioData," +
      " renderProfile, renderSections, renderResearch, renderPublicationsMeta," +
      " renderLastUpdated })",
    context,
  );

  if (!api.validatePortfolioData(api.portfolioData)) {
    console.error("Assets/data.js failed validation — not pre-rendering.");
    process.exit(1);
  }

  api.renderProfile(api.portfolioData.profile);
  api.renderSections(api.portfolioData);
  api.renderResearch(api.portfolioData);
  api.renderPublicationsMeta(api.portfolioData.publications);
  api.renderLastUpdated(api.portfolioData);

  return { nodes, api };
}

/* ── splicing helpers ─────────────────────────────────────────────────── */

/** Replace the inner HTML of <tag id="id" ...> ... </tag>, preserving indent. */
function fillElement(source, id, markup) {
  const open = new RegExp(`<(\\w+)([^>]*\\bid="${id}"[^>]*)>`);
  const m = open.exec(source);
  if (!m) throw new Error(`no element with id="${id}"`);

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
  if (!re.test(source)) throw new Error(`no id="${id}"`);
  return source.replace(re, `$1${esc}$4`);
}

/* ── structured data ──────────────────────────────────────────────────── */

/**
 * Build the JSON-LD graph from data.js: the Person, plus one ScholarlyArticle
 * per publication so citation scrapers and Google Scholar see the list without
 * running any JavaScript.
 *
 * One block per page, not two. check-integrity.js has a single sha256 slot in
 * each page's CSP to rewrite, so a second block would silently overwrite the
 * first one's hash and get itself blocked.
 */
function buildJsonLd(data) {
  const { seo, profile, publications } = data;
  const person = {
    "@type": "Person",
    "@id": seo.url + "#person",
    name: profile.name,
    givenName: profile.name.split(" ")[0],
    familyName: profile.name.split(" ").slice(1).join(" "),
    url: seo.url,
    image: seo.url + profile.avatar,
    email: "mailto:" + profile.email,
    jobTitle: seo.jobTitle,
    description: seo.description,
    identifier: seo.orcid,
    affiliation: {
      "@type": "ResearchOrganization",
      name: seo.affiliation.name,
      url: seo.affiliation.url,
    },
    alumniOf: seo.alumniOf.map((name) => ({
      "@type": "CollegeOrUniversity",
      name,
    })),
    knowsAbout: seo.knowsAbout,
    sameAs: profile.social
      .filter((s) => !s.url.startsWith("mailto:"))
      .map((s) => s.url),
  };

  // Authors arrive as one display string; split it back into people so each
  // gets its own Person node rather than a single run-on name.
  const authorsOf = (item) =>
    String(item.authors || "")
      .split(/,| and /)
      .map((a) => a.trim())
      .filter(Boolean)
      .map((name) => ({ "@type": "Person", name }));

  const works = publications.map((item) => {
    const work = {
      "@type":
        item.type === "presentation" ? "CreativeWork" : "ScholarlyArticle",
      headline: item.title,
      name: item.title,
      author: authorsOf(item),
      datePublished: String(item.year || ""),
      url: item.url,
      isPartOf: item.journal
        ? { "@type": "Periodical", name: item.journal }
        : undefined,
      volumeNumber: item.volume,
      pagination: item.pages,
      identifier: item.doi ? "https://doi.org/" + item.doi : undefined,
      sameAs: item.doi ? "https://doi.org/" + item.doi : undefined,
      description: item.description,
    };
    for (const key of Object.keys(work)) {
      if (work[key] === undefined) delete work[key];
    }
    return work;
  });

  return { "@context": "https://schema.org", "@graph": [person, ...works] };
}

/* ── per-page splice ──────────────────────────────────────────────────── */

const { nodes, api } = render();

// Grids are filled in spec order below, so skip them in the generic pass.
const gridIds = new Set(
  Object.values(api.SECTION_SPECS).map((spec) => spec.grid),
);

// Indented to sit inside <script>, which keeps the block Prettier-canonical —
// --check compares the formatted file byte for byte.
const jsonLd = JSON.stringify(buildJsonLd(api.portfolioData), null, 2)
  .split("\n")
  .map((line) => "      " + line)
  .join("\n");

function build(file) {
  let html = read(file);
  const has = (id) => new RegExp(`\\bid="${id}"`).test(html);

  /*
   * Take whatever the renderers actually set, rather than listing the fields
   * here — a hardcoded list silently drops any field added later, which is how
   * the hero statement once shipped blank. Text nodes carry textContent;
   * containers carry innerHTML and must go through fillElement or their markup
   * would be escaped into visible angle brackets.
   */
  for (const [id, node] of nodes) {
    if (gridIds.has(id) || !has(id)) continue;
    if (node.innerHTML) html = fillElement(html, id, node.innerHTML);
    else if (node.textContent) html = fillText(html, id, node.textContent);
  }

  let sections = 0;
  for (const spec of Object.values(api.SECTION_SPECS)) {
    const node = nodes.get(spec.grid);
    if (!node || !node.innerHTML || !has(spec.grid)) continue;
    // Emitted as one line; Prettier reflows it into the file's house style.
    html = fillElement(html, spec.grid, node.innerHTML);
    sections++;
  }

  html = html.replace(
    /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
    (_m, open, close) => `${open}\n${jsonLd}\n    ${close}`,
  );

  return { html, sections };
}

/* ── write or verify ──────────────────────────────────────────────────── */

// Format here rather than in a following npm step, so the output is canonical
// and --check can compare it byte-for-byte against what is committed.
(async () => {
  let stale = false;

  for (const file of PAGES) {
    const full = path.join(ROOT, file);
    const { html, sections } = build(file);
    const options = await prettier.resolveConfig(full);
    const formatted = await prettier.format(html, {
      ...options,
      filepath: full,
    });
    const current = fs.readFileSync(full, "utf8");

    if (CHECK) {
      if (current !== formatted) {
        console.error(`${file} is out of date with Assets/data.js.`);
        stale = true;
      }
      continue;
    }

    fs.writeFileSync(full, formatted);
    const cards = (formatted.match(/class="card[\s"]/g) || []).length;
    console.log(`${file}: ${cards} cards across ${sections} sections.`);
  }

  if (CHECK) {
    if (stale) {
      console.error("Run `npm run prerender`.");
      process.exit(1);
    }
    console.log("Pre-rendered HTML is up to date.");
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
