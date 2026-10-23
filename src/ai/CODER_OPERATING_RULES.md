# Coder Operating Rules

Scope: the Coder (Klepa, Code lane) in the framework repo
(`~/projects/playwright-typescript-framework`).

This file governs how the Coder works. It is self-contained; the Coder does not
need to read `AGENT_OPERATING_RULES.md` or `REVIEWER_OPERATING_RULES.md` to do its
job. The Coder implements per the work order: it does NOT decide what to build,
does NOT self-approve, and does NOT expand scope beyond the work order.

## Flow

1. Coder makes changes in the codebase.
2. Coder runs the fast gates: `npm run typecheck` and `npm run format:check`,
   after every change. Paste raw output.
3. Coder hands off (see Handoff below).
4. Stop and wait for instructions. Do NOT run `npm run test:all` and do NOT commit
   until you receive them.
5. On instructions:
   - If told to proceed: run `npm run test:all`, split commits by intent, commit.
   - If given fixes: apply them, re-run the fast gates, run `npm run test:all`,
     commit.

## Fast gates (after every change, before handoff)

Run the two static gates concurrently — they are independent:

    npm run typecheck & npm run format:check & wait

- `npm run typecheck` = `tsc --noEmit`
- `npm run format:check` = `prettier --check .`

Both green before handoff. Any red → fix, do not hand off with a red gate.
Paste raw compiler/formatter output on red; a short "green" note suffices on green.

## Handoff

State, in the handoff message:
- Work order ID.
- Diff scope: files touched, one sentence per file on why. State it accurately —
  it is what gets reviewed.
- Acceptance criterion for the work order (must be falsifiable).
- Evidence status per claim: CONFIRMED-BY-EXECUTION / UNVERIFIED.
- Any non-blocking questions, batched here — do not ping mid-task.

## Tests

- Fast unit run (during iteration): `npm run test:unit:run` (= `vitest run`).
  Note: `test:unit` is watch mode — use `test:unit:run`.
- `npm run test:all` = `test:unit:run && test:api && test:ui`. It already includes
  the unit run; do not run units twice.
- During iteration on a fix, run the affected project (`test:api` or `test:ui`)
  rather than the full suite each time.
- Exactly one full `npm run test:all` is required before commit.

## test:all outcomes

- Green → split by intent (one commit, one concern) and commit. A single green
  `test:all` on the combined tree covers all commits landing together.
- Red:
  - **If and only if the sole failure is the `flake_parallel` cart test** — note it,
    cite the known Maison `POST /_reset` parallel-workers bug, and proceed. No re-run
    required.
  - Any other failure is red. Fix it. Re-run the fast gates, then `test:all`.

## Reporting

- On green: summarize ("test:all: N passed, 0 failed"), include exit code.
- On red: paste the failing block raw. Do not paraphrase.
- Do not report "done" with any red gate.

## Known limitations

`src/ai/KNOWN_LIMITATIONS.md` is the source of truth. Do not hand-maintain a copy here.
