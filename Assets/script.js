/**
 * Portfolio renderer.
 *
 * Content lives in Assets/data.js. To add or change a section, edit that file
 * and (for a brand new section) add an entry to SECTION_SPECS below plus a
 * matching <section> in index.html. Nothing else needs to change.
 */

/* ── Escaping helpers ─────────────────────────────────────────────────── */

const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

/** Escape a value for interpolation into HTML text or a quoted attribute. */
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

/**
 * Escape a value for an href. Anything that is not http/https/mailto is
 * dropped, so a malformed or javascript: URL in data.js can never become a
 * live link.
 */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];
function safeUrl(value) {
  try {
    const url = new URL(String(value ?? ""), document.baseURI);
    return SAFE_PROTOCOLS.includes(url.protocol) ? esc(url.href) : "#";
  } catch {
    return "#";
  }
}

/**
 * Symbols present in the inlined Assets/icons.svg sprite. Regenerate both with
 * `npm run icons` after adding a new icon to data.js.
 */
const ICON_IDS = new Set([
  "adjust",
  "bars",
  "envelope",
  "file-arrow-down",
  "github",
  "google",
  "graduation-cap",
  "link",
  "linkedin",
  "microchip",
  "moon",
  "orcid",
  "researchgate",
  "sun",
]);

/**
 * Turn a FontAwesome class string from data.js ("fab fa-github") into a
 * reference to the local sprite. Unknown names fall back to a generic link
 * glyph rather than rendering an empty box.
 */
