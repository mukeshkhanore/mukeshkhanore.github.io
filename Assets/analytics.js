/**
 * Google Analytics 4 with Consent Mode v2.
 *
 * Load order in <head> matters:
 *   1. CookieFirst consent.js  — renders the banner, owns the consent state
 *   2. this file               — sets consent defaults BEFORE any tag fires
 *   3. gtag.js (async)         — reads those defaults on execution
 *
 * Everything except strictly necessary storage starts denied, so no analytics
 * cookie is written until the visitor opts in.
 */

const GA_MEASUREMENT_ID = "G-TEYETSEN4Z";

window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
  wait_for_update: 500,
});

gtag("js", new Date());
gtag("config", GA_MEASUREMENT_ID);

/** Map a CookieFirst consent object onto Consent Mode signals. */
function syncConsent(consent) {
  if (!consent) return;
  const allow = (granted) => (granted ? "granted" : "denied");

  gtag("consent", "update", {
    ad_storage: allow(consent.advertising),
    ad_user_data: allow(consent.advertising),
    ad_personalization: allow(consent.advertising),
    analytics_storage: allow(consent.performance),
    functionality_storage: allow(consent.functional),
    personalization_storage: allow(consent.functional),
  });
}

// cf_init fires once CookieFirst has loaded a stored choice; cf_consent fires
// whenever the visitor changes it.
window.addEventListener("cf_init", (event) => syncConsent(event.detail));
window.addEventListener("cf_consent", (event) => syncConsent(event.detail));

// Covers the case where CookieFirst finished before this listener was attached.
if (window.CookieFirst && window.CookieFirst.consent) {
  syncConsent(window.CookieFirst.consent);
}
