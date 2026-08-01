# mukeshkhanore.github.io

Personal academic portfolio. Plain HTML, CSS and JavaScript, no framework.
GitHub Pages serves `main` directly. Two generated artefacts are committed —
the icon sprite and the pre-rendered HTML — both produced by `npm run build`.

## Updating content

Almost every change is an edit to **`Assets/data.js`**. That file is the single
source of truth for the profile, experience, education, publications,
activities, certificates, projects, skills and teaching sections.

After editing it, run:

```bash
npm run build      # regenerates the icon sprite and re-renders index.html
```

then commit both `Assets/data.js` and `index.html`. CI fails if you forget —
see _Pre-rendering_ below for why the HTML is generated rather than empty.

Adding a publication, for example:

```js
"publications": [
  {
    "type": "presentation",        // or omit for a journal article
    "title": "…",
    "meta": "Conference, City, 2026",
    "authors": "M. Khanore, …",
    "description": "…",
    "url": "https://…"
  },
  …
]
```

`type: "presentation"` marks the entry's year rail with `--mark-color` and
labels it _presentation_; anything else reads as _journal_. The year shown in
the rail is parsed out of `meta`, so keep the `(YYYY)` in the venue string.

### Adding a whole new section

Three small edits:

1. **`Assets/data.js`** — add the array of items.
2. **`Assets/script.js`** — add an entry to `SECTION_SPECS`. Either map each
   item onto a card descriptor with `card` (`title`, `meta`, `body`, `list`,
   `tags`, `href`, …) and share `renderCard`, or supply `render` to emit your
   own markup when the content is not card-shaped. Publications and experience
   use `render`: a bibliography and a chronology are not cards.
3. **`index.html`** — add a `<section>` containing a grid `<div>` whose `id`
   matches the `grid` name in the spec, plus a nav link.

### The CV

The hero links to `Assets/Mukesh_Khanore_CV.pdf`. The button ships with the
`hidden` attribute and `initCvLink()` reveals it only after a `HEAD` request
confirms the file is really there — so the button simply does not appear until
you commit the PDF, and never offers a link that 404s. The probe fails closed:
if it errors, the button stays hidden.

To add or replace it:

1. Put the file at `Assets/Mukesh_Khanore_CV.pdf` (exact case — GitHub Pages is
   case-sensitive). Nothing else needs editing.
2. Delete the CV exclusion line from `lychee.toml` so CI starts checking it.

Note that the PDF is **not** the source of the page's content. Nothing reads
it. Experience, education and publications all come from `Assets/data.js`, so
updating your CV means editing both the PDF and that file.

## Checks

```bash
npm install
npm run build      # icon sprite + pre-rendered HTML
npm run check      # formatting, HTML, icons, pre-render, hashes, smoke test
npm test           # render smoke test on its own
npm run format     # apply Prettier
npm run serve      # http://localhost:8000
```

Requires Node 18 or newer. CI runs `npm ci` against the committed
`package-lock.json`, so the toolchain in the runner is exactly what is pinned.

### Pre-rendering

`scripts/prerender.js` writes the rendered content of `data.js` straight into
`index.html`. Without it the page ships eight empty `<div>`s and every
publication exists only after JavaScript runs — invisible to crawlers,
archivers, citation scrapers and reader modes, which is the wrong trade for a
publication list.

It runs the **real** `Assets/script.js` against a DOM stub, so there is one
renderer and the server and client output cannot drift. The client still
re-renders on load, so the JS remains a progressive layer. `--check` mode fails
CI when `index.html` is stale relative to `data.js`.

### Icons

`scripts/build-icons.js` generates `Assets/icons.svg`, a sprite holding only
the icons actually referenced, and keeps the `ICON_IDS` allow-list in
`script.js` in sync. This replaced the FontAwesome CDN stylesheet — 102KB of
CSS plus webfonts for 17 glyphs — with roughly 9KB inlined, and removed a
third-party origin from the CSP.

The same checks run in GitHub Actions on every push and weekly on a schedule.

### Hash verification

`scripts/check-integrity.js` guards two things that fail silently in browsers:

- **SRI hashes** on CDN resources. If a pinned hash does not match the file the
  CDN actually serves, the browser blocks it silently — which is how this site
  once lost every icon. No pinned CDN resource remains today, so this check is
  dormant; it starts working again the moment one is added.
- **The inline JSON-LD block** in `index.html`. The Content Security Policy has
  no `'unsafe-inline'` for scripts, so that block is allowed by its `sha256`
  hash. Editing the JSON-LD invalidates the hash.

Both are repaired automatically:

```bash
npm run sri        # rewrites stale hashes in place
```

### Render smoke test

`scripts/render-smoke-test.js` runs the real `data.js` through the real
`script.js` against a DOM stub and asserts that every section renders the
expected number of cards, that no card has an empty heading, that no `url`
field collapsed to `"#"`, and that every grid in `index.html` is claimed by a
`SECTION_SPECS` entry. A typo in `data.js` fails here rather than on the live
page.

## Privacy and analytics

Google Analytics 4 runs under [Consent Mode
v2](https://developers.google.com/tag-platform/security/guides/consent). Every
storage category except `security_storage` starts **denied**; CookieFirst
raises them only after the visitor accepts. Load order in `<head>` matters and
is commented in `index.html`:

1. CookieFirst `consent.js`
2. `Assets/analytics.js` — sets the denied-by-default state
3. `gtag.js` (async)

Changing that order would let a tag fire before consent is known.

## Security notes

- CSP is delivered via `<meta>` because GitHub Pages cannot set response
  headers. `frame-ancestors` and HSTS are therefore unavailable; everything
  else applies normally.
- `style-src` keeps `'unsafe-inline'` because the CookieFirst banner styles
  itself inline and a static host cannot issue a nonce. `script-src` does not.
- All values from `data.js` are escaped before rendering: `esc()` for text and
  attributes, `safeUrl()` for `href` (which drops anything that is not
  `http`, `https` or `mailto`), and `icon()`, which resolves names against the
  `ICON_IDS` allow-list rather than interpolating them.
- Icons are local. Removing the FontAwesome CDN dropped an executing
  third-party origin; `consent-eu.cookiefirst.com` and `googletagmanager.com`
  remain and cannot be SRI-pinned, since both serve per-site dynamic scripts.
