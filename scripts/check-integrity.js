#!/usr/bin/env node
/**
 * Verifies the two kinds of hash this site depends on:
 *
 *   1. SRI hashes on <link>/<script> tags pointing at a CDN — downloads the
 *      real file and confirms the pinned hash still matches. A stale hash
 *      silently blocks the resource in every browser.
 *
 *   2. sha256 hashes of inline <script type="application/ld+json"> blocks —
 *      confirms the CSP in the same file allows the block it actually
 *      contains. Editing the JSON-LD without updating the CSP would get it
 *      blocked under a policy that has no 'unsafe-inline'.
 *
 * Usage:
 *   node scripts/check-integrity.js          # verify, exit 1 on mismatch
 *   node scripts/check-integrity.js --fix    # rewrite hashes in place
 *
 * Deliberately dependency-free so it runs anywhere without an install step.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const HTML_FILES = ["index.html", "cookie-policy.html", "404.html"];
const FIX = process.argv.includes("--fix");

let failures = 0;
const note = (msg) => console.log("  " + msg);
const fail = (msg) => {
  failures++;
  console.log("  FAIL " + msg);
};

/* ── helpers ──────────────────────────────────────────────────────────── */

function download(url, redirectsLeft) {
  if (redirectsLeft === undefined) redirectsLeft = 5;
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "check-integrity" } }, (res) => {
        const status = res.statusCode;
        if (status >= 300 && status < 400 && res.headers.location) {
          if (redirectsLeft === 0)
            return reject(new Error("too many redirects"));
          res.resume();
          return resolve(download(res.headers.location, redirectsLeft - 1));
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error("HTTP " + status));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

const digest = (algo, buf) =>
  algo + "-" + crypto.createHash(algo).update(buf).digest("base64");

/* ── 1. Subresource Integrity ─────────────────────────────────────────── */

// Matches any tag carrying both an integrity attribute and a remote href/src.
const SRI_TAG = /<(?:link|script)\b[^>]*?\bintegrity="([^"]+)"[^>]*>/g;
const URL_ATTR = /\b(?:href|src)="(https:\/\/[^"]+)"/;

async function checkSri(file, source) {
  let updated = source;
  let match;
  SRI_TAG.lastIndex = 0;

  while ((match = SRI_TAG.exec(source)) !== null) {
    const tag = match[0];
    const pinned = match[1].trim();
    const urlMatch = URL_ATTR.exec(tag);
    if (!urlMatch) continue;

    const url = urlMatch[1];
    const algo = pinned.split("-")[0];
    if (["sha256", "sha384", "sha512"].indexOf(algo) === -1) {
      fail(file + ": unsupported SRI algorithm " + algo);
      continue;
    }

    let body;
    try {
      body = await download(url);
    } catch (err) {
      fail(file + ": could not fetch " + url + " (" + err.message + ")");
      continue;
    }

    const actual = digest(algo, body);
    if (actual === pinned) {
      note("ok   SRI " + url);
    } else if (FIX) {
      updated = updated.replace(pinned, actual);
      note("fixed SRI " + url);
    } else {
      fail(file + ": SRI mismatch for " + url);
      note("     pinned: " + pinned);
      note("     actual: " + actual);
    }
  }

  return updated;
}

/* ── 2. Inline JSON-LD vs CSP ─────────────────────────────────────────── */

const LD_BLOCK = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

function checkJsonLd(file, source) {
  let updated = source;
  let match;
  LD_BLOCK.lastIndex = 0;

  while ((match = LD_BLOCK.exec(source)) !== null) {
    const content = match[1];

    try {
      JSON.parse(content);
    } catch (err) {
      fail(file + ": JSON-LD block is not valid JSON (" + err.message + ")");
      continue;
    }

    const expected = digest("sha256", Buffer.from(content, "utf8"));

    if (updated.indexOf("'" + expected + "'") !== -1) {
      note("ok   JSON-LD hash present in CSP");
      continue;
    }

    if (FIX) {
      // Replace whichever sha256 token or placeholder is currently in the CSP.
      const stale =
        /'(?:sha256-[A-Za-z0-9+/=]+|sha256-JSONLD_HASH_PLACEHOLDER)'/;
      if (stale.test(updated)) {
        updated = updated.replace(stale, "'" + expected + "'");
        note("fixed JSON-LD hash -> " + expected);
      } else {
        fail(file + ": no sha256 slot in CSP to update; add one manually");
        note("     needed: '" + expected + "'");
      }
    } else {
      fail(file + ": CSP does not allow this JSON-LD block");
      note("     needed: '" + expected + "'");
    }
  }

  return updated;
}

/* ── main ─────────────────────────────────────────────────────────────── */

async function main() {
  for (const file of HTML_FILES) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;

    console.log(file);
    const original = fs.readFileSync(full, "utf8");
    let source = checkJsonLd(file, original);
    source = await checkSri(file, source);

    if (FIX && source !== original) {
      fs.writeFileSync(full, source);
    }
  }

  if (failures > 0) {
    console.log("\n" + failures + " problem(s) found.");
    if (!FIX) console.log("Run `node scripts/check-integrity.js --fix`.");
    process.exit(1);
  }
  console.log("\nAll integrity hashes match.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
