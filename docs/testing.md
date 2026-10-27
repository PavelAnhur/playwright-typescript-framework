# Testing policy

## Locators

Preference order: role → label → text → testid → CSS → XPath.

- No absolute XPath.
- No `nth` without a contract.

### Viewport- and state-dependent visibility

Do not assert or wait for visibility on elements hidden by:

- `opacity` / `pointer-events` (e.g. `.dob-popup`);
- a collapsed mobile nav (`.nav > *` at <=560px);
- a desktop-hidden control (`.nav-toggle`).

Assert attachment, attributes, or content instead. Open the mobile menu before interacting with nav children.

## API response schemas

API response schemas live in `tests/specs/api/schemas/`, one `*.schema.ts` file per response shape.

They are consumer-side contracts for the tests, not app types. `src/types/` remains the place for hand-written app interfaces.

A schema must require the fields the TypeScript interface requires, plus the fields the specs actually assert. Fields whose type allows null are `.nullable()` (e.g. `discount`).

Use default zod object behavior: unknown keys are stripped. Do not use `.passthrough()` or `.strict()`.

Validate with `safeParse` and surface `error.issues` on failure; do not reduce a validation failure to a bare boolean.

Name inferred types `<X>Response` (`ProductResponse`, `DiscountResponse`) so they do not collide with the types in `src/types/`.

## Tooling

The files in `scripts/` are driver tools, not Aider plugins. Two are wired into `.aider.conf.yml`; neither is a plugin:

- `verify.sh` — the single local gate (tsc, vitest, prettier, eslint, `npm ci --dry-run`, `bash -n`, mojibake on changed `.md`). Also wired as Aider's `test-cmd`.
- `aider-lint.sh` — Aider's `lint-cmd`; prettier `--write` then `--check`, with `--ignore-unknown`.
- `judge.sh` — builds four prompts, one per review question, calls `judge.mjs` once per question with `--section`, validates each section, and assembles the four answers into one review. Run by the driver.
- `judge.mjs` — minimal chat-completions client. Called only by `judge.sh`.
- `flow.sh` — one command per turn: runs `verify.sh`, stops on failure, then runs `judge.sh` on the worktree vs HEAD (staged and unstaged changes); with `--range` the Judge reviews that commit range instead. Run by the driver.
- `gate-watch.sh` — polls a GitHub Actions run to terminal state. Run by the driver.
