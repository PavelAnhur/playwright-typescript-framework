# Known Limitations

An honest inventory of what this harness does not do, does inconsistently, or does in a way that will need rework. Written for three audiences:

- **Future me** — when I return to the code after months away, I want to know where the rough edges are before I trip over them.
- **Reviewers** — what a reader should know about this project beyond what the README advertises.
- **Interviews** — the honest answer to "what would you improve" starts here, not in a marketing pitch.

Each entry follows the same shape: where it is, what the issue is, why it exists, how to fix it, and how urgent it is.

## Gaps

Missing capabilities that a production harness would have.

### No fetch timeout in dshClient

- **Where:** `src/ai/dshClient.ts`, `callOnce`
- **What:** `fetch` has no `AbortSignal.timeout()`. If the provider accepts the connection and then hangs, the script hangs until the CI job times out.
- **Why:** the local provider has been reliable enough at demo scale that this has not triggered.
- **Fix:** add `signal: AbortSignal.timeout(60_000)` to the fetch options in `callOnce`. Consider making it configurable via `aiConfig`.
- **Priority:** high

### No quality metrics aggregation

- **Where:** not implemented
- **What:** the judge produces scores per triage, but nothing aggregates them. There is no answer to "what is our triage accuracy over the last month?" or "has the prompt change improved or degraded results?"
- **Why:** the harness was built bottom-up. Metrics were deferred until the agents stabilized.
- **Fix:** parse `logs/ai/*.jsonl` into a monthly report. Track: total triages, category distribution, average judge score, count of hallucination flags. A simple CLI + HTML dashboard.
- **Priority:** medium

### No few-shot examples

- **Where:** all prompts in `src/ai/prompts/`
- **What:** every prompt is zero-shot — instructions only, no examples of correct outputs.
- **Why:** starting from zero-shot keeps prompts small and cheap, and the schemas enforce the output shape anyway.
- **Fix:** assemble 5–10 hand-labeled triages and add them as `user`/`assistant` message pairs before the real input. Measure accuracy delta before and after.
- **Priority:** medium

### No human feedback loop

- **Where:** not implemented
- **What:** when the analyst classifies a failure incorrectly, there is no mechanism to record "this was wrong, it should have been X." Feedback does not accumulate.
- **Why:** no UI for it, and the demo scale does not justify the effort yet.
- **Fix:** a CLI command `npm run ai:feedback -- <triage-id> <correct-category>`. Store under `fixtures/triage-feedback/`. Compare against agent output in the metrics report.
- **Priority:** medium

### No cost tracking across runs

- **Where:** token counts are logged per call, but not aggregated
- **What:** no running total of how much a project has spent on model calls over time.
- **Why:** the cost at demo scale is trivial (fractions of a BYN per run).
- **Fix:** extend the metrics aggregator to sum `totalTokens` from the logs, multiply by the current price per million, and report weekly totals.
- **Priority:** low

### No tests for the harness itself

- **Where:** not implemented
- **What:** the agents, tools, and reporter engines are not covered by automated tests. `detectFlake`, `flakeDecisionGate`, `runPlaywrightTest`, and the reporter engines have no unit or integration tests in the repository. The CLI scripts have been exercised by hand, and frozen artifacts exist in `fixtures/sample-output/`, but there is no regression suite that runs on commit.
- **Why:** the harness grew bottom-up during demo preparation. Each piece was validated interactively, and the frozen artifacts served as informal baselines. Formal tests were deferred and never added.
- **Fix:** start with the pure functions — `detectFlake` (mock `runPlaywrightTest` and assert classification logic), `flakeDecisionGate.shouldConsider` (table-driven tests over category/confidence combos), `runPlaywrightTest` JSON parsing (feed fixed JSON, assert extracted fields). Then add a snapshot test for the reporter summary output. Prompt regression testing is a separate, larger effort — see the "No prompt A/B testing" entry.
- **Priority:** high

### runPlaywrightTest retries option is unreachable

- **Where:** `src/ai/tools/runPlaywrightTest.ts` — `RunOptions.retries` (line 22), loop at line 185.
- **What:** no caller passes `retries`. Verified by grep: `detectFlake.ts:48` passes `{ project, workers, repeatEach }`; `refineSpec.ts:150` and `refineSpec.ts:174` pass no options object. Default `retries = 0` at line 176 means the loop (`attempt <= retries`) always runs exactly once. The retry semantics are dead code.
- **Latent caveat:** IF retries were ever wired, the semantics are wrong for the obvious use case ("retry a flaky test"). At line 210, a genuine test failure (`code === 1` with parsed failures) sets `lastResult` and breaks immediately — it never retries. Only non-test-failure exit codes with no parsed report reach the continue path.
- **Classification:** defense-in-depth — the option is dead, document, do not fix (rule 8).