function icon(value, extraClass) {
  const match = /fa-([a-z0-9-]+)/.exec(String(value ?? ""));
  const name = match && ICON_IDS.has(match[1]) ? match[1] : "link";
  const cls = extraClass ? `icon ${extraClass}` : "icon";
  return `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

/* ── Data validation ──────────────────────────────────────────────────── */

const REQUIRED_SECTIONS = [
  "profile",
  "education",
  "experience",
  "projects",
  "publications",
  "activities",
  "skills",
  "certificates",
  "teaching",
];

function validatePortfolioData(data) {
  if (!data || typeof data !== "object") {
    console.error("Invalid portfolio data: not an object");
    return false;
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!data[section]) {
      console.error(`Invalid portfolio data: missing "${section}" section`);
      return false;
    }
  }

  const { name, tagline, bio } = data.profile;
  if (!name || !tagline || !bio?.length) {
    console.error("Invalid portfolio data: missing required profile fields");
    return false;
  }

  return true;
}

/* ── Card rendering ───────────────────────────────────────────────────── */

/**
 * Build one card from a plain descriptor. Every section funnels through here,
 * so escaping and markup stay consistent.
 *
 * Publications and experience no longer come through here — they have their
 * own renderers — so the badge and subtitle affordances they needed are gone.
 *
 * Descriptor fields (all optional except title):
 *   href                 makes the whole card a link
 *   titleIconLeading     icon before the title
 *   meta                 mono label line
 *   body []              paragraphs
 *   list []              bulleted items
 *   pills []             skill-tag pills
 *   tags []              small skill-tag pills in a bottom row
 *   footer               call-to-action line
 */
function renderCard(card) {
  const isLink = Boolean(card.href);
  const tag = isLink ? "a" : "article";
  const attrs = isLink
    ? ` href="${safeUrl(card.href)}" target="_blank" rel="noopener noreferrer"`
    : "";
  const classes = ["card", isLink ? "card--link" : ""]
    .filter(Boolean)
    .join(" ");

  const leadingIcon = card.titleIconLeading
    ? icon(card.titleIconLeading, "card-icon")
    : "";

  const meta = card.meta ? `<div class="meta">${esc(card.meta)}</div>` : "";

  const body = (card.body || [])
    .filter(Boolean)
    .map((text) => `<p>${esc(text)}</p>`)
    .join("");

  const list = card.list?.length
    ? `<ul>${card.list.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
    : "";

  const pills = card.pills?.length
    ? `<ul class="skills-list">${card.pills
        .map((pill) => `<li class="skill-tag">${esc(pill)}</li>`)
        .join("")}</ul>`
    : "";

  const tags = card.tags?.length
    ? `<div class="skills-list card-tag-row">${card.tags
        .map((t) => `<span class="skill-tag skill-tag--sm">${esc(t)}</span>`)
        .join("")}</div>`
    : "";

  const footer = card.footer
    ? `<p class="card-view-link">${esc(card.footer)} ${icon("fa-external-link-alt", "card-ext-icon")}</p>`
    : "";

  return (
    `<${tag} class="${classes}"${attrs}>` +
    `<h3>${leadingIcon}${esc(card.title)}</h3>` +
    `${meta}${body}${list}${pills}${tags}${footer}` +
    `</${tag}>`
  );
}

/* ── Section definitions ──────────────────────────────────────────────── */

const SKILL_CATEGORIES = [
  { title: "Programming", key: "programming", style: "pills" },
  { title: "Simulation & Tools", key: "simulation", style: "pills" },
  { title: "Research & Physics", key: "research", style: "pills" },
  { title: "Soft Skills", key: "soft", style: "pills" },
];

/**
 * Publication year. Prefers the explicit `year` field; older entries that only
 * carry a display string like "AIP Advances 15, 3 (2025)" fall back to
 * scraping it, so an entry missing the structured fields still sorts and rails
 * correctly instead of dropping to the bottom with an em dash.
 */
function pubYear(item) {
  if (item?.year) return String(item.year);
  const s = String(item?.meta ?? "");
  const parens = /\((\d{4})\)/.exec(s);
  if (parens) return parens[1];
  const loose = /\b(?:19|20)\d{2}\b/.exec(s);
  return loose ? loose[0] : "";
}

/**
 * Citation line: "Journal 101, 155904 (2026)". Built from the structured
 * fields so the displayed citation and the JSON-LD cannot disagree; `meta` is
 * the fallback for entries that predate those fields.
 */
function citation(item) {
  if (!item?.journal) return String(item?.meta ?? "");
  const volume = item.volume ? ` ${item.volume}` : "";
  const pages = item.pages ? `, ${item.pages}` : "";
  const year = pubYear(item);
  return `${item.journal}${volume}${pages}${year ? ` (${year})` : ""}`;
}

/** Hyphenated ranges read as dashes: "Oct 2022 - Present" -> en dash. */
const enDash = (s) => String(s ?? "").replace(/\s+-\s+/g, " – ");

/**
 * One entry per section: which grid it fills, and how the data becomes markup.
 *
 * Most sections map each item onto a card descriptor via `card` and share
 * renderCard. Sections whose content is not card-shaped supply `render`
 * instead and emit their own markup — publications are a bibliography and
 * experience is a chronology, and flattening both into the same grid was the
 * design problem this replaces.
 */
/** Publication entries, shared by the homepage bibliography and research.html. */
function renderBiblio(items, { limit } = {}) {
  const list = [...items].sort(
    (a, b) => Number(pubYear(b) || 0) - Number(pubYear(a) || 0),
  );
  const shown = limit ? list.slice(0, limit) : list;

  return (
    `<ol class="biblio">` +
    shown
      .map((item) => {
        const isTalk = item.type === "presentation";
        const year = pubYear(item);
        return (
          `<li class="biblio-item${isTalk ? " biblio-item--talk" : ""}">` +
          `<div class="biblio-year">${esc(year || "—")}</div>` +
          `<div class="biblio-entry">` +
          `<h3 class="biblio-title">` +
          `<a href="${safeUrl(item.url)}" target="_blank" rel="noopener noreferrer">` +
          `${esc(item.title)}${icon("fa-external-link-alt", "biblio-arrow")}</a></h3>` +
          (item.authors
            ? `<p class="biblio-authors">${esc(item.authors)}</p>`
            : "") +
          `<p class="biblio-venue">${esc(citation(item))}` +
          `<span class="biblio-kind">${isTalk ? "presentation" : "journal"}</span></p>` +
          (item.description
            ? `<p class="biblio-note">${esc(item.description)}</p>`
            : "") +
          (item.doi
            ? `<p class="biblio-doi"><a href="https://doi.org/${encodeURI(item.doi)}"` +
              ` target="_blank" rel="noopener noreferrer">doi:${esc(item.doi)}</a></p>`
            : "") +
          `</div></li>`
        );
      })
      .join("") +
    `</ol>`
  );
}

const SECTION_SPECS = {
  publications: {
    grid: "publications-grid",
    /*
     * Sorted newest first inside renderBiblio rather than in data.js, so that
     * file stays a plain curated list. A year rail running 2025, 2022, 2026
     * reads as a rendering bug, so display order has to match the device.
     */
    render: renderBiblio,
  },

  experience: {
    grid: "experience-grid",
    render: (items) =>
      `<ol class="timeline">` +
      items
        .map(
          (item) =>
            `<li class="timeline-item">` +
            `<div class="timeline-period">${esc(enDash(item.period))}</div>` +
            `<div class="timeline-entry">` +
            `<h3 class="timeline-role">${esc(item.role)}</h3>` +
            `<p class="timeline-org">${esc(item.company)}</p>` +
            (item.details?.length
              ? `<ul class="timeline-points">${item.details
                  .map((d) => `<li>${esc(d)}</li>`)
                  .join("")}</ul>`
              : "") +
            `</div></li>`,
        )
        .join("") +
      `</ol>`,
  },

  education: {
    grid: "education-grid",
    render: (items) =>
      `<ol class="edu-list">` +
      items
        .map(
          (item) =>
            `<li class="edu-item">` +
            `<div class="edu-meta">${esc(item.meta)}</div>` +
            `<div class="edu-entry">` +
            `<h3 class="edu-degree">${esc(item.degree)}</h3>` +
            `<p class="edu-org">${esc(item.institution)}</p>` +
            (item.description
              ? `<p class="edu-note">${esc(item.description)}</p>`
              : "") +
            `</div></li>`,
        )
        .join("") +
      `</ol>`,
  },

  projects: {
    grid: "projects-grid",
    card: (item) => ({
      href: item.url,
      title: item.name,
      meta: item.meta,
      body: [item.description],
      tags: item.tags,
    }),
  },

  skills: {
    grid: "skills-grid",
    transform: (skills) =>
      SKILL_CATEGORIES.filter((cat) => Array.isArray(skills[cat.key])).map(
        (cat) => ({ ...cat, items: skills[cat.key] }),
      ),
    card: (cat) => ({
      title: cat.title,
      [cat.style === "pills" ? "pills" : "list"]: cat.items,
    }),
  },

  certificates: {
    grid: "certificates-grid",
    card: (item) => ({
      href: item.url,
      titleIconLeading: item.icon,
      title: item.title,
      meta: item.issuer,
      body: [item.description],
      footer: "View certificate",
    }),
  },

  activities: {
    grid: "conferences-grid",
    card: (item) => ({
      title: item.title,
      meta: item.meta,
      body: [item.description],
    }),
  },

  teaching: {
    grid: "teaching-grid",
    card: (item) => ({
      title: item.role,
      meta: item.institution,
      body: [item.description],
    }),
  },
};

function renderSections(data) {
  for (const [key, spec] of Object.entries(SECTION_SPECS)) {
    const grid = document.getElementById(spec.grid);
    if (!grid) continue; // section not present on this page

    const raw = data[key];
    const items = spec.transform ? spec.transform(raw) : raw;
    if (!Array.isArray(items)) {
      console.error(`Section "${key}" did not produce a list of items`);
      continue;
    }

    grid.innerHTML = spec.render
      ? spec.render(items)
      : items.map(spec.card).map(renderCard).join("");
  }
}

/**
 * research.html's own blocks: the focus areas, the methods list and a short
 * selection of publications. These have no SECTION_SPECS entries because they
 * do not appear on index.html.
 */
function renderResearch(data) {
  const research = data.research;
  if (!research) return;

  const fill = (id, markup) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = markup;
  };

  fill(
    "focus-grid",
    (research.focus || [])
      .map(
        (area) =>
          `<article class="focus-card">` +
          `<h3>${esc(area.title)}</h3>` +
          `<p>${esc(area.description)}</p>` +
          (area.tags?.length
            ? `<ul class="skills-list">${area.tags
                .map(
                  (t) => `<li class="skill-tag skill-tag--sm">${esc(t)}</li>`,
                )
                .join("")}</ul>`
            : "") +
          `</article>`,
      )
      .join(""),
  );

  fill(
    "methods-grid",
    `<ul class="skills-list">${(research.methods || [])
      .map((m) => `<li class="skill-tag">${esc(m)}</li>`)
      .join("")}</ul>`,
  );

  // Four most recent, so the page stays a summary and the full list on the
  // homepage remains the canonical one.
  fill(
    "selected-publications",
    renderBiblio(data.publications || [], { limit: 4 }),
  );
}

