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
- [x] Add `docs/testing.md` with locator policy (see docs/testing.md)
- [x] Route the remaining chained `.locator(...)` calls in specs through the
      per-card POM surface. `ProductCard` exists and `HomePage` exposes
      `firstCard` (getter) and `cardById(id)`; `ProductCard` gained
      `saleBadge()`/`soldOutBadge()`. Migrated: the three
      chained `.locator(...)` calls in `product-card.spec.ts` (two tests), the
      `price-was` test, and `authenticated-buyer.spec.ts:183` (commits: 8accb9ed,
      4276f598).
- [x] `catalog-toolbar.spec.ts:15` uses
      `homePage.categorySelect.locator('option')` -- a toolbar select, not a
      product-card locator. Added `getCategoryOptions()` to `HomePage`
      analogous to `getSortOptions()` and routed the spec through it.
      (commit: b06a0693)
- [x] Replace `nth(17)` index locator in `product-card.spec.ts` with `filter({ hasText })`. (commit: 85aa7b2c)
- [x] Purge the `waitForTimeout` wrapper in `BasePage` and its one usage. (commit: ca8e7582)

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

- [ ] Document that `scripts/` are driver tools, not Aider plugins.
      `verify.sh`, `judge.sh`, `gate-watch.sh` are run by the driver; `judge.mjs`
      is called only by `judge.sh`; `aider-lint.sh` is the sole Aider hook.
      Place the note in `docs/testing.md` or a scripts README.

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
- [x] Audit the npm dependency tree and clear reachable advisories. Fixed:
      zod `4.6.5` -> `4.6.6` (GHSA-mrhx-c7xc-m3w5, high, commit `fc5028f6`).
      Method: `npm audit` plus reachability, not `audit fix`.
- [ ] 2 critical / 2 high tinypool prototype-pollution advisories remain
      reachable under vitest `3.2.7`. The `3.2.7` -> `5.0.5` upgrade (commit
      `f0bf7e69`) was rolled back in `c72da9eb` (PR #60) because `allure-vitest`
      declares a peer dep on `@vitest/runner`, which vitest 5 no longer publishes
      as a stable package. Blocked on `allure-vitest` dropping that peer dep.
      See the rollback note in P3 below.

## P3 — Opportunistic

- [x] CI lint failure on the scripts merge (run `40118359625`) - `scripts/judge.mjs`
      was linted without node globals, producing 14 no-undef plus one no-empty.
      Fixed by scoping `globals.node` to `scripts/**/*.mjs` in `eslint.config.js`
      and commenting the deliberate empty catch (PR #62). Follow-up: `eslint .`
      added to `verify.sh` (PR #63), so local green now predicts CI green on lint.

- [ ] Add sharding (`--shard`) + `blob` reporter + `merge-reports` for the UI
      suite.
- [ ] Split shared fragments (header, nav, modal, cookie banner) into component
      objects taking `root: Locator`.
- [ ] `ProductCard` uses CSS selectors for `category`/`media`/`image`
      (`.card__cat`, `.card__media`, `.card__media img`). Parked: the app
      exposes no `data-testid` for these elements (`maison/web/src/app.ts:218-225`);
      `.card__media`/`img` carry `aria-label`/`alt` but a role+name locator
      would require threading the product name into the accessor (an API change,
      not a like-for-like migration). CSS is the only locator until the app adds
      testids.
- [ ] Add custom matcher(s) via `expect.extend` + declaration merging where
      multi-field assertions repeat.
- [ ] Add `frameLocator` tests for iframe flows.
- [ ] Add `waitForEvent('download')` + `saveAs()` tests for download flows.
- [ ] Pin the Playwright Docker image for CI
      (`mcr.microsoft.com/playwright:vX.Y.Z-jammy`).
- [ ] Add visual regression (`toHaveScreenshot`) for 3–5 stable screens, with
      `mask` + pinned Docker image.
- [x] vitest 5 upgrade blocked by `allure-vitest`; rolled back to 3.2.7.
      `allure-vitest` (through 3.14.0) declares peerDependencies
      `@vitest/runner >=1.3.0` and imports it at runtime; vitest 5 inlines it and
      publishes no stable `@vitest/runner` (last stable 4.1.12, then only
      `5.0.0-beta.*`). Under vitest 5 the reporter fails to load, so no unit
      tests ran and `allure-results/` was never produced. Rollback merged as
      PR #60 (commit `c72da9eb`); 2 critical / 2 high audit vulns return as a
      known cost. Revisit when `allure-vitest` drops the peer dep. See
      `src/ai/KNOWN_LIMITATIONS.md`.
      (supersedes the earlier "harmless while the reporter passes" note)

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
- [ ] `body-parser` GHSA-27r3-jxmh-p828 (high) is present transitively
      (`@modelcontextprotocol/sdk` -> `express@5.2.1`) but not reachable:
      `src/ai/mcp-server.ts` uses `StdioServerTransport` only, no HTTP listener.
      Becomes live only if an HTTP transport is added.