### runPlaywrightTest merges stderr into the parsed stdout buffer

- **Where:** `src/ai/tools/runPlaywrightTest.ts` — `runProcess` lines 66–68 append both `child.stdout` and `child.stderr` to the same `stdout` variable; `parseJsonReport` (line 114) then parses that merged buffer.
- **What (CONFIRMED):** stderr is non-empty during a `--reporter=json` run. Observed npm notice output on stderr (176 bytes) in a real run.
- **Observed impact (do NOT overstate):** `parseJsonReport` uses `indexOf` on `'{\n  "config":'` and slices from there, so preceding stderr/stdout chatter is tolerated — the anchor was found at index 263 in a real run and parsing succeeded. The merge is therefore NOT demonstrated to corrupt the parse today.
- **Residual risk:** if stderr output ever interleaves _within_ the JSON body (after the opening brace, before the closing brace), `JSON.parse` would fail and the report would be null, silently emptying `failures.names`. The anchor+slice design is not structurally safe against that.
- **Classification:** real code property, observed impact tolerated, latent risk — document, do not fix.
- **Note:** this is NOT covered by the existing "no tests for the harness" entry, which names JSON parsing generally but not the stream merge.

### maison/ is a vendored copy, rebuilt manually

- **Where:** `maison/` (at the repository root of the framework)
- **What:** the AUT lives in a separate repository (`github.com/PavelAnhur/maison`). The copy under `maison/` in the framework is vendored — it is not a git submodule, not a symlink, and not tied to a specific upstream commit. When the upstream Maison repository changes, the vendored copy has to be refreshed by hand. If it is not refreshed, the framework tests a stale version of the AUT.
- **Why:** the initial setup copied the AUT once to have a self-contained working tree. There was no requirement at the time to track upstream changes automatically.
- **Fix:** either convert to a git submodule (`git submodule add https://github.com/PavelAnhur/maison.git maison`), or add a script that clones the current main branch into `maison/` before the test run. Submodule is cleaner for local development; the script is simpler for CI.
- **Priority:** medium

### specRefiner does not receive the original case description

- **Where:** `src/ai/prompts/specGenerator.ts`, `SpecRefinerInput`
- **What:** the refiner prompt receives the current test code, the error, the error context, and the project context — but not the original test case (title, steps, expected result). To fix the test, the model has to infer the intent from the code alone. If the code has drifted from the case (e.g. an earlier refinement weakened an assertion), the refiner cannot detect the drift.
- **Why:** the refiner was designed as a minimal input — everything it needs to fix the current failure. The original case was considered out of scope.
- **Fix:** extend `SpecRefinerInput` with the original case fields (`caseTitle`, `steps`, `expected`) and pass them through. Update `refineSpec.ts` to thread them from the case into the refiner. The prompt gains a section `--- ORIGINAL CASE ---` and a rule: "the fixed test must still verify what the case describes."
- **Priority:** medium

### No retry on schema validation failure