/**
 * The publications eyebrow: "6 papers · 2014–2026".
 *
 * A structural label should carry information the reader would otherwise have
 * to count for themselves — how much work there is, and over what span. Both
 * numbers are derived from the list, so neither can go stale.
 */
function renderPublicationsMeta(publications) {
  const el = document.getElementById("publications-meta");
  if (!el || !publications?.length) return;

  const years = publications
    .map((item) => Number(pubYear(item)))
    .filter((y) => Number.isFinite(y) && y > 0);

  const count = publications.length;
  const noun = count === 1 ? "entry" : "entries";
  const span = years.length
    ? ` · ${Math.min(...years)}–${Math.max(...years)}`
    : "";
  el.textContent = `${count} ${noun}${span}`;
}

function renderProfile(profile) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set("profile-name", profile.name);
  set("profile-tagline", profile.tagline);
  set("profile-summary", profile.summary);

  /*
   * The long bio is a list of paragraphs, not one block of text. It has to go
   * in as innerHTML rather than textContent — which is also why prerender.js
   * routes any node carrying innerHTML through fillElement.
   */
  const bio = document.getElementById("profile-bio");
  if (bio) {
    const paragraphs = Array.isArray(profile.bio) ? profile.bio : [profile.bio];
    bio.innerHTML = paragraphs
      .filter(Boolean)
      .map((text) => `<p>${esc(text)}</p>`)
      .join("");
  }

  const avatar = document.getElementById("profile-avatar");
  if (avatar && profile.avatar) avatar.src = profile.avatar;

  const social = document.getElementById("social-links");
  if (social) {
    social.innerHTML = (profile.social || [])
      .map(
        (link) =>
          `<a href="${safeUrl(link.url)}" class="social-icon" aria-label="${esc(link.name)}" title="${esc(link.name)}"` +
          ` target="_blank" rel="noopener noreferrer">${icon(link.icon)}</a>`,
      )
      .join("");
  }
}

