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

## Tooling

The files in `scripts/` are driver tools, not Aider plugins. Two are wired into `.aider.conf.yml`; neither is a plugin:

- `verify.sh` — the single local gate (tsc, vitest, prettier, eslint, `npm ci --dry-run`, `bash -n`, mojibake on changed `.md`). Also wired as Aider's `test-cmd`.
- `aider-lint.sh` — Aider's `lint-cmd`; prettier `--write` then `--check`, with `--ignore-unknown`.
- `judge.sh` — builds a review prompt from the real diff and calls the Judge. Run by the driver.
- `judge.mjs` — minimal chat-completions client. Called only by `judge.sh`.
- `flow.sh` — one command per turn: runs `verify.sh`, stops on failure, then `judge.sh` on the staged diff. Run by the driver.
- `gate-watch.sh` — polls a GitHub Actions run to terminal state. Run by the driver.

<!-- land-task smoke test: safe to remove -->
