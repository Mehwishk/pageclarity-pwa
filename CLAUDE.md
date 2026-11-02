# PageClarity — Full App Context

What this app does, how it works, and how to continue building it

## What PageClarity Is

**PageClarity** is a mobile-first PWA for parents who want to know what's in a book before their child reads it. Parents scan a book's ISBN barcode or cover photo, or type a title, and the app returns a breakdown of 6 content categories — Violence, Sexual Content, Language, Substance Use, LGBTQ+ Themes, Mature Themes — each rated by presence and intensity.

Results are filtered through a **Profile Lens**: a parent sets up a child profile with age range and a values preset (Conservative / Moderate / Custom). The same book analysis is always the same facts — only which flags get *emphasized* changes per profile. A parent can also scan without an account in guest mode with a one-time setup.

**Target users:** Religious / values-conscious parents, elementary/middle school age children. App must be COPPA-compliant (no child data collected).

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5.4.1 + vite-plugin-pwa (offline PWA)
- **Fonts:** Google Fonts — Inter (sans) + Lora (serif)
- **Styling:** Single `src/index.css` — no CSS framework, pure custom properties
- **State:** React `useState` + `localStorage` for auth, profiles, accessibility prefs
- **No backend yet** — all data is mocked/hardcoded; APIs are next milestone
- **Dev:** `npm run dev` → localhost:5173 | **Build:** `npm run build`

## File Locations

```
Repo: github.com/Mehwishk/pageclarity-pwa (branch: main)

  src/App.tsx          <- ALL screens as React components (single file)
  src/main.tsx         <- React entry point
  src/index.css        <- ALL styles (append CSS fixes at the bottom). NOTE: currently the
                          minified one-line version recovered from the build output.
  src/assets/pageclarity-logo-mark.svg  <- teal rounded-square logo
  public/              <- PWA icons
  vite.config.ts       <- PWA manifest lives here (vite-plugin-pwa)
  index.html           <- app shell
```

## Commands

- `npm run dev` -> localhost:5173
- `npm run build` -> installable PWA in `dist/`
- `npm run build:preview` -> static preview in `preview-dist/` (relative paths, no service worker),
  used to publish the shareable preview link

## CSS System

```
:root {
  --teal: #1C7A6E;        /* primary brand */
  --teal-light: #2A9D8F;
  --mint: #E8F5F3;        /* light teal background */
  --ink: #111827;         /* headings */
  --mid: #6B7280;         /* secondary text */
  --rule: #E5EEF2;        /* borders */
  --bg: #FFFFFF;
  --surface: #FFFFFF;
  --navy: #0D1E28;        /* dark editorial cards */
  --sky: #2AB5CC;         /* accent blue */
  --amber: #F5B940;       /* accent yellow */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Lora', Georgia, serif;
}
```

## Screen Map — All Screens & Components

**home** Logo, hero, scan trigger, ISBN search field, "On parents' shelves" chips. Tab bar at bottom.

.home-screen .home-header .hero .scan-stage .finder .shelf-section

**guestSetup** One-time setup: pick age + per-category sensitivity. No account created.

.guest-setup-screen .guest-setup-scroll .guest-question .age-grid

**loading** Spinner with animated steps while "analysis" runs (2.2 s timer → results).

.loading-screen .loader .loading-steps

**results ✓** Book result: cover, clarity score, 6-tile content spectrum, editorial note, discussion starters, trust block, compare link. Bottom sheets: flag detail, profile lens switcher, feedback form.

.results-screen .clarity-strip .spectrum .spectrum-tile .flag-sheet .profile-sheet

**history** List of previously scanned books. Tab bar at bottom.

.history-screen .history-list .history-card

**settings ✓** Account card (guest → sign-up CTA / logged-in → parent info), child profile list, app menu (Accessibility, Privacy, Sources). Tab bar at bottom.

.settings-overview .guest-account-card .parent-card .child-summary .settings-menu

**profile** Create / edit child profile: name, age range, values preset (Conservative / Moderate / Custom), per-category sensitivity toggles.

.settings-screen .settings-card .sensitivity-control .toggle-row

**accessibility** 4 toggles: larger text, reduced motion, enhanced contrast, screen-reader detail. Applies CSS classes to \<html> immediately.

.accessibility-screen .accessibility-options .access-switch

**privacy** Data explainer, delete history, delete profile, export JSON, delete account.

.privacy-screen .privacy-scroll .data-actions .never-sell