/* ── Background particle network ──────────────────────────────────────── */

const PARTICLE_STORAGE_KEY = "particle-settings-v4";
const PARTICLE_DEFAULTS = Object.freeze({
  density: 70,
  speed: 65,
  showLines: true,
  autoTune: true,
});

const MAX_DPR = 1.5; // beyond this the fill rate costs more than it looks better

/*
 * The lattice is sized by SPACING, not by an atom count.
 *
 * The count-based budget inherited from the random-particle version put 68
 * atoms on a 1600x900 screen, which works out to ~206px between lattice
 * points: forty faint dots scattered across the viewport, reading as nothing
 * at all. A crystal has to be dense enough to see as a crystal, and a lattice
 * is far cheaper to draw than the old all-pairs field it replaced — bonds are
 * known from the grid instead of searched for — so it can afford the atoms.
 *
 * The density slider now interpolates spacing between these two bounds.
 */
const SPACING_SPARSE = 150; // px, at density 20
const SPACING_DENSE = 48; // px, at density 120
const MAX_ATOMS = 800; // ceiling regardless of viewport size
const BOND_BUCKETS = 6; // opacity steps; one stroke() per bucket, not per bond
const BOND_MIN = 0.08; // faintest A–B bond (fully stretched)
const BOND_RANGE = 0.26; // added at full compression

/* 0.5 keeps #fafafa headings at 7.2:1 where they sit on the bare page ground;
   0.55 drops them below AAA. This is the ceiling, not a preference. */
const PARTICLE_ALPHA = 0.5;
const FPS_FLOOR = 45;
const MIN_AUTOTUNE_ATOMS = 60;

/*
 * The lattice is a perovskite in plan view: A-sites on the grid points, one
 * B-site in the middle of every cell. Below the Curie temperature the B-site
 * cation sits off-centre, and that displacement is the ferroelectric order
 * parameter — a small atomic shift producing a macroscopic polarization,
 * which is the subject of the research this page describes.
 *
 * A random particle field would have been the same machinery saying nothing.
 */
const JITTER_PX = 1.4; // thermal amplitude about each site
const DISPLACEMENT = 0.16; // B-site offset, as a fraction of the cell
const POLARIZATION = { x: 0.92, y: 0.39 }; // one coherent direction for all
const TRANSITION_DELAY = 900; // ms of symmetric lattice before it orders
const TRANSITION_MS = 1700;

/*
 * Coral comes from --accent-rgb, not --primary-color: on this palette
 * --primary-color is the near-black page ground (#0a0a0a), so reading it would
 * paint black particles onto a black background. --accent-rgb is defined in
 * all three themes and is already an "r, g, b" triple, so no colour parsing is
 * needed and the network re-tints correctly when the theme changes.
 */
const CORAL_FALLBACK = [255, 122, 89];

function readAccentRgb() {
  const raw = getComputedStyle(document.body)
    .getPropertyValue("--accent-rgb")
    .trim();
  const parts = raw.split(",").map((n) => Number(n.trim()));
  const usable =
    parts.length === 3 &&
    parts.every((n) => Number.isFinite(n) && n >= 0 && n <= 255);
  return usable ? parts : CORAL_FALLBACK;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function loadParticleSettings() {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(PARTICLE_STORAGE_KEY) || "null");
  } catch {
    stored = null; // corrupt entry — fall back to defaults rather than throw
  }
  const s = { ...PARTICLE_DEFAULTS, ...(stored || {}) };
  return {
    density: clamp(Math.round(Number(s.density) || 0), 20, 120),
    speed: clamp(Math.round(Number(s.speed) || 0), 10, 100),
    showLines: Boolean(s.showLines),
    autoTune: Boolean(s.autoTune),
  };
}

