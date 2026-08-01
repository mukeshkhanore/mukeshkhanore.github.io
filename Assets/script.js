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

  const { name, titles, bio } = data.profile;
  if (!name || !titles || !bio) {
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
  { title: "Languages & Packages", key: "languages", style: "pills" },
  { title: "ML Tools", key: "ml_tools", style: "pills" },
  { title: "Numerical Techniques", key: "numerical", style: "list" },
  { title: "Cloud & Tools", key: "cloud", style: "list" },
];

/** Publication years live inside the venue string, e.g. "AIP Advances (2025)". */
function yearOf(meta) {
  const s = String(meta ?? "");
  const parens = /\((\d{4})\)/.exec(s);
  if (parens) return parens[1];
  const loose = /\b(?:19|20)\d{2}\b/.exec(s);
  return loose ? loose[0] : "";
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
const SECTION_SPECS = {
  publications: {
    grid: "publications-grid",
    /*
     * Sorted newest first on the way out rather than in data.js, so the file
     * stays a plain curated list. A year rail that runs 2025, 2022, 2026 reads
     * as a rendering bug, so the display order has to match the device.
     * Entries with no parseable year fall to the bottom.
     */
    transform: (items) =>
      [...items].sort(
        (a, b) => Number(yearOf(b.meta) || 0) - Number(yearOf(a.meta) || 0),
      ),
    render: (items) =>
      `<ol class="biblio">` +
      items
        .map((item) => {
          const isTalk = item.type === "presentation";
          const year = yearOf(item.meta);
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
            `<p class="biblio-venue">${esc(item.meta)}` +
            `<span class="biblio-kind">${isTalk ? "presentation" : "journal"}</span></p>` +
            (item.description
              ? `<p class="biblio-note">${esc(item.description)}</p>`
              : "") +
            `</div></li>`
          );
        })
        .join("") +
      `</ol>`,
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

function renderProfile(profile) {
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  set("profile-name", profile.name);
  set("profile-statement", profile.statement);
  set("profile-titles", profile.titles);
  set("profile-bio", profile.bio);

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

/* ── Background particle animation ────────────────────────────────────── */

const MAX_PARTICLES = 120;

function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let particles = [];
  let animFrameId = null;

  // data-theme lives on <body>, so the accent must be read from there — reading
  // from documentElement always returns the :root default.
  function accentRgb() {
    const hex = getComputedStyle(document.body)
      .getPropertyValue("--accent-color")
      .trim();
    const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    // Fallback must track the :root --accent-color, or an unparseable value
    // would draw particles in a colour the palette no longer contains.
    return match
      ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
      : [82, 209, 184];
  }

  let accent = accentRgb();

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.directionX = Math.random() * 0.6 - 0.3;
      this.directionY = Math.random() * 0.6 - 0.3;
      this.size = Math.random() * 3 + 2; // 2–5 px
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = `rgb(${accent[0]}, ${accent[1]}, ${accent[2]})`;
      ctx.fill();
      ctx.restore();
    }

    update() {
      if (this.x > canvas.width || this.x < 0) this.directionX *= -1;
      if (this.y > canvas.height || this.y < 0) this.directionY *= -1;
      this.x += this.directionX;
      this.y += this.directionY;
      this.draw();
    }
  }

  function connect() {
    const threshold = (canvas.width / 6) * (canvas.height / 6);
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const distance = dx * dx + dy * dy;
        if (distance >= threshold) continue;

        // Fade across the cull radius. This used to divide by a fixed 25000
        // while the radius scales with the viewport, so above roughly
        // 1000x900 the alpha went negative — an invalid rgba() string, which
        // browsers ignore, leaving the line whatever colour was set last.
        const opacity = (1 - distance / threshold) * 0.2;
        ctx.strokeStyle = `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, ${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(particles[a].x, particles[a].y);
        ctx.lineTo(particles[b].x, particles[b].y);
        ctx.stroke();
      }
    }
  }

  function seed() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const count = Math.min(
      Math.floor((canvas.height * canvas.width) / 10000),
      MAX_PARTICLES,
    );
    particles = Array.from({ length: count }, () => new Particle());
  }

  function drawFrame(move) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const particle of particles) {
      if (move) particle.update();
      else particle.draw();
    }
    connect();
  }

  function stop() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function loop() {
    animFrameId = requestAnimationFrame(loop);
    drawFrame(true);
  }

  /** Animate, or draw a single static frame when the visitor prefers less motion. */
  function start() {
    stop();
    if (reduceMotion.matches) drawFrame(false);
    else loop();
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
      seed();
      start();
    }, 150);
  });

  seed();
  start();

  return {
    refreshTheme() {
      accent = accentRgb();
      if (reduceMotion.matches) drawFrame(false);
    },
  };
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
  const link = document.getElementById("cv-link");
  if (!link) return;

  const container = link.closest(".hero-cv") || link;

  fetch(link.href, { method: "HEAD" })
    .then((response) => {
      if (response.ok) container.hidden = false;
    })
    .catch(() => {
      // Offline, or the request was blocked — leave the button hidden.
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

  const setOpen = (open) => {
    navLinks.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
  };

  hamburger.addEventListener("click", () => {
    setOpen(!navLinks.classList.contains("active"));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

/* ── Boot ─────────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
  const background = initBackground();
  initTheme(background);
  initNav();
  initCvLink();

  const yearEl = document.getElementById("copyright-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Pages without portfolio content (e.g. the cookie policy) simply skip this.
  if (typeof portfolioData === "undefined") return;

  if (!validatePortfolioData(portfolioData)) {
    const name = document.getElementById("profile-name");
    const bio = document.getElementById("profile-bio");
    if (name) name.textContent = "Error Loading Portfolio";
    if (bio)
      bio.textContent =
        "Unable to load portfolio data. Please refresh the page.";
    return;
  }

  renderProfile(portfolioData.profile);
  renderSections(portfolioData);
});