**privacyPolicy** Iframe loading PDF. Header + back button.

.policy-screen .policy-document

**sources** 3-step methodology, category definitions, limitations notice, flag-for-review link.

.sources-screen .method-step .category-definitions .limitations

**contact** Form: name, email, subject, message. Confirmation state. Used both for "flag a book" and general contact.

.contact-page .auth-field .contact-page-success

**login / signup** Email + password form. Stores to localStorage. Shared component (AuthScreen) with mode prop.

.auth-screen .auth-top .auth-body .auth-field .auth-trust .auth-switch

**bookstore ✓** Camera scanner: ISBN barcode mode or book cover mode. Shutter button, scan tray with queued books, compare shortcut.

.bookstore-screen .camera-header .camera-mode-switch .camera-view .shutter-row .scan-tray

**compare ✓** Side-by-side table for 3 books. Covers, comparison rows, best-match pick, add-book button.

.compare-screen .compare-books .comparison-table .comparison-row .comparison-pick

## User Flow

HomeScan trigger → bookstore screen (camera) OR search field → startBookAnalysis()

startBookAnalysisIf no account OR guest mode → guestSetup, else → loading (2.2s) → results

guestSetupPick age + sensitivities → sessionStorage → loading → results

resultsDisplays Charlotte's Web (hardcoded demo). "Scan Another" → startBookAnalysis. "Compare" → compare screen. Flag → contact screen.

bookstoreCamera view + shutter (flash animation, scanned count +1). "Open last result" → startBookAnalysis. "Compare tray" → compare.

settingsGuest → CTA to sign up/in. Logged-in → child profiles, menu to sub-screens. Sign out clears auth, goes home.

login / signupForm → localStorage sets pageclarity-account + pageclarity-authenticated=true → settings screen.

profile editorCreate/edit child profile → saved to localStorage pageclarity-profiles array.

## localStorage Keys

```
pageclarity-authenticated   "true" / null
pageclarity-account         JSON: { name, email }
pageclarity-profiles        JSON array: [{ id, name, age, values, sensitivities }]
pageclarity-active-profile  String number (profile id, "0" = guest)
pageclarity-accessibility   JSON: { largeText, reducedMotion, highContrast, screenReader }
pageclarity-history         (reserved, not yet written)

sessionStorage:
pageclarity-guest-context   JSON: { age, categories[], sensitivities }  ← guest one-time setup
```

## Content Categories (hardcoded in App.tsx)

```
{ name: "Violence",        status: "Mild",    tone: "mild",    icon: "flame"    }
{ name: "Sexual Content",  status: "None",    tone: "clear",   icon: "heart"    }
{ name: "Language",        status: "None",    tone: "clear",   icon: "language" }
{ name: "Substance Use",   status: "None",    tone: "clear",   icon: "leaf"     }
{ name: "LGBTQ+ Themes",   status: "Present", tone: "present", icon: "user"     }
{ name: "Mature Themes",   status: "Mild",    tone: "mild",    icon: "sparkle"  }

Profile sensitivity key for LGBTQ+ is "Homosexuality" (not "LGBTQ+ Themes") — see ProfileEditor
```

## Known Bug Pattern — CRITICAL

**Root cause:** JSX `className` attributes and CSS class names don't match — CSS was written with prototype names while JSX was updated. Result: elements render inline/unstyled.

**Fix pattern every time:**

1. Read the JSX component to find actual `className` values
2. Search `src/index.css` for those class names
3. Append missing CSS rules to the bottom of `src/index.css`
4. Run `npm run build` to confirm no errors

**Never modify App.tsx class names** — fix CSS to match JSX, not the other way.

## Screen Status

**login / signup** — CSS fixed

**settings (SettingsOverview)** — CSS fixed

**results** — CSS fixed

**bookstore** — CSS fixed

**compare** — CSS fixed

**history** — CSS fixed

**guestSetup** — not audited

**loading** — not audited

**profile (ProfileEditor)** — not audited

**accessibility** — not audited

**privacy** — not audited

**sources** — not audited

**contact** — not audited

## Pending / Roadmap

- Audit remaining screens for CSS class-name mismatches (same fix pattern above)
- Wire up **Google Books API** — real ISBN / title → book metadata
- Wire up **Claude API** — AI content analysis for the 6 categories
- Set up **Supabase** — cache analysis results, real auth, sync profiles across devices
- COPPA compliance audit — no child PII collected or stored server-side
- Connect **pageclarity.app** domain + deploy to production