function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const settings = loadParticleSettings();

  let accent = readAccentRgb();
  let width = 0;
  let height = 0;
  let spacing = 0;
  let aSites = [];
  let bSites = [];
  // Flat pairs: [bIndex, aIndex, bIndex, aIndex, …]. Flat rather than an array
  // of tuples so the per-frame loop allocates nothing.
  let bonds = [];
  const bondBuckets = Array.from({ length: BOND_BUCKETS }, () => []);
  let rows = 0;
  let cols = 0;
  let animFrameId = null;

  // Auto-tune state. These narrow what is drawn; they never touch `speed`,
  // because a lattice that visibly slows down reads as a stutter rather than
  // as a smaller lattice.
  let linesSuppressed = false;
  let atomCap = MAX_ATOMS;

  // Order parameter: 0 above the transition (B-sites centred), 1 below it
  // (displaced coherently, so the cell carries a dipole). This is the whole
  // point of the animation, so it is a real number the draw reads, not a flag.
  let order = 0;
  let transitionAt = null;

  const linesOn = () => settings.showLines && !linesSuppressed;

  /** Density 20..120 maps to lattice spacing, sparse to dense. */
  function spacingFor(density) {
    const t = (clamp(density, 20, 120) - 20) / 100;
    return SPACING_SPARSE + t * (SPACING_DENSE - SPACING_SPARSE);
  }

  /**
   * Lay out a square lattice: A-sites on the grid points, one B-site in the
   * middle of every cell. Spacing is solved from the atom budget rather than
   * fixed, so the density slider thins the crystal instead of cropping it.
   */
  function build() {
    const budget = Math.min(MAX_ATOMS, atomCap);
    let s = spacingFor(settings.density);

    // Two extra rows and columns so the lattice runs past the viewport edge;
    // a crystal that stops short of the frame reads as a texture swatch.
    // Spacing only ever widens from here, and only to stay inside the atom
    // budget — which is what keeps a 4K display from building 1900 atoms.
    for (let i = 0; i < 8; i++) {
      cols = Math.max(2, Math.floor(width / s) + 2);
      rows = Math.max(2, Math.floor(height / s) + 2);
      const total = cols * rows + (cols - 1) * (rows - 1);
      if (total <= budget) break;
      s *= Math.sqrt(total / budget);
    }
    spacing = s;

    const offX = (width - (cols - 1) * s) / 2;
    const offY = (height - (rows - 1) * s) / 2;

    // Thermal motion: every atom oscillates about its own site with its own
    // phase and rate, so the lattice shimmers rather than pulsing in unison.
    const site = (x, y, r) => ({
      x,
      y,
      hx: x,
      hy: y,
      r,
      px: Math.random() * Math.PI * 2,
      py: Math.random() * Math.PI * 2,
      fx: 0.6 + Math.random() * 0.5,
      fy: 0.6 + Math.random() * 0.5,
    });

    aSites = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aSites.push(
          site(offX + c * s, offY + r * s, 3.2 + Math.random() * 0.6),
        );
      }
    }

    bSites = [];
    bonds = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const b = site(
          offX + (c + 0.5) * s,
          offY + (r + 0.5) * s,
          2.1 + Math.random() * 0.5,
        );
        const index = bSites.push(b) - 1;
        // Corner A-sites of this cell. Displacing B stretches two of these
        // bonds and compresses the other two, which is what makes the
        // transition legible rather than merely decorative.
        bonds.push(
          index,
          r * cols + c,
          index,
          r * cols + c + 1,
          index,
          (r + 1) * cols + c,
          index,
          (r + 1) * cols + c + 1,
        );
      }
    }
  }

  /** Size the backing store for the display, capped at MAX_DPR. */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // Draw in CSS pixels; the transform maps them onto the backing store.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Move every atom to where it sits at time `t`, given the current order. */
  function settle(t) {
    const amp = Math.min(JITTER_PX, spacing * 0.08);
    const dx = POLARIZATION.x * DISPLACEMENT * spacing * order;
    const dy = POLARIZATION.y * DISPLACEMENT * spacing * order;

    for (const a of aSites) {
      a.x = a.hx + Math.sin(t * a.fx + a.px) * amp;
      a.y = a.hy + Math.cos(t * a.fy + a.py) * amp;
    }
    for (const b of bSites) {
      b.x = b.hx + Math.sin(t * b.fx + b.px) * amp + dx;
      b.y = b.hy + Math.cos(t * b.fy + b.py) * amp + dy;
    }
  }

  function drawBonds() {
    ctx.lineWidth = 1.5;

    // The A–A grid, batched into a single path. It is what makes the thing
    // read as a lattice rather than a scatter, so it is no longer at 0.06,
    // where it was invisible.
    ctx.strokeStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.1)`;
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const p = aSites[r * cols + c];
        const q = aSites[r * cols + c + 1];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 1; r++) {
        const p = aSites[r * cols + c];
        const q = aSites[(r + 1) * cols + c];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
      }
    }
    ctx.stroke();

    /*
     * A–B bonds, brightest where the bond is compressed. Above the transition
     * all four in a cell are equal; below it they split into two bright and
     * two faint, which is the polarization becoming visible.
     *
     * Quantised into BOND_BUCKETS opacity steps and stroked once per step. A
     * stroke() per bond would be ~750 calls a frame on a dense lattice; this
     * is six regardless of how many atoms there are, which is what lets the
     * density go up at all.
     */
    for (const bucket of bondBuckets) bucket.length = 0;

    const rest = spacing * 0.7071; // centre-to-corner at rest
    for (let i = 0; i < bonds.length; i += 2) {
      const b = bSites[bonds[i]];
      const a = aSites[bonds[i + 1]];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const strain = clamp(
        (rest - Math.sqrt(dx * dx + dy * dy)) / (rest * 0.5),
        -1,
        1,
      );
      const k = clamp(
        Math.floor(((strain + 1) / 2) * BOND_BUCKETS),
        0,
        BOND_BUCKETS - 1,
      );
      bondBuckets[k].push(b.x, b.y, a.x, a.y);
    }

    for (let k = 0; k < BOND_BUCKETS; k++) {
      const seg = bondBuckets[k];
      if (!seg.length) continue;
      const opacity = BOND_MIN + ((k + 0.5) / BOND_BUCKETS) * BOND_RANGE;
      ctx.strokeStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${opacity})`;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) {
        ctx.moveTo(seg[i], seg[i + 1]);
        ctx.lineTo(seg[i + 2], seg[i + 3]);
      }
      ctx.stroke();
    }
  }

  function drawFrame(t) {
    settle(t);
    ctx.clearRect(0, 0, width, height);
    if (linesOn()) drawBonds();

    ctx.globalAlpha = PARTICLE_ALPHA;
    ctx.fillStyle = `rgb(${accent[0]}, ${accent[1]}, ${accent[2]})`;
    for (const a of aSites) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The displaced species is the one carrying the dipole, so it is the one
    // that brightens as the order parameter rises.
    ctx.globalAlpha = PARTICLE_ALPHA * (0.7 + 0.3 * order);
    for (const b of bSites) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── frame loop and FPS sampling ────────────────────────────────────── */

  let frames = 0;
  // null, not 0: a legitimate first timestamp of 0 read as "unset" under a
  // falsy check, so the window restarted on every frame and the sample never
  // completed — auto-tune could never fire.
  let sampleStart = null;

  function sampleFps(now) {
    frames++;
    if (sampleStart === null) sampleStart = now;
    if (now - sampleStart < 1000) return;

    const fps = (frames * 1000) / (now - sampleStart);
    frames = 0;
    sampleStart = now;

    if (!settings.autoTune || fps >= FPS_FLOOR) return;

    // Bonds are the expensive half, so they go first.
    if (linesOn()) {
      linesSuppressed = true;
      return;
    }
    const atoms = aSites.length + bSites.length;
    if (atoms > MIN_AUTOTUNE_ATOMS) {
      atomCap = Math.max(MIN_AUTOTUNE_ATOMS, Math.floor(atoms * 0.8));
      build();
    }
  }

  const easeInOut = (p) =>
    p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  function loop(now) {
    animFrameId = requestAnimationFrame(loop);
    sampleFps(now);

    // One orchestrated moment: the lattice sits above the transition for a
    // beat after load, then every B-site slides off-centre together.
    if (transitionAt === null) transitionAt = now + TRANSITION_DELAY;
    order = easeInOut(clamp((now - transitionAt) / TRANSITION_MS, 0, 1));

    drawFrame((now / 1000) * (settings.speed / PARTICLE_DEFAULTS.speed));
  }

  function stop() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  /**
   * Start animating, or — when the visitor prefers reduced motion — paint one
   * static frame and leave it. The lattice stays visible and already in its
   * displaced state; it simply does not move or transition.
   */
  function start() {
    stop();
    frames = 0;
    sampleStart = null;
    if (reduceMotion.matches) {
      order = 1;
      drawFrame(0);
    } else {
      transitionAt = null;
      animFrameId = requestAnimationFrame(loop);
    }
  }

  /** Re-read settings that changed, then repaint. */
  function apply() {
    // A manual change is a fresh start for the tuner: honour the new intent
    // rather than keeping a cap inferred from the old one.
    linesSuppressed = false;
    atomCap = MAX_ATOMS;
    build();
    if (reduceMotion.matches) {
      order = 1;
      drawFrame(0);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  reduceMotion.addEventListener("change", start);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      build();
      if (reduceMotion.matches) drawFrame(0);
    }, 150);
  });

  resize();
  build();
  start();

  return {
    settings,
    apply,
    refreshTheme() {
      accent = readAccentRgb();
      if (reduceMotion.matches) drawFrame(0);
    },
    save() {
      try {
        localStorage.setItem(PARTICLE_STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Private mode or a full quota — the settings just do not persist.
      }
    },
  };
}

