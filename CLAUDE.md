# Project Context: Playwright + TypeScript QA Automation Framework

This is a Playwright + TypeScript QA automation framework for testing the "Maison" e-commerce application. It combines unit tests (Vitest), API tests, and UI/E2E tests.

## Key Architecture & Directories

- **`tests/specs/unit/`**: Unit tests (Vitest)
- **`tests/specs/api/`**: API tests (Playwright)
- **`tests/specs/ui/`**: UI/E2E tests (Playwright)
- **`tests/fixtures/`**: Custom Playwright fixtures
- **`tests/pages/`**: Page Object Model classes
- **`src/config/`**: Environment and timeout configurations
- **`src/types/`**: TypeScript type definitions
- **`maison/`**: The Application Under Test (AUT) server

## Common Commands

- Run all tests sequentially (unit, api, ui): `npm run test:all`
- Run unit tests: `npm run test:unit`
- Run API tests: `npm run test:api`
- Run UI tests: `npm run test:ui`
- Lint: `npm run lint`
- Typecheck: `npx tsc --noEmit`

## Workflow Rules — Codex Loop

Follow this five-phase loop for every task. Do not skip phases.

### ① EXPLORE

Before touching anything, map the territory. Use read-only operations only:

- `glob` to locate files
- `grep` to locate symbols
- read to inspect implementations

Do not guess file contents from filenames. Do not guess behavior from memory.
Prefer reusing existing functions and patterns over inventing new machinery.

### ② PLAN

If the change touches more than one file, or involves an irreversible action (migration, file deletion, config change, dependency change):

- Write a `todo_write` list first
- Then execute it item by item
  If the requirement is ambiguous, ask the user — do not fill gaps with guesses.

### ③ IMPLEMENT

- **Read before write.** Always open a file before editing it.
- Make small, focused changes. One change, one verification.
- Do not refactor unrelated code. Do not make "while I'm here" improvements.
- Match existing patterns in the codebase.

### ④ VERIFY

This is the boundary between a working agent and a chatting model.

- **Run the code.** Tests, builds, linters, actual invocations.
- **No claim without evidence.** Do not say "tests pass" until you have seen tests pass. Do not say "fixed" until you have seen the original failure disappear.
- Every non-zero exit code must be handled. Do not skip and continue.
- If verification fails, return to ③ with the failure output as the next input.

### ⑤ INTEGRATE

Report what a human can check:

- Which files changed and why
- Which commands ran and what they returned
- What remains undone

For git operations, show the diff before committing. Commit messages must accurately describe the change.

## Evidence Discipline

Rules that apply across all phases:

- **Distinguish "I verified" from "I suspect."** Verified = give the command and its output. Suspected = say so explicitly.
- **Quote error messages verbatim.** Do not paraphrase "there's a problem." Errors must be greppable.
- **Never fake success.** If you cannot do something, say so. If you are missing information, say what is missing.
- **For long outputs,** check `tail` and exit code first, then decide whether to read the full output.
- **One thing at a time.** Complete one verifiable goal, stop, and report. Let the user decide the next step. Do not expand scope "while you're at it."

## Coding Standards

1. **ES Modules**: Use `import`/`export` syntax.
2. **TypeScript Strict Mode**: The project uses TS in strict mode. Ensure type safety.
3. **Path Aliases**: Use `tsconfig.json` path aliases where defined.
4. **Test Layer Placement**:
   - Unit tests → `tests/specs/unit/`
   - API tests → `tests/specs/api/`
   - UI tests → `tests/specs/ui/`
5. **Fixtures**: New fixtures go in `tests/fixtures/` and are merged in `index.ts`.
6. **Page Objects**: Extend `BasePage` when adding new pages.

## Known Issues / Conventions

- **`maison/` is the AUT.** Do not modify it unless explicitly asked.
- **Fixture filename typo**: `tests/fixtures/api.fuxture.ts` should be `api.fixture.ts`. If asked to fix, rename the file AND update all imports.
- **Script names must match README.** When adding npm scripts, verify the name matches what the README documents.
- **Duplicate Playwright project names**: `ui` and `chromium` both use Desktop Chrome. Be aware when editing `playwright.config.ts`.
- **No LICENSE file** despite README referencing MIT.

## Session Hygiene

- If context usage exceeds ~70%, stop and report to the user. Suggest starting a new session rather than continuing to drift.
- If a task requires reading more than 3 large files, propose a plan first instead of reading everything blindly.
- Do not re-read files you already read in the same session unless they were modified.

## Pre-approved Actions

The following actions do not require asking the user first:

- Read-only operations (glob, grep, read, list directories)
- Running linters and typechecks on files you just edited
- Running the project's existing test commands

The following always require explicit user confirmation:

- `git commit`, `git push`, or any history-changing git operation
- Deleting any file
- Modifying `package.json` dependencies
- Modifying `playwright.config.ts` or `tsconfig.json`
- Any change to the `maison/` folder
