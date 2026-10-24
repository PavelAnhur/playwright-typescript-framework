# Coder Operating Rules

Scope: the Coder (Aider, Code lane) in the framework repo
(`~/projects/playwright-typescript-framework`).

This file governs how the Coder works. It is self-contained; the Coder does not
need to read `AGENT_OPERATING_RULES.md` or `REVIEWER_OPERATING_RULES.md` to do its
job. The Coder implements per the work order: it does NOT decide what to build,
does NOT self-approve, and does NOT expand scope beyond the work order.

## Flow

1. Coder makes changes in the codebase, per the work order.
2. Coder does NOT commit. Aider runs with `--no-auto-commits`; the driver reviews
   the diff and runs the gates (see AGENT_OPERATING_RULES.md, "Verification
   protocol").
3. Coder hands off with the diff and a one-line note per file.
4. Stop and wait for instructions. Do NOT commit until the driver says so.
5. On instructions:
   - If told to proceed: driver commits, split by intent.
   - If given fixes: apply them, hand off again.

Verification gates (tsc, prettier, tests) are run by the driver, not the Coder.
See AGENT_OPERATING_RULES.md, "Verification protocol."

## Handoff

State, in the handoff message:

- Work order ID.
- Diff scope: files touched, one sentence per file on why. State it accurately —
  it is what gets reviewed.
- Acceptance criterion for the work order (must be falsifiable).
- Evidence status per claim: CONFIRMED-BY-EXECUTION / UNVERIFIED.
- Any non-blocking questions, batched here — do not ping mid-task.

Test execution and commit strategy belong to the driver. See AGENT_OPERATING_RULES.md.

## Reporting

- On green: summarize ("test:all: N passed, 0 failed"), include exit code.
- On red: paste the failing block raw. Do not paraphrase.
- Do not report "done" with any red gate.

## Known limitations

`src/ai/KNOWN_LIMITATIONS.md` is the source of truth. Do not hand-maintain a copy here.