/* ── Background settings panel ────────────────────────────────────────── */

/*
 * Built in JavaScript rather than authored into each page: it controls a
 * JS-only feature, so without JS there is nothing for it to control, and this
 * keeps four copies of the same form markup out of the HTML.
 *
 * Collapsed by default — "small floating panel" should not mean a control
 * surface parked permanently on top of the content.
 */
function initBackgroundPanel(background) {
  if (!background) return;
  const { settings } = background;

  const panel = document.createElement("div");
  panel.className = "fx-panel";
  panel.innerHTML =
    `<button type="button" class="fx-panel-toggle" aria-expanded="false"` +
    ` aria-controls="fx-panel-body" aria-label="Background animation settings"` +
    ` title="Background animation settings">` +
    `<svg viewBox="0 0 24 24" class="fx-panel-icon" aria-hidden="true">` +
    `<path fill="currentColor" d="M4 7h9v2H4V7zm13 0h3v2h-3V7zM4 15h3v2H4v-2zm7 0h9v2h-9v-2z"/>` +
    `<circle cx="15" cy="8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>` +
    `<circle cx="9" cy="16" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>` +
    `</svg></button>` +
    `<div class="fx-panel-body" id="fx-panel-body" hidden>` +
    `<p class="fx-panel-title">Background</p>` +
    `<label class="fx-field" for="fx-density">Density` +
    `<input type="range" id="fx-density" min="20" max="120" step="1"></label>` +
    `<label class="fx-field" for="fx-speed">Speed` +
    `<input type="range" id="fx-speed" min="10" max="100" step="1"></label>` +
    `<label class="fx-check" for="fx-lines">` +
    `<input type="checkbox" id="fx-lines">Connection lines</label>` +
    `<label class="fx-check" for="fx-autotune">` +
    `<input type="checkbox" id="fx-autotune">Auto-tune</label>` +
    `<button type="button" class="fx-reset" id="fx-reset">Reset to defaults</button>` +
    `</div>`;
  document.body.appendChild(panel);

  const toggle = panel.querySelector(".fx-panel-toggle");
  const body = panel.querySelector(".fx-panel-body");
  const density = panel.querySelector("#fx-density");
  const speed = panel.querySelector("#fx-speed");
  const lines = panel.querySelector("#fx-lines");
  const autoTune = panel.querySelector("#fx-autotune");

  const sync = () => {
    density.value = String(settings.density);
    speed.value = String(settings.speed);
    lines.checked = settings.showLines;
    autoTune.checked = settings.autoTune;
  };
  sync();

  toggle.addEventListener("click", () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  const commit = () => {
    background.apply();
    background.save();
  };

  density.addEventListener("input", () => {
    settings.density = Number(density.value);
    commit();
  });
  speed.addEventListener("input", () => {
    settings.speed = Number(speed.value);
    commit();
  });
  lines.addEventListener("change", () => {
    settings.showLines = lines.checked;
    commit();
  });
  autoTune.addEventListener("change", () => {
    settings.autoTune = autoTune.checked;
    commit();
  });

  panel.querySelector("#fx-reset").addEventListener("click", () => {
    Object.assign(settings, PARTICLE_DEFAULTS);
    sync();
    commit();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !body.hidden) {
      body.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });
}

/* ── CV download link ─────────────────────────────────────────────────── */

/**
 * The CV is an optional file that may not be committed yet. Its button starts
 * hidden and is revealed only once a HEAD request confirms the file is really
 * there, so a visitor is never offered a link that 404s.
 *
 * Failing closed is deliberate: if the probe errors, the button stays hidden.
 */
function initCvLink() {
  // Two of them now: one in the sticky header, one in the hero. A single
  // probe reveals both rather than one HEAD request each.
  const links = [...document.querySelectorAll("[data-cv-link]")];
  if (!links.length) return;

  fetch(links[0].href, { method: "HEAD" })
    .then((response) => {
      if (!response.ok) return;
      for (const link of links) {
        (link.closest(".hero-cv") || link).hidden = false;
      }
    })
    .catch(() => {
      // Offline, or the request was blocked — the buttons stay hidden.
    });
}

/* ── Theme toggle ─────────────────────────────────────────────────────── */

// `name` is the stored key, so it stays stable; `next` is what the button says.
const THEMES = [
  { name: "atomic", icon: "i-moon", next: "light theme" },
  { name: "light", icon: "i-sun", next: "high contrast" },
  { name: "contrast", icon: "i-adjust", next: "dark theme" },
];

function initTheme(background) {
  const button = document.getElementById("theme-toggle");
  const iconRef = button?.querySelector("svg use");

  function apply(name) {
    const theme = THEMES.find((t) => t.name === name) || THEMES[0];
    document.body.setAttribute("data-theme", theme.name);

    if (iconRef) iconRef.setAttribute("href", `#${theme.icon}`);
    if (button) {
      const label = `Switch to ${theme.next}`;
      button.title = label;
      button.setAttribute("aria-label", label);
    }

    // The particle network reads --accent-rgb, so it has to re-tint when the
    // theme changes or it keeps the previous palette's coral.
    background?.refreshTheme();
  }

  const saved = localStorage.getItem("theme");
  apply(THEMES.some((t) => t.name === saved) ? saved : "atomic");

  button?.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    const index = THEMES.findIndex((t) => t.name === current);
    const next = THEMES[(index + 1) % THEMES.length];
    apply(next.name);
    localStorage.setItem("theme", next.name);
  });
}

