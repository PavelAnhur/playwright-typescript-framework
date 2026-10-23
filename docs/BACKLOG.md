# Backlog

Framework improvements identified by going through the Playwright/TypeScript
interview-prep document and checking each candidate against the tree.
Done items are excluded; what remains is listed here, prioritized.

Status legend: `[ ]` open, `[x]` done, `[~]` partial / conditional.
When an item is completed, mark it `[x]` and note the commit. Do not delete
completed items — the history is useful for future sessions.

Priority tiers: P0 (do first), P1 (next), P2 (worth doing), P3 (opportunistic),
P4 (defer).

## P0 — Do first

- [~] Remove `expect()` from POMs (`LoginPage`, `RegisterPage`, `HomePage`,
  `BasePage`) — expose state, assert in tests.
  Partial: 13 `expect()` calls converted to waits/attachments across
  `1fbfa8cb`, `ef5d4e23`, `86175717`. One conversion reverted in `6f457573`
  (`.dob-popup` hides via `opacity: 0`, never `display:none`; `waitFor`
  hidden is unsatisfiable). 12 `expect()` retained by design: the
  `expect*`-named helpers, `LoginPage:104` (contains-text), and
  `RegisterPage:93` (catch-branch, must not block).
- [ ] Add `docs/testing.md` with locator policy (role → label → text → testid →
      CSS → XPath; no absolute XPath; no `nth` without contract).
      Must also cover viewport/state-dependent visibility: do not assert or
      wait for visibility on elements hidden by `opacity`/`pointer-events`
      (`.dob-popup`), by a collapsed mobile nav (`.nav > *` at <=560px), or by
      a desktop-hidden control (`.nav-toggle`). Assert attachment, attributes,
      or content; open the mobile menu before interacting with nav children.
- [ ] Remove `page.locator(...)` from specs — route through POMs; enforce with
      a lint rule or review checklist.
- [ ] Replace `nth(17)` index locator in `product-card.spec.ts` with
      `filter({ hasText })`.
- [x] Purge the `waitForTimeout` wrapper in `BasePage` and its one usage. (commit: 1234567)

## P1 — Next

- [ ] Add Zod response-schema validation to API tests
      (`api/schemas/*.schema.ts`, `parse`/`safeParse`).
- [ ] Replace `as any` in unit tests with `satisfies`/`Partial`/typed mocks;
      tighten `no-explicit-any` from `warn` to `error`.
- [ ] Add Playwright browser cache to CI (`actions/cache` on
      `~/.cache/ms-playwright`, key by lockfile hash).
- [ ] Wire `test:all` as a single step in CI (currently three separate steps).
- [ ] Add `.env.example` (variables only, no secrets) and confirm `.env*`
      ignored.
- [ ] Introduce test-data factories (`makeUser(overrides: Partial<User>)`)
      instead of static data.
- [ ] `RegisterPage.ts:84`: `datePickerDialog.waitFor({ state: 'visible' })`
      asserts nothing — `.dob-popup { opacity: 0 }` means the element is always
      visible to Playwright. Drop it or assert `aria-hidden='false'`.
- [ ] `home-page/authenticated-buyer.spec.ts:6`: `currentUser` `toBeVisible()`
      passes on Mobile Chrome while the same assertion failed elsewhere. Find
      out why before changing it; do not "fix" a passing assertion.
- [ ] Add a non-asserting `openMobileMenu()` to `BasePage`
      (`HomePage`'s version asserts `navShop`/`navLogin`, so it is not
      reusable from `LoginPage`).
- [ ] Playwright projects `firefox`, `webkit`, `Mobile Chrome` have no
      `testDir`; they inherit `./tests/specs` and run `api/` and `review/`
      suites. Decide intended matrix and scope with `testDir`/`testMatch`.

## P2 — Worth doing

- [ ] Add hybrid tests (API seed → UI verify → API post-condition) for
      checkout/order flows.
- [ ] Add network interception for UI tests: `page.route` for API mocks,
      `context.route` to block analytics.
- [ ] Use `expect.poll` / `toPass` where async conditions are currently awaited
      manually.
- [ ] Use `test.each` for repeated table-driven cases.
- [ ] Use `satisfies` for test data, config, and mock shapes.
- [ ] Add `--shuffle` and/or `--repeat-each` run (nightly or scheduled) to
      surface hidden state dependencies.
- [ ] Replace the manual `npm start &` + curl loop in CI with `webServer` in
      `playwright.config.ts`.

## P3 — Opportunistic

- [ ] Add sharding (`--shard`) + `blob` reporter + `merge-reports` for the UI
      suite.
- [ ] Split shared fragments (header, nav, modal, cookie banner) into component
      objects taking `root: Locator`.
- [ ] Add custom matcher(s) via `expect.extend` + declaration merging where
      multi-field assertions repeat.
- [ ] Add `frameLocator` tests for iframe flows.
- [ ] Add `waitForEvent('download')` + `saveAs()` tests for download flows.
- [ ] Pin the Playwright Docker image for CI
      (`mcr.microsoft.com/playwright:vX.Y.Z-jammy`).
- [ ] Add visual regression (`toHaveScreenshot`) for 3–5 stable screens, with
      `mask` + pinned Docker image.

## P4 — Low priority / defer

- [ ] Add `defineConfig<TestOptions, WorkerOptions>` if custom `use` options
      are added.
- [ ] Add `globalTimeout` in config.
- [ ] Review POMs/fixtures against SOLID (folds into P0 POM work and P3
      component split).
- [ ] Add `.d.ts` declarations for any untyped dependencies.

## Conditional / verify first

- [ ] `frameLocator` item above — only if the app has iframes.
- [ ] Download-test item above — only if the app has downloads.
- [ ] Custom-matcher item above — only if the same multi-field assertion
      repeats.
- [ ] `.d.ts` item above — only when an untyped dependency is introduced.