- **Where:** `src/ai/agents/requirementsAnalyst.ts` (and the other agents that call `callModel` directly)
- **What:** if the model returns valid JSON that fails zod validation, the agent throws immediately. The retry loop in `callModel` only covers HTTP-level failures (network, 5xx, timeouts). A model that returns `{"risks": "not an array"}` gets exactly one shot — no re-prompt with feedback about what was wrong.
- **Why:** validation was placed in the agent, not in `callModel`. This keeps the client simple (it doesn't know about schemas) but means the model never sees its own validation errors.
- **Fix:** add a retry-with-feedback wrapper. On `safeParse` failure, append the validation error to the conversation as a new user message ("your previous output failed validation: <error>. Return corrected JSON.") and call again, up to 1–2 extra attempts. Cap the cost so a stubborn model does not loop indefinitely.
- **Priority:** medium

## Inconsistencies

Places where similar tasks are handled differently.

### specGenerator validates by hand, other agents use zod

- **Where:** `src/ai/agents/specGenerator.ts` vs. `src/ai/agents/failureAnalyst.ts`, `judge.ts`, `requirementsAnalyst.ts`
- **What:** the first three agents parse the model output with `SomeSchema.safeParse()`. `specGenerator` parses JSON and does manual `typeof x === 'string'` checks.
- **Why:** `specGenerator` returns `{ fileName, code }` — a two-field object — and it seemed simpler at the time to check inline.
- **Fix:** create `SpecGeneratorOutputSchema` and `SpecRefinerOutputSchema` in `schemas.ts`. Refactor `specGenerator.ts` and `refineSpec.ts` to use them.
- **Priority:** medium

### Batch result has no schema

- **Where:** `src/ai/agents/failureAnalyst.ts`, `analyzeFailures`
- **What:** the function returns `FailureHypothesis[]` but validates each entry individually inside a loop, not with a batch schema. There is no single schema expressing "an array of hypotheses."
- **Why:** zod's `z.array(FailureHypothesisSchema)` was not introduced because the batch prompt returns the whole structure in one field, and it was easier to iterate.
- **Fix:** define `FailureHypothesisListSchema = z.array(FailureHypothesisSchema).min(1)` and validate the parsed batch response against it once.
- **Priority:** low

### Failure path logs durationMs: 0

- **Where:** `src/ai/dshClient.ts`, `callModel` error branch
- **What:** on success, `durationMs` reflects real elapsed time. On failure, it is hardcoded to `0`. This makes the log less useful for diagnosing slow failures (timeouts vs. immediate 401s look identical).
- **Why:** `callOnce` throws on failure, so there is no result object to read duration from.
- **Fix:** catch inside `callOnce`, return duration alongside the error, or use a `finally` block that records elapsed time.
- **Priority:** low

### Two different flake-detection counters

- **Where:** `src/ai/tools/flakeDecisionGate.ts` and `reporters/aiTriageReporter.ts`
- **What:** the gate tracks `runs` internally and is reset in `onBegin`. The reporter does not track its own count. This is not a bug, but the responsibility for "how many flake detections have we run this session?" is spread across two layers.
- **Why:** the gate was extracted from the reporter during the refactor. The counter moved with it, but reset stayed on the reporter.
- **Fix:** make the gate fully self-contained — including the reset. The reporter would just call `flakeGate.onBegin()` instead of `flakeGate.reset()`.
- **Priority:** low

### Two builder styles in specGenerator.ts

- **Where:** `src/ai/prompts/specGenerator.ts`, `buildSpecGeneratorUser` vs. `buildSpecRefinerUser`
- **What:** the two builder functions use different patterns. `buildSpecGeneratorUser` constructs an array literal with spread syntax (`.map(...)` unpacked with `...`). `buildSpecRefinerUser` uses `parts.push()` calls. Both produce correct output, but the file has two idioms for the same job.
- **Why:** they were written at different times, and neither pattern was declared a standard.
- **Fix:** pick one style and apply it to both. The `parts.push()` form handles conditional sections more cleanly; the array literal form is more compact when all sections are unconditional. Document the choice in the file's comment header, or in AGENTS.md.
- **Priority:** low

### Two CLI invocation patterns: embedded guard vs separate *Cli.ts files

- **Where:** `src/ai/agents/requirementsAnalyst.ts:86`, `judge.ts:141`, `failureAnalyst.ts:168` embed `if (import.meta.url === \`file://${process.argv[1]}\`)`; the `refineSpecCli.ts`/`specGeneratorCli.ts` CLI modules use separate files instead.
- **What:** three agents have an inline CLI entrypoint guard; two others use dedicated *Cli.ts modules. Both patterns work under tsx today — `npm run ai:judge` was executed and ran correctly (exit 0, real output), confirming the embedded guard fires in the real invocation.
- **Why it is a note, not a fix:** the embedded guard depends on `argv[1]` being an absolute realpath, which is true under tsx but not guaranteed under a symlinked install or a different runner. Standardizing would touch six files for marginal gain.
- **Classification:** consistency/robustness note — document, do not fix.

### Judge output-name transform is a single undocumented convention

- **Where:** `src/ai/agents/judge.ts`, `writeVerdict`
- **What:** the output name is derived by `/\.triage\.json$/ -> '.judge.json'`. This is the repo's only triage naming convention — `failureAnalyst.ts` writes it, the judge CLI defaults to it. The regex previously also handled `.summary.json` and `-summary.json`; both were removed after confirming no producer emits them.
- **Soft behavior change:** the reporter's batch file `test-results/ai-triage-summary.json` was transformed to `ai-triage.judge.json` by the old regex (`[.-](triage|summary)\.json$`) and is no longer transformed by the new one (`/\.(triage)\.json$/`). No automated path feeds that file to `judgeTriage` today, so nothing breaks now — but a manual caller relying on the old transform would see the name unchanged. A future reporter extension that pipes batch failures into `judgeTriage` would make this a live concern.
- **Guard:** `writeVerdict` refuses to write when the resolved output path equals the input path (non-conforming names inside `generated-cases/`). The guard is cwd-dependent and does not resolve symlinks, so a symlinked `generated-cases/` accessed via its target path would bypass it — unverified, no known symlinked paths in the repo.
- **Why:** the convention is defined only by the regex, with no written contract. A future change could silently break it.
- **Priority:** low

### JSDoc comment only on one function in requirementsAnalyst.ts

- **Where:** `src/ai/agents/requirementsAnalyst.ts`
- **What:** `stripFences` has a JSDoc block explaining its purpose. `toYaml`, `clean`, and `analyzeRequirements` — the other three functions in the same file — have no comments at all. A reader cannot tell whether the missing comments were deliberate or forgotten.
- **Why:** `stripFences` was written during a debugging session where the reason for its existence needed explaining. The others were written earlier, when the codebase was smaller and the conventions less defined.
- **Fix:** either remove the JSDoc from `stripFences` (consistency with the rest of the project — most files are comment-light), or add short one-line comments to the other three. The project style leans toward minimal comments, so removal is probably the right call. Check the other agent files for the same pattern before deciding.
- **Priority:** low

## Technical Debt

Working code that should be rewritten or reconfigured.

### projectRoot = process.cwd() in config

- **Where:** `src/ai/config.ts`
- **What:** the project root is assumed to be the current working directory. If the process is launched from a different cwd — for example, an MCP client that spawns the server from its own directory — all paths break.
- **Why:** the original design assumed CLI execution from the repo root.
- **Fix:** derive `projectRoot` from `import.meta.url` — two levels up from `src/ai/config.ts`. This makes the module location-independent.
- **Priority:** high

### MAX_TRIAGE is hardcoded

- **Where:** `reporters/triageEngine.ts`
- **What:** the cap on how many failures are triaged per run is a module-level `const MAX_TRIAGE = 10`. It cannot be changed without editing the file.
- **Why:** the value was set during initial design and never revisited.
- **Fix:** move to `ReporterOptions` in `aiTriageReporter.ts`. Default 10, configurable in `playwright.config.ts`.
- **Priority:** medium

### No circuit breaker on the provider

- **Where:** `src/ai/dshClient.ts`
- **What:** if the provider is down for a long stretch, every call in a run makes 3 attempts with backoff. That is bounded but wasteful when the provider is reliably failing.
- **Why:** at demo scale, provider outages are rare and short.
- **Fix:** track recent failure rate in memory. After N consecutive failures, skip retries for the remainder of the process.
- **Priority:** low

### Two log formats with different lifecycles

- **Where:** `src/ai/logger.ts` (`run-<timestamp>.jsonl`) and `src/ai/tools/refineLogger.ts` (`refine-<caseId>-<timestamp>.jsonl`)
- **What:** two separate logging modules, similar shape, different naming. Not a bug, but the log directory has mixed purposes.
- **Why:** the refine logger was added later to support per-iteration refinement history.
- **Fix:** either merge into one logger with a "kind" field, or document the split in `src/ai/README.md`.
- **Priority:** low

### No npm script for the flake detector in CI mode

- **Where:** `package.json`
- **What:** `npm run ai:flake-detect` runs the CLI. There is no script that runs it with `--fail-on-non-pass` for use as a CI gate.
- **Why:** the flag was added recently. No CI use case yet.
- **Fix:** add `ai:flake-gate` script with the flag. Document the use case in the README.
- **Priority:** low

### .vscode/mcp.json is stale

- **Where:** `.vscode/mcp.json`
- **What:** configures only the Playwright MCP server for VS Code Copilot, not `ai-qa-harness`. Not currently used — the active client config is `kilo.jsonc`. Its presence suggests harness support in VS Code that does not exist.
- **Why:** created during early exploration before Klepa AI became the primary client.
- **Fix:** delete the file, or update to mirror `kilo.jsonc` if VS Code Copilot support is wanted.
- **Priority:** low

### Triple-backslash escaping in prompt templates

- **Where:** `src/ai/prompts/specGenerator.ts` (and to a lesser degree the other prompt files)
- **What:** backticks inside the system prompt template literals are escaped as `\\\`` (three backslashes) rather than the single `\`` that a template literal requires. The output renders correctly to the model, but the source is noisy and hard to scan. This happened because the prompt text was pasted from another context where escaping was already applied, and the extra layer was never stripped.
- **Why:** the prompt was assembled outside the codebase and pasted in as a string. The escaping was preserved.
- **Fix:** replace every `\\\`` with `\`` in the prompt template literals. Run typecheck and format after, since template literals are sensitive. Verify by logging the final prompt once: the rendered text should be identical.
- **Priority:** low

## Open Questions

Decisions I have not made yet.

### Should detectFlake be exposed as an MCP tool?

- **Context:** flake detection is available via CLI (`npm run ai:flake-detect`) and via the reporter (`FlakeDecisionGate`). It is not exposed as an MCP tool.
- **Tension:** exposing it as an MCP tool lets an AI client call it directly, but flake detection is slow (12–60 seconds depending on the phase that fails). A long-running tool call may time out on the client side.
- **Decision needed:** whether the value of manual triggering from an AI client outweighs the risk of timeout.

### Should there be a judge for the judge?

- **Context:** the judge scores the analyst's triages. If the judge itself is wrong (as happened in the session where it flagged `ctx` as dead code), nothing catches that.
- **Tension:** adding a second-level judge doubles cost and adds complexity. The human-in-the-loop already covers this today.
- **Decision needed:** whether to formalize a "human review required" flag when the judge's confidence is low, or leave the review entirely manual.

### Should batch mode fall back to single-triaged failure when the batch count mismatches?

- **Context:** `analyzeFailures` returns an array. If the model returns fewer hypotheses than there were failures, the loop in `triageEngine.ts` silently skips the extras.
- **Tension:** skipping silently is the current behavior. Alternatively, the mismatch could trigger the fallback-to-single path per unmatched failure.
- **Decision needed:** whether a count mismatch is a rare edge case (skip) or a symptom of a batch prompt problem (fall back).

### Should prompts live in code or in Markdown files?

- **Context:** prompts are TypeScript constants in `src/ai/prompts/`. They could also live in `.md` files loaded at runtime.
- **Tension:** TypeScript keeps everything in one place, type-checked. Markdown is easier to edit and to version-control diff by diff, and non-developers (a QA lead) could review them.
- **Decision needed:** whether prompt editing is ever a non-developer activity in this project.

## Not Planned

Deliberate exclusions. Not gaps — choices.

### No RAG / vector store

The harness operates on single documents (a spec, a failure, a test case). Retrieval over a large corpus is a different problem, solved by a different tool.

### No fine-tuning

The schemas, prompts, and judge give sufficient control at this scale. Fine-tuning would lock us to a specific model and contradict the provider-agnostic design.

### No autonomous UI exploration

The agents analyze text and code. They do not drive a browser on their own to discover scenarios. Adding that would trade stability for a demo that only works half the time.

### No custom agent framework

No LangChain, no CrewAI, no AutoGen. Four functions, one HTTP client, three zod schemas. The total surface is small enough to reason about without abstractions.

### specGenerator path containment — defense-in-depth, unreachable by design

`src/ai/agents/specGenerator.ts` enforces spec-file writes with two layers:

1. **Policy (`parseOutput`)** — rejects any model-supplied `fileName` containing
   `/`, `\`, or `..`, and requires a `.spec.ts` suffix. This is the _authoritative_
   policy: spec output is flat only — no subdirectories under `tests/specs/review/`.
2. **Defense-in-depth (`assertPathInsideTargetDir`)** — asserts the resolved output
   path is inside the resolved target dir (rejects `../` and `..`).

**Scope note:** under the flat-only policy, layer 2 is **unreachable via
`generateSpec`** — layer 1 rejects every input that could escape, so no
policy-passing `fileName` ever triggers the containment throw. The isolation tests
in `tests/unit/ai/specGenerator.test.ts` call `assertPathInsideTargetDir` directly
to cover its logic. Do **not** delete layer 2 as dead code: it exists so that if
layer 1 is ever loosened (e.g. to allow nested spec paths), writes remain confined.
Its escape branch is covered only by direct unit tests, not by any `generateSpec`
integration test — a `generateSpec`-level mutation test for it is impossible while
the policy is flat-only.

Origin: traversal write outside `tests/specs/review/` (reproduced by execution,
2026-10-13), fixed in commit `1b290b6a`.

### spec-generator returns path-shaped fileName intermittently

- **Where:** `src/ai/prompts/specGenerator.ts` (the fileName instruction) and
  `src/ai/agents/specGenerator.ts` parseOutput (the containment guard).
- **What:** the model intermittently returns a path-shaped fileName
  (`tests/specs/review/checkout-empty-cart.spec.ts`) instead of a bare filename.
  Observed twice in live `ai:refine` runs. The guard in `parseOutput` rejects it
  correctly — the CLI fails loudly with "Refusing fileName with path separators or
  traversal sequences", no file is written outside targetDir.
- **Fix applied:** the prompt was tightened to require a BARE filename with an explicit
  negative example (commit `1eca30e8`).
- **Residual:** model output is probabilistic; the tightened prompt reduces but cannot
  deterministically eliminate the path-return. There is no unit test for prompt
  compliance (see the "No prompt A/B testing" entry).
- **Classification:** documented model-variance, guard handles it correctly.

### refineSpec parser policy — consistency alignment, defense-in-depth

`src/ai/agents/refineSpec.ts`, `parseRefinerOutput` previously checked only that
`fileName` ends with `.spec.ts`. It did NOT reject `/`, `\`, or `..`.

Phase 0 investigation confirmed the model-supplied `fileName` cannot reach any
filesystem call in `refineSpec`: the sole `writeFile` call uses `currentOutputPath`
(from `generateSpec`), which is never reassigned. The model's `fileName` flows only
to records, logs, and result fields — both consumers (`mcp-server.ts`,
`refineSpecCli.ts`) are display-only.

The parser policy was aligned with `specGenerator`'s `parseOutput` (commit
`1b290b6a`) for **consistency**, not as a security fix. The guard is
defense-in-depth — it is unreachable by construction because no fs call consumes
the model's `fileName`.

**Test coverage:** the reject tests (`../x.spec.ts`, `nested/deep.spec.ts`,
`nested\deep.spec.ts`) were demonstrated to fail when the policy check is removed
(revert-and-restore proof in commit `db25e74e`), so the guard is actually tested
and not vacuous.

Origin: consistency alignment with `specGenerator` parser policy, commit
`db25e74e`.

### refineSpec name invariant — unobservable in production

The refactor (commit `81703eb4`) moved the loop's name assignment into
`runRefinementIteration` and re-establishes it in the loop via
`currentFileName = result.fileName`. In production this reassignment is
unobservable: `generateSpec` derives `outputPath` from `fileName`
(`specGenerator.ts` line 74) and validates `fileName` as a flat basename
(line 51), so `basename(outputPath)` always equals `fileName`. No test can
distinguish the reassignment present vs absent; a revert-proof is impossible.
It is kept as an explicit invariant, not a fix.

This mirrors the specGenerator unreachable-guard entry: a real code property
that cannot be exercised in production.

Origin: refinement decomposition, commit `9ded8184`.

### refineLogger caseId interpolated into filename without sanitization

- **Where:** `src/ai/tools/refineLogger.ts`, `resolveLogFile`, line 31 — `caseId`
  is interpolated directly into `` `refine-${caseId}-${runId}.jsonl` `` with no
  validation or sanitization.
- **Why it is not a live bug:** the `caseId` reaching this code originates from
  parsed requirements YAML (`testCase.id` via `refineSpec` → `logRefineAttempt`),
  not from a raw MCP tool argument. The raw client string is used only for the YAML
  lookup `parsed.cases.find(c => c.id === caseId)`, and the value threaded onward is
  `testCase.id` from the YAML structure.
- **Residual risk:** if a requirements YAML ever contains a case id with `/` or `..`,
  the resolved path could escape `aiConfig.logsDir`. Trust in the YAML is the only
  barrier.
- **Classification:** defense-in-depth — document, do not fix (rule 8). A sanitizing
  guard would be appropriate if `caseId` could originate from an untrusted source;
  today it is trusted input from the YAML pipeline.