/* ── Mobile navigation ────────────────────────────────────────────────── */

function initNav() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (!hamburger || !navLinks) return;

  // Must match the drawer breakpoint in style.css. Off-screen links stayed in
  // the tab order, so keyboard users walked through a menu they could not see.
  const drawer = window.matchMedia("(max-width: 767.98px)");

  const setOpen = (open) => {
    navLinks.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
    // Without this the page behind the drawer scrolls under your finger.
    document.body.classList.toggle("nav-open", open);
    // `inert` rather than aria-hidden: html-validate's hidden-focusable rule
    // rejects aria-hidden on a container holding focusable links, and inert
    // removes them from the tab order as well as the accessibility tree.
    navLinks.inert = drawer.matches && !open;
  };

  hamburger.addEventListener("click", () => {
    setOpen(!navLinks.classList.contains("active"));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !navLinks.classList.contains("active"))
      return;
    setOpen(false);
    // Focus was inside the drawer we just made inert; send it somewhere real.
    hamburger.focus();
  });

  // Resizing past the breakpoint with the drawer open would otherwise leave
  // the desktop nav stuck in its open state, or an inert nav on desktop.
  drawer.addEventListener("change", () => setOpen(false));

  setOpen(false);
}

/* ── Scroll spy ───────────────────────────────────────────────────────── */

