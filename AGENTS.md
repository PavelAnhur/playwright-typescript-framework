# AGENTS.md

## Project Overview
Playwright + TypeScript QA automation framework for testing the "Maison" e-commerce app.
Test layers: Vitest (unit), Playwright API, Playwright UI.

## Commands
- Install deps: `npm install`
- Run unit tests: `npm run test:unit`
- Run API tests: `npm run test:api`
- Run UI tests: `npm run test:ui`
- Run all tests: `npm run test:all`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`

## Boundaries

✅ Always do
- Read a file before editing it
- Run `npm run lint` and `npx tsc --noEmit` after any code change
- Match existing patterns in the codebase

⚠️ Ask first
- Modifying `package.json` dependencies
- Modifying `playwright.config.ts` or `tsconfig.json`
- Deleting any file
- Running `git commit` or `git push`

🚫 Never do
- Modify the `maison/` folder (AUT)
- Commit `.env.local` or any secrets
- Refactor code unrelated to the current task

## Code Style
- ES modules (`import`/`export`), no CommonJS
- TypeScript strict mode — ensure type safety
- Unit tests → `tests/specs/unit/`
- API tests → `tests/specs/api/`
- UI tests → `tests/specs/ui/`
- New fixtures go in `tests/fixtures/` and are merged in `index.ts`
- New page objects extend `BasePage`

## Known Gotchas
- Fixture filename typo: `api.fuxture.ts` should be `api.fixture.ts`
- `ui` and `chromium` Playwright projects both use Desktop Chrome
- No LICENSE file despite README referencing MIT
  