/**
 * Highlights the nav link for whichever section is currently in view.
 *
 * IntersectionObserver rather than a scroll handler: no listener firing on
 * every frame, and the browser does the geometry. The root margin pulls the
 * detection band down past the sticky header and up from the bottom, so the
 * active link tracks the section you are actually reading rather than whatever
 * is clipping the viewport edge.
 */
function initScrollSpy() {
  /*
   * Only same-page anchors take part. research.html marks its own nav link
   * with aria-current="page" in the markup, and a spy that cleared every
   * aria-current on scroll would strip it.
   */
  const links = new Map();
  for (const link of document.querySelectorAll('.nav-links a[href^="#"]')) {
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const section = id && document.getElementById(id);
    if (section) links.set(section, link);
  }
  if (!links.size || typeof IntersectionObserver === "undefined") return;

  let active = null;
  const setActive = (link) => {
    if (link === active) return;
    active?.classList.remove("is-active");
    active?.removeAttribute("aria-current");
    active = link || null;
    if (!active) return;
    active.classList.add("is-active");
    // "page" rather than "true": these links navigate to a location, and a
    // screen reader announces "current page" for them.
    active.setAttribute("aria-current", "page");
  };

  const visible = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      // Several sections can straddle the band at once; the topmost wins.
      const top = [...visible].sort(
        (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
      )[0];
      setActive(top ? links.get(top) : null);
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
  );

  for (const section of links.keys()) observer.observe(section);
}

/* ── Boot ─────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  const background = initBackground();
  initBackgroundPanel(background);
  initTheme(background);
  initNav();
  initCvLink();
  initScrollSpy();

  const yearEl = document.getElementById("copyright-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Pages without portfolio content (e.g. the cookie policy) simply skip this.
  if (typeof portfolioData === "undefined") return;

  if (!validatePortfolioData(portfolioData)) {
    const name = document.getElementById("profile-name");
    const summary = document.getElementById("profile-summary");
    if (name) name.textContent = "Error Loading Portfolio";
    if (summary)
      summary.textContent =
        "Unable to load portfolio data. Please refresh the page.";
    return;
  }

  renderProfile(portfolioData.profile);
  renderSections(portfolioData);
  renderPublicationsMeta(portfolioData.publications);
  renderResearch(portfolioData);
});